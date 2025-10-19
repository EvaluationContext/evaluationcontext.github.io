import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# Configuration
num_workspaces = 10
num_semantic_models_per_workspace = 3
num_refresh_logs = 200
failure_rate = 0.05  # 5% failure rate

# --- Generate Dimensions ---

# Workspaces Dimension
workspaces_data = {'WorkspaceID': range(1, num_workspaces + 1),
                   'WorkspaceName': [f'Workspace {i}' for i in range(1, num_workspaces + 1)]}
dim_workspaces = pd.DataFrame(workspaces_data)

# Semantic Models Dimension
semantic_models_data = []
model_id_counter = 1
for ws_id in range(1, num_workspaces + 1):
    for i in range(1, num_semantic_models_per_workspace + 1):
        semantic_models_data.append({'SemanticModelID': model_id_counter,
                                     'WorkspaceID': ws_id,
                                     'SemanticModelName': f'Model {model_id_counter}'})
        model_id_counter += 1
dim_semantic_models = pd.DataFrame(semantic_models_data)

# --- Generate Fact Table: Execution Metrics Logs (Refreshes) ---

fact_refresh_data = []
for i in range(num_refresh_logs):
    semantic_model_id = random.choice(dim_semantic_models['SemanticModelID'])
    workspace_id = dim_semantic_models[dim_semantic_models['SemanticModelID'] == semantic_model_id]['WorkspaceID'].iloc[0]

    start_time = datetime.now() - timedelta(days=random.randint(1, 30), hours=random.randint(0, 23), minutes=random.randint(0, 59), seconds=random.randint(0, 59))

    # Simulate different base refresh durations for each model
    base_duration_minutes = (semantic_model_id * 5) % 60 + 15  # Ensure different durations
    duration_variation = random.uniform(-0.2, 0.3) * base_duration_minutes # Add some variability
    refresh_duration_seconds = max(10, int((base_duration_minutes + duration_variation) * 60)) # Ensure minimum duration

    end_time = start_time + timedelta(seconds=refresh_duration_seconds)

    # Simulate CPU cost (rough correlation with duration)
    cpu_cost = round((refresh_duration_seconds / 60) * random.uniform(0.5, 2.0), 2)

    # Simulate success or failure
    if random.random() < failure_rate:
        status = 'Failed'
    else:
        status = 'Succeeded'

    fact_refresh_data.append({
        'LogID': i + 1,
        'WorkspaceID': workspace_id,
        'SemanticModelID': semantic_model_id,
        'RefreshStartTime': start_time,
        'RefreshEndTime': end_time,
        'RefreshDurationSeconds': refresh_duration_seconds,
        'CPUCost': cpu_cost,
        'Status': status
    })

fact_refresh_logs = pd.DataFrame(fact_refresh_data)

# --- Output the Tables ---

# print("--- Workspaces Dimension ---")
# print(dim_workspaces.to_string(index=False))
# print("\n--- Semantic Models Dimension ---")
# print(dim_semantic_models.to_string(index=False))
# print("\n--- Fact Refresh Logs ---")
# print(fact_refresh_logs.to_string(index=False))

# --- Optional: Save to CSV files ---
dim_workspaces.to_csv('dim_workspaces.csv', index=False)
dim_semantic_models.to_csv('dim_semantic_models.csv', index=False)
fact_refresh_logs.to_csv('fact_refresh_logs.csv', index=False)
print("\nTables saved to CSV files.")