/**
 * Cloudflare Images Upload Utility
 * 
 * Handles image uploads to Cloudflare Images with automatic optimization,
 * multiple size variants, and global CDN delivery.
 * 
 * Pricing:
 * - Base: $5/month (includes 100k images)
 * - Storage: $1 per 100k images
 * - Delivery: $1 per 100k images delivered
 * 
 * Benefits:
 * - Automatic optimization (WebP/AVIF)
 * - Multiple size variants (thumbnail, small, medium, large)
 * - Global CDN (fast delivery worldwide)
 * - 30KB optimized images vs 800KB originals
 */

export type CloudflareImageVariant = 'thumbnail' | 'small' | 'medium' | 'large' | 'full';

export interface CloudflareImagesUploadResult {
  imageId: string;
  imageUrl: string;
  variants: {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
    full: string;
  };
  provider: 'cloudflare';
}

/**
 * Upload image to Cloudflare Images
 * 
 * @param file - Image file to upload
 * @returns Image ID, base URL, and variant URLs
 */
export async function uploadImageToCloudflare(
  file: File
): Promise<CloudflareImagesUploadResult> {
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH;
  const apiToken = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN;

  if (!accountHash || !apiToken) {
    throw new Error('Cloudflare Images credentials not configured. Please set NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH and NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN');
  }

  try {
    // Create form data for upload
    const formData = new FormData();
    formData.append('file', file);
    
    // Optional: Add metadata
    formData.append('metadata', JSON.stringify({
      uploadedAt: new Date().toISOString(),
    }));

    // Upload image
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountHash}/images/v1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to upload image: ${error.errors?.[0]?.message || 'Unknown error'}`);
    }

    const { result } = await response.json();
    const imageId = result.id;
    const baseUrl = result.variants?.[0] || result.filename;

    // Generate variant URLs
    const variants = {
      thumbnail: getCloudflareImageUrl(imageId, 'thumbnail'),
      small: getCloudflareImageUrl(imageId, 'small'),
      medium: getCloudflareImageUrl(imageId, 'medium'),
      large: getCloudflareImageUrl(imageId, 'large'),
      full: getCloudflareImageUrl(imageId, 'full'),
    };

    return {
      imageId,
      imageUrl: variants.medium, // Default to medium
      variants,
      provider: 'cloudflare',
    };
  } catch (error: any) {
    console.error('Error uploading image to Cloudflare Images:', error);
    throw new Error(`Cloudflare Images upload failed: ${error.message}`);
  }
}

/**
 * Get optimized Cloudflare Images URL with variant
 * 
 * @param imageId - Cloudflare image ID
 * @param variant - Size variant (thumbnail, small, medium, large, full)
 * @returns Optimized image URL
 */
export function getCloudflareImageUrl(
  imageId: string,
  variant: CloudflareImageVariant = 'medium'
): string {
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH;
  
  if (!accountHash) {
    throw new Error('Cloudflare Images account hash not configured');
  }

  // Cloudflare Images URL format:
  // https://imagedelivery.net/{accountHash}/{imageId}/{variant}
  
  // Variant mapping
  const variantMap: Record<CloudflareImageVariant, string> = {
    thumbnail: 'thumbnail', // 240px width
    small: 'small',         // 480px width
    medium: 'medium',       // 720px width
    large: 'large',         // 1080px width
    full: 'full',           // Original size
  };

  const variantName = variantMap[variant] || 'medium';
  return `https://imagedelivery.net/${accountHash}/${imageId}/${variantName}`;
}

/**
 * Check if URL is a Cloudflare Images URL
 */
export function isCloudflareImageUrl(url: string): boolean {
  return url.includes('imagedelivery.net') || url.includes('cloudflare');
}

/**
 * Extract image ID from Cloudflare Images URL
 */
export function extractCloudflareImageId(url: string): string | null {
  const match = url.match(/imagedelivery\.net\/[^/]+\/([^/]+)/);
  return match ? match[1] : null;
}

