'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook for prefetching video metadata and full video on hover
 */
export function useVideoPrefetch(
  videoUrl: string | undefined,
  fullVideoUrl: string | undefined,
  isNearViewport: boolean,
  enabled: boolean = true
) {
  const prefetchLinkRef = useRef<HTMLLinkElement | null>(null);
  const metadataPrefetchedRef = useRef(false);
  const fullVideoPrefetchedRef = useRef(false);

  // Prefetch metadata for videos just outside viewport
  useEffect(() => {
    if (!enabled || !videoUrl || !isNearViewport || metadataPrefetchedRef.current) return;

    // Prefetch video metadata using link prefetch
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'video';
    link.href = videoUrl;
    link.type = 'video/mp4';
    document.head.appendChild(link);
    prefetchLinkRef.current = link;
    metadataPrefetchedRef.current = true;

    return () => {
      if (prefetchLinkRef.current && prefetchLinkRef.current.parentNode) {
        prefetchLinkRef.current.parentNode.removeChild(prefetchLinkRef.current);
      }
    };
  }, [videoUrl, isNearViewport, enabled]);

  // Prefetch full video on hover
  const handleMouseEnter = () => {
    if (!enabled || !fullVideoUrl || fullVideoPrefetchedRef.current) return;

    // Prefetch full quality video
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'video';
    link.href = fullVideoUrl;
    link.type = 'video/mp4';
    document.head.appendChild(link);
    fullVideoPrefetchedRef.current = true;
  };

  return { handleMouseEnter };
}
