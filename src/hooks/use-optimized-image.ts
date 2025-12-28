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
  const [bestFormat, setBestFormat] = useState<string>('jpg');

  // Detect viewport size
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Detect best format
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    import('@/lib/image-optimizer').then(({ getBestFormat }) => {
      setBestFormat(getBestFormat());
    });
  }, []);

  // Calculate optimal size if not provided
  const optimalSize = useMemo(() => {
    if (size) return size;
    return getOptimalImageSize(viewportWidth, isGrid, isMobile);
  }, [size, viewportWidth, isGrid, isMobile]);

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

