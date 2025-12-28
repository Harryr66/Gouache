/**
 * Image Optimization Utility
 * 
 * Generates optimized image URLs with multiple sizes and formats (like Pinterest/Instagram)
 * - Automatic size generation based on viewport
 * - WebP/AVIF format support with JPEG fallback
 * - Blur-up placeholder generation
 * - Responsive images for mobile/tablet/desktop
 */

export type ImageSize = 'thumbnail' | 'small' | 'medium' | 'large' | 'full';
export type ImageFormat = 'webp' | 'avif' | 'jpg' | 'auto';

export interface OptimizedImageOptions {
  src: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: ImageFormat;
  blur?: boolean; // Generate blur-up placeholder
}

export interface OptimizedImageResult {
  src: string;
  srcSet?: string;
  sizes?: string;
  placeholder?: string; // Blur-up placeholder (base64 or tiny image)
  width: number;
  height: number;
}

/**
 * Size presets matching Pinterest/Instagram strategy
 */
const SIZE_PRESETS: Record<ImageSize, { width: number; quality: number }> = {
  thumbnail: { width: 240, quality: 75 },   // Grid view (30KB)
  small: { width: 480, quality: 80 },         // Mobile detail (80KB)
  medium: { width: 720, quality: 85 },       // Tablet/Desktop grid (150KB)
  large: { width: 1080, quality: 90 },       // Desktop detail (500KB)
  full: { width: 2048, quality: 95 },        // Full quality (2MB)
};

/**
 * Generate optimized image URL with size and format
 * 
 * For Firebase Storage images, we'll use Next.js Image Optimization API
 * For Cloudflare Images, we'll use variant URLs
 */
export function getOptimizedImageUrl(
  originalUrl: string,
  size: ImageSize = 'medium',
  format: ImageFormat = 'auto'
): string {
  // If already a CDN URL with transformations, return as-is
  if (originalUrl.includes('?') && (originalUrl.includes('w=') || originalUrl.includes('width='))) {
    return originalUrl;
  }

  const preset = SIZE_PRESETS[size];
  
  // Cloudflare Images - use variant URLs
  if (originalUrl.includes('imagedelivery.net') || originalUrl.includes('cloudflare')) {
    // Extract image ID and variant from URL
    // Format: https://imagedelivery.net/{accountHash}/{imageId}/{variant}
    const urlParts = originalUrl.split('/');
    const variantIndex = urlParts.length - 1;
    const imageIdIndex = urlParts.length - 2;
    
    // Map our size to Cloudflare variant
    const variantMap: Record<ImageSize, string> = {
      thumbnail: 'thumbnail',
      small: 'small',
      medium: 'medium',
      large: 'large',
      full: 'full',
    };
    
    const variant = variantMap[size] || 'medium';
    
    // Replace variant in URL
    if (urlParts[variantIndex] && urlParts[imageIdIndex]) {
      urlParts[variantIndex] = variant;
      return urlParts.join('/');
    }
    
    // If URL doesn't have variant, construct it
    return originalUrl.replace(/\/[^/]+$/, `/${variant}`);
  }
  
  // For Firebase Storage or direct URLs, use Next.js Image Optimization
  // Format: /_next/image?url=ENCODED_URL&w=WIDTH&q=QUALITY
  if (originalUrl.includes('firebasestorage') || originalUrl.includes('firebase')) {
    // Use Next.js Image component's optimization (handled automatically)
    // For now, return original - Next.js will optimize on-the-fly
    return originalUrl;
  }

  // For other CDN providers (Cloudinary, etc.)
  // Example: https://cdn.example.com/image.jpg?w=720&q=85&f=webp
  return originalUrl;
}

/**
 * Generate responsive image srcSet for different viewport sizes
 * Like Pinterest/Instagram - different sizes for mobile/tablet/desktop
 */
export function getResponsiveImageSrcSet(
  originalUrl: string,
  baseSize: ImageSize = 'medium'
): { srcSet: string; sizes: string } {
  const sizes = [
    { size: 'thumbnail' as ImageSize, media: '(max-width: 640px)' },      // Mobile grid
    { size: 'small' as ImageSize, media: '(max-width: 1024px)' },          // Tablet
    { size: 'medium' as ImageSize, media: '(min-width: 1025px)' },          // Desktop
  ];

  const srcSetParts = sizes.map(({ size }) => {
    const preset = SIZE_PRESETS[size];
    const url = getOptimizedImageUrl(originalUrl, size);
    return `${url} ${preset.width}w`;
  });

  const sizesAttr = sizes.map(({ size, media }) => {
    const preset = SIZE_PRESETS[size];
    return `${media} ${preset.width}px`;
  }).join(', ');

  return {
    srcSet: srcSetParts.join(', '),
    sizes: sizesAttr,
  };
}

/**
 * Generate blur-up placeholder (tiny blurry version)
 * Returns a data URL or tiny image URL for instant display
 */
export function generateBlurPlaceholder(
  originalUrl: string,
  width: number = 20,
  quality: number = 20
): string {
  // For now, return a tiny version of the image
  // In production, this would be a base64-encoded 20px blurry version
  // Or use a service like Cloudinary's blur transformation
  
  // Temporary: Use Next.js Image with very small size for placeholder
  // In production, generate actual blur-up during upload
  return `${originalUrl}?w=${width}&q=${quality}&blur=10`;
}

/**
 * Get optimal image size based on viewport and context
 */
export function getOptimalImageSize(
  viewportWidth: number,
  isGrid: boolean = true,
  isMobile: boolean = false
): ImageSize {
  if (isMobile) {
    return isGrid ? 'thumbnail' : 'small';
  }
  
  if (viewportWidth < 640) {
    return 'thumbnail'; // Mobile
  } else if (viewportWidth < 1024) {
    return isGrid ? 'small' : 'medium'; // Tablet
  } else {
    return isGrid ? 'medium' : 'large'; // Desktop
  }
}

/**
 * Check if browser supports WebP
 */
export function supportsWebP(): boolean {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * Check if browser supports AVIF
 */
export function supportsAVIF(): boolean {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  try {
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  } catch {
    return false;
  }
}

/**
 * Get best format for current browser
 */
export function getBestFormat(): ImageFormat {
  if (supportsAVIF()) return 'avif';
  if (supportsWebP()) return 'webp';
  return 'jpg';
}

