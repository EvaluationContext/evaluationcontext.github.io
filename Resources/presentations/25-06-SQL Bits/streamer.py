import asyncio
import json
import datetime
from typing import Optional
import time
import numpy as np
import pyaudio
import math
from queue import Queue, Empty
from collections import deque
import signal
import sys

from bleak import BleakClient, BleakScanner
from bleak.backends.device import BLEDevice
from bleak.exc import BleakError

from azure.eventhub.aio import EventHubProducerClient
from azure.eventhub import EventData
from azure.identity.aio import AzureCliCredential
from azure.core.exceptions import AzureError

# --- Configuration ---
DEBUG_LOCAL_ONLY = False
DEBUG_DISPLAY_VISUALIZATION = True
BATCH_INTERVAL = 1  # seconds to wait before sending a batch of events
QUEUE_MAX_SIZE = 1000 # Max number of events to hold in memory

# --- Garmin Device Configuration ---
# Option 1: Filter by device name (most common approach)
GARMIN_DEVICE_NAME = "Forerunner"  # Adjust this to match your exact device name
# Option 2: Filter by MAC address (most specific - uncomment and set if needed)
GARMIN_MAC_ADDRESS = "14:13:0b:44:fb:6b"  # Replace with your device's MAC address

# --- Heart Rate ---
HR_SERVICE_UUID = "0000180d-0000-1000-8000-00805f9b34fb"
HR_MEASUREMENT_CHAR_UUID = "00002a37-0000-1000-8000-00805f9b34fb"

# --- Audio Configuration ---
AUDIO_RATE = 44100
AUDIO_CHUNK = 1024
AUDIO_FORMAT = pyaudio.paInt16
AUDIO_CHANNELS = 1
AUDIO_SMOOTHING_INTERVAL = 0.8  # seconds - collect max dB over this period
AUDIO_BARS = 20  # Number of bars in audio display

# --- Azure Event Hub Configuration ---
EVENT_HUB_NAMESPACE = "PowerHour.servicebus.windows.net"
HR_EVENT_HUB_NAME = "heartrate"
AUDIO_EVENT_HUB_NAME = "audio"

class GracefulKiller:
    """Handle graceful shutdown to prevent kernel timeout."""
    def __init__(self):
        self.kill_now = False
        signal.signal(signal.SIGINT, self._handle_signal)
        signal.signal(signal.SIGTERM, self._handle_signal)

    def _handle_signal(self, signum, frame):
        print(f"\nReceived signal {signum}, shutting down gracefully...\033[0m")
        self.kill_now = True

class BaseStreamer:
    """Base class for streaming data to Azure Event Hub."""
    def __init__(self, event_hub_namespace: str, event_hub_name: str):
        self.event_hub_namespace = event_hub_namespace
        self.event_hub_name = event_hub_name
        self.event_queue = asyncio.Queue(maxsize=QUEUE_MAX_SIZE)
        self.producer_client: Optional[EventHubProducerClient] = None
        self.sender_task: Optional[asyncio.Task] = None
        self.debug_mode = DEBUG_LOCAL_ONLY
        self.debug_display_visualization = DEBUG_DISPLAY_VISUALIZATION
        self.running = False
        self.killer = GracefulKiller()
        self.display_initialized = False

        self.events_queued = 0
        self.events_sent = 0
        self.last_send_time = None

    def clear_console(self):
        """Clear the console display."""
        print("\033[H\033[J", end='')

    async def init_event_hub(self):
        """Initialize Azure Event Hub client."""
        if self.debug_mode:
            print(f"[{datetime.datetime.now()}] Running in DEBUG mode - no data will be sent to Event Hub.")
            return

        try:
            print(f"[{datetime.datetime.now()}] Initializing Event Hub connection...")

            credential = AzureCliCredential()

            # Test credential and permissions
            try:
                token = await credential.get_token("https://eventhubs.azure.net/.default")
                print(f"[{datetime.datetime.now()}] Azure credentials validated successfully.")
            except Exception as cred_error:
                print(f"[{datetime.datetime.now()}] ❌ Azure credential error: {cred_error}")
                print("    Please make sure you are logged in with 'az login' and have the 'Azure Event Hubs Data Sender' role.")
                raise

            self.producer_client = EventHubProducerClient(
                fully_qualified_namespace=self.event_hub_namespace,
                eventhub_name=self.event_hub_name,
                credential=credential
            )

        except Exception as e:
            print(f"[{datetime.datetime.now()}] ❌ Event Hub initialization failed: {e}")
            print(f"    Error type: {type(e).__name__}")
            print("    Falling back to local-only mode.")
            self.debug_mode = True

    async def send_events_batch(self):
        """Send queued events to Event Hub in batches."""
        print(f"[{datetime.datetime.now()}] Starting batch sender task...")

        while self.running and not self.killer.kill_now:
            await asyncio.sleep(BATCH_INTERVAL)
            events = []

            # Collect all available events from the queue for this batch
            while not self.event_queue.empty():
                try:
                    events.append(self.event_queue.get_nowait())
                    self.event_queue.task_done()
                except asyncio.QueueEmpty:
                    break

            if not events:
                continue

            if self.debug_mode:
                self.events_sent += len(events)
                print(f"[{datetime.datetime.now()}] DEBUG: Would send {len(events)} events.")
                if events:
                    sample_event = json.loads(events[0].body)
                    print(f"[{datetime.datetime.now()}]   Sample event: {sample_event}")
                await self.on_events_sent(events)
                self.last_send_time = datetime.datetime.now()
                continue

            # Original logic for sending to Event Hub (only runs if not in debug_mode)
            if self.producer_client:
                try:
                    batch = await self.producer_client.create_batch()
                    for event in events:
                        try:
                            batch.add(event)
                        except ValueError:
                            # Batch is full, send and create a new one
                            await self.producer_client.send_batch(batch)
                            self.events_sent += len(batch)
                            print(f"[{datetime.datetime.now()}] Sent intermediate batch of {len(batch)} events.")
                            batch = await self.producer_client.create_batch()
                            batch.add(event) # Add the event that didn't fit

                    if len(batch) > 0:
                        await self.producer_client.send_batch(batch)
                        self.events_sent += len(batch)

                    print(f"[{datetime.datetime.now()}] ✅ Successfully sent a total of {len(events)} events to '{self.event_hub_name}'.")
                    self.last_send_time = datetime.datetime.now()
                    await self.on_events_sent(events)

                except AzureError as e:
                    print(f"[{datetime.datetime.now()}] ❌ Failed to send batch to Azure: {e}")
                    print(f"    Error type: {type(e).__name__}")
                except Exception as e:
                    print(f"[{datetime.datetime.now()}] ❌ An unexpected error occurred while sending batch: {e}")

    async def on_events_sent(self, events):
        """Override this method to handle post-send actions."""
        pass

    def add_event(self, event_data: dict):
        """Add an event to the queue."""
        try:
            enhanced_event_data = {
                **event_data,
                "client_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "version": "1.1"
            }
            event = EventData(body=json.dumps(enhanced_event_data))

            try:
                self.event_queue.put_nowait(event)
                self.events_queued += 1
            except asyncio.QueueFull:
                print(f"[{datetime.datetime.now()}] ⚠️  Queue full (size: {QUEUE_MAX_SIZE}), dropping event.")

        except Exception as e:
            print(f"[{datetime.datetime.now()}] Error adding event: {e}")

    async def start(self):
        """Start the streamer."""
        print(f"[{datetime.datetime.now()}] Starting {self.__class__.__name__}...")
        self.running = True

        await self.init_event_hub()
        self.sender_task = asyncio.create_task(self.send_events_batch())
        await self.start_monitoring()

    async def start_monitoring(self):
        """Override this method to implement specific monitoring logic."""
        raise NotImplementedError("Subclasses must implement start_monitoring")

    async def stop(self):
        """Stop the streamer and clean up resources."""
        print(f"[{datetime.datetime.now()}] DEBUG: stop() method called. Setting self.running to False.")
        print(f"\n[{datetime.datetime.now()}] Stopping {self.__class__.__name__}...")
        self.running = False

        if not self.event_queue.empty():
            print(f"[{datetime.datetime.now()}] Sending final {self.event_queue.qsize()} events...")
            await asyncio.sleep(BATCH_INTERVAL + 1)

        if self.sender_task and not self.sender_task.done():
            self.sender_task.cancel()
            try:
                await self.sender_task
            except asyncio.CancelledError:
                pass

        if self.producer_client:
            try:
                await self.producer_client.close()
                print(f"[{datetime.datetime.now()}] Event Hub client closed for '{self.event_hub_name}'.")
            except Exception as e:
                print(f"[{datetime.datetime.now()}] Error closing Event Hub client: {e}")

        await self.cleanup()
        print(f"[{datetime.datetime.now()}] Final stats: Queued={self.events_queued}, Sent={self.events_sent}")

    async def cleanup(self):
        """Override this method for specific cleanup tasks."""
        pass

class HeartRateStreamer(BaseStreamer):
    """Streams heart rate data from a specific Garmin device to Azure Event Hub."""
    def __init__(self, event_hub_namespace: str, event_hub_name: str):
        super().__init__(event_hub_namespace, event_hub_name)
        self.client: Optional[BleakClient] = None
        self.last_hr = 0
        self.heart_art = """
,d88b.d88b,
88888888888
`Y8888888Y'
  `Y888Y'
    `Y'
"""

    def display_heart(self, hr_value: int):
        if not self.debug_display_visualization:
            return
        self.clear_console()
        print(f"Heart Rate: {hr_value} BPM")
        print(f"{self.heart_art}\033[91m")

    def handle_hr_notification(self, device_address: str, sender: int, data: bytearray):
        """Handle heart rate notifications from BLE device."""
        if len(data) < 2:
            return

        flags = data[0]
        hr_format_is_uint16 = bool(flags & 0x01)

        if hr_format_is_uint16:
            heart_rate = int.from_bytes(data[1:3], byteorder='little')
        else:
            heart_rate = data[1]

        self.last_hr = heart_rate
        hr_event = {
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "heart_rate_bpm": heart_rate,
            "source": "Garmin Forerunner",
            "device_address": device_address,
            "data_type": "heart_rate"
        }
        print(f"[{datetime.datetime.now()}] HR reading: {heart_rate} BPM. Queueing event...")
        self.add_event(hr_event)
        self.display_heart(heart_rate)

    def is_target_garmin_device(self, device: BLEDevice) -> bool:
        """Check if the device is the target Garmin watch."""
        device_name = device.name or ""
        
        # Method 1: Check by device name (most common)
        if GARMIN_DEVICE_NAME.lower() in device_name.lower():
            return True
        
        # Method 2: Check by MAC address (uncomment if using MAC filtering)
        if hasattr(globals(), 'GARMIN_MAC_ADDRESS') and device.address.upper() == GARMIN_MAC_ADDRESS.upper():
            return True
        
        # Method 3: Check for common Garmin device name patterns
        garmin_patterns = [
            "forerunner"
            "Forerunner"
            "forerunner 955",
            "forerunner955", 
            "fr955",
            "garmin",
            # Add other patterns your device might use
        ]
        
        for pattern in garmin_patterns:
            if pattern.lower() in device_name.lower():
                return True
        
        return False

    async def find_hr_device(self) -> Optional[BLEDevice]:
        """Scan for and find the specific Garmin heart rate device."""
        print(f"[{datetime.datetime.now()}] Scanning for Garmin Forerunner with heart rate service...")
        try:
            devices = await BleakScanner.discover(service_uuids=[HR_SERVICE_UUID], timeout=15.0)
        except BleakError as e:
            print(f"[{datetime.datetime.now()}] Scan error: {e}. Is Bluetooth enabled?")
            return None
        except Exception as e:
            print(f"[{datetime.datetime.now()}] Unexpected scan error: {e}")
            return None

        if not devices:
            print(f"[{datetime.datetime.now()}] No heart rate devices found.")
            return None

        print(f"[{datetime.datetime.now()}] Found {len(devices)} heart rate device(s):")
        target_device = None
        
        for device in devices:
            device_name = device.name or "Unknown"
            print(f"  Found: {device_name} ({device.address}) RSSI: {device.rssi}")
            
            if self.is_target_garmin_device(device):
                print(f"  ✅ This matches your target Garmin device!")
                target_device = device
            else:
                print(f"  ❌ Not the target device")

        if target_device:
            print(f"[{datetime.datetime.now()}] Selected device: {target_device.name} ({target_device.address})")
            return target_device
        else:
            print(f"[{datetime.datetime.now()}] ❌ Target Garmin device '{GARMIN_DEVICE_NAME}' not found.")
            print("Available devices did not match the target. Check the device name or MAC address configuration.")
            return None

    async def start_monitoring(self):
        """Start heart rate monitoring."""
        while self.running and not self.killer.kill_now:
            device = await self.find_hr_device()
            if not device:
                print(f"Target Garmin device not found. Retrying in 15 seconds...")
                await asyncio.sleep(15)
                continue

            print(f"[{datetime.datetime.now()}] Connecting to {device.name or 'Unknown'} ({device.address})")
            try:
                async with BleakClient(device.address) as client:
                    self.client = client
                    if not client.is_connected:
                        print(f"[{datetime.datetime.now()}] Failed to connect.")
                        continue

                    print(f"[{datetime.datetime.now()}] Connected successfully to Garmin device. Starting notifications...")
                    try:
                        handler = lambda s, d: self.handle_hr_notification(device.address, s, d)
                        await client.start_notify(HR_MEASUREMENT_CHAR_UUID, handler)
                        print(f"[{datetime.datetime.now()}] Streaming HR data from Garmin. Press Ctrl+C to stop.")

                        while client.is_connected and self.running and not self.killer.kill_now:
                            await asyncio.sleep(1)

                    except Exception as e:
                        print(f"[{datetime.datetime.now()}] Error during notification: {e}")
                    finally:
                        print("Device disconnected.")
                        if self.client and self.client.is_connected:
                            await self.client.stop_notify(HR_MEASUREMENT_CHAR_UUID)
            except Exception as e:
                print(f"[{datetime.datetime.now()}] Connection error: {e}")
                print("Retrying in 15 seconds...")
                await asyncio.sleep(15)

    async def cleanup(self):
        """Clean up BLE resources."""
        print("Heart rate monitoring stopped.")
        self.clear_console()

class AudioStreamer(BaseStreamer):
    """Simplified audio streamer with smoothed dB readings."""
    def __init__(self, event_hub_namespace: str, event_hub_name: str):
        super().__init__(event_hub_namespace, event_hub_name)
        self.audio = None
        self.audio_stream = None
        self.audio_running = False
        self.last_db = 0.0
        self.audio_data_queue = Queue()
        self.db_samples = deque(maxlen=int(AUDIO_SMOOTHING_INTERVAL * AUDIO_RATE / AUDIO_CHUNK))
        self.last_update_time = 0

    def display_speaker(self, db_value: float):
        """Display reception bars with audio level."""
        if not self.debug_display_visualization:
            return
        active_bars = int((max(0, min(100, db_value)) / 100) * AUDIO_BARS)
        console_bars = ""
        for i in range(AUDIO_BARS):
            console_bars += "█" if i < active_bars else "░"
        self.clear_console()
        print(f"Audio Level: {db_value:.1f} dB")
        print(f"[{console_bars}]\033[94m")

    def calculate_decibels(self, audio_data):
        """Calculate decibel level from audio data."""
        try:
            audio_np = np.frombuffer(audio_data, dtype=np.int16)
            if len(audio_np) == 0:
                return 0.0
            rms = np.sqrt(np.mean(audio_np.astype(np.float64)**2))
            if rms < 1.0:
                return 0.0
            db = 20 * math.log10(rms / 32767.0)
            normalized_db = max(0, min(100, db + 90))
            return normalized_db
        except Exception as e:
            print(f"Error calculating decibels: {e}")
            return 0.0

    def audio_callback(self, in_data, frame_count, time_info, status):
        """Audio stream callback - runs in separate thread."""
        if self.audio_running and in_data:
            self.audio_data_queue.put(in_data)
        return (in_data, pyaudio.paContinue)

    async def process_audio_data(self):
        """Process audio data from queue with smoothing."""
        while self.running and not self.killer.kill_now:
            try:
                audio_data = self.audio_data_queue.get_nowait()
                current_time = time.time()
                db_level = self.calculate_decibels(audio_data)
                self.db_samples.append(db_level)

                if current_time - self.last_update_time >= AUDIO_SMOOTHING_INTERVAL:
                    if self.db_samples:
                        max_db = max(self.db_samples)
                        self.last_db = max_db
                        audio_event = {
                            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                            "decibel_level": max_db,
                            "source": "Laptop Microphone",
                            "device": "Internal Audio",
                            "data_type": "audio_level"
                        }
                        print(f"[{datetime.datetime.now()}] Audio level: {max_db:.1f} dB. Queueing event...")
                        self.add_event(audio_event)
                        self.display_speaker(max_db)
                        self.last_update_time = current_time
            except Empty:
                await asyncio.sleep(0.01)
            except Exception as e:
                print(f"Error processing audio data: {e}")
                await asyncio.sleep(0.1)

    def init_audio(self):
        """Initialize PyAudio with error handling."""
        try:
            self.audio = pyaudio.PyAudio()
            self.audio.get_default_input_device_info()
            return True
        except Exception as e:
            print(f"Failed to initialize audio: {e}. No input device found?")
            if self.audio: self.audio.terminate()
            self.audio = None
            return False

    async def start_monitoring(self):
        """Start audio monitoring."""
        print(f"[{datetime.datetime.now()}] DEBUG: AudioStreamer.start_monitoring() ENTERED.")
        if not self.init_audio():
            print(f"[{datetime.datetime.now()}] DEBUG: AudioStreamer.start_monitoring() EXITED due to init failure.")
            print("Audio initialization failed. Skipping audio monitoring.")
            return

        processing_task = asyncio.create_task(self.process_audio_data())
        self.audio_running = True

        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self.run_pyaudio_stream)

        print(f"[{datetime.datetime.now()}] DEBUG: AudioStreamer.start_monitoring() EXITED.")

        await processing_task

    def run_pyaudio_stream(self):
        """Blocking method to run the PyAudio stream."""
        self.audio_stream = self.audio.open(
            format=AUDIO_FORMAT,
            channels=AUDIO_CHANNELS,
            rate=AUDIO_RATE,
            input=True,
            frames_per_buffer=AUDIO_CHUNK,
            stream_callback=self.audio_callback
        )
        print(f"[{datetime.datetime.now()}] Audio monitoring started...")
        while self.running and not self.killer.kill_now and self.audio_stream.is_active():
            time.sleep(0.1)
        self.audio_running = False

    async def cleanup(self):
        """Clean up audio resources."""
        print("Cleaning up audio resources...")
        if self.audio_stream:
            self.audio_stream.stop_stream()
            self.audio_stream.close()
            print("Audio stream closed.")
        if self.audio:
            self.audio.terminate()
            print("Audio system terminated.")
        self.clear_console()

async def run_audio_only():
    """Run only the audio streamer."""
    print("Starting Audio Streamer...")
    print("=" * 50)
    streamer = AudioStreamer(EVENT_HUB_NAMESPACE, AUDIO_EVENT_HUB_NAME)
    await streamer.start()

async def run_hr_only():
    """Run only the heart rate streamer."""
    print("Starting Heart Rate Streamer...")
    print("=" * 50)
    streamer = HeartRateStreamer(EVENT_HUB_NAMESPACE, HR_EVENT_HUB_NAME)
    await streamer.start()

async def main():
    """Main entry point to run the appropriate streamer."""
    killer = GracefulKiller()
    streamer_task = None
    try:
        print("Welcome to the Azure Event Hub Streamer!")
        print("Choose an option:")
        print("1. Run Audio Streamer")
        print("2. Run Heart Rate Streamer (Garmin Forerunner 955)")
        choice = input("Enter your choice (1/2): ")

        if choice == '1':
            streamer_task = asyncio.create_task(run_audio_only())
        elif choice == '2':
            streamer_task = asyncio.create_task(run_hr_only())
        else:
            print("Invalid choice, exiting...")
            return

        while not killer.kill_now:
            await asyncio.sleep(1)
            if streamer_task and streamer_task.done():
                if streamer_task.exception():
                    raise streamer_task.exception()
                break

    except (KeyboardInterrupt, SystemExit):
        print("\nMain loop interrupted.")
    except Exception as e:
        print(f"\nAn unexpected error occurred in main: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("\nShutting down all tasks...")
        if streamer_task and not streamer_task.done():
            streamer_task.cancel()
            try:
                await streamer_task
            except asyncio.CancelledError:
                pass
        print("Shutdown complete.")

if __name__ == "__main__":
    asyncio.run(main())