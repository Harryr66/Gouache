/**
 * Image Compression Utilities
 * 
 * Client-side image compression and resizing for uploads
 */

/**
 * Compress and resize an image file
 * @param file - The image file to compress
 * @param maxWidth - Maximum width in pixels (default: 1920)
 * @param maxHeight - Maximum height in pixels (default: 1920)
 * @param quality - JPEG quality 0-1 (default: 0.85 for good quality)
 * @returns Promise<File> - Compressed image file
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.95  // High quality (95%) - increased from 0.85
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        
        if (width > height) {
          if (width > maxWidth) {
            width = maxWidth;
            height = width / aspectRatio;
          }
        } else {
          if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Image compression failed'));
            return;
          }

          // Convert blob back to File
          const compressedFile = new File([blob], file.name, {
            type: file.type || 'image/jpeg',
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        },
        file.type || 'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compress image for avatar/profile pictures (smaller size)
 * @param file - The image file to compress
 * @returns Promise<File> - Compressed image file (400x400 max)
 */
export async function compressImageForAvatar(file: File): Promise<File> {
  return compressImage(file, 400, 400, 0.85);
}

/**
 * Compress image for banner images (wider aspect ratio)
 * @param file - The image file to compress
 * @returns Promise<File> - Compressed image file (1200x400 max)
 */
export async function compressImageForBanner(file: File): Promise<File> {
  return compressImage(file, 1200, 400, 0.85);
}

/**
 * Compress image for portfolio/square images (1:1 aspect ratio preferred)
 * @param file - The image file to compress
 * @returns Promise<File> - Compressed image file (1080x1080 max)
 */
export async function compressImageForPortfolio(file: File): Promise<File> {
  return compressImage(file, 1080, 1080, 0.85);
}