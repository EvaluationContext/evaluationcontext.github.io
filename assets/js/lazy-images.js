// Add loading="lazy" and decoding="async" to all images on page load
function optimizeImages() {
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    // Add lazy loading if not already set
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
    // Add async decoding for better performance
    if (!img.hasAttribute('decoding')) {
      img.setAttribute('decoding', 'async');
    }
    // Add fetchpriority for images in viewport
    const rect = img.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      img.setAttribute('fetchpriority', 'high');
    }
  });
}

document.addEventListener('DOMContentLoaded', optimizeImages);

// Handle instant navigation - re-optimize images after page change
if (typeof document$ !== 'undefined') {
  document$.subscribe(() => {
    optimizeImages();
  });
}

// Image retry logic - retry loading failed images (but not 404s)
function setupImageRetry() {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second
  const checked404s = new Set(); // Track URLs that returned 404

  // Check if URL returns 404
  async function is404(url) {
    // If we already know it's a 404, don't check again
    if (checked404s.has(url)) return true;
    
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.status === 404) {
        checked404s.add(url);
        return true;
      }
      return false;
    } catch (e) {
      // Network error, not a 404, so we should retry
      return false;
    }
  }

  // Handle image load errors with retry logic
  async function handleImageError(img, retryCount = 0) {
    const originalSrc = img.dataset.originalSrc || img.src.split('?')[0];
    img.dataset.originalSrc = originalSrc;
    
    // Check if this is a 404 error
    const is404Error = await is404(originalSrc);
    
    if (is404Error) {
      console.error('Image not found (404):', originalSrc);
      img.alt = img.alt + ' (Image not found)';
      img.style.opacity = '0.3';
      img.style.border = '1px dashed var(--md-default-fg-color--lightest)';
      return; // Don't retry 404s
    }
    
    // Only retry for network errors, not 404s
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying image load (attempt ${retryCount + 1}/${MAX_RETRIES}):`, originalSrc);
      
      setTimeout(() => {
        // Force reload by adding timestamp to bypass cache
        img.src = originalSrc + '?t=' + Date.now();
      }, RETRY_DELAY * (retryCount + 1)); // Exponential backoff
    } else {
      console.error('Image failed to load after retries:', originalSrc);
      img.alt = img.alt + ' (Failed to load)';
      img.style.opacity = '0.5';
      img.style.border = '1px dashed var(--md-default-fg-color--lightest)';
    }
  }

  // Add error handler to all images
  const allImages = document.querySelectorAll('img');
  allImages.forEach(img => {
    // Skip if already has error handler
    if (img.dataset.hasErrorHandler) return;
    img.dataset.hasErrorHandler = 'true';
    
    // Store retry count on the image element
    let retryCount = 0;
    
    img.addEventListener('error', function() {
      handleImageError(this, retryCount);
      retryCount++;
    });

    // Also handle successful loads to clear any error state
    img.addEventListener('load', function() {
      retryCount = 0;
      this.style.border = '';
      this.style.opacity = '';
    });
  });
}

document.addEventListener('DOMContentLoaded', setupImageRetry);

// Re-setup retry handlers on navigation
if (typeof document$ !== 'undefined') {
  document$.subscribe(() => {
    setupImageRetry();
  });
}

// Intersection Observer for better lazy loading control
function setupIntersectionObserver() {
  // Check if Intersection Observer is supported
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          
          // If image has data-src, load it
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          
          // Stop observing this image
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px' // Start loading 50px before image enters viewport
    });

    // Observe all images with data-src attribute
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => imageObserver.observe(img));
  }
}

document.addEventListener('DOMContentLoaded', setupIntersectionObserver);

// Re-setup observer on navigation
if (typeof document$ !== 'undefined') {
  document$.subscribe(() => {
    setupIntersectionObserver();
  });
}
