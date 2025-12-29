'use client';

import { useState, useEffect, useMemo } from 'react';
import { getOptimizedImageUrl, getResponsiveImageSrcSet, getOptimalImageSize, generateBlurPlaceholder, getBestFormat, ImageSize } from '@/lib/image-optimizer';

interface UseOptimizedImageOptions {
  src: string;
  size?: ImageSize;
  isGrid?: boolean;
  isMobile?: boolean;
  enableBlur?: boolean;
  priority?: boolean;
}

interface OptimizedImageData {
  src: string;
  srcSet?: string;
  sizes?: string;
  placeholder?: string;
  format: string;
  width: number;
  height: number;
}

/**
 * Hook for optimized image loading (Pinterest/Instagram style)
 * 
 * Features:
 * - Automatic size selection based on viewport
 * - WebP/AVIF format support
 * - Blur-up placeholder
 * - Responsive srcSet
 */
export function useOptimizedImage({
  src,
  size,
  isGrid = true,
  isMobile = false,
  enableBlur = true,
  priority = false,
}: UseOptimizedImageOptions): OptimizedImageData {
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1920
  );

  // Synchronous format detection (no async delay - critical for performance)
  const bestFormat = useMemo(() => {
    if (typeof window === 'undefined') return 'jpg';
    // Check browser support synchronously using canvas
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const supportsAVIF = canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
      if (supportsAVIF) return 'avif';
      const supportsWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      if (supportsWebP) return 'webp';
    } catch (e) {
      // Fallback to jpg if detection fails
    }
    return 'jpg';
  }, []);

  // Detect viewport size
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate optimal size if not provided
  // Default to thumbnail for grid view (Pinterest/Instagram style - fastest initial load)
  const optimalSize = useMemo(() => {
    if (size) return size;
    // For grid view, default to thumbnail for fastest load, then upgrade
    if (isGrid && !priority) return 'thumbnail';
    return getOptimalImageSize(viewportWidth, isGrid, isMobile);
  }, [size, viewportWidth, isGrid, isMobile, priority]);

  // Generate optimized image data
  const imageData = useMemo(() => {
    const optimizedSrc = getOptimizedImageUrl(src, optimalSize, bestFormat as any);
    const { srcSet, sizes } = getResponsiveImageSrcSet(src, optimalSize);
    const placeholder = enableBlur ? generateBlurPlaceholder(src) : undefined;

    // Size presets
    const sizeMap: Record<ImageSize, { width: number; height: number }> = {
      thumbnail: { width: 240, height: 240 },
      small: { width: 480, height: 480 },
      medium: { width: 720, height: 720 },
      large: { width: 1080, height: 1080 },
      full: { width: 2048, height: 2048 },
    };

    const dimensions = sizeMap[optimalSize];

    return {
      src: optimizedSrc,
      srcSet: priority ? undefined : srcSet, // Don't use srcSet for priority images
      sizes: priority ? undefined : sizes,
      placeholder,
      format: bestFormat,
      width: dimensions.width,
      height: dimensions.height,
    };
  }, [src, optimalSize, bestFormat, enableBlur, priority]);

  return imageData;
}

