/**
 * Blur Placeholder Generation Utility
 * 
 * Generates base64-encoded blur placeholders for instant visual feedback
 * (Pinterest/Instagram style)
 */

/**
 * Generate a blur placeholder from an image file
 * Returns a base64-encoded data URL of a tiny, blurry version
 */
export async function generateBlurPlaceholder(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    // Create a tiny version (20px width, maintaining aspect ratio)
    const targetWidth = 20;
    const targetHeight = 20;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    img.onload = () => {
      // Draw image scaled down
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      
      // Apply blur effect using a simple box blur
      // For better quality, we could use a more sophisticated blur algorithm
      // But this is fast and works well for placeholders
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const blurred = boxBlur(imageData, 2); // 2px blur radius
      ctx.putImageData(blurred, 0, 0);

      // Convert to base64 data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.2); // Low quality for small size
      resolve(dataUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for blur placeholder'));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Simple box blur algorithm for blur placeholders
 * Fast and efficient for small images
 */
function boxBlur(imageData: ImageData, radius: number): ImageData {
  const { data, width, height } = imageData;
  const result = new Uint8ClampedArray(data);
  
  // Simple box blur - average pixels in a box
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            a += data[idx + 3];
            count++;
          }
        }
      }
      
      const idx = (y * width + x) * 4;
      result[idx] = r / count;
      result[idx + 1] = g / count;
      result[idx + 2] = b / count;
      result[idx + 3] = a / count;
    }
  }
  
  return new ImageData(result, width, height);
}

/**
 * Generate blur placeholder from image URL
 * Fetches the image and generates a blur placeholder
 */
export async function generateBlurPlaceholderFromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return generateBlurPlaceholder(blob);
  } catch (error) {
    console.error('Failed to generate blur placeholder from URL:', error);
    // Return a simple gray placeholder
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==';
  }
}

/**
 * Extract blur placeholder from Cloudflare Images variant
 * Cloudflare Images can generate blur placeholders on-the-fly
 */
export function getCloudflareBlurPlaceholder(imageId: string, accountHash: string): string {
  // Use Cloudflare's blur transformation
  // Format: https://imagedelivery.net/{accountHash}/{imageId}/blur
  return `https://imagedelivery.net/${accountHash}/${imageId}/blur`;
}

