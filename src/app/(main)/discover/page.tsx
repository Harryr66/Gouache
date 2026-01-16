'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useRef, useDeferredValue, startTransition, useCallback } from 'react';
import { Eye, Filter, Search, X, Palette, Calendar, ShoppingBag, MapPin, ArrowUp, Loader2 } from 'lucide-react';
import { ViewSelector } from '@/components/view-selector';
import { toast } from '@/hooks/use-toast';
import { ArtworkTile } from '@/components/artwork-tile';
import { Artwork, MarketplaceProduct, Event as EventType } from '@/lib/types';
import { db } from '@/lib/firebase';
import { useLikes } from '@/providers/likes-provider';
import { fetchActiveAds, mixAdsIntoContent } from '@/lib/ad-fetcher';
import { AdTile } from '@/components/ad-tile';
import { useAuth } from '@/providers/auth-provider';
import { collection, query, getDocs, orderBy, limit, where, doc, getDoc, startAfter } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { useDiscoverSettings } from '@/providers/discover-settings-provider';
import { ThemeLoading } from '@/components/theme-loading';
import { useTheme } from 'next-themes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { engagementTracker } from '@/lib/engagement-tracker';
import { engagementScorer } from '@/lib/engagement-scorer';
import { useFollow } from '@/providers/follow-provider';
import { useVideoControl } from '@/providers/video-control-provider';
import Hls from 'hls.js';
import { cn } from '@/lib/utils';
import { DiscoverErrorBoundary } from '@/components/discover-error-boundary';

const generatePlaceholderArtworks = (theme: string | undefined, count: number = 12): Artwork[] => {
  // NO EXTERNAL IMAGES - Return empty array
  // This function should NOT be used in production
  if (process.env.NODE_ENV === 'development') {
    console.error('⛔ generatePlaceholderArtworks() should NEVER be called - no external images allowed');
  }
  return [];
};

const generatePlaceholderEvents = (theme: string | undefined, count: number = 12) => {
  const placeholderImage = theme === 'dark' 
    ? '/assets/placeholder-dark.png' 
    : '/assets/placeholder-light.png';
  
  const eventTitles = [
    'Contemporary Art Exhibition', 'Gallery Opening Night', 'Artist Workshop Series',
    'Sculpture Garden Tour', 'Abstract Art Showcase', 'Photography Exhibition',
    'Mixed Media Workshop', 'Art Auction Gala', 'Street Art Festival',
    'Digital Art Symposium', 'Watercolor Masterclass', 'Printmaking Workshop'
  ];
  
  const venues = [
    'Modern Art Gallery', 'Downtown Cultural Center', 'Riverside Gallery',
    'Metropolitan Museum', 'Art District Studio', 'Contemporary Space',
    'Heritage Gallery', 'Creative Hub', 'Urban Art Center',
    'Gallery 302', 'The Loft', 'Artisan Collective'
  ];
  
  const locations = [
    'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'San Francisco, CA',
    'Miami, FL', 'Seattle, WA', 'Boston, MA', 'Portland, OR',
    'Austin, TX', 'Denver, CO', 'Philadelphia, PA', 'Nashville, TN'
  ];
  
  return Array.from({ length: count }, (_, i) => {
    const daysFromNow = i * 7 + Math.floor(Math.random() * 7);
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + daysFromNow);
    const endDate = new Date(eventDate);
    endDate.setDate(endDate.getDate() + (i % 3 === 0 ? 7 : 1));
    
    return {
      id: `placeholder-event-${i + 1}`,
      title: eventTitles[i % eventTitles.length],
      description: 'Join us for an exciting art event featuring contemporary works and engaging discussions.',
      date: eventDate,
      endDate: i % 3 === 0 ? endDate : undefined,
      location: locations[i % locations.length],
      venue: venues[i % venues.length],
      type: ['Exhibition', 'Workshop', 'Gallery Opening', 'Festival'][i % 4],
      imageUrl: placeholderImage,
      price: i % 4 === 0 ? 'Free' : `$${Math.floor(Math.random() * 50) + 10}`,
      capacity: Math.floor(Math.random() * 200) + 50,
    };
  });
};

const generatePlaceholderMarketplaceProducts = (theme: string | undefined, count: number = 20): MarketplaceProduct[] => {
  const placeholderImage = theme === 'dark' 
    ? '/assets/placeholder-dark.png' 
    : '/assets/placeholder-light.png';
  
  const productTitles = [
    'Original Artwork',
    'Print',
    'Limited Edition Print',
    'Book'
  ];
  
  const sellerNames = [
    'Sarah Martinez', 'James Chen', 'Emma Wilson', 'Michael Brown',
    'Sophie Anderson', 'David Lee', 'Olivia Garcia', 'Ryan Taylor',
    'Isabella White', 'Noah Harris', 'Ava Clark', 'Lucas Moore',
    'Mia Johnson', 'Ethan Davis', 'Zoe Martinez', 'Liam Thompson',
    'Chloe Rodriguez', 'Aiden Lewis', 'Lily Walker', 'Jackson Hall'
  ];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `placeholder-market-${i + 1}`,
    title: productTitles[i % productTitles.length],
    description: 'A beautiful piece of art perfect for collectors and art enthusiasts.',
    price: Math.floor(Math.random() * 500) + 50,
    currency: 'USD',
    category: ['Artwork', 'Prints', 'Original', 'Limited Edition'][i % 4],
    subcategory: ['Painting', 'Print', 'Drawing', 'Digital'][i % 4],
    images: [placeholderImage],
    sellerId: `placeholder-seller-${i + 1}`,
    sellerName: sellerNames[i % sellerNames.length],
    isAffiliate: false,
    isActive: true,
    stock: Math.floor(Math.random() * 10) + 1,
    rating: 4 + Math.random(),
    reviewCount: Math.floor(Math.random() * 50) + 5,
    tags: ['art', 'original', 'collectible', 'handmade'],
    createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
    updatedAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
    salesCount: Math.floor(Math.random() * 20),
    isOnSale: i % 5 === 0,
    isApproved: true,
    status: 'approved' as const,
  }));
};

const generatePlaceholderProducts = (theme: string | undefined, count: number = 12): MarketplaceProduct[] => {
  const placeholderImage = theme === 'dark'
    ? '/assets/placeholder-dark.png'
    : '/assets/placeholder-light.png';

  const titles = [
    'Limited Edition Print',
    'Original Canvas Painting',
    'Monotype Series',
    'Charcoal Portrait',
    'Watercolor Landscape',
    'Abstract Study'
  ];

  const sellers = [
    'Studio Rivera',
    'Atelier Laurent',
    'Gallery Chen',
    'Artist Collective',
    'Maison d’Art',
    'Urban Canvas'
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `market-placeholder-${i + 1}`,
    title: titles[i % titles.length],
    description: 'Placeholder product to preview the market layout.',
    price: 120 + i * 5,
    currency: 'USD',
    category: 'Artwork',
    subcategory: 'Prints',
    images: [placeholderImage],
    sellerId: `seller-${i + 1}`,
    sellerName: sellers[i % sellers.length],
    isAffiliate: false,
    isActive: true,
    stock: 1,
    rating: 0,
    reviewCount: 0,
    tags: ['art', 'print', 'placeholder'],
    createdAt: new Date(),
    updatedAt: new Date(),
    salesCount: 0,
    isOnSale: false,
    isApproved: true,
    status: 'approved',
  }));
};

const MEDIUMS = ['All', 'Oil', 'Acrylic', 'Watercolor', 'Charcoal', 'Ink', 'Pencil', 'Pastel', 'Mixed'];
const ARTWORK_TYPES = ['All', 'Original', 'Print'];
const MARKET_CATEGORIES = ['All', 'Original Artworks', 'Limited Edition Prints', 'All Prints', 'Books'];
const EVENT_TYPES = ['All Events', 'Exhibition', 'Gallery', 'Meet and greet', 'Pop up event'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'likes', label: 'Most Liked' },
  { value: 'recent', label: 'Recently Updated' }
];

// Masonry grid component that fills columns sequentially from top to bottom
// INSTAGRAM/PINTEREST-LEVEL: Virtualization - only render visible items + buffer
function MasonryGrid({ items, columnCount, gap, renderItem, loadMoreRef, isLoadingMore }: {
  items: any[];
  columnCount: number;
  gap: number;
  renderItem: (item: any) => React.ReactNode;
  loadMoreRef: React.RefObject<HTMLDivElement>;
  isLoadingMore?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [positions, setPositions] = useState<Array<{ top: number; left: number; width: number }>>([]);
  // PERFORMANCE: Cache item heights to avoid repeated getBoundingClientRect calls
  const itemHeightsRef = useRef<Map<number, number>>(new Map());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  
  // Note: Full virtualization not possible with masonry (need all positions for height calculation)
  // Instead, we render all items but use IntersectionObserver in ArtworkTile to only load visible images

  // Calculate positions for masonry layout - OPTIMIZED with ResizeObserver
  useEffect(() => {
    if (!containerRef.current || columnCount === 0 || items.length === 0) {
      setPositions([]);
      itemHeightsRef.current.clear();
      return;
    }

    const calculatePositions = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      if (!containerWidth || containerWidth <= 0 || !columnCount || columnCount <= 0) {
        return;
      }
      
      const totalGapSpace = gap * (columnCount - 1);
      const itemWidth = (containerWidth - totalGapSpace) / columnCount;
      if (itemWidth <= 0 || !isFinite(itemWidth)) {
        return;
      }
      
      const columnHeights = new Array(columnCount).fill(0);
      const newPositions: Array<{ top: number; left: number; width: number }> = [];

      itemRefs.current.forEach((itemEl, index) => {
        if (!itemEl || index >= items.length) return;

        try {
          // PERFORMANCE: Use cached height if available, otherwise measure once
          let itemHeight = itemHeightsRef.current.get(index);
          if (itemHeight === undefined || itemHeight === 0) {
            // Only measure if not cached - getBoundingClientRect forces layout recalculation
            itemHeight = Math.ceil(itemEl.offsetHeight) || 0;
            if (itemHeight > 0) {
              itemHeightsRef.current.set(index, itemHeight);
            } else {
              return; // Skip items with no height
            }
          }
          
          // Find shortest column
          const shortestColumnIndex = columnHeights.reduce(
            (minIndex, height, colIndex) => 
              height < columnHeights[minIndex] ? colIndex : minIndex,
            0
          );
          
          const left = shortestColumnIndex * (itemWidth + gap);
          const currentColumnHeight = columnHeights[shortestColumnIndex];
          const top = currentColumnHeight === 0 ? 0 : Math.ceil(currentColumnHeight) + gap;
          
          if (!isFinite(top) || !isFinite(left) || !isFinite(itemWidth)) {
            return;
          }

          newPositions.push({ top, left, width: itemWidth });
          columnHeights[shortestColumnIndex] = top + itemHeight;
        } catch (error) {
          if (process.env.NODE_ENV === 'development') console.error('Error calculating masonry position for item', index, error);
        }
      });

      if (newPositions.length > 0) {
        setPositions(newPositions);
      }
    };

    // PERFORMANCE: Debounced calculation with requestAnimationFrame
    let timeout: NodeJS.Timeout;
    let rafId: number | null = null;
    let calculationScheduled = false;
    
    const scheduleCalculation = () => {
      if (calculationScheduled) return;
      calculationScheduled = true;
      
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          calculatePositions();
          calculationScheduled = false;
          rafId = null;
        });
      }, 100); // Reduced from 200ms for faster response
    };
    
    scheduleCalculation();
    
    // PERFORMANCE: Use ResizeObserver instead of individual event listeners
    // This is much more efficient than adding listeners to every image/video
    let handleMediaLoad: ((e: Event) => void) | null = null;
    
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        // Batch height updates
        let heightsChanged = false;
        entries.forEach((entry) => {
          const itemEl = entry.target as HTMLElement;
          const index = itemRefs.current.indexOf(itemEl as any);
          if (index >= 0) {
            const newHeight = Math.ceil(entry.contentRect.height) || 0;
            const oldHeight = itemHeightsRef.current.get(index);
            if (newHeight > 0 && newHeight !== oldHeight) {
              itemHeightsRef.current.set(index, newHeight);
              heightsChanged = true;
            }
          }
        });
        if (heightsChanged) {
          scheduleCalculation();
        }
      });

      // Observe all item elements
      itemRefs.current.forEach((itemEl) => {
        if (itemEl && resizeObserverRef.current) {
          resizeObserverRef.current.observe(itemEl);
        }
      });
    } else {
      // Fallback: Single delegated event listener (much better than individual listeners)
      handleMediaLoad = (e: Event) => {
        const target = e.target as HTMLElement;
        const itemEl = target.closest('[data-artwork-index]') as HTMLElement | null;
        if (itemEl) {
          const index = parseInt(itemEl.getAttribute('data-artwork-index') || '-1');
          if (index >= 0) {
            // Update cached height
            const newHeight = Math.ceil(itemEl.offsetHeight) || 0;
            if (newHeight > 0) {
              itemHeightsRef.current.set(index, newHeight);
              scheduleCalculation();
            }
          }
        }
      };

      // Use event delegation on container instead of individual listeners
      const container = containerRef.current;
      if (container && handleMediaLoad) {
        container.addEventListener('load', handleMediaLoad, true);
        container.addEventListener('loadeddata', handleMediaLoad, true);
      }
    }

    return () => {
      clearTimeout(timeout);
      if (rafId !== null) cancelAnimationFrame(rafId);
      
      // Cleanup ResizeObserver
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      
      // Cleanup delegated event listeners
      const container = containerRef.current;
      if (container && handleMediaLoad) {
        container.removeEventListener('load', handleMediaLoad, true);
        container.removeEventListener('loadeddata', handleMediaLoad, true);
      }
    };
  }, [items.length, columnCount, gap, items]);

  // PERFORMANCE: Memoize container height calculation to avoid recalculating on every render
  const containerHeight = useMemo(() => {
    if (positions.length === 0 || itemRefs.current.length === 0) return 0;
    
    // Use cached heights from itemHeightsRef when available
    const heights = positions.map((pos, index) => {
      const cachedHeight = itemHeightsRef.current.get(index);
      const itemHeight = cachedHeight || itemRefs.current[index]?.offsetHeight || 0;
      const height = pos.top + itemHeight;
      return isFinite(height) && height > 0 ? height : 0;
    }).filter(h => h > 0);
    
    return heights.length > 0 ? Math.max(...heights) : 0;
  }, [positions]);

  return (
    <div ref={containerRef} className="relative w-full" style={{ minHeight: containerHeight || 'auto' }}>
      {/* INSTAGRAM/PINTEREST-LEVEL: Render all items (needed for masonry height calculation)
          But ArtworkTile uses IntersectionObserver to only load visible images */}
      {items.map((item, index) => {
        const itemKey = 'id' in item ? item.id : ('campaign' in item ? item.campaign?.id : index);
        return (
          <div
            key={itemKey}
            data-artwork-index={index}
            ref={(el) => { itemRefs.current[index] = el; }}
            style={{
              position: 'absolute',
              top: positions[index]?.top ?? 0,
              left: positions[index]?.left ?? 0,
              width: positions[index]?.width || `${100 / columnCount}%`,
              opacity: 1,
              margin: 0,
              padding: 0,
              transition: 'none',
            }}
          >
            {renderItem(item)}
          </div>
        );
      })}
      {/* Sentinel element for infinite scroll - must be positioned after all items */}
      <div 
        ref={loadMoreRef} 
        data-load-more-sentinel="true"
        className="h-20 w-full flex items-center justify-center" 
        style={{ 
          position: 'absolute', 
          top: containerHeight > 0 ? containerHeight : '100%', 
          left: 0, 
          right: 0,
          zIndex: 1
        }} 
      >
        {isLoadingMore && (
          <div className="flex flex-col items-center gap-2 py-4">
            {/* THEME-MATCHED: Colored loading animation matching ThemeLoading component */}
            <ThemeLoadingAnimation />
          </div>
        )}
      </div>
    </div>
  );
}

// Video Player Component with HLS support
const VideoPlayer = ({ 
  videoUrl, 
  artwork, 
  avatarPlaceholder, 
  liked, 
  toggleLike 
}: { 
  videoUrl: string; 
  artwork: Artwork; 
  avatarPlaceholder: string; 
  liked: boolean; 
  toggleLike: (id: string) => Promise<void>;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const retryCountRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    
    // Reset error state when video URL changes
    setHasError(false);
    retryCountRef.current = 0;

    // CRITICAL: Convert Cloudflare Stream URLs to HLS manifest format
    let manifestUrl = videoUrl;
    if (!videoUrl.includes('.m3u8')) {
      const videoIdMatch = videoUrl.match(/([a-f0-9]{32})/);
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        manifestUrl = `https://videodelivery.net/${videoId}/manifest/video.m3u8`;
        if (process.env.NODE_ENV === 'development') console.log('🔄 Converted to HLS manifest:', manifestUrl);
      }
    }

    const isHLS = manifestUrl.includes('.m3u8');
    const isCloudflareStream = manifestUrl.includes('cloudflarestream.com') || manifestUrl.includes('videodelivery.net');

    // Check if browser natively supports HLS (Safari on iOS/macOS)
    const canPlayHLS = video.canPlayType('application/vnd.apple.mpegurl') !== '';

    if (isHLS || isCloudflareStream) {
      if (canPlayHLS) {
        // Native HLS support (Safari)
        video.src = manifestUrl;
        if (process.env.NODE_ENV === 'development') console.log('✅ Using native HLS support for:', manifestUrl);
        
        // For Safari, wait for loadedmetadata then play
        video.addEventListener('loadedmetadata', () => {
          if (process.env.NODE_ENV === 'development') console.log('✅ Video metadata loaded');
          video.muted = true;
          setIsVideoReady(true);
          video.play()
            .then(() => { if (process.env.NODE_ENV === 'development') console.log('✅ Video playing'); })
            .catch(err => { if (process.env.NODE_ENV === 'development') console.log('⚠️ Autoplay prevented:', err); });
        }, { once: true });
        
        video.load();
      } else if (Hls.isSupported()) {
        // Use hls.js for browsers that don't support HLS natively
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
        });
        
        hls.loadSource(manifestUrl);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (process.env.NODE_ENV === 'development') console.log('✅ HLS manifest parsed, video ready:', manifestUrl);
          setIsVideoReady(true);
          video.play().catch((error) => {
            if (process.env.NODE_ENV === 'development') console.log('Autoplay prevented:', error);
          });
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (process.env.NODE_ENV === 'development') console.error('❌ HLS error:', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                if (process.env.NODE_ENV === 'development') console.error('Fatal network error, trying to recover...');
                // Try to recover from network errors
                if (retryCountRef.current < 3) {
                  retryCountRef.current++;
                  setTimeout(() => {
                    hls.startLoad();
                  }, 1000 * retryCountRef.current);
                } else {
                  if (process.env.NODE_ENV === 'development') console.error('Max HLS network retries reached');
                  setHasError(true);
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                if (process.env.NODE_ENV === 'development') console.error('Fatal media error, trying to recover...');
                // Try to recover from media errors
                if (retryCountRef.current < 3) {
                  retryCountRef.current++;
                  setTimeout(() => {
                    hls.recoverMediaError();
                  }, 1000 * retryCountRef.current);
                } else {
                  if (process.env.NODE_ENV === 'development') console.error('Max HLS media retries reached');
                  setHasError(true);
                }
                break;
              default:
                if (process.env.NODE_ENV === 'development') console.error('Fatal error, destroying HLS instance');
                // Only show error after retries
                if (retryCountRef.current < 3) {
                  retryCountRef.current++;
                  setTimeout(() => {
                    hls.destroy();
                    // Recreate HLS instance
                    const newHls = new Hls({
                      enableWorker: true,
                      lowLatencyMode: false,
                      backBufferLength: 90,
                    });
                    newHls.loadSource(manifestUrl);
                    newHls.attachMedia(video);
                    hlsRef.current = newHls;
                  }, 1000 * retryCountRef.current);
                } else {
                  hls.destroy();
                  setHasError(true);
                }
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else {
        // Fallback: try direct URL (might work for some formats)
        if (process.env.NODE_ENV === 'development') console.warn('⚠️ HLS not supported, trying direct URL:', manifestUrl);
        video.src = manifestUrl;
      }
    } else {
      // Not HLS, use direct URL
      video.src = manifestUrl;
    }

    video.addEventListener('canplay', () => {
      if (process.env.NODE_ENV === 'development') console.log('✅ Video can play:', manifestUrl);
      setIsVideoReady(true);
    });

    video.addEventListener('loadedmetadata', () => {
      if (process.env.NODE_ENV === 'development') console.log('✅ Video metadata loaded:', manifestUrl);
      setIsVideoReady(true);
    });

    video.addEventListener('error', (e) => {
      const error = video.error;
      // Detect 404 errors (networkState 3 = NETWORK_NO_SOURCE, code 4 = MEDIA_ERR_SRC_NOT_SUPPORTED)
      const is404 = video.networkState === 3 || error?.code === 4;
      
      // For 404 errors, try videodelivery.net fallback if using customer subdomain
      if (is404 && manifestUrl.includes('customer-') && manifestUrl.includes('.cloudflarestream.com')) {
        // Extract video ID and try videodelivery.net format
        const videoIdMatch = manifestUrl.match(/\/([^/]+)\/manifest\/video\.m3u8/);
        if (videoIdMatch && videoIdMatch[1] && retryCountRef.current === 0) {
          const videoId = videoIdMatch[1];
          const fallbackUrl = `https://videodelivery.net/${videoId}/manifest/video.m3u8`;
          if (process.env.NODE_ENV === 'development') console.log('🔄 404 on customer subdomain, trying videodelivery.net fallback:', fallbackUrl);
          
          // Try fallback URL
          if (hlsRef.current) {
            hlsRef.current.destroy();
          }
          
          // Reset error state and try fallback
          setHasError(false);
          retryCountRef.current = 1; // Mark that we've tried fallback
          
          // Use native HLS if supported, otherwise hls.js
          if (canPlayHLS) {
            video.src = fallbackUrl;
          } else if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: false,
              backBufferLength: 90,
            });
            hls.loadSource(fallbackUrl);
            hls.attachMedia(video);
            hlsRef.current = hls;
          }
          return;
        }
      }
      
      // If 404 and no fallback available, or fallback also failed, hide the video
      if (is404) {
        console.debug('❌ Video not found (404), hiding:', manifestUrl);
        setHasError(true);
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
        return;
      }
      
      // For non-404 errors, retry a few times
      if (retryCountRef.current < 3) {
        retryCountRef.current++;
        const retryDelay = Math.min(1000 * retryCountRef.current, 3000);
        console.debug(`⚠️ Video error (non-404), retrying (${retryCountRef.current}/3) in ${retryDelay}ms...`);
        
        setTimeout(() => {
          if (video && manifestUrl && !hasError) {
            video.load();
          }
        }, retryDelay);
        return;
      }
      
      // Max retries reached for non-404 errors
      console.debug('❌ Max retries reached for video error');
      setHasError(true);
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    });

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [videoUrl]);

  // Don't render at all if video failed
  if (hasError) {
    return null;
  }

  return (
    <div className="relative group w-full max-w-md mx-auto">
      <Link href={`/artwork/${artwork.id}`}>
        <Card className="relative w-full overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer">
          {/* Video container with 9:16 portrait aspect ratio */}
          <div className="relative w-full" style={{ aspectRatio: '9/16' }}>
            <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                loop
                controls={false}
                style={{ opacity: isVideoReady ? 1 : 0 }}
              />
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-background/80 backdrop-blur-sm p-3 flex items-center gap-2">
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarImage src={artwork.artist.avatarUrl || avatarPlaceholder} />
              <AvatarFallback>{artwork.artist.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">by {artwork.artist.name}</p>
              {artwork.artist.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3" />
                  {artwork.artist.location}
                </p>
              )}
            </div>
            {artwork.sold ? (
              <Badge variant="destructive" className="text-xs px-2 py-1 flex-shrink-0">
                Sold
              </Badge>
            ) : artwork.isForSale ? (
              <Badge className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1 flex-shrink-0">
                {artwork.priceType === 'contact' || artwork.contactForPrice ? 'For Sale' : artwork.price ? `$${artwork.price.toLocaleString()}` : 'For Sale'}
              </Badge>
            ) : null}
          </div>
        </Card>
      </Link>
      {/* Upvote Button - positioned on the tile */}
      <Button
        variant="ghost"
        size="icon"
        className={`absolute top-3 right-3 h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm border-2 transition-all z-10 ${
          liked 
            ? 'border-primary text-primary bg-primary/10' 
            : 'border-border hover:border-primary/50 hover:text-primary'
        }`}
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await toggleLike(artwork.id);
        }}
        aria-label={liked ? 'Remove upvote' : 'Upvote artwork'}
      >
        <ArrowUp className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
      </Button>
    </div>
  );
};

// Theme-matched loading animation component (reusable for both video and continuous loading)
const ThemeLoadingAnimation = () => {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Get theme-appropriate colors (same as ThemeLoading component)
  const getDotColors = (isDark: boolean) => {
    if (isDark) {
      return ['#51C4D3', '#77ACF1', '#EF88AD'];
    } else {
      return ['#1e3a8a', '#3b82f6', '#60a5fa'];
    }
  };
  
  const currentTheme = resolvedTheme || theme || 'dark';
  const isDark = currentTheme === 'dark';
  const dotColors = getDotColors(isDark);
  
  return (
    <div className="flex items-center gap-2">
      <div 
        className="w-3 h-3 rounded-full animate-pulse" 
        style={{ backgroundColor: dotColors[0], animationDelay: '0ms' }}
      ></div>
      <div 
        className="w-3 h-3 rounded-full animate-pulse" 
        style={{ backgroundColor: dotColors[1], animationDelay: '150ms' }}
      ></div>
      <div 
        className="w-3 h-3 rounded-full animate-pulse" 
        style={{ backgroundColor: dotColors[2], animationDelay: '300ms' }}
      ></div>
    </div>
  );
};

// Video Loading Animation Component with theme-appropriate colors
const VideoLoadingAnimation = () => {
  return (
    <div className="w-full py-12 flex flex-col items-center justify-center gap-3">
      <ThemeLoadingAnimation />
      <p className="text-sm text-muted-foreground">Loading videos...</p>
    </div>
  );
};

function DiscoverPageContent() {
  const isDev = process.env.NODE_ENV === 'development';
  // Performance: Only log in development to avoid blocking main thread in production
  const log = (...args: any[]) => { if (isDev) console.log(...args); };
  const warn = (...args: any[]) => { if (isDev) console.warn(...args); };
  const error = (...args: any[]) => { if (isDev) console.error(...args); };
  
  // Helper: Check if image URL is from Cloudflare (all active artists should use Cloudflare)
  const isCloudflareImage = (url: string | null | undefined): boolean => {
    if (!url || typeof url !== 'string') return false;
    return url.includes('imagedelivery.net') || url.includes('cloudflare.com');
  };
  
  // Helper: Validate Cloudflare Images URL format to prevent 404s
  // Valid format: https://imagedelivery.net/{accountHash}/{imageId}/{variant}
  const isValidCloudflareImageUrl = (url: string | null | undefined): boolean => {
    if (!url || typeof url !== 'string') return false;
    if (!isCloudflareImage(url)) return false;
    
    // Must be imagedelivery.net format
    if (!url.includes('imagedelivery.net')) return false;
    
    // Extract components
    const match = url.match(/imagedelivery\.net\/([^/]+)\/([^/]+)(?:\/([^/]+))?/);
    if (!match) return false;
    
    const [, accountHash, imageId] = match;
    
    // Validate components exist and are not empty
    if (!accountHash || !imageId || accountHash.length === 0 || imageId.length === 0) {
      return false;
    }
    
    // Account hash should be alphanumeric (Cloudflare format)
    if (!/^[a-zA-Z0-9_-]+$/.test(accountHash)) return false;
    
    // Image ID should be alphanumeric or UUID format
    if (!/^[a-zA-Z0-9_-]+$/.test(imageId)) return false;
    
    return true;
  };
  
  // Helper: Check if video URL is from Cloudflare Stream (ONLY Cloudflare videos allowed)
  const isCloudflareVideo = (videoUrl: string | null | undefined): boolean => {
    if (!videoUrl || typeof videoUrl !== 'string') return false;
    
    // Cloudflare Stream URL patterns:
    // - cloudflarestream.com (any subdomain)
    // - videodelivery.net
    // - Contains .m3u8 (HLS manifest)
    const isCloudflare = 
      videoUrl.includes('cloudflarestream.com') ||
      videoUrl.includes('videodelivery.net') ||
      videoUrl.includes('.m3u8');
    
    // Explicitly exclude Firebase Storage and other sources
    const isFirebaseStorage = videoUrl.includes('firebasestorage.googleapis.com');
    
    return isCloudflare && !isFirebaseStorage;
  };
  
  const { toggleLike, isLiked } = useLikes();
  const { user } = useAuth();
  const { getFollowedArtists, isFollowing } = useFollow();
  const { getConnectionSpeed } = useVideoControl();
  const { settings: discoverSettings } = useDiscoverSettings();
  const { theme } = useTheme();
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams?.get?.('tab');
  const initialTab: 'artwork' | 'events' = (tabParam === 'artwork' || tabParam === 'events') ? tabParam : 'artwork';
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [marketplaceProducts, setMarketplaceProducts] = useState<MarketplaceProduct[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  // Pagination state
  const [hasMore, setHasMore] = useState(true); // Enable pagination - load more content as user scrolls
  const [lastDocument, setLastDocument] = useState<any>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Comprehensive logging for state changes (dev only)
  useEffect(() => {
    if (isDev) {
      console.log('🔄 SCROLL LOAD: 📊 STATE UPDATE - hasMore:', hasMore, 'lastDocument:', !!lastDocument, 'isLoadingMore:', isLoadingMore);
    }
  }, [hasMore, lastDocument, isLoadingMore, isDev]);
  const [artworkEngagements, setArtworkEngagements] = useState<Map<string, any>>(new Map());
  const [initialVideosReady, setInitialVideosReady] = useState(0);
  const [initialVideosTotal, setInitialVideosTotal] = useState(0);
  const [initialImagesReady, setInitialImagesReady] = useState(0);
  const [initialImagesTotal, setInitialImagesTotal] = useState(0);
  const [initialVideoPostersReady, setInitialVideoPostersReady] = useState(0);
  const [initialVideoPostersTotal, setInitialVideoPostersTotal] = useState(0);
  const initialVideoReadyRef = useRef<Set<string>>(new Set());
  const initialImageReadyRef = useRef<Set<string>>(new Set());
  const initialVideoPosterRef = useRef<Set<string>>(new Set());
  
  // OPTIONAL LOADING SCREEN - Only show if there's actually a delay (500ms+)
  // This prevents showing loading screen for fast loads (like Instagram/Pinterest)
  const [showLoadingScreen, setShowLoadingScreen] = useState(false); // Start hidden
  const [artworksLoaded, setArtworksLoaded] = useState(false);
  const loadingStartTimeRef = useRef<number>(Date.now());
  const loadingScreenDismissedTimeRef = useRef<number | null>(null);
  const dismissalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingScreenTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const PROGRESSIVE_LOADING_DELAY = 2000; // 2 seconds delay before progressive loading starts
  const LOADING_SCREEN_DELAY = 500; // Only show loading screen if load takes 500ms+
  
  // Track items per row with state to handle window resize (needed for itemsToWaitFor calculation)
  const [itemsPerRow, setItemsPerRow] = useState(6);
  // Track column count for masonry layout (CSS columns) - needed for itemsToWaitFor calculation
  const [columnCount, setColumnCount] = useState(5);
  
  // Calculate how many items are in viewport + buffer (for faster loading)
  // This is what we'll wait for before dismissing the loading screen
  // USER REQUEST: 9 rows initially (as requested 5 times)
  const itemsToWaitFor = useMemo(() => {
    // Desktop: 5 cols × 9 rows = 45 items
    // Mobile: 2 cols × 9 rows = 18 items
    // Use columnCount to estimate: if 2-3 cols assume mobile, else desktop
    const rowsToLoad = 9; // USER REQUEST: 9 rows (not 12 or 20)
    return columnCount * rowsToLoad;
  }, [columnCount]);
  
  // Track when initial videos are ready
  const handleVideoReady = useCallback((artworkId: string) => {
    if (!initialVideoReadyRef.current.has(artworkId)) {
      initialVideoReadyRef.current.add(artworkId);
      setInitialVideosReady(prev => prev + 1);
    }
  }, []);
  
  // Track when initial images are ready (including video posters)
  const handleImageReady = useCallback((artworkId: string, isVideoPoster: boolean = false) => {
    if (!initialImageReadyRef.current.has(artworkId)) {
      initialImageReadyRef.current.add(artworkId);
      setInitialImagesReady(prev => prev + 1);
    }
    
    // Also track video posters separately to ensure all 3 load
    if (isVideoPoster && !initialVideoPosterRef.current.has(artworkId)) {
      initialVideoPosterRef.current.add(artworkId);
      setInitialVideoPostersReady(prev => prev + 1);
    }
  }, []);
  
  // Joke handler removed - jokes list preserved in typewriter-joke.tsx for future use
  
  // OPTIONAL LOADING SCREEN LOGIC - Only show if there's actually a delay
  // Show loading screen only if artworks haven't loaded after 500ms (fast loads skip it)
  useEffect(() => {
    // If artworks are already loaded, don't show loading screen
    if (artworksLoaded && artworks.length > 0) {
      if (showLoadingScreen) {
        setShowLoadingScreen(false);
      }
      return;
    }

    // Only show loading screen if there's a delay (500ms+)
    if (!showLoadingScreen && !artworksLoaded) {
      loadingScreenTimeoutRef.current = setTimeout(() => {
        // Only show if still loading after delay
        if (!artworksLoaded && artworks.length === 0) {
          setShowLoadingScreen(true);
        }
      }, LOADING_SCREEN_DELAY);
    }

    // Cleanup timeout if artworks load before delay
    if (artworksLoaded && loadingScreenTimeoutRef.current) {
      clearTimeout(loadingScreenTimeoutRef.current);
      loadingScreenTimeoutRef.current = null;
      if (showLoadingScreen) {
        setShowLoadingScreen(false);
      }
    }

    return () => {
      if (loadingScreenTimeoutRef.current) {
        clearTimeout(loadingScreenTimeoutRef.current);
        loadingScreenTimeoutRef.current = null;
      }
    };
  }, [artworksLoaded, artworks.length, showLoadingScreen]);

  // LOADING SCREEN DISMISSAL LOGIC - Dismiss when media is ready
  useEffect(() => {
    // Don't check if loading screen is not shown or already dismissed
    if (!showLoadingScreen) {
      return;
    }
    
    // Get isMobile from state (declared earlier)
    const currentIsMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    
    // Check if we have enough artworks to start checking media (viewport + 1 row)
    // Don't wait for ALL artworks - just enough to fill the viewport
    const hasEnoughArtworks = artworks.length >= itemsToWaitFor || artworksLoaded;
    
    // If we don't have enough artworks yet, wait a bit and check again
    if (!hasEnoughArtworks && artworks.length === 0) {
      return; // No artworks at all yet, wait
    }
    
    // Define checkIfReadyToDismiss function BEFORE using it
    function checkIfReadyToDismiss() {
      // Get itemsToWaitFor from the memoized value
      const itemsToWaitForValue = itemsToWaitFor;
      
      // CRITICAL: If initialImagesTotal is 0 but we have artworks, calculate it now from artworks
      // This allows media tracking to start immediately
      let effectiveImagesTotal = initialImagesTotal;
      let effectiveVideoPostersTotal = initialVideoPostersTotal;
      
      if (effectiveImagesTotal === 0 && artworks.length > 0) {
        // Calculate media counts from available artworks immediately
        const availableArtworks = artworks.slice(0, itemsToWaitForValue);
        let videoPosterCount = 0;
        let regularImageCount = 0;
        
        for (const artwork of availableArtworks) {
          const hasVideo = (artwork as any).videoUrl || (artwork as any).mediaType === 'video';
          if (hasVideo && artwork.imageUrl) {
            videoPosterCount++;
          } else if (!hasVideo && artwork.imageUrl) {
            regularImageCount++;
          }
        }
        
        effectiveVideoPostersTotal = videoPosterCount;
        effectiveImagesTotal = videoPosterCount + regularImageCount;
        
        // Set the totals so tracking can work immediately
        if (effectiveImagesTotal > 0) {
          setInitialVideoPostersTotal(effectiveVideoPostersTotal);
          setInitialImagesTotal(effectiveImagesTotal);
        }
      }
      
      // Joke animation removed - no longer waiting for joke completion
      // Dismiss immediately when media is ready
      const jokeTimeMet = true; // Always true since we're not waiting for joke
      
      
      // CRITICAL FIX: Wait for minimum number of images to load before dismissing
      // USER REQUEST: 9 rows initially
      // Ensure at least 18-45 images are loaded (not just a percentage)
      // This prevents dismissing with only 3 images visible
      // Use currentIsMobile (detected from window width)
      const MIN_IMAGES_TO_LOAD = currentIsMobile ? 18 : 45; // Match 9 rows: mobile 18, desktop 45
      const imagesReady = effectiveImagesTotal > 0
        ? initialImagesReady >= Math.max(
            Math.ceil(effectiveImagesTotal * 0.9), // 90% of available
            MIN_IMAGES_TO_LOAD // OR minimum count, whichever is higher
          )
        : true; // If no images, consider ready
      const videoPostersReady = effectiveVideoPostersTotal > 0
        ? initialVideoPostersReady >= Math.ceil(effectiveVideoPostersTotal * 0.9)
        : true; // If no posters, consider ready
      const allMediaReady = imagesReady && videoPostersReady;

      // PRIORITY 1: Ideal case - Have minimum artworks AND media ready
      // USER REQUEST: 9 rows (18 mobile, 45 desktop)
      const minArtworksRequired = currentIsMobile ? 18 : 45;
      const hasMinimumArtworks = artworks.length >= minArtworksRequired;
      
      // BEST CASE: Have minimum artworks AND all media ready
      if (artworksLoaded && hasMinimumArtworks && allMediaReady) {
        if (dismissalTimeoutRef.current) return;
        dismissalTimeoutRef.current = setTimeout(() => {
          if (isDev) console.log(`✅ DISMISSING (IDEAL): ${artworks.length} artworks (min ${minArtworksRequired}), all media ready`);
          setShowLoadingScreen(false);
          loadingScreenDismissedTimeRef.current = Date.now();
          dismissalTimeoutRef.current = null;
        }, 200);
        return;
      }
      
      // PRIORITY 2: Timeout fallback - After 15 seconds, show whatever we have
      // This prevents infinite loading if processing is stuck
      const timeSinceStart = Date.now() - loadingStartTimeRef.current;
      const TIMEOUT = 15000; // 15 seconds max wait (processing can take 5-10s)
      
      if (timeSinceStart > TIMEOUT && artworksLoaded && artworks.length > 0) {
        if (dismissalTimeoutRef.current) return;
        dismissalTimeoutRef.current = setTimeout(() => {
          if (isDev) console.log(`✅ DISMISSING (TIMEOUT): ${artworks.length} artworks after ${timeSinceStart}ms (showing whatever loaded)`);
          setShowLoadingScreen(false);
          loadingScreenDismissedTimeRef.current = Date.now();
          dismissalTimeoutRef.current = null;
        }, 200);
        return;
      }
      
      // Log progress for debugging
      if (isDev && artworksLoaded) {
        if (!hasMinimumArtworks) {
          console.log(`⏳ Waiting: ${artworks.length}/${minArtworksRequired} artworks, ${Math.round((TIMEOUT - timeSinceStart) / 1000)}s until timeout`);
        }
        if (!allMediaReady) {
          console.log(`⏳ Waiting: Media loading ${initialImagesReady}/${effectiveImagesTotal} images`);
        }
      }
    }
    
    // Check media readiness continuously
    // Media can start loading immediately
    checkIfReadyToDismiss();
    
    // Re-check every 500ms to catch when conditions are met
    const interval = setInterval(() => {
      if (showLoadingScreen) {
        checkIfReadyToDismiss();
      } else {
        clearInterval(interval);
      }
    }, 500);
    
    return () => {
      clearInterval(interval);
      if (dismissalTimeoutRef.current) {
        clearTimeout(dismissalTimeoutRef.current);
        dismissalTimeoutRef.current = null;
      }
    };
  }, [showLoadingScreen, artworks.length, artworksLoaded, initialImagesReady, initialImagesTotal, initialVideoPostersReady, initialVideoPostersTotal, getConnectionSpeed, itemsToWaitFor, LOADING_SCREEN_DELAY]);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  const [activeTab, setActiveTab] = useState<'artwork' | 'events'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedium, setSelectedMedium] = useState('All');
  const [selectedArtworkType, setSelectedArtworkType] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEventLocation, setSelectedEventLocation] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('All Events');
  const [showEventFilters, setShowEventFilters] = useState(false);
  // CRITICAL: Initialize isMobile early so it can be used in useEffect dependencies
  const [isMobile, setIsMobile] = useState(false);
  // CRITICAL: Initialize based on device to prevent mobile crashes
  // USER REQUEST: 9 rows initially - ABSOLUTE REQUIREMENT
  // Mobile (2 cols): 9 rows = 18 items
  // Desktop (5 cols): 9 rows = 45 items
  // Start with desktop default to ensure we show enough
  const [visibleCount, setVisibleCount] = useState(45); // Desktop: 45 items (5 cols × 9 rows) - start high
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  // CRITICAL: Track displayed item IDs to preserve their order when new items are added
  const displayedItemIdsRef = useRef<Set<string>>(new Set());
  const deferredSearchQuery = useDeferredValue(searchQuery);
  // Default views: Artwork grid, Market list, Events grid on mobile
  const [artworkView, setArtworkView] = useState<'grid' | 'list'>('grid');
  const [marketView, setMarketView] = useState<'grid' | 'list'>('list');
  const [eventsView, setEventsView] = useState<'grid' | 'list'>('grid');
  const [marketSearchQuery, setMarketSearchQuery] = useState('');
  const [selectedMarketCategory, setSelectedMarketCategory] = useState('All');
  const [marketSortBy, setMarketSortBy] = useState('newest');
  const [showMarketFilters, setShowMarketFilters] = useState(false);

  // PERFORMANCE: Consolidated resize handler - single listener for all resize operations
  // Note: getItemsPerRow is defined later, so we inline the logic here
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      try {
        const width = window.innerWidth;
        
        // Update mobile detection
        setIsMobile(width < 768);
        
        // Update items per row (inline logic to avoid dependency on getItemsPerRow)
        let newItemsPerRow = 6; // default
        if (width >= 1280) newItemsPerRow = 6;
        else if (width >= 1024) newItemsPerRow = 5;
        else if (width >= 768) newItemsPerRow = 4;
        else newItemsPerRow = 3;
        setItemsPerRow(newItemsPerRow);
        
        // Update column count for masonry
        let newColumnCount = 2; // mobile default
        if (width >= 1536) newColumnCount = 6;
        else if (width >= 1280) newColumnCount = 5;
        else if (width >= 1024) newColumnCount = 4;
        else if (width >= 768) newColumnCount = 3;
        setColumnCount(newColumnCount);
        
        // Update visibleCount - NO LIMITS, just calculate based on rows
        // CRITICAL: visibleCount is only for initial load, not for limiting displayed content
        setVisibleCount((prev) => {
          const completeRows = Math.floor(prev / newItemsPerRow);
          const calculated = Math.max(newItemsPerRow, completeRows * newItemsPerRow);
          // NO CAPPING - just calculate based on layout
          return calculated;
        });
      } catch (error) {
        if (isDev) console.error('Error in resize handler:', error);
      }
    };
    
    // Throttle resize events to prevent excessive calls
    let resizeTimeout: NodeJS.Timeout;
    const throttledResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 150);
    };
    
    handleResize(); // Initial call
    window.addEventListener('resize', throttledResize, { passive: true });
    
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', throttledResize);
    };
  }, [isDev]);

  // Set default views and visibleCount based on device
  useEffect(() => {
    if (!isMobile) {
      // Desktop: default to grid view, but allow user to switch
      // Don't force it - let user's choice persist
      // USER REQUEST: Desktop: 5 cols × 9 rows = 45 items (9 rows as requested 5 times)
      setVisibleCount(45); // 9 rows × 5 cols = 45 items
    } else {
      // On mobile, ensure correct defaults
      setArtworkView('grid');
      setMarketView('list');
      setEventsView('grid'); // Events use grid view on mobile
      // USER REQUEST: Mobile: 2 cols × 9 rows = 18 items (9 rows as requested 5 times)
      setVisibleCount(18); // 9 rows × 2 cols = 18 items
    }
  }, [isMobile]);

  // Track if fetch is in progress to prevent multiple simultaneous calls
  const fetchingRef = useRef(false);
  
  useEffect(() => {
    // Prevent multiple simultaneous fetches
    if (fetchingRef.current) {
      log('⚠️ Discover: Fetch already in progress, skipping duplicate call');
      return;
    }
    
    const fetchArtworks = async () => {
      fetchingRef.current = true;
      const fetchStartTime = Date.now();
      try {
        // DO NOT set loading to true here - loading is already managed by joke completion logic
        // Setting it to true here would reset the loading screen after joke completes
        log('🔍 Discover: Starting to fetch artworks from cached API...');
        
        // OPTIMIZED: Use cached API route for instant response (5-10s → <100ms)
        // Falls back to direct Firestore if API fails
        let portfolioItems: any[] = [];
        let useFallback = false;
        
        // Fetch enough items to fill viewport - loading screen provides time for larger initial load
        // Load significantly more to account for filtering (non-Cloudflare images, etc.)
        // USER REQUEST: 9 rows initially
        // MOBILE: Load enough to show 18 items (2 cols × 9 rows) after filtering
        // Desktop: Load enough to show 45 items (5 cols × 9 rows) after filtering
        // Load 2x the target to account for filtering losses
        const INITIAL_FETCH_LIMIT = isMobile ? 36 : 90; // Mobile: 36 items (2x 18), Desktop: 90 items (2x 45)
        
        try {
          // Try cached API first (ISR with 5min revalidation)
          const apiUrl = `/api/discover/feed?hideAI=${discoverSettings.hideAiAssistedArt}&limit=${INITIAL_FETCH_LIMIT}`;
          log(`📡 Discover: Fetching from cached API: ${apiUrl}`);
          
          // Add timeout to prevent hanging (15 seconds max)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          
          const apiResponse = await fetch(apiUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (apiResponse.ok) {
            const apiData = await apiResponse.json();
            if (apiData.success && apiData.items) {
              portfolioItems = apiData.items;
              console.log(`🔥 DISCOVER DEBUG: API returned ${portfolioItems.length} items (requested: ${INITIAL_FETCH_LIMIT})`);
              if (apiData.debug) {
                console.log(`🔥 DISCOVER DEBUG: API BREAKDOWN:`, {
                  portfolioItems: apiData.debug.portfolioItemsCount,
                  discoverItems: apiData.debug.discoverItemsCount,
                  combined: apiData.debug.combinedTotal,
                  final: apiData.debug.finalCount,
                  requested: apiData.debug.requested
                });
              }
              console.log(`🔥 DISCOVER DEBUG: Sample items:`, portfolioItems.slice(0, 5).map((i: any) => ({
                id: i.id,
                title: i.title,
                type: i.type,
                eventType: i.eventType,
                hasImage: !!i.imageUrl,
                hasVideo: !!i.videoUrl,
                showInPortfolio: i.showInPortfolio
              })));
              
              // Store last document for pagination - need to fetch actual DocumentSnapshot
              // because API returns plain object but Firestore startAfter needs DocumentSnapshot
              if (portfolioItems.length > 0) {
                const lastItem = portfolioItems[portfolioItems.length - 1];
                if (isDev) console.log('🔄 SCROLL LOAD: 📝 INITIAL LOAD (API) - Fetching lastDocument snapshot for pagination:', { 
                  portfolioItemsCount: portfolioItems.length, 
                  INITIAL_FETCH_LIMIT, 
                  lastItemId: lastItem.id
                });
                
                // Fetch the actual document snapshot for proper pagination (non-blocking)
                // Use a timeout to prevent blocking on slow connections (mobile)
                Promise.race([
                  getDoc(doc(db, 'portfolioItems', lastItem.id)),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('getDoc timeout')), 5000))
                ])
                  .then((lastDocSnap: any) => {
                    if (lastDocSnap?.exists()) {
                      setLastDocument(lastDocSnap);
                      if (isDev) console.log('🔄 SCROLL LOAD: ✅ INITIAL LOAD (API) - Set lastDocument snapshot successfully');
                    } else {
                      if (isDev) console.warn('🔄 SCROLL LOAD: ⚠️ INITIAL LOAD (API) - Last document does not exist, using plain object fallback');
                      setLastDocument(lastItem);
                    }
                  })
                  .catch((docError) => {
                    if (isDev) console.error('🔄 SCROLL LOAD: ⚠️ INITIAL LOAD (API) - Failed to fetch lastDocument snapshot, using plain object fallback:', docError);
                    setLastDocument(lastItem); // Fallback to plain object
                  });
                
                // ALWAYS set hasMore to true if we got items - let pagination logic determine if there's more
                // Don't compare to INITIAL_FETCH_LIMIT because filtering may reduce count, but more content exists
                setHasMore(true);
                if (isDev) console.log('🔄 SCROLL LOAD: 📝 INITIAL LOAD (API) - Set hasMore: true (will be corrected by pagination logic)');
              } else {
                if (isDev) console.log('🔄 SCROLL LOAD: ⚠️ INITIAL LOAD (API) - No items, setting hasMore to false');
                setHasMore(false);
              }
            } else {
              throw new Error('API returned invalid data');
            }
          } else {
            throw new Error(`API returned ${apiResponse.status}`);
          }
        } catch (apiError: any) {
          const errorMsg = apiError.name === 'AbortError' ? 'Request timeout (15s)' : apiError.message;
          log(`⚠️ Discover: API cache miss or error, falling back to direct Firestore: ${errorMsg}`);
          
          try {
            // Fallback to direct Firestore query
            // Query BOTH portfolio items (showInPortfolio: true) AND discover content (showInPortfolio: false)
            // This ensures videos uploaded via Discover portal appear in the feed
            const { PortfolioService } = await import('@/lib/database');
            
            // Query portfolio items
            const portfolioResult = await PortfolioService.getDiscoverPortfolioItems({
              showInPortfolio: true,
              deleted: false,
              hideAI: discoverSettings.hideAiAssistedArt,
              limit: INITIAL_FETCH_LIMIT, // Load full limit from portfolio items
            });
            
            // Query discover content (videos uploaded via Discover portal)
            const discoverResult = await PortfolioService.getDiscoverPortfolioItems({
              showInPortfolio: false,
              deleted: false,
              hideAI: discoverSettings.hideAiAssistedArt,
              limit: INITIAL_FETCH_LIMIT, // Load full limit from artworks collection
            });
            
            // Combine results, portfolio items first, then discover content
            portfolioItems = [...portfolioResult.items, ...discoverResult.items];
            
            // Sort combined results by createdAt (newest first)
            portfolioItems.sort((a, b) => {
              const aTime = a.createdAt?.toDate?.()?.getTime() || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
              const bTime = b.createdAt?.toDate?.()?.getTime() || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
              return bTime - aTime;
            });
            
            // Don't limit after combining - we want all valid items from both collections
            // Filtering will happen later, but we want maximum content for initial load
            // portfolioItems = portfolioItems.slice(0, INITIAL_FETCH_LIMIT); // Removed limit
            log(`📦 Discover: Found ${portfolioItems.length} portfolio items from direct Firestore (fallback)`);
            
            // Store last document for pagination - fetch actual DocumentSnapshot
            // because combined/sorted results lose the snapshot nature
            if (portfolioItems.length > 0) {
              const lastItem = portfolioItems[portfolioItems.length - 1];
              if (isDev) console.log('🔄 SCROLL LOAD: 📝 INITIAL LOAD (fallback) - Fetching lastDocument snapshot for pagination:', { 
                portfolioItemsCount: portfolioItems.length, 
                INITIAL_FETCH_LIMIT, 
                lastItemId: lastItem.id 
              });
              
              // Fetch the actual document snapshot for proper pagination (non-blocking)
              // Use a timeout to prevent blocking on slow connections (mobile)
              Promise.race([
                getDoc(doc(db, 'portfolioItems', lastItem.id)),
                new Promise((_, reject) => setTimeout(() => reject(new Error('getDoc timeout')), 5000))
              ])
                .then((lastDocSnap: any) => {
                  if (lastDocSnap?.exists()) {
                    setLastDocument(lastDocSnap);
                    if (isDev) console.log('🔄 SCROLL LOAD: ✅ INITIAL LOAD (fallback) - Set lastDocument snapshot successfully');
                  } else {
                    if (isDev) console.warn('🔄 SCROLL LOAD: ⚠️ INITIAL LOAD (fallback) - Last document does not exist, using plain object fallback');
                    setLastDocument(lastItem);
                  }
                })
                .catch((docError) => {
                  if (isDev) console.error('🔄 SCROLL LOAD: ⚠️ INITIAL LOAD (fallback) - Failed to fetch lastDocument snapshot, using plain object fallback:', docError);
                  setLastDocument(lastItem); // Fallback to plain object
                });
              
              // ALWAYS set hasMore to true if we got items - let pagination logic determine if there's more
              setHasMore(true);
              console.log('🔄 SCROLL LOAD: 📝 INITIAL LOAD (fallback) - Set hasMore: true (will be corrected by pagination logic)');
            } else {
              if (isDev) console.log('🔄 SCROLL LOAD: ⚠️ INITIAL LOAD (fallback) - No items, setting hasMore to false');
              setHasMore(false);
            }
            
            // If empty, immediately use fallback
            if (portfolioItems.length === 0) {
              log('📋 Discover: portfolioItems collection is empty, using fallback method');
              useFallback = true;
            }
          } catch (portfolioError: any) {
            // If portfolioItems query fails (e.g., missing index), fall back to old method
            log('⚠️ Discover: Error querying portfolioItems, falling back to userProfiles method:', portfolioError?.message || portfolioError);
            useFallback = true;
          }
        }
        
        const fetchedArtworks: Artwork[] = [];
        let skippedNoImage = 0;
        let skippedAI = 0;
        let skippedNoArtist = 0;
        
        // Only process portfolioItems if we have them and aren't using fallback
        if (!useFallback && portfolioItems.length > 0) {
          // CRITICAL OPTIMIZATION: Don't block on artist profiles - use fallback data immediately
          // Fetch artist profiles in background, update when ready
          const artistIds = new Set<string>(portfolioItems.map(item => item.userId));
          const artistDataMap = new Map<string, any>();
          
          // Start fetching artist profiles but don't await - process items immediately
          log(`👥 Discover: Fetching ${artistIds.size} artist profiles in background (non-blocking)...`);
          const artistPromises = Array.from(artistIds).map(async (artistId) => {
            try {
              const artistDoc = await getDoc(doc(db, 'userProfiles', artistId));
              if (artistDoc.exists()) {
                artistDataMap.set(artistId, artistDoc.data());
              }
            } catch (error) {
              if (isDev) console.warn(`⚠️ Failed to fetch artist ${artistId}:`, error);
            }
          });
          
          // Don't await - let it load in background, use fallback for now
          Promise.all(artistPromises).then(() => {
            log('✅ Artist profiles loaded in background');
          });
          
          // Process portfolio items immediately with fallback artist data
          for (const [index, item] of portfolioItems.entries()) {
            // NOTE: We don't filter by deleted here - if truly deleted, item should be removed from DB entirely
            // The deleted flag is mislabeled in some cases, so we show all content
            
            // Get artist data (use fallback if not loaded yet)
            let artistData = artistDataMap.get(item.userId);
            
            // If not loaded yet, use minimal fallback (don't skip - show content immediately)
            if (!artistData) {
              artistData = {
                displayName: item.artistName || item.userId || 'Artist',
                username: item.artistHandle || item.userId || 'artist',
                avatarUrl: item.artistAvatarUrl || null,
                isVerified: false,
                followerCount: 0,
                followingCount: 0,
                createdAt: new Date(),
              };
            }
            
            // Get media URL (support video or image)
            let videoUrl = item.videoUrl || null;
            if (!videoUrl && item.mediaUrls?.[0] && item.mediaTypes?.[0] === 'video') {
              videoUrl = item.mediaUrls[0];
            }
            const imageUrl = item.imageUrl || item.supportingImages?.[0] || item.images?.[0] || (item.mediaUrls?.[0] && item.mediaTypes?.[0] !== 'video' ? item.mediaUrls[0] : '') || '';
            const mediaType = item.mediaType || (videoUrl ? 'video' : 'image');
            
            // CRITICAL: Skip events - only show artworks from portfolio/discover
            if (item.type === 'event' || item.type === 'Event' || item.eventType) {
              skippedNoImage++;
              continue;
            }
            
            // CRITICAL: Skip products/shop items - only show artworks from portfolio/discover
            if (item.type === 'product' || item.type === 'Product' || item.type === 'marketplace' || item.type === 'MarketplaceProduct') {
              skippedNoImage++;
              continue;
            }
            if (item.artworkType === 'merchandise') {
              skippedNoImage++;
              continue;
            }
            if (item.showInShop === true && item.showInPortfolio !== true) {
              skippedNoImage++;
              continue; // Skip shop-only items
            }
            
            // RELAXED: Allow both Cloudflare and non-Cloudflare images
            // Only skip Pexels stock images
            if (imageUrl && (imageUrl.includes('pexels.com') || imageUrl.includes('images.pexels.com'))) {
              skippedNoImage++;
              continue; // Skip stock images
            }
            
            // Skip items without any media
            if (!imageUrl && !videoUrl) {
              skippedNoImage++;
              continue;
            }

            // Convert portfolio item to Artwork object
        const artwork: Artwork = {
          id: item.id,
          title: item.title || '',
          description: item.description || '',
          imageUrl: imageUrl,
          imageAiHint: item.description || '',
          ...(videoUrl && { videoUrl: videoUrl as any }),
          ...(mediaType && { mediaType: mediaType as any }),
          ...(item.mediaUrls && { mediaUrls: item.mediaUrls }),
          ...(item.mediaTypes && { mediaTypes: item.mediaTypes }),
          artist: {
            id: item.userId || '',
            name: artistData?.displayName || artistData?.name || artistData?.username || 'Unknown Artist',
            handle: artistData?.username || artistData?.handle || '',
            avatarUrl: artistData?.avatarUrl || null,
            isVerified: artistData?.isVerified || false,
            isProfessional: true,
            followerCount: artistData?.followerCount || 0,
            followingCount: artistData?.followingCount || 0,
            createdAt: artistData?.createdAt?.toDate?.() || (artistData?.createdAt instanceof Date ? artistData.createdAt : new Date()),
          },
              likes: item.likes || 0,
              commentsCount: item.commentsCount || 0,
              createdAt: item.createdAt instanceof Date ? item.createdAt : (item.createdAt as any)?.toDate?.() || new Date(),
              updatedAt: item.updatedAt instanceof Date ? item.updatedAt : (item.updatedAt as any)?.toDate?.() || new Date(),
              category: item.category || '',
              medium: item.medium || '',
              tags: item.tags || [],
              aiAssistance: item.aiAssistance || 'none',
              isAI: item.isAI || false,
              isForSale: item.isForSale || false,
              sold: item.sold || false,
              price: item.price ? (item.price > 1000 ? item.price / 100 : item.price) : undefined,
              priceType: item.priceType as 'fixed' | 'contact' | undefined,
              contactForPrice: item.contactForPrice || item.priceType === 'contact',
            };
            
            fetchedArtworks.push(artwork);
          }
          
          log(`📊 Discover: Summary - Portfolio items: ${portfolioItems.length}, Added: ${fetchedArtworks.length}, Skipped (no image): ${skippedNoImage}, Skipped (no artist): ${skippedNoArtist}`);
        }
        
        
        // BACKWARD COMPATIBILITY: If no portfolioItems found or using fallback, use old method (userProfiles.portfolio arrays)
        if (useFallback || (portfolioItems.length === 0 && fetchedArtworks.length === 0)) {
          log('📋 Discover: No portfolioItems found, falling back to userProfiles.portfolio method (backward compatibility)...');
          
          // Fetch artists with portfolios - old method
          const artistsQuery = query(
            collection(db, 'userProfiles'),
            limit(90) // Increased to fill desktop viewport + 5+ more rows for immediate scrolling
          );
          
          const artistsSnapshot = await getDocs(artistsQuery);
          log(`👥 Discover: Found ${artistsSnapshot.docs.length} artists (fallback method)`);
          
          // Extract portfolio items from each artist (old method)
          for (const artistDoc of artistsSnapshot.docs) {
            const artistData = artistDoc.data();
            const portfolio = artistData.portfolio || [];
            
            if (portfolio.length === 0) continue;
            
            const recentPortfolio = portfolio
              .filter((item: any) => {
                // NOTE: We don't filter by deleted - if truly deleted, item should be removed from DB entirely
                // The deleted flag is mislabeled in some cases, so we show all content
                if (item.showInPortfolio === false && !item.videoUrl) return false; // Skip discover-only items without video
                
                // Skip items without any valid media
                const hasVideo = item.videoUrl || (item.mediaUrls?.[0] && item.mediaTypes?.[0] === 'video');
                const hasImage = item.imageUrl || item.supportingImages?.[0] || item.images?.[0] || 
                                (item.mediaUrls?.[0] && item.mediaTypes?.[0] !== 'video');
                if (!hasVideo && !hasImage) return false;
                
                return true;
              })
              .sort((a: any, b: any) => {
                const dateA = a.createdAt?.toDate?.()?.getTime() || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0) || 0;
                const dateB = b.createdAt?.toDate?.()?.getTime() || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0) || 0;
                return dateB - dateA;
              })
              .slice(0, 20);
            
            for (const [index, item] of recentPortfolio.entries()) {
              if (discoverSettings.hideAiAssistedArt && (item.aiAssistance === 'assisted' || item.aiAssistance === 'generated' || item.isAI)) {
                continue;
              }
              
              let videoUrl = item.videoUrl || null;
              if (!videoUrl && item.mediaUrls?.[0] && item.mediaTypes?.[0] === 'video') {
                videoUrl = item.mediaUrls[0];
              }
              const imageUrl = item.imageUrl || item.supportingImages?.[0] || item.images?.[0] || (item.mediaUrls?.[0] && item.mediaTypes?.[0] !== 'video' ? item.mediaUrls[0] : '') || '';
              
              if (!imageUrl && !videoUrl) continue;
              
              const artwork: Artwork = {
                id: item.id || `${artistDoc.id}-${Date.now()}-${index}`,
                title: item.title || '',
                description: item.description || '',
                imageUrl: imageUrl, // Already validated as Cloudflare image above
                imageAiHint: item.description || '',
                ...(videoUrl && { videoUrl: videoUrl as any }),
                artist: {
                  id: artistDoc.id,
                  name: artistData.displayName || artistData.name || artistData.username || 'Unknown Artist',
                  handle: artistData.username || artistData.handle || '',
                  avatarUrl: artistData.avatarUrl || null,
                  isVerified: artistData.isVerified || false,
                  isProfessional: true,
                  followerCount: artistData.followerCount || 0,
                  followingCount: artistData.followingCount || 0,
                  createdAt: artistData.createdAt?.toDate?.() || (artistData.createdAt instanceof Date ? artistData.createdAt : new Date()),
                },
                likes: item.likes || 0,
                commentsCount: item.commentsCount || 0,
                createdAt: item.createdAt?.toDate?.() || (item.createdAt instanceof Date ? item.createdAt : new Date()),
                updatedAt: item.updatedAt?.toDate?.() || item.createdAt?.toDate?.() || (item.createdAt instanceof Date ? item.createdAt : new Date()),
                category: item.category || '',
                medium: item.medium || '',
                tags: item.tags || [],
                aiAssistance: item.aiAssistance || 'none',
                isAI: item.isAI || false,
                isForSale: item.isForSale || false,
                sold: item.sold || false,
                price: item.price ? (item.price > 1000 ? item.price / 100 : item.price) : undefined,
                priceType: item.priceType as 'fixed' | 'contact' | undefined,
                contactForPrice: item.contactForPrice || item.priceType === 'contact',
              };
              
              fetchedArtworks.push(artwork);
            }
          }
          
          log(`📊 Discover: Fallback method - Added ${fetchedArtworks.length} artworks from userProfiles.portfolio`);
        }
        
        // REMOVED: Redundant artworks collection fetch - portfolioItems already contains all content
        // This was causing multiple reloads after initial load
        // If portfolioItems is empty, we already have fallback logic above
        const artworksLimit = isMobile ? 50 : 300; // Keep for reference but don't use
        
        // Skip artworks collection fetch to prevent duplicate reloads
        // portfolioItems from API/fallback already contains all discover content
        if (false) { // Disabled to prevent multiple reloads
        try {
          // Filter in JavaScript instead of query level to avoid index requirement
          const artworksQuery = query(
            collection(db, 'artworks'),
            orderBy('createdAt', 'desc'),
            limit(artworksLimit)
          );
          
          // Add timeout protection for mobile (10 seconds)
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Artworks query timeout')), 10000);
          });
          
          const artworksSnapshot = await Promise.race([
            getDocs(artworksQuery),
            timeoutPromise
          ]);
          
          // Batch fetch artist data to avoid N+1 queries
          const artistIds = new Set<string>();
          const artworkItems: any[] = [];
          
          log(`📦 Discover: Processing ${artworksSnapshot.docs.length} artworks from collection...`);
          
          for (const artworkDoc of artworksSnapshot.docs) {
            const artworkData = artworkDoc.data();
            
            // NOTE: We don't filter by deleted - if truly deleted, item should be removed from DB entirely
            // The deleted flag is mislabeled in some cases, so we show all content
            
            // Skip events
            if (artworkData.type === 'event' || artworkData.type === 'Event' || artworkData.eventType) continue;
            
            // CRITICAL: Skip products/shop items - only show artworks from portfolio/discover
            if (artworkData.type === 'product' || artworkData.type === 'Product' || artworkData.type === 'marketplace' || artworkData.type === 'MarketplaceProduct') continue;
            if (artworkData.artworkType === 'merchandise') continue;
            if (artworkData.showInShop === true && artworkData.showInPortfolio !== true) continue; // Skip shop-only items
            
            // Skip items with invalid/corrupted imageUrls (data URLs from old uploads)
            if (artworkData.imageUrl && artworkData.imageUrl.startsWith('data:image')) continue;
            
            // CRITICAL: Only fetch images from Cloudflare (all active artists should use Cloudflare)
            // Skip images that are NOT from Cloudflare
            const imageUrl = artworkData.imageUrl || artworkData.supportingImages?.[0] || artworkData.images?.[0] || (artworkData.mediaUrls?.[0] && artworkData.mediaTypes?.[0] !== 'video' ? artworkData.mediaUrls[0] : '') || '';
            const hasVideo = artworkData.videoUrl || (artworkData.mediaUrls?.[0] && artworkData.mediaTypes?.[0] === 'video');
            
            // RELAXED: Allow both Cloudflare and non-Cloudflare media
            // Only skip Pexels stock images
            if (imageUrl && (imageUrl.includes('pexels.com') || imageUrl.includes('images.pexels.com'))) {
              continue; // Skip stock images
            }
            
            // Skip items with no valid media at all
            const hasValidMedia = imageUrl || artworkData.videoUrl || artworkData.supportingImages?.[0] || artworkData.images?.[0] || artworkData.mediaUrls?.[0];
            if (!hasValidMedia) continue;
            
            // Apply discover settings filters for AI content
            if (discoverSettings.hideAiAssistedArt && (artworkData.aiAssistance === 'assisted' || artworkData.aiAssistance === 'generated' || artworkData.isAI)) {
              continue;
            }
            
            // Get media URL (support video or image)
            // Check for video: first check videoUrl, then check mediaUrls array for video type
            let videoUrl = artworkData.videoUrl || null;
            if (!videoUrl && artworkData.mediaUrls?.[0] && artworkData.mediaTypes?.[0] === 'video') {
              videoUrl = artworkData.mediaUrls[0];
            }
            // For image, prefer imageUrl, then supportingImages, then mediaUrls (but only if not video)
            // NOTE: imageUrl already filtered above to only include Cloudflare images
            const mediaType = artworkData.mediaType || (videoUrl ? 'video' : 'image');
            
            // Skip items without media
            if (!imageUrl && !videoUrl) continue;
            
            const artistId = artworkData.artist?.id || artworkData.artist?.userId || artworkData.artistId;
            if (artistId) {
              artistIds.add(artistId);
            }
            
            artworkItems.push({
              artworkDoc,
              artworkData,
              imageUrl,
              videoUrl,
              mediaType,
              artistId
            });
          }
          
          // Batch fetch all artist data in parallel
          const artistDataMap = new Map<string, any>();
          if (artistIds.size > 0) {
            const artistPromises = Array.from(artistIds).map(async (artistId) => {
              try {
                const artistDoc = await getDoc(doc(db, 'userProfiles', artistId));
                if (artistDoc.exists()) {
                  return { id: artistId, data: artistDoc.data() };
                }
              } catch (err) {
                log(`⚠️ Discover: Could not fetch artist data for ${artistId}`);
              }
              return null;
            });
            
            const artistResults = await Promise.all(artistPromises);
            artistResults.forEach(result => {
              if (result) {
                artistDataMap.set(result.id, result.data);
              }
            });
          }
          
          // Now build artwork objects with cached artist data
          for (const { artworkDoc, artworkData, imageUrl, videoUrl, mediaType, artistId } of artworkItems) {
            // Get artist info from cached data
            let artistName = 'Unknown Artist';
            let artistHandle = '';
            let artistAvatarUrl = null;
            
            if (artistId && artistDataMap.has(artistId)) {
              const artistData = artistDataMap.get(artistId);
              artistName = artistData.displayName || artistData.name || artistData.username || 'Unknown Artist';
              artistHandle = artistData.username || artistData.handle || '';
              artistAvatarUrl = artistData.avatarUrl || null;
            }
            
            // Convert to Artwork object
            // For videos without imageUrl, construct thumbnail URL from video URL
            let finalImageUrl = imageUrl || '';
            if (!finalImageUrl && videoUrl && videoUrl.includes('cloudflarestream.com')) {
              // Construct thumbnail URL from video URL
              finalImageUrl = videoUrl.replace(/\/manifest\/video\.m3u8$/, '/thumbnails/thumbnail.jpg');
            }
            
            // CRITICAL: Use 'any' type to ensure videoUrl and mediaType are always included
            const artwork: any = {
              id: artworkDoc.id,
              title: artworkData.title || '',
              description: artworkData.description || '',
              imageUrl: finalImageUrl,
              imageAiHint: artworkData.description || '',
              // Always include videoUrl and mediaType if they exist (don't use conditional spread)
              videoUrl: videoUrl || undefined,
              mediaType: mediaType || undefined,
              // Also preserve mediaUrls and mediaTypes arrays for video detection
              mediaUrls: artworkData.mediaUrls || (videoUrl ? [videoUrl] : undefined),
              mediaTypes: artworkData.mediaTypes || (videoUrl ? ['video'] : undefined),
              artist: {
                id: artistId || '',
                name: artistName,
                handle: artistHandle,
                avatarUrl: artistAvatarUrl,
                isVerified: false,
                isProfessional: true,
                followerCount: 0,
                followingCount: 0,
                createdAt: new Date(),
              },
              likes: artworkData.likes || 0,
              commentsCount: artworkData.commentsCount || 0,
              createdAt: artworkData.createdAt?.toDate?.() || (artworkData.createdAt instanceof Date ? artworkData.createdAt : new Date()),
              updatedAt: artworkData.updatedAt?.toDate?.() || (artworkData.updatedAt instanceof Date ? artworkData.updatedAt : new Date()),
              category: artworkData.category || '',
              medium: artworkData.medium || '',
              tags: artworkData.tags || [],
              aiAssistance: artworkData.aiAssistance || 'none',
              isAI: artworkData.isAI || false,
              isForSale: artworkData.isForSale || false,
              sold: artworkData.sold || false,
              price: artworkData.price ? (artworkData.price > 1000 ? artworkData.price / 100 : artworkData.price) : undefined,
              priceType: artworkData.priceType as 'fixed' | 'contact' | undefined,
              contactForPrice: artworkData.contactForPrice || artworkData.priceType === 'contact',
            };
            
            fetchedArtworks.push(artwork);
            log(`✅ Discover: Added non-portfolio artwork "${artwork.title}" from ${artwork.artist.name}`);
          }
          
          log(`📊 Discover: Added ${fetchedArtworks.length} total artworks from artworks collection`);
        } catch (error) {
          if (isDev) console.error('❌ Error fetching artworks collection:', error);
          // Don't crash - continue with whatever we have
        }
        } // End of disabled artworks collection fetch
        
        // CRITICAL: Apply ranking system on initial load (not just newest first)
        // This ensures proper content ordering from the start
        const processingTime = Date.now() - fetchStartTime;
        console.log(`🔥 DISCOVER DEBUG: After processing, ${fetchedArtworks.length} artworks ready for ranking (took ${processingTime}ms)`);
        console.log(`🔥 DISCOVER DEBUG: Breakdown - portfolioItems: ${portfolioItems.length}, skipped: ${skippedNoImage}`);
        log(`🎯 Discover: Applying ranking system to ${fetchedArtworks.length} fetched artworks...`);
        
        // Get followed artist IDs for priority boost
        const followedArtists = getFollowedArtists();
        const followedArtistIds = new Set(followedArtists.map((a: any) => a.id));
        
        // Apply engagement-based scoring if we have engagement data
        let sortedArtworks = fetchedArtworks;
        if (artworkEngagements.size > 0) {
          log(`📊 Discover: Using engagement-based ranking (${artworkEngagements.size} artworks with engagement data)`);
          const scoredArtworks = engagementScorer.scoreArtworks(fetchedArtworks, artworkEngagements, followedArtistIds);
          const withDiversity = engagementScorer.applyDiversityBoost(scoredArtworks);
          sortedArtworks = engagementScorer.sortByScore(withDiversity);
        } else {
          // Fallback: Sort by createdAt descending (newest first), but prioritize followed artists
          log(`📊 Discover: Using newest-first ranking (no engagement data yet)`);
          sortedArtworks.sort((a, b) => {
            const aIsFollowed = followedArtistIds.has(a.artist.id);
            const bIsFollowed = followedArtistIds.has(b.artist.id);
            if (aIsFollowed && !bIsFollowed) return -1;
            if (!aIsFollowed && bIsFollowed) return 1;
            const dateA = a.createdAt.getTime();
            const dateB = b.createdAt.getTime();
            return dateB - dateA;
          });
        }
        
        // No fallback: only show current portfolio items with images, skip deleted/hidden
        
        // Use all sorted artworks - no artificial limits
        const safeArtworks = Array.isArray(sortedArtworks) ? sortedArtworks : [];
        
        log(`🎯 Discover: Real artworks count: ${safeArtworks.length}`);
        
        // Only show real artworks - no placeholders
        const finalArtworks = safeArtworks;
        
        console.log(`🔥 DISCOVER DEBUG: FINAL COUNT: ${finalArtworks.length} artworks being set to state`);
        log(`🎯 Discover: Final artworks count: ${finalArtworks.length} (ranked and ready)`);
        
        if (safeArtworks.length === 0) {
          warn('⚠️ Discover: No real artworks found');
        } else {
          log(`✅ Discover: Showing ${safeArtworks.length} ranked artworks (engagement-based ordering applied)`);
        }
        
        setArtworks(Array.isArray(finalArtworks) ? finalArtworks : []);
        setArtworksLoaded(true); // Mark artworks as loaded
        
        // CRITICAL: Set lastDocument from the LAST item in the final artworks array for pagination
        // Use the last portfolioItem if available, otherwise use the last artwork from artworks collection
        if (portfolioItems.length > 0) {
          const lastPortfolioItem = portfolioItems[portfolioItems.length - 1];
          if (isDev) console.log('🔄 SCROLL LOAD: 📝 FINAL - Fetching lastDocument snapshot from portfolioItems:', { lastItemId: lastPortfolioItem.id });
          
          // Fetch the actual document snapshot for proper pagination (non-blocking)
          // Use a timeout to prevent blocking on slow connections (mobile)
          Promise.race([
            getDoc(doc(db, 'portfolioItems', lastPortfolioItem.id)),
            new Promise((_, reject) => setTimeout(() => reject(new Error('getDoc timeout')), 5000))
          ])
            .then((lastDocSnap: any) => {
              if (lastDocSnap?.exists()) {
                setLastDocument(lastDocSnap);
                if (isDev) console.log('🔄 SCROLL LOAD: ✅ FINAL - Set lastDocument snapshot successfully');
              } else {
                if (isDev) console.warn('🔄 SCROLL LOAD: ⚠️ FINAL - Last document does not exist, using plain object fallback');
                setLastDocument(lastPortfolioItem);
              }
            })
            .catch((docError) => {
              if (isDev) console.error('🔄 SCROLL LOAD: ⚠️ FINAL - Failed to fetch lastDocument snapshot, using plain object fallback:', docError);
              setLastDocument(lastPortfolioItem); // Fallback to plain object
            });
          
          setHasMore(true); // Always set to true initially since we're loading from multiple sources
        } else if (finalArtworks.length > 0) {
          // Fallback: Use last artwork (but this won't work for pagination since it's from artworks collection)
          if (isDev) console.log('🔄 SCROLL LOAD: ⚠️ FINAL - No portfolioItems, cannot set lastDocument properly');
        }
        
        // AUTO-LOAD MORE: If we don't have enough content to fill viewport, immediately load more
        // Desktop typically needs 30-40 items (6 cols × 5-7 rows), so trigger if we have less
        const MIN_ITEMS_FOR_DESKTOP = 30;
        // Note: loadMoreArtworks will be called via useEffect after artworks are set
        
        // Count initial viewport media for preloading with connection-aware limits
        // Strategy: Load poster images first (fast), limit videos to 3 per viewport, connection-aware preload count
        const connectionSpeed = getConnectionSpeed();
        
        // INSTAGRAM/PINTEREST-LEVEL: Preload 40-60+ images for instant display (like Instagram/Pinterest)
        // Desktop: 60 images (5 cols × 12 rows), Mobile: 40 images (2 cols × 20 rows)
        const preloadCount = isMobile
          ? (connectionSpeed === 'fast' ? 40 : connectionSpeed === 'medium' ? 32 : 24)
          : (connectionSpeed === 'fast' ? 60 : connectionSpeed === 'medium' ? 48 : 36);
        
        // Limit videos to 3 per viewport for consistent performance
        const MAX_VIDEOS_PER_VIEWPORT = 3;
        let videoCount = 0;
        const initialTiles: Artwork[] = [];
        
        // Select tiles with video limiting: max 3 videos, fill rest with images
        for (const artwork of finalArtworks) {
          if (initialTiles.length >= preloadCount) break;
          
          const hasVideo = (artwork as any).videoUrl || (artwork as any).mediaType === 'video';
          
          if (hasVideo) {
            if (videoCount < MAX_VIDEOS_PER_VIEWPORT) {
              initialTiles.push(artwork);
              videoCount++;
            }
            // Skip this video if we've hit the limit
          } else {
            // Always include images
            initialTiles.push(artwork);
          }
        }
        
        // Separate video posters from regular images
        // We need ALL 3 video thumbnails to load, plus regular images
        const initialVideoPosters = initialTiles.filter((artwork: Artwork) => {
          const hasVideo = (artwork as any).videoUrl || (artwork as any).mediaType === 'video';
          return hasVideo && artwork.imageUrl; // Video posters
        });
        const initialRegularImages = initialTiles.filter((artwork: Artwork) => {
          const hasVideo = (artwork as any).videoUrl || (artwork as any).mediaType === 'video';
          return !hasVideo && artwork.imageUrl; // Regular images (not videos)
        });
        
        // Count videos (for tracking) and separate poster images
        setInitialVideosTotal(initialVideoPosters.length); // Track video count (max 3)
        setInitialVideoPostersTotal(initialVideoPosters.length); // All video posters must load (100%)
        setInitialImagesTotal(initialVideoPosters.length + initialRegularImages.length); // All images including video posters
        initialVideoReadyRef.current.clear();
        initialImageReadyRef.current.clear();
        initialVideoPosterRef.current.clear();
        setInitialVideosReady(0);
        setInitialImagesReady(0);
        setInitialVideoPostersReady(0);
        // DO NOT reset joke completion state - it must remain true once set to prevent overlay from reappearing
        // setJokeComplete(false); // REMOVED - causes second loading screen
        // setJokeCompleteTime(null); // REMOVED - causes second loading screen
        
        // OPTIMIZED: Fetch engagement metrics in background (non-blocking)
        // Don't wait for this - it's not critical for initial display
        if (finalArtworks.length > 0) {
          const artworkIds = finalArtworks.map(a => a.id);
          // Fire and forget - update when ready
          engagementTracker.getArtworkEngagements(artworkIds)
            .then(engagements => {
              setArtworkEngagements(engagements);
              log(`📊 Discover: Loaded engagement metrics for ${engagements.size} artworks (background)`);
            })
            .catch(err => {
              warn('⚠️ Error fetching engagement metrics (non-blocking):', err);
            });
        }
      } catch (err: any) {
        const fetchDuration = Date.now() - fetchStartTime;
        error(`❌ Error fetching artworks from artist profiles (took ${fetchDuration}ms):`, err);
        // On error, show empty state - no placeholders
        setArtworks([]);
        setArtworksLoaded(true); // Mark artworks as loaded even on error
        // DO NOT reset joke completion state - it must remain true once set to prevent overlay from reappearing
        // setJokeComplete(false); // REMOVED - causes second loading screen
        // setJokeCompleteTime(null); // REMOVED - causes second loading screen
      } finally {
        fetchingRef.current = false;
      }
    };

    fetchArtworks();
    
    // Fetch ads for discover feed
    fetchActiveAds('discover', user?.id).then(setAds).catch(console.error);
    
    // Cleanup: reset fetch flag if component unmounts
    return () => {
      fetchingRef.current = false;
    };
  }, [discoverSettings.hideAiAssistedArt, theme, mounted, user?.id]); // Only depend on specific values, not entire objects

  // OPTIMIZED: Prefetch next page when user is 80% through current content
  const prefetchNextPage = useCallback(async () => {
    if (isLoadingMore || !hasMore || !lastDocument || fetchingRef.current) {
      return;
    }
    
    // Silently prefetch in background (don't show loading state)
    try {
      const { PortfolioService } = await import('@/lib/database');
      const result = await PortfolioService.getDiscoverPortfolioItems({
        showInPortfolio: true,
        deleted: false,
        hideAI: discoverSettings.hideAiAssistedArt,
        limit: 20,
        startAfter: lastDocument,
      });
      
      // Store prefetched data for instant display when user scrolls
      if (result.items.length > 0) {
        log(`🚀 Discover: Prefetched ${result.items.length} items (ready for instant load)`);
        // Store in a ref or state for instant display
      }
    } catch (err) {
      // Silent fail - prefetch is optional
    }
  }, [hasMore, lastDocument, discoverSettings.hideAiAssistedArt, isLoadingMore]);

  // Load more artworks when scrolling to bottom (pagination)
  // Note: Pagination uses direct Firestore (not cached API) for fresh data
  const loadMoreArtworks = useCallback(async () => {
    // CRITICAL: Prevent duplicate loads from multiple triggers (IntersectionObserver + scroll listener)
    const now = Date.now();
    if (now - lastLoadTimeRef.current < LOAD_COOLDOWN) {
      if (isDev) console.log('🔄 SCROLL LOAD: ⛔ BLOCKED: Load cooldown active (prevent duplicate loads)');
      return;
    }
    
    if (isDev) {
      console.log('🔄 SCROLL LOAD: ========================================');
      console.log('🔄 SCROLL LOAD: 🚀 loadMoreArtworks CALLBACK INVOKED');
      console.log('🔄 SCROLL LOAD: 🔍 CURRENT STATE:', {
        isLoadingMore: isLoadingMore,
        hasMore: hasMore,
        hasLastDocument: !!lastDocument,
        lastDocumentType: lastDocument ? typeof lastDocument : 'null',
        lastDocumentId: lastDocument?.id || 'N/A',
        timeSinceLastLoad: now - lastLoadTimeRef.current
      });
    }
    
    if (isLoadingMore) {
      if (isDev) console.log('🔄 SCROLL LOAD: ⛔ BLOCKED: isLoadingMore is TRUE (already loading)');
      return;
    }

    if (!hasMore) {
      if (isDev) console.log('🔄 SCROLL LOAD: ⛔ BLOCKED: hasMore is FALSE (no more content)');
      return;
    }
    
    if (!lastDocument) {
      if (isDev) {
        console.log('🔄 SCROLL LOAD: ⛔ BLOCKED: lastDocument is NULL/UNDEFINED (no pagination cursor)');
        console.log('🔄 SCROLL LOAD: 💡 This means initial load did not set lastDocument properly!');
      }
      return;
    }

    // Mark load time to prevent duplicates
    lastLoadTimeRef.current = now;
    
    if (isDev) console.log('🔄 SCROLL LOAD: ✅ ALL CONDITIONS MET - PROCEEDING WITH LOAD');
    
    // INSTAGRAM/PINTEREST-LEVEL: Show loading animation immediately, then load full section
    setIsLoadingMore(true);
    
    // Brief pause to show loading animation and allow preloading (200ms)
    await new Promise(resolve => setTimeout(resolve, 200));
    if (isDev) console.log('🔄 SCROLL LOAD: 📥 Starting to fetch more artworks...');
    log('📥 Discover: Loading more artworks...');

    try {
      const { PortfolioService } = await import('@/lib/database');
      // CRITICAL: Reduce load limit to prevent crashes with 200+ images
      // Mobile has less memory - use even smaller batches
      // Use existing isMobile state instead of creating new variable
      // Load enough items to fill 10 rows (accounting for filtering)
      // Increase limit to ensure we get 10 rows after filtering
      const LOAD_MORE_LIMIT = isMobile
        ? Math.min(columnCount * 5, 20)  // Mobile: 5 rows (reduced from 8), Desktop: 12 rows
        : Math.min(columnCount * 12, 60); // Desktop: 12 rows (load extra to ensure 10 rows after filtering)
      
      // NOTE: lastDocument should already be a DocumentSnapshot from previous loadMoreArtworks calls
      // Only the initial load from API returns a plain object, but we use direct Firestore for pagination
      // So lastDocument should always be a DocumentSnapshot here
      
      // Add timeout protection to prevent infinite loading states
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Load more timeout after 15 seconds')), 15000);
      });
      
      // Load from BOTH portfolioItems AND artworks collections
      // The 513 images are in artworks collection, so we need to query both
      // Load full limit from each to ensure we get enough items after filtering
      const [portfolioResult, artworksResult] = await Promise.all([
        PortfolioService.getDiscoverPortfolioItems({
          showInPortfolio: true,
          deleted: false,
          hideAI: discoverSettings.hideAiAssistedArt,
          limit: LOAD_MORE_LIMIT, // Load full limit (not split) to ensure enough items after filtering
          startAfter: lastDocument,
        }),
        // Also query artworks collection with pagination
        (async () => {
          try {
            const artworksQuery = query(
              collection(db, 'artworks'),
              orderBy('createdAt', 'desc'),
              startAfter(lastDocument),
              limit(LOAD_MORE_LIMIT) // Load full limit (not split) to ensure enough items after filtering
            );
            const snapshot = await getDocs(artworksQuery);
            return {
              items: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)),
              lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
            };
          } catch (error) {
            if (isDev) console.error('Error loading more artworks:', error);
            return { items: [], lastDoc: null };
          }
        })()
      ]);
      
      // Combine results
      const combinedResult = {
        items: [...portfolioResult.items, ...artworksResult.items],
        lastDoc: artworksResult.lastDoc || portfolioResult.lastDoc,
      };
      
      const loadPromise = Promise.resolve(combinedResult);
      
      if (isDev) {
        console.log('🔄 SCROLL LOAD: ⏱️ Waiting for result with 15s timeout...');
        console.log('🔄 SCROLL LOAD: 📋 Query params:', {
          limit: LOAD_MORE_LIMIT,
          lastDocumentType: typeof lastDocument,
          hasExistsMethod: typeof lastDocument?.exists === 'function',
          lastDocumentId: lastDocument?.id
        });
      }
      
      const result = await Promise.race([loadPromise, timeoutPromise]);
      
      if (isDev) console.log('🔄 SCROLL LOAD: ✅ Got result:', {
        itemsCount: result.items.length,
        hasLastDoc: !!result.lastDoc,
        lastDocId: result.lastDoc?.id
      });
      
      // If no items returned, check if there's a lastDoc - if so, there might be more content
      // (items might be filtered out, but cursor indicates more content exists)
      if (result.items.length === 0) {
        if (result.lastDoc) {
          // There's a cursor, so more content might exist (even if filtered out)
          if (isDev) console.log('🔄 SCROLL LOAD: ⚠️ No items returned, but lastDoc exists - updating cursor and will try once more');
          setLastDocument(result.lastDoc);
          setHasMore(true);
        } else {
          // No cursor and no items - we've reached the end
          if (isDev) console.log('🔄 SCROLL LOAD: ✅ No more content available (no items and no lastDoc)');
          setHasMore(false); // FIXED: Stop infinite loop by setting hasMore to false
        }
        setIsLoadingMore(false);
        return;
      }

      // Process items - handle both portfolioItems and artworks structures
      const newArtworks: Artwork[] = [];
      const artistIds = new Set<string>();
      
      // Collect artist IDs from both structures
      for (const item of result.items) {
        const itemAny = item as any; // Type assertion - items can be from portfolioItems or artworks
        const artistId = itemAny.userId || itemAny.artist?.id || itemAny.artist?.userId || itemAny.artistId;
        if (artistId) artistIds.add(artistId);
      }
      
      // Batch fetch artist data
      const artistDataMap = new Map<string, any>();
      const artistPromises = Array.from(artistIds).map(async (artistId) => {
        try {
          const artistDoc = await getDoc(doc(db, 'userProfiles', artistId));
          if (artistDoc.exists()) {
            artistDataMap.set(artistId, artistDoc.data());
          }
        } catch (error) {
          if (isDev) console.warn(`⚠️ Failed to fetch artist ${artistId}:`, error);
        }
      });
      await Promise.all(artistPromises);

      // Process items - handle both portfolioItems (has userId) and artworks (has artist.id)
      for (const item of result.items) {
        // Get artist ID from either structure
        const itemAny = item as any; // Type assertion - items can be from portfolioItems or artworks
        const artistId = itemAny.userId || itemAny.artist?.id || itemAny.artist?.userId || itemAny.artistId;
        let artistData = artistId ? artistDataMap.get(artistId) : null;
        
        if (!artistData && artistId) {
          // Use fallback artist data
          artistData = {
            displayName: itemAny.artistName || itemAny.artist?.name || itemAny.artist?.displayName || 'Artist',
            username: itemAny.artistHandle || itemAny.artist?.handle || itemAny.artist?.username || 'artist',
            avatarUrl: itemAny.artistAvatarUrl || itemAny.artist?.avatarUrl || null,
            isVerified: false,
            followerCount: 0,
            followingCount: 0,
            createdAt: new Date(),
          };
        }
        
        // Get media URLs - handle both structures
        let videoUrl = itemAny.videoUrl || null;
        if (!videoUrl && itemAny.mediaUrls?.[0] && itemAny.mediaTypes?.[0] === 'video') {
          videoUrl = itemAny.mediaUrls[0];
        }
        const mediaType = itemAny.mediaType || (videoUrl ? 'video' : 'image');
        const imageUrl = itemAny.imageUrl || 
                        itemAny.supportingImages?.[0] || 
                        itemAny.images?.[0] || 
                        (itemAny.mediaUrls?.[0] && itemAny.mediaTypes?.[0] !== 'video' ? itemAny.mediaUrls[0] : '') || 
                        '';
        
        // CRITICAL: Filter out events - only show artworks from portfolio/discover
        if (itemAny.type === 'event' || itemAny.type === 'Event' || itemAny.eventType) continue;
        
        // CRITICAL: Filter out products/shop items - only show artworks from portfolio/discover
        // itemAny is already defined above, no need to redefine
        if (itemAny.type === 'product' || itemAny.type === 'Product' || itemAny.type === 'marketplace' || itemAny.type === 'MarketplaceProduct') continue;
        if (itemAny.artworkType === 'merchandise') continue;
        if (itemAny.showInShop === true && itemAny.showInPortfolio !== true) continue; // Skip shop-only items
        
        // RELAXED: Allow both Cloudflare and non-Cloudflare media
        // Only skip Pexels stock images
        if (imageUrl && (imageUrl.includes('pexels.com') || imageUrl.includes('images.pexels.com'))) continue;
        
        // Skip items without any media
        if (!imageUrl && !videoUrl) continue;
        
        // Apply AI filter
        if (discoverSettings.hideAiAssistedArt && (itemAny.aiAssistance === 'assisted' || itemAny.aiAssistance === 'generated' || itemAny.isAI)) {
          continue;
        }

        const artwork: Artwork = {
          id: itemAny.id,
          title: itemAny.title || '',
          description: itemAny.description || '',
          imageUrl: imageUrl,
          imageAiHint: itemAny.description || '',
          ...(videoUrl && { videoUrl: videoUrl as any }),
          ...(mediaType && { mediaType: mediaType as any }),
          ...(itemAny.mediaUrls && { mediaUrls: itemAny.mediaUrls }),
          ...(itemAny.mediaTypes && { mediaTypes: itemAny.mediaTypes }),
          artist: {
            id: artistId || '',
            name: artistData?.displayName || artistData?.name || artistData?.username || 'Unknown Artist',
            handle: artistData?.username || artistData?.handle || '',
            avatarUrl: artistData?.avatarUrl || null,
            isVerified: artistData?.isVerified || false,
            isProfessional: true,
            followerCount: artistData?.followerCount || 0,
            followingCount: artistData?.followingCount || 0,
            createdAt: artistData?.createdAt?.toDate?.() || (artistData?.createdAt instanceof Date ? artistData.createdAt : new Date()),
          },
          likes: itemAny.likes || 0,
          commentsCount: itemAny.commentsCount || 0,
          createdAt: itemAny.createdAt instanceof Date ? itemAny.createdAt : (itemAny.createdAt as any)?.toDate?.() || new Date(),
          updatedAt: itemAny.updatedAt instanceof Date ? itemAny.updatedAt : (itemAny.updatedAt as any)?.toDate?.() || new Date(),
          category: itemAny.category || '',
          medium: itemAny.medium || '',
          tags: itemAny.tags || [],
          aiAssistance: itemAny.aiAssistance || 'none',
          isAI: itemAny.isAI || false,
          isForSale: itemAny.isForSale || false,
          sold: itemAny.sold || false,
          price: itemAny.price ? (itemAny.price > 1000 ? itemAny.price / 100 : itemAny.price) : undefined,
          priceType: itemAny.priceType as 'fixed' | 'contact' | undefined,
          contactForPrice: itemAny.contactForPrice || itemAny.priceType === 'contact',
        };
        
        newArtworks.push(artwork);
      }

      // CRITICAL FIX: ALL CONTENT MUST BE STATIC - NEVER REMOVE EXISTING CONTENT
      // Simply append new sections - no capping, no removal, no replacement
      // This ensures section 1 stays static when section 2 loads, section 2 stays static when section 3 loads, etc.
      try {
        const updatedArtworks = (() => {
          const existingIds = new Set(artworks.map(a => a.id));
          const uniqueNewArtworks = newArtworks.filter(a => !existingIds.has(a.id));
          // SIMPLY APPEND - NEVER REMOVE EXISTING CONTENT
          const combined = [...artworks, ...uniqueNewArtworks];
          // Deduplicate entire array by ID (in case of any duplicates in prev)
          const uniqueCombined = Array.from(
            new Map(combined.map(a => [a.id, a])).values()
          );
          // NO CAPPING - ALL CONTENT STAYS STATIC
          return uniqueCombined;
        })();
        
        // INSTAGRAM/PINTEREST-LEVEL: Update state in one batch to prevent position shifting
        // Use flushSync to ensure immediate render, then stabilize
        startTransition(() => {
          setArtworks(updatedArtworks);
        });
        
        // Brief pause to allow React to render and stabilize positions
        // This prevents content from shifting after display
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (error) {
        if (isDev) console.error('Error updating artworks state:', error);
        // Fallback: just add new artworks without complex processing
        // CRITICAL: NEVER REMOVE EXISTING CONTENT - JUST APPEND
        startTransition(() => {
          setArtworks(prev => {
            const existingIds = new Set(prev.map(a => a.id));
            const uniqueNew = newArtworks.filter(a => !existingIds.has(a.id));
            // SIMPLY APPEND - NO CAPPING, NO REMOVAL
            return [...prev, ...uniqueNew];
          });
        });
      }
      
      // Update pagination state
      // CRITICAL: Only set hasMore to false if we got NO items AND no lastDoc
      // If we got items but no lastDoc, we might have reached the end, but check if we got fewer than requested
      // If we got items equal to requested, there's definitely more content
      if (result.lastDoc) {
        setLastDocument(result.lastDoc);
        setHasMore(true); // There's more content if lastDoc exists
        if (isDev) console.log(`🔄 SCROLL LOAD: ✅ More content available (lastDoc exists, got ${result.items.length} items, requested ${LOAD_MORE_LIMIT})`);
      } else if (newArtworks.length === 0) {
        // No items and no cursor - we've reached the end
        setHasMore(false);
        if (isDev) console.log(`🔄 SCROLL LOAD: ⚠️ No more content (no items, no lastDoc)`);
      } else if (newArtworks.length < LOAD_MORE_LIMIT) {
        // Got some items but fewer than requested - might be the end, but be conservative
        // Only set hasMore to false if we got significantly fewer (less than 50% of requested)
        if (newArtworks.length < LOAD_MORE_LIMIT * 0.5) {
          setHasMore(false);
          if (isDev) console.log(`🔄 SCROLL LOAD: ⚠️ Likely no more content (got ${newArtworks.length} items, requested ${LOAD_MORE_LIMIT}, less than 50%)`);
        } else {
          // Got a reasonable amount - might be more, keep hasMore true
          setHasMore(true);
          if (isDev) console.log(`🔄 SCROLL LOAD: ⚠️ Got ${newArtworks.length} items (requested ${LOAD_MORE_LIMIT}), keeping hasMore=true to allow one more try`);
        }
      } else {
        // Got full amount - definitely more content
        setHasMore(true);
        if (isDev) console.log(`🔄 SCROLL LOAD: ✅ Got full amount (${newArtworks.length} items), more content available`);
      }

      if (isDev) console.log(`🔄 SCROLL LOAD: ✅ Successfully loaded ${newArtworks.length} more artworks (expected ${LOAD_MORE_LIMIT} for 10 rows, columnCount=${columnCount})`);
      log(`✅ Discover: Loaded ${newArtworks.length} more artworks`);
      
      // INSTAGRAM/PINTEREST-LEVEL: Content is now statically displayed - no more reloading
      // REMOVED: Auto-scroll on pagination - let user control their scroll position
    } catch (error: any) {
      if (isDev) console.error('🔄 SCROLL LOAD: ❌ Error loading more artworks:', error);
      
      // Show user-friendly error message
      if (error.message?.includes('timeout')) {
        toast({
          title: 'Loading Timeout',
          description: 'Taking longer than expected. Please try scrolling again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Failed to Load More',
          description: 'Unable to load more artworks. Please refresh the page.',
          variant: 'destructive',
        });
      }
      
      // Don't set hasMore to false immediately on error - allow retry
      // setHasMore(false);
    } finally {
      // INSTAGRAM/PINTEREST-LEVEL: Reset loading state after brief delay to show completion
      // This ensures the loading animation is visible and content is stable
      setTimeout(() => {
        setIsLoadingMore(false);
        if (isDev) console.log('🔄 SCROLL LOAD: ✅ Finished loading (isLoadingMore set to false)');
      }, 300);
    }
  }, [hasMore, lastDocument, isLoadingMore, discoverSettings, columnCount, isMobile, isDev]);

  // SAFETY: Reset isLoadingMore if it gets stuck for too long (20 seconds)
  useEffect(() => {
    if (!isLoadingMore) return;
    
    const timeoutId = setTimeout(() => {
      if (isDev) console.warn('🔄 SCROLL LOAD: ⚠️ SAFETY: isLoadingMore stuck for 20 seconds, forcing reset');
      setIsLoadingMore(false);
      toast({
        title: 'Loading Reset',
        description: 'Loading took too long and was reset. Please try scrolling again.',
        variant: 'default',
      });
    }, 20000); // 20 second safety timeout
    
    return () => clearTimeout(timeoutId);
  }, [isLoadingMore]);

  // REMOVED: AUTO-LOAD MORE - was causing uncontrolled loading on page load
  // Let the user control when to load more content via scrolling
  // The initial load should be sufficient, and pagination should only trigger on user scroll

  // PERFORMANCE: Track last load time to prevent duplicate loads from multiple triggers
  const lastLoadTimeRef = useRef<number>(0);
  const LOAD_COOLDOWN = 500; // 500ms cooldown - just enough to prevent rapid duplicate triggers

  // PERFORMANCE: Consolidated scroll handler - ONLY for prefetch, NOT for loading
  // IntersectionObserver handles the actual loading - this is just for prefetch optimization
  useEffect(() => {
    if (!hasMore || !lastDocument) return;
    
    let scrollTimeout: NodeJS.Timeout | null = null;
    
    const handleScroll = () => {
      // Debounce scroll events to prevent excessive calls
      if (scrollTimeout) clearTimeout(scrollTimeout);
      
      scrollTimeout = setTimeout(() => {
        const scrollY = window.scrollY;
        const innerHeight = window.innerHeight;
        const scrollHeight = document.documentElement.scrollHeight;
        const scrollPercentage = (scrollY + innerHeight) / scrollHeight;
        
        // ONLY prefetch at 75% scroll - do NOT trigger loadMoreArtworks here
        // IntersectionObserver handles the actual loading to prevent duplicate loads
        if (scrollPercentage > 0.75 && !fetchingRef.current && !isLoadingMore) {
          prefetchNextPage();
        }
        
        // REMOVED: Fallback loadMoreArtworks call - this was causing duplicate loads
        // IntersectionObserver is the primary mechanism and should handle all loading
      }, 200); // Increased debounce to 200ms to reduce calls
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [hasMore, isLoadingMore, lastDocument, prefetchNextPage]);

  // SIMPLE: Single IntersectionObserver for infinite scroll (like Instagram/Pinterest)
  // This is the ONLY mechanism that triggers loads - simple and reliable
  useEffect(() => {
    if (artworkView !== 'grid') return; // Grid view only - list view has separate observer
    if (!hasMore || isLoadingMore) return;
    
    const sentinel = loadMoreRef.current;
    if (!sentinel) {
      // Retry after a short delay if sentinel not ready
      const timeout = setTimeout(() => {
        const retrySentinel = loadMoreRef.current;
        if (retrySentinel && hasMore && !isLoadingMore) {
          const observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting && hasMore && !isLoadingMore) {
                  if (isDev) console.log('🔄 SCROLL LOAD: 🚀 TRIGGERING loadMoreArtworks via IntersectionObserver');
                  loadMoreArtworks();
                }
              });
            },
            { rootMargin: '400px', threshold: 0.1 }
          );
          observer.observe(retrySentinel);
          return () => observer.disconnect();
        }
      }, 100);
      return () => clearTimeout(timeout);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Simple check: if sentinel is visible and we can load, do it
          if (entry.isIntersecting && hasMore && !isLoadingMore) {
            if (isDev) console.log('🔄 SCROLL LOAD: 🚀 TRIGGERING loadMoreArtworks via IntersectionObserver');
            loadMoreArtworks();
          }
        });
      },
      {
        rootMargin: '400px', // Start loading 400px before reaching bottom
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMoreArtworks, artworkView, isDev]);

  // INSTAGRAM/PINTEREST-LEVEL: Cache filtered results to prevent content reloading
  // This ensures content stays static after being displayed
  const baseFilteredArtworks = useMemo(() => {
    const allArtworks = Array.isArray(artworks) ? artworks : [];
    
    // PERFORMANCE: Single pass filter combining all base filters
    // CRITICAL: This memoization prevents content from reloading/changing
    return allArtworks.filter((artwork: any) => {
      // Quick rejections first (most common cases)
      if (!artwork || !artwork.id) return false;
      
      // Placeholder checks
      const tags = Array.isArray(artwork.tags) ? artwork.tags : [];
      if (tags.includes('_placeholder') || artwork.id.startsWith('placeholder-')) return false;
      
      // Event checks - NEVER show events in artwork feed
      if (artwork.type === 'event' || artwork.type === 'Event' || artwork.eventType) {
        return false;
      }
      
      // Product/shop checks
      if (artwork.type === 'product' || artwork.type === 'Product' || 
          artwork.type === 'marketplace' || artwork.type === 'MarketplaceProduct' ||
          artwork.artworkType === 'merchandise' ||
          (artwork.showInShop === true && artwork.showInPortfolio !== true)) {
        return false;
      }
      
      // Media validation - RELAXED: Allow both Cloudflare AND non-Cloudflare images
      const imageUrl = artwork.imageUrl || artwork.supportingImages?.[0] || artwork.images?.[0] || '';
      const hasVideo = artwork.videoUrl || artwork.mediaType === 'video';
      
      // Only exclude Pexels images (stock photos)
      if (imageUrl && (imageUrl.includes('pexels.com') || imageUrl.includes('images.pexels.com'))) return false;
      
      // Require at least one valid media source (image or video)
      const hasValidImage = imageUrl && imageUrl.length > 0;
      const hasValidVideo = hasVideo && (artwork.videoUrl || artwork.mediaUrls?.[0]);
      
      return hasValidImage || hasValidVideo;
    });
  }, [artworks]);

  const filteredAndSortedArtworks = useMemo(() => {
    // PERFORMANCE: Start from pre-filtered base instead of re-filtering
    let realArtworks = [...baseFilteredArtworks];
    
    log('🔍 filteredAndSortedArtworks - Input:', {
      totalArtworks: realArtworks.length,
      artworkIds: realArtworks.slice(0, 10).map((a: any) => a.id),
      displayedIdsCount: displayedItemIdsRef.current.size,
      sortBy: sortBy
    });
    
    // PERFORMANCE: Combine all user filters into single pass FIRST
    // CRITICAL: Filter BEFORE splitting to preserve displayed items
    const queryLower = deferredSearchQuery ? deferredSearchQuery.toLowerCase() : '';
    const needsSearch = !!deferredSearchQuery;
    const needsMedium = selectedMedium !== 'All';
    const needsType = selectedArtworkType !== 'All';
    const needsAI = discoverSettings.hideAiAssistedArt;
    
    if (needsSearch || needsMedium || needsType || needsAI) {
      realArtworks = realArtworks.filter(artwork => {
        // Search filter
        if (needsSearch) {
          const title = (artwork.title || '').toLowerCase();
          const description = (artwork.description || '').toLowerCase();
          const artistName = (artwork.artist?.name || '').toLowerCase();
          const tags = Array.isArray(artwork.tags) ? artwork.tags : [];
          const matchesSearch = title.includes(queryLower) ||
            description.includes(queryLower) ||
            artistName.includes(queryLower) ||
            tags.some(tag => (tag || '').toLowerCase().includes(queryLower));
          if (!matchesSearch) return false;
        }
        
        // Medium filter
        if (needsMedium && artwork.medium !== selectedMedium) return false;
        
        // Artwork Type filter
        if (needsType) {
          if (!artwork.isForSale) return false;
          const tags = Array.isArray(artwork.tags) ? artwork.tags : [];
          const hasPrintTag = tags.some(tag => tag.toLowerCase() === 'print');
          const hasOriginalTag = tags.some(tag => tag.toLowerCase() === 'original');
          if (selectedArtworkType === 'Print' && !hasPrintTag) return false;
          if (selectedArtworkType === 'Original' && hasPrintTag && !hasOriginalTag) return false;
        }
        
        // AI filter
        if (needsAI && (artwork.isAI || artwork.aiAssistance !== 'none')) return false;
        
        return true;
      });
    }
    
    // CRITICAL FIX: Preserve order of already-displayed items
    // Split into displayed (keep order) and new items (sort these)
    // MUST happen AFTER filtering so displayed items don't get filtered out
    const displayedItems: any[] = [];
    const newItems: any[] = [];
    
    for (const artwork of realArtworks) {
      if (displayedItemIdsRef.current.has(artwork.id)) {
        displayedItems.push(artwork);
      } else {
        newItems.push(artwork);
      }
    }
    
    // Sort only NEW items, preserve order of displayed items
    let sortedNewItems = [...newItems];

    // Get followed artist IDs for priority boost
    const followedArtists = getFollowedArtists();
    const followedArtistIds = new Set(followedArtists.map(a => a.id));
    
    // CRITICAL FIX: Sort ONLY new items, preserve displayed items in their current order
    if (sortBy === 'popular' && artworkEngagements.size > 0) {
      // Use engagement-based scoring algorithm with follow boost (only for new items)
      const scoredArtworks = engagementScorer.scoreArtworks(sortedNewItems, artworkEngagements, followedArtistIds);
      const withDiversity = engagementScorer.applyDiversityBoost(scoredArtworks);
      sortedNewItems = engagementScorer.sortByScore(withDiversity);
    } else {
      // Traditional sorting for other options, but still prioritize followed artists (only for new items)
      switch (sortBy) {
        case 'newest':
          // Sort by newest, but prioritize followed artists
          sortedNewItems.sort((a, b) => {
            const aIsFollowed = followedArtistIds.has(a.artist.id);
            const bIsFollowed = followedArtistIds.has(b.artist.id);
            if (aIsFollowed && !bIsFollowed) return -1;
            if (!aIsFollowed && bIsFollowed) return 1;
            return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
          });
          break;
        case 'oldest':
          sortedNewItems.sort((a, b) => {
            const aIsFollowed = followedArtistIds.has(a.artist.id);
            const bIsFollowed = followedArtistIds.has(b.artist.id);
            if (aIsFollowed && !bIsFollowed) return -1;
            if (!aIsFollowed && bIsFollowed) return 1;
            return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
          });
          break;
        case 'likes':
          sortedNewItems.sort((a, b) => {
            const aIsFollowed = followedArtistIds.has(a.artist.id);
            const bIsFollowed = followedArtistIds.has(b.artist.id);
            if (aIsFollowed && !bIsFollowed) return -1;
            if (!aIsFollowed && bIsFollowed) return 1;
            return (b.likes || 0) - (a.likes || 0);
          });
          break;
        case 'recent':
          sortedNewItems.sort((a, b) => {
            const aIsFollowed = followedArtistIds.has(a.artist.id);
            const bIsFollowed = followedArtistIds.has(b.artist.id);
            if (aIsFollowed && !bIsFollowed) return -1;
            if (!aIsFollowed && bIsFollowed) return 1;
            return (b.updatedAt?.getTime() || b.createdAt?.getTime() || 0) - (a.updatedAt?.getTime() || a.createdAt?.getTime() || 0);
          });
          break;
        default:
          // Default: Use engagement-based ranking if we have engagement data
          if (artworkEngagements.size > 0) {
            const scoredArtworks = engagementScorer.scoreArtworks(sortedNewItems, artworkEngagements, followedArtistIds);
            const withDiversity = engagementScorer.applyDiversityBoost(scoredArtworks);
            sortedNewItems = engagementScorer.sortByScore(withDiversity);
          } else {
            // Fallback to newest if no engagement data, but prioritize followed artists
            sortedNewItems.sort((a, b) => {
              const aIsFollowed = followedArtistIds.has(a.artist.id);
              const bIsFollowed = followedArtistIds.has(b.artist.id);
              if (aIsFollowed && !bIsFollowed) return -1;
              if (!aIsFollowed && bIsFollowed) return 1;
              return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
            });
          }
          break;
      }
    }
    
    // CRITICAL FIX: Combine displayed items (preserved order) + sorted new items (append at end)
    // This ensures section 1 stays static, section 2 stays static, etc.
    const sorted = [...displayedItems, ...sortedNewItems];
    
    // Update displayed IDs ref to track what's been displayed
    sorted.forEach(item => displayedItemIdsRef.current.add(item.id));

    log('🔍 filteredAndSortedArtworks:', {
      totalFiltered: baseFilteredArtworks.length,
      sortedRealArtworks: sorted.length
    });
    
    log('✅ Discover: Returning', sorted.length, 'real artworks');
    // INSTAGRAM/PINTEREST-LEVEL: Return stable sorted array to prevent content reloading
    // This ensures once content is displayed, it stays static
    return sorted;
  }, [baseFilteredArtworks, deferredSearchQuery, selectedMedium, selectedArtworkType, sortBy, discoverSettings.hideAiAssistedArt, artworkEngagements, getFollowedArtists]);

  // Filter and sort marketplace products
  const filteredAndSortedMarketProducts = useMemo(() => {
    let filtered = Array.isArray(marketplaceProducts) ? marketplaceProducts : [];

    // Search filter
    if (marketSearchQuery) {
      const queryLower = marketSearchQuery.toLowerCase();
      filtered = filtered.filter(product => {
        const title = (product.title || '').toLowerCase();
        const description = (product.description || '').toLowerCase();
        const sellerName = (product.sellerName || '').toLowerCase();
        const tags = Array.isArray(product.tags) ? product.tags : [];
        return (
          title.includes(queryLower) ||
          description.includes(queryLower) ||
          sellerName.includes(queryLower) ||
          tags.some(tag => (tag || '').toLowerCase().includes(queryLower))
        );
      });
    }

    // Category filter
    if (selectedMarketCategory !== 'All') {
      if (selectedMarketCategory === 'Limited Edition Prints') {
        filtered = filtered.filter(product => 
          product.tags?.some(tag => tag.toLowerCase().includes('limited')) ||
          product.subcategory?.toLowerCase().includes('limited') ||
          product.title.toLowerCase().includes('limited')
        );
      } else if (selectedMarketCategory === 'All Prints') {
        filtered = filtered.filter(product => 
          product.category?.toLowerCase().includes('print') ||
          product.subcategory?.toLowerCase().includes('print') ||
          product.title.toLowerCase().includes('print')
        );
      } else if (selectedMarketCategory === 'Original Artworks') {
        filtered = filtered.filter(product => 
          product.category?.toLowerCase().includes('artwork') ||
          product.category?.toLowerCase().includes('original') ||
          (!product.category?.toLowerCase().includes('print') && !product.subcategory?.toLowerCase().includes('print'))
        );
      } else if (selectedMarketCategory === 'Books') {
        filtered = filtered.filter(product => 
          product.category?.toLowerCase().includes('book') ||
          product.title.toLowerCase().includes('book')
        );
      }
    }

    // Sort
    const sorted = Array.isArray(filtered) ? [...filtered] : [];
    switch (marketSortBy) {
      case 'newest':
        sorted.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        break;
      case 'oldest':
        sorted.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
        break;
      case 'price-low':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        sorted.sort((a, b) => b.price - a.price);
        break;
      default:
        break;
    }

    return Array.isArray(sorted) ? sorted : [];
  }, [marketplaceProducts, marketSearchQuery, selectedMarketCategory, marketSortBy]);

  // Calculate items per row based on screen size
  const getItemsPerRow = useMemo(() => {
    return () => {
      if (typeof window === 'undefined') return 6; // Default for SSR
      const width = window.innerWidth;
      if (width >= 1280) return 6; // xl:grid-cols-6
      if (width >= 1024) return 5; // lg:grid-cols-5
      if (width >= 768) return 4;  // md:grid-cols-4
      return 3; // sm:grid-cols-3 (mobile)
    };
  }, []);

  // PERFORMANCE: Resize handling consolidated above - this effect removed

  // Infinite scroll observer for list view - progressively show more items
  // SIMPLE: IntersectionObserver for list view (video feed) - separate from grid
  useEffect(() => {
    if (artworkView !== 'list') return;
    if (!hasMore || isLoadingMore) return;
    
    const sentinel = loadMoreRef.current;
    if (!sentinel) {
      // Retry after a short delay if sentinel not ready
      const timeout = setTimeout(() => {
        const retrySentinel = loadMoreRef.current;
        if (retrySentinel && hasMore && !isLoadingMore) {
          const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && hasMore && !isLoadingMore) {
                if (isDev) console.log('🔄 SCROLL LOAD: 🚀 TRIGGERING loadMoreArtworks via IntersectionObserver (list view)');
                loadMoreArtworks();
              }
            });
          }, { rootMargin: '400px', threshold: 0.1 });
          observer.observe(retrySentinel);
          return () => observer.disconnect();
        }
      }, 100);
      return () => clearTimeout(timeout);
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMore && !isLoadingMore) {
          if (isDev) console.log('🔄 SCROLL LOAD: 🚀 TRIGGERING loadMoreArtworks via IntersectionObserver (list view)');
          loadMoreArtworks();
        }
      });
    }, {
      rootMargin: '400px',
      threshold: 0.1,
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMoreArtworks, artworkView, isDev]);

  // INSTAGRAM/PINTEREST-LEVEL: Smart preloading - only preload viewport + 1 row buffer
  // Don't preload everything upfront - let IntersectionObserver handle lazy loading
  const preloadLinksRef = useRef<HTMLLinkElement[]>([]);
  
  useEffect(() => {
    if (typeof window === 'undefined' || filteredAndSortedArtworks.length === 0) {
      // Clean up old links when no artworks
      preloadLinksRef.current.forEach(link => link.remove());
      preloadLinksRef.current = [];
      return;
    }
    
    // PERFORMANCE: Clean up old preload links first to prevent accumulation
    preloadLinksRef.current.forEach(link => {
      try {
        if (link.parentNode) {
          link.remove();
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    });
    preloadLinksRef.current = [];
    
    // INSTAGRAM/PINTEREST-LEVEL: Only preload viewport + 1 row (not 40-60 images)
    // Let IntersectionObserver handle the rest - this prevents loading too much upfront
    const viewportItems = isMobile ? 8 : 15; // Mobile: 2 cols × 4 rows, Desktop: 5 cols × 3 rows
    const preloadCount = Math.min(viewportItems, filteredAndSortedArtworks.length);
    const criticalArtworks = filteredAndSortedArtworks.slice(0, preloadCount);
    
    criticalArtworks.forEach((artwork) => {
      const imageUrl = artwork.imageUrl;
      if (!imageUrl) return;
      
      // PRIORITY: Use Thumbnail variant for preload (smallest, fastest)
      let preloadUrl = imageUrl;
      if (imageUrl.includes('imagedelivery.net')) {
        const cloudflareMatch = imageUrl.match(/imagedelivery\.net\/([^/]+)\/([^/]+)/);
        if (cloudflareMatch) {
          const [, accountHash, imageId] = cloudflareMatch;
          // Use Thumbnail for preload (smallest, ~10-20KB)
          preloadUrl = `https://imagedelivery.net/${accountHash}/${imageId}/Thumbnail`;
        }
      } else if (imageUrl.includes('cloudflarestream.com')) {
        preloadUrl = imageUrl;
      } else if (imageUrl.includes('firebasestorage') || imageUrl.includes('firebase')) {
        const encodedUrl = encodeURIComponent(imageUrl);
        preloadUrl = `/_next/image?url=${encodedUrl}&w=240&q=75`;
      }
      
      // Create preload link and track it for cleanup
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = preloadUrl;
      link.setAttribute('fetchpriority', 'high');
      document.head.appendChild(link);
      preloadLinksRef.current.push(link);
    });

    log(`🚀 Preloaded ${preloadCount} viewport images (Pinterest/Instagram style - minimal preload)`);
    
    // Cleanup on unmount or when artworks change
    return () => {
      preloadLinksRef.current.forEach(link => {
        try {
          if (link.parentNode) {
            link.remove();
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      });
      preloadLinksRef.current = [];
    };
  }, [filteredAndSortedArtworks, columnCount, isMobile]);

  // CRITICAL FIX: ALL CONTENT MUST BE STATIC - NO LIMITS ON RENDERED ITEMS
  // This prevents content from reloading/changing after being displayed
  const visibleFilteredArtworks = useMemo(() => {
    const totalItems = Array.isArray(filteredAndSortedArtworks) ? filteredAndSortedArtworks.length : 0;
    
    // NO LIMITS - ALL CONTENT STAYS VISIBLE AND STATIC
    // User can scroll through all loaded sections without content disappearing
    const safeTotalItems = totalItems;
    
    // Check how many placeholders are in the array
    const placeholderCount = Array.isArray(filteredAndSortedArtworks) 
      ? filteredAndSortedArtworks.filter((a: any) => {
          const tags = Array.isArray(a.tags) ? a.tags : [];
          return tags.includes('_placeholder');
        }).length
      : 0;
    
    log('🔍 visibleFilteredArtworks calculation:', {
      totalItems,
      safeTotalItems,
      visibleCount,
      placeholderCount,
      filteredAndSortedArtworksLength: filteredAndSortedArtworks?.length,
      firstFewIds: filteredAndSortedArtworks?.slice(0, 5).map((a: any) => a.id)
    });
    
    if (safeTotalItems === 0) {
      log('⚠️ visibleFilteredArtworks: No items to display');
      return [];
    }
    
    // CRITICAL FIX: Show ALL items - no capping, no limits, no slicing
    // visibleCount is just for initial load calculation, but once content is loaded, show ALL of it
    // This ensures section 1, section 2, section 3, etc. all stay visible and static
    // NEVER slice - show everything that's been loaded
    
    const artworksSlice = Array.isArray(filteredAndSortedArtworks)
      ? filteredAndSortedArtworks // NO SLICING - SHOW ALL LOADED ITEMS
      : [];
    
    // Mix ads into artworks
    const result = mixAdsIntoContent(artworksSlice, ads, 2);
    
    log('✅ visibleFilteredArtworks: Returning', result.length, 'items');
    return result;
  }, [filteredAndSortedArtworks, visibleCount, ads]);

  useEffect(() => {
    // CRITICAL FIX: Reset to device-appropriate count when filters change
    // USER REQUEST: 9 rows initially - Mobile: 18 items (2 cols × 9 rows), Desktop: 45 items (5 cols × 9 rows)
    // DO NOT reset to lower values - this was causing only 3 tiles to show
    // NO LIMITS - visibleCount is only for initial load calculation, not for capping displayed content
    const resetCount = isMobile ? 18 : 45; // 9 rows as requested (was 40/60)
    setVisibleCount(resetCount);
  }, [searchQuery, selectedMedium, selectedArtworkType, sortBy, selectedEventLocation, isMobile]);

  // Marketplace products useEffect removed - marketplace tab is hidden

  // Events useEffect - fetch real events from Firestore
  useEffect(() => {
    if (!mounted) return;
    
    const fetchEvents = async () => {
      try {
        log('🎫 Discover: Fetching events...');
        // Simple query without composite index requirement
        const eventsQuery = query(
          collection(db, 'events'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        
        // Filter for active events in JavaScript to avoid composite index
        const eventItems = eventsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((event: any) => event.status === 'active');
        
        log(`✅ Discover: Loaded ${eventItems.length} active events (from ${eventsSnapshot.docs.length} total)`);
        setEvents(eventItems);
      } catch (error) {
        if (isDev) console.error('Error fetching events:', error);
        // Fallback to placeholder events on error
        const placeholderEvents = generatePlaceholderEvents(theme, 12);
        setEvents(placeholderEvents);
      }
    };
    
    fetchEvents();
  }, [mounted, theme]);

  // Render initial tiles invisibly during loading so poster images can preload
  // Videos will load in background and autoplay when ready (onCanPlay)

  return (
    <>
      {/* Fixed Loading Screen Overlay - Independent of content area */}
      {/* Positioned fixed to viewport, completely removed from DOM when dismissed */}
      {/* Navigation has z-[60], so this uses z-[50] to stay below navigation but above content */}
      {showLoadingScreen && typeof window !== 'undefined' ? (
        <div 
          className="fixed inset-0 bg-background flex items-center justify-center"
          style={{
            zIndex: 50, // Below navigation (z-[60]) but above content
            pointerEvents: 'none', // Never block navigation or content clicks
            isolation: 'isolate', // Create own stacking context
          }}
          aria-hidden="true"
        >
          <div 
            className="flex flex-col items-center justify-center gap-6 pt-24"
            style={{
              pointerEvents: 'auto', // Allow interaction with loading animation itself
            }}
          >
            <ThemeLoading size="lg" />
            {/* Joke animation removed to speed up loading - jokes list preserved in typewriter-joke.tsx for future use */}
          </div>
        </div>
      ) : null}
      
      <div className="min-h-screen bg-background">
        {/* Main content - render immediately so images/videos can load */}
        {/* Only hide visually if loading screen is actually shown (optional) */}
        <div className={showLoadingScreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}>
        {/* Preload tiles invisibly during loading - render in viewport but hidden so browser loads images */}
        {(showLoadingScreen && initialImagesTotal > 0) && (
          <div className="absolute inset-0 opacity-0 pointer-events-none" style={{ zIndex: -1 }} aria-hidden="true">
            {(() => {
              // INSTAGRAM/PINTEREST-LEVEL: Preload 40-60+ items during loading screen (doubled)
              // Desktop: 60 items (5 cols × 12 rows), Mobile: 40 items (2 cols × 20 rows)
              const connectionSpeed = getConnectionSpeed();
              const preloadCount = isMobile
                ? (connectionSpeed === 'fast' ? 40 : connectionSpeed === 'medium' ? 32 : 24)
                : (connectionSpeed === 'fast' ? 60 : connectionSpeed === 'medium' ? 48 : 36);
              const MAX_VIDEOS_PER_VIEWPORT = 3;
              
              const preloadTiles: Artwork[] = [];
              let preloadVideoCount = 0;
              
              // Preload ALL initial viewport items, not just a few
              for (const item of visibleFilteredArtworks) {
                if (preloadTiles.length >= preloadCount) break;
                if ('type' in item && item.type === 'ad') continue;
                
                const artwork = item as Artwork;
                const hasVideo = (artwork as any).videoUrl || (artwork as any).mediaType === 'video';
                
                if (hasVideo) {
                  if (preloadVideoCount < MAX_VIDEOS_PER_VIEWPORT) {
                    preloadTiles.push(artwork);
                    preloadVideoCount++;
                  }
                } else {
                  preloadTiles.push(artwork);
                }
              }
              
              // Preload ALL items we collected (up to preloadCount) for maximum speed
              const preloadSlice = preloadTiles;
              
              return preloadSlice.map((artwork) => {
                const isInitial = true;
                const hasVideo = (artwork as any).videoUrl || (artwork as any).mediaType === 'video';
                const hasImage = !!artwork.imageUrl;
                
                return (
                  <ArtworkTile 
                    key={`preload-${artwork.id}`}
                    artwork={artwork} 
                    hideBanner={isMobile && artworkView === 'list'}
                    // Mark as initial viewport so videos start loading immediately and autoplay when ready
                    isInitialViewport={isInitial && (hasVideo || hasImage) ? true : undefined}
                    // Track image loading (including video posters) - ArtworkTile will pass isVideoPoster flag
                    onImageReady={isInitial && (hasImage || hasVideo) ? (isVideoPoster) => handleImageReady(artwork.id, isVideoPoster) : undefined}
                    // Track video metadata loading
                    onVideoReady={isInitial && hasVideo ? () => handleVideoReady(artwork.id) : undefined}
                  />
                );
              });
            })()}
          </div>
        )}
        
        {/* Main content - always clickable, navigation outside this container */}
        <div 
          className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 w-full max-w-full overflow-y-visible"
          style={isMobile ? { overflowX: 'visible', paddingRight: '1.5rem' } : { overflowX: 'hidden' }}
        >
        {/* Tabs for Artwork/Events/Market */}
        <Tabs
          value={activeTab}
        onValueChange={(value) => {
            startTransition(() => {
              setActiveTab(value as 'artwork' | 'events');
            });
            // Defer router update to avoid blocking UI
            setTimeout(() => {
              router.replace(`/discover?tab=${value}`, { scroll: false });
            }, 0);
          }}
          className="mb-6"
        >
          <TabsList className="w-full" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', padding: 0, background: 'transparent' }}>
            <TabsTrigger value="artwork" className="flex items-center justify-center gap-2 px-4 md:px-6 h-10 rounded-l-md border-2" style={{ width: '100%', boxSizing: 'border-box' }}>
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Discover</span>
              <span className="sm:hidden">Discover</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center justify-center gap-2 px-4 md:px-6 h-10 rounded-r-md border-2" style={{ width: '100%', boxSizing: 'border-box' }}>
              <Calendar className="h-4 w-4" />
              Events
            </TabsTrigger>
          </TabsList>
          {/* Bottom row - Filter and View Selector aligned with top row split */}
          <div className="hidden md:flex items-center w-full overflow-visible mb-0 mt-0" style={{ gap: '2px' }}>
            <div className="flex-1 filter-view-grid">
              {activeTab === 'artwork' ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => startTransition(() => setShowFilters(!showFilters))}
                    className={cn(
                      "h-10 px-4 md:px-6 rounded-l-md border-2 border-border w-full",
                      showFilters && "bg-muted"
                    )}
                    style={{ width: '100%' }}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                  <ViewSelector view={artworkView} onViewChange={setArtworkView} className="rounded-md w-full" style={{ width: '100%' }} />
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => startTransition(() => setShowEventFilters(!showEventFilters))}
                    className={cn(
                      "h-10 px-4 md:px-6 rounded-l-md border-2 border-border",
                      showEventFilters && "bg-muted"
                    )}
                    style={{ width: '100%' }}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                  <ViewSelector view={eventsView} onViewChange={setEventsView} className="w-full" />
                </>
              )}
            </div>
          </div>

          {/* Artwork Tab */}
          <TabsContent value="artwork" className="!pt-0 mobile-artwork-tab">
            {/* Search and Filter Bar */}
            <div className="mb-0 space-y-2 overflow-visible">
              {/* Remove gap between filter bar and content */}
              {/* Mobile: Filter and View Toggle - use exact same structure as desktop */}
              {isMobile && (
                <div className="flex items-center gap-0 w-full overflow-visible mb-0 mt-0">
                  <div className="flex-1 filter-view-grid">
                    <Button
                      variant="ghost"
                      onClick={() => startTransition(() => setShowFilters(!showFilters))}
                      className={cn(
                        "h-10 px-4 rounded-l-md border-2 border-border w-full",
                        showFilters && "bg-muted"
                      )}
                      style={{ width: '100%' }}
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                    <ViewSelector view={artworkView} onViewChange={setArtworkView} className="rounded-md w-full" style={{ width: '100%' }} />
                  </div>
                </div>
              )}

              {/* Filters Panel */}
              {showFilters && (
                <Card className="p-4 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search artworks, artists, or tags..."
                      value={searchQuery}
                      onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
                      className="pl-10"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Medium</label>
                      <Select value={selectedMedium} onValueChange={(value) => startTransition(() => setSelectedMedium(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEDIUMS.map((med) => (
                            <SelectItem key={med} value={med}>
                              {med}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Type</label>
                      <Select value={selectedArtworkType} onValueChange={(value) => startTransition(() => setSelectedArtworkType(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ARTWORK_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Sort By</label>
                      <Select value={sortBy} onValueChange={(value) => startTransition(() => setSortBy(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SORT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        startTransition(() => {
                          setSelectedMedium('All');
                          setSelectedArtworkType('All');
                          setSortBy('newest');
                          setSearchQuery('');
                        });
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  </div>
                </Card>
              )}

              {/* Active Filters Display */}
              {(selectedMedium !== 'All' || selectedArtworkType !== 'All' || searchQuery) && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      Search: {searchQuery}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => startTransition(() => setSearchQuery(''))} />
                    </Badge>
                  )}
                  {selectedMedium !== 'All' && (
                    <Badge variant="secondary" className="gap-1">
                      Medium: {selectedMedium}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => startTransition(() => setSelectedMedium('All'))} />
                    </Badge>
                  )}
                  {selectedArtworkType !== 'All' && (
                    <Badge variant="secondary" className="gap-1">
                      Type: {selectedArtworkType}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => startTransition(() => setSelectedArtworkType('All'))} />
                    </Badge>
                  )}
                        </div>
              )}
              
            </div>
            
            {/* Artworks Grid - Padding from filter bar above */}
            {/* Show content when loading screen is dismissed */}
            <div className="mt-4 md:mt-0">
            {!showLoadingScreen && filteredAndSortedArtworks.length === 0 ? (
              <div className="text-center py-16">
                <Eye className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-2">No artworks found</h2>
                <p className="text-muted-foreground mb-4">
                  {(searchQuery || selectedMedium !== 'All' || selectedArtworkType !== 'All')
                    ? 'Try adjusting your filters to see more results.'
                    : 'Check back later for new content.'}
                </p>
                {(searchQuery || selectedMedium !== 'All' || selectedArtworkType !== 'All') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      startTransition(() => {
                        setSelectedMedium('All');
                        setSelectedArtworkType('All');
                        setSearchQuery('');
                      });
                    }}
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            ) : !showLoadingScreen && artworkView === 'grid' ? (
              <MasonryGrid
                items={(() => {
                  // Grid view shows ONLY images (no videos) from Cloudflare
                  // Videos will only appear in video feed (list view)
                  // CRITICAL: Use ALL filteredAndSortedArtworks for grid view, not visibleFilteredArtworks
                  // This ensures all items are displayed and gaps are filled
                  const imageOnlyArtworks = filteredAndSortedArtworks.filter((item) => {
                    // Keep ads
                    if ('type' in item && item.type === 'ad') return true;
                    // Filter out videos - only show images in grid view
                    const artwork = item as Artwork;
                    const hasVideo = (artwork as any).videoUrl || (artwork as any).mediaType === 'video';
                    if (hasVideo) return false; // Filter out videos
                    
                    // RELAXED: Allow both Cloudflare and non-Cloudflare images
                    const imageUrl = artwork.imageUrl || (artwork as any).supportingImages?.[0] || (artwork as any).images?.[0] || '';
                    if (!imageUrl) return false; // Skip items with no image
                    // Only skip Pexels stock images
                    if (imageUrl.includes('pexels.com') || imageUrl.includes('images.pexels.com')) return false;
                    
                    return true;
                  });
                  console.log('🖼️ Grid view (images only):', {
                    artworkView,
                    totalArtworks: filteredAndSortedArtworks.length,
                    imageArtworksCount: imageOnlyArtworks.length,
                    filteredOut: filteredAndSortedArtworks.length - imageOnlyArtworks.length
                  });
                  return imageOnlyArtworks;
                })()}
                columnCount={columnCount}
                gap={4}
                renderItem={(item) => {
                  // Check if this is an ad
                  const isAd = 'type' in item && item.type === 'ad';
                  if (isAd) {
                    return (
                      <AdTile
                        campaign={item.campaign}
                        placement="discover"
                        userId={user?.id}
                        isMobile={isMobile}
                      />
                    );
                  }
                  
                  const artwork = item as Artwork;
                  
                  // Grid view only shows images (videos filtered out above)
                  const hasVideo = (artwork as any).videoUrl || (artwork as any).mediaType === 'video';
                  
                  // Check if this is in initial viewport (first 12 tiles)
                  const isInitial = visibleFilteredArtworks.indexOf(artwork) < 12;
                  
                  return (
                    <ArtworkTile 
                      artwork={artwork} 
                      hideBanner={isMobile && (artworkView as string) === 'list'}
                      isInitialViewport={isInitial && hasVideo}
                      onVideoReady={isInitial && hasVideo ? () => handleVideoReady(artwork.id) : undefined}
                    />
                  );
                }}
                loadMoreRef={loadMoreRef}
                isLoadingMore={isLoadingMore}
              />
            ) : !showLoadingScreen && artworkView === 'list' ? (
              <>
                {/* Video feed - Only videos, 1 per row, 1 column, full width */}
                {(() => {
                  // CRITICAL: Log all artworks first to see what we're working with
                  console.log('🎬 VIDEO FEED DEBUG - All visibleFilteredArtworks:', {
                    total: visibleFilteredArtworks.length,
                    sample: visibleFilteredArtworks.slice(0, 5).map((item: any) => ({
                      id: item.id,
                      title: item.title,
                      videoUrl: item.videoUrl,
                      mediaType: item.mediaType,
                      mediaUrls: item.mediaUrls,
                      mediaTypes: item.mediaTypes,
                      imageUrl: item.imageUrl,
                      allKeys: Object.keys(item)
                    }))
                  });
                  
                  // Filter to only videos for video feed (list view)
                  const videoArtworks = visibleFilteredArtworks.filter((item) => {
                    if ('type' in item && item.type === 'ad') return false; // Exclude ads
                    
                    // Access videoUrl directly from item (not through artwork cast)
                    const videoUrl = (item as any).videoUrl || '';
                    const mediaType = (item as any).mediaType || '';
                    const mediaUrls = (item as any).mediaUrls || [];
                    const mediaTypes = (item as any).mediaTypes || [];
                    const imageUrl = (item as any).imageUrl || '';
                    
                    // RELAXED: Accept videos from any CDN source (Cloudflare, Firebase, etc.)
                    // Check for video in multiple ways:
                    // 1. Direct videoUrl field (most reliable)
                    const hasVideoUrl = !!videoUrl && videoUrl.length > 0;
                    // 2. mediaType field
                    const hasVideoMediaType = mediaType === 'video' && videoUrl.length > 0;
                    // 3. mediaUrls array with video type
                    const hasVideoInMediaUrls = Array.isArray(mediaUrls) && mediaUrls.length > 0 && 
                                               Array.isArray(mediaTypes) && mediaTypes.includes('video');
                    // 4. Check if imageUrl is actually a Stream thumbnail (indicates video)
                    const isCloudflareThumbnail = imageUrl.includes('cloudflarestream.com') && 
                                                  (imageUrl.includes('/thumbnails/') || imageUrl.includes('thumbnail'));
                    
                    // Allow all videos regardless of CDN source
                    const hasVideo = hasVideoUrl || hasVideoMediaType || hasVideoInMediaUrls || isCloudflareThumbnail;
                    
                    // Debug logging for each item
                    console.log('🔍 Checking item for video:', {
                      id: (item as any).id,
                      title: (item as any).title,
                      hasVideoUrl,
                      hasVideoMediaType,
                      hasVideoInMediaUrls,
                      isCloudflareThumbnail,
                      isCloudflareVideo,
                      videoUrl,
                      imageUrl,
                      mediaType,
                      mediaUrls,
                      mediaTypes,
                      isVideo: hasVideo,
                      itemKeys: Object.keys(item)
                    });
                    
                    return hasVideo;
                  });
                  
                  console.log('🎬 Video feed (list view - videos only):', {
                    artworkView,
                    totalArtworks: visibleFilteredArtworks.length,
                    videoArtworksCount: videoArtworks.length,
                    filteredOut: visibleFilteredArtworks.length - videoArtworks.length,
                    allArtworkIds: visibleFilteredArtworks.slice(0, 10).map((a: any) => a.id),
                    videoArtworkIds: videoArtworks.slice(0, 10).map((a: any) => a.id),
                    videoArtworks: videoArtworks.map((a: any) => ({
                      id: a.id,
                      title: a.title,
                      videoUrl: (a as any).videoUrl,
                      mediaType: (a as any).mediaType,
                      mediaUrls: (a as any).mediaUrls,
                      mediaTypes: (a as any).mediaTypes
                    }))
                  });
                  
                  if (videoArtworks.length === 0) {
                    console.warn('⚠️ No videos found in video feed. Total artworks:', visibleFilteredArtworks.length);
                    console.warn('⚠️ Sample artworks:', visibleFilteredArtworks.slice(0, 5).map((a: any) => ({
                      id: a.id,
                      title: a.title,
                      hasVideoUrl: !!(a as any).videoUrl,
                      mediaType: (a as any).mediaType,
                      mediaUrls: (a as any).mediaUrls,
                      mediaTypes: (a as any).mediaTypes
                    })));
                  }
                  
                  return (
                    <div className="w-full space-y-0 flex flex-col items-center mt-0">
                      {videoArtworks.length === 0 ? (
                        // Always show loading animation - never show "No videos available" message
                        // This prevents flickering and users clicking away
                        <VideoLoadingAnimation />
                      ) : (
                        videoArtworks.map((item) => {
                        const artwork = item as Artwork;
                        const hasVideo = (artwork as any).videoUrl || (artwork as any).mediaType === 'video';
                        let videoUrl = (artwork as any).videoVariants?.full || (artwork as any).videoUrl;
                        
                        // Handle Cloudflare Stream URLs - need to use HLS manifest
                        const isCloudflareStream = videoUrl?.includes('cloudflarestream.com') || 
                                                   videoUrl?.includes('videodelivery.net');
                        
                        if (isCloudflareStream && videoUrl) {
                          // Extract video ID first (needed for fallback)
                          let videoId: string | null = null;
                          const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
                          
                          // Try customer subdomain format: customer-{accountId}.cloudflarestream.com/{videoId}
                          const customerMatch = videoUrl.match(/customer-[^/]+\.cloudflarestream\.com\/([^/?]+)/);
                          if (customerMatch) {
                            videoId = customerMatch[1];
                          } else {
                            // Try videodelivery.net format: videodelivery.net/{videoId}
                            const videoDeliveryMatch = videoUrl.match(/videodelivery\.net\/([^/?]+)/);
                            if (videoDeliveryMatch) {
                              videoId = videoDeliveryMatch[1];
                            } else {
                              // Fallback: try to extract from any cloudflarestream.com URL
                              const fallbackMatch = videoUrl.match(/cloudflarestream\.com\/([^/?]+)/);
                              if (fallbackMatch) {
                                videoId = fallbackMatch[1];
                              }
                            }
                          }
                          
                          // If URL already has .m3u8, use it as-is but store videoId for fallback
                          if (videoUrl.includes('.m3u8')) {
                            console.log('✅ Video URL already has .m3u8, using as-is:', videoUrl);
                            // Store videoId for potential fallback if this URL fails
                            if (!videoId) {
                              // Extract from .m3u8 URL
                              const m3u8Match = videoUrl.match(/\/([^/]+)\/manifest\/video\.m3u8/);
                              if (m3u8Match) videoId = m3u8Match[1];
                            }
                          } else if (videoId) {
                            // Construct HLS manifest URL - try customer subdomain first, then videodelivery.net
                            if (accountId) {
                              videoUrl = `https://customer-${accountId}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
                              console.log('✅ Constructed HLS manifest URL (customer subdomain):', videoUrl);
                            } else {
                              videoUrl = `https://videodelivery.net/${videoId}/manifest/video.m3u8`;
                              console.log('⚠️ Using videodelivery.net (no account ID):', videoUrl);
                            }
                          } else {
                            console.error('❌ Could not extract video ID from Cloudflare Stream URL:', videoUrl);
                            console.error('❌ Original artwork data:', artwork);
                          }
                        } else {
                          console.log('⚠️ Video URL is not Cloudflare Stream:', videoUrl);
                        }
                        
                        // Ensure videoUrl is valid before proceeding
                        if (!videoUrl) {
                          console.error('❌ No valid video URL found for artwork:', artwork.id);
                          return null;
                        }
                        
                        const avatarPlaceholder = theme === 'dark'
                          ? '/assets/placeholder-dark.png'
                          : '/assets/placeholder-light.png';
                        
                        const liked = isLiked(artwork.id);
                        
                        // Only render if it has a video
                        if (!hasVideo || !videoUrl) return null;
                        
                        return (
                          <VideoPlayer
                            key={artwork.id}
                            videoUrl={videoUrl}
                            artwork={artwork}
                            avatarPlaceholder={avatarPlaceholder}
                            liked={liked}
                            toggleLike={toggleLike}
                          />
                        );
                      }))}
                    </div>
                  );
                })()}
                {/* Sentinel element for infinite scroll in video feed */}
                <div ref={loadMoreRef} className="h-20 w-full" />
              </>
            ) : null}
            </div>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="!pt-0">
            {/* Search and Filter Bar */}
            <div className="mb-0 space-y-2 overflow-visible">
              {/* Mobile: Filter and View Toggle - match artwork tab structure */}
              {isMobile && (
                <div className="flex items-center gap-0 w-full overflow-visible mb-0 mt-0">
                  <div className="flex-1 filter-view-grid">
                    <Button
                      variant="ghost"
                      onClick={() => setShowEventFilters(!showEventFilters)}
                      className={cn(
                        "h-10 px-4 rounded-l-md border-2 border-border w-full",
                        showEventFilters && "bg-muted"
                      )}
                      style={{ width: '100%' }}
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                    <ViewSelector view={eventsView} onViewChange={setEventsView} className="rounded-md w-full" style={{ width: '100%' }} />
                  </div>
                </div>
              )}

              {/* Filters Panel */}
              {showEventFilters && (
                <Card className="p-4 space-y-4">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search events by location (e.g., New York, London, Paris)..."
                      value={selectedEventLocation}
                      onChange={(e) => setSelectedEventLocation(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Event Type</label>
                      <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EVENT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              )}

              {/* Active Filters */}
              {(selectedEventLocation || selectedEventType !== 'All Events') && (
                <div className="flex flex-wrap gap-2 items-center">
                  {(selectedEventLocation || selectedEventType !== 'All Events') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEventLocation('');
                        setSelectedEventType('All Events');
                      }}
                    >
                      Clear All Filters
                      </Button>
                  )}
                  {selectedEventLocation && (
                    <Badge variant="secondary" className="gap-1">
                      Location: {selectedEventLocation}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedEventLocation('')} />
                    </Badge>
                  )}
                  {selectedEventType !== 'All Events' && (
                    <Badge variant="secondary" className="gap-1">
                      Type: {selectedEventType}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedEventType('All Events')} />
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Filtered Events */}
            {(() => {
              const filteredEvents = events.filter((event: any) => {
                // Location filter - check tags first, then fallback to location text
                if (selectedEventLocation.trim()) {
                  const searchTerm = selectedEventLocation.toLowerCase().trim();
                  // Check tags array for location tag
                  const eventTags = Array.isArray(event.tags) ? event.tags : [];
                  const hasLocationTag = eventTags.some((tag: string) => 
                    tag.toLowerCase().includes(searchTerm)
                  );
                  // Also check locationTag field
                  const locationTagMatch = event.locationTag && 
                    event.locationTag.toLowerCase().includes(searchTerm);
                  // Fallback to location text fields
                  const eventLocation = (event.location || event.locationName || event.locationAddress || '').toLowerCase();
                  const eventVenue = ((event as any).venue || '').toLowerCase();
                  
                  if (!hasLocationTag && !locationTagMatch && 
                      !eventLocation.includes(searchTerm) && 
                      !eventVenue.includes(searchTerm)) {
                    return false;
                  }
                }

                // Event type filter
                if (selectedEventType !== 'All Events') {
                  const eventType = (event.type || '').toLowerCase();
                  const selectedType = selectedEventType.toLowerCase();
                  
                  // Map filter options to event types
                  if (selectedType === 'exhibition') {
                    if (!eventType.includes('exhibition')) return false;
                  } else if (selectedType === 'gallery') {
                    if (!eventType.includes('gallery') && !eventType.includes('opening')) return false;
                  } else if (selectedType === 'meet and greet') {
                    if (!eventType.includes('meet') && !eventType.includes('greet')) return false;
                  } else if (selectedType === 'pop up event') {
                    if (!eventType.includes('pop') && !eventType.includes('popup')) return false;
                  }
                }

                return true;
              });

              if (filteredEvents.length === 0) {
                return (
                  <div className="text-center py-16">
                    <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-2xl font-semibold mb-2">No events found</h2>
                    <p className="text-muted-foreground mb-4">
                      {(selectedEventLocation.trim() || selectedEventType !== 'All Events')
                        ? 'No events found matching your filters. Try adjusting your filters or clear them to see all events.'
                        : 'Check back later for upcoming exhibitions, workshops, and art events.'}
                    </p>
                    {(selectedEventLocation.trim() || selectedEventType !== 'All Events') && (
                      <Button variant="outline" onClick={() => {
                        setSelectedEventLocation('');
                        setSelectedEventType('All Events');
                      }}>
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                );
              }

              return (eventsView === 'grid' || !isMobile) ? (
                <div className={isMobile ? "grid grid-cols-1 gap-3" : "grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3"}>
                  {filteredEvents.map((event: any) => {
                  const placeholderImage = theme === 'dark' 
                    ? '/assets/placeholder-dark.png' 
                    : '/assets/placeholder-light.png';
                  const eventImage = event.imageUrl || placeholderImage;
                  const eventDate = new Date(event.date);
                  const formattedDate = eventDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  });
                  
                  const priceLabel = event.price === undefined || event.price === null || `${event.price}`.trim() === ''
                    ? null
                    : (typeof event.price === 'number' ? `$${event.price}` : `${event.price}`);

                  return (
                    <Link key={event.id} href={`/event/${event.id}`}>
                      <Card className={`group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer h-full ${isMobile ? 'flex flex-row min-h-[140px]' : 'flex flex-col'}`}>
                        <div className={`${isMobile ? 'relative w-36 sm:w-40 h-full aspect-[3/2] flex-shrink-0' : 'relative aspect-[4/3]'} overflow-hidden`}>
                          <Image
                            src={eventImage}
                            alt={event.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-4 flex flex-col flex-grow">
                          <Badge variant="secondary" className="mb-2 text-xs w-fit">{event.type}</Badge>
                          <h3 className="font-medium text-sm mb-1 line-clamp-2">{event.title}</h3>
                          <div className="space-y-1 text-xs text-muted-foreground flex-grow">
                            <p className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{formattedDate}</span>
                            </p>
                          {((event as any).location || event.locationName) && (
                            <p className="flex items-center gap-1 line-clamp-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{(event as any).location || event.locationName}</span>
                            </p>
                          )}
                          {(event as any).venue && (
                            <p className="text-xs text-muted-foreground line-clamp-1 truncate">{(event as any).venue}</p>
                          )}
                          </div>
                          {priceLabel && (
                            <p className="font-semibold text-foreground text-sm mt-auto pt-1">{priceLabel}</p>
                          )}
                        </div>
                </Card>
                    </Link>
                  );
                  })}
            </div>
              ) : (
                <div className="space-y-4">
                  {filteredEvents.map((event: any) => {
                    const placeholderImage = theme === 'dark' 
                      ? '/assets/placeholder-dark.png' 
                      : '/assets/placeholder-light.png';
                    const eventImage = event.imageUrl || placeholderImage;
                    const eventDate = new Date(event.date);
                    const formattedDate = eventDate.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    });
                    const avatarPlaceholder = theme === 'dark'
                      ? '/assets/placeholder-dark.png'
                      : '/assets/placeholder-light.png';
                    
                    const priceLabel = event.price === undefined || event.price === null || `${event.price}`.trim() === ''
                      ? null
                      : (typeof event.price === 'number' ? `$${event.price}` : `${event.price}`);

                    return (
                      <Link key={event.id} href={`/event/${event.id}`}>
                        <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer">
                          <div className="flex flex-col md:flex-row gap-4 p-4">
                            <div className="relative w-full md:w-48 h-48 flex-shrink-0 rounded-lg overflow-hidden">
                              <Image
                                src={eventImage}
                                alt={event.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 flex flex-col">
                              <div className="flex items-start gap-3 mb-3">
                                <Avatar className="h-10 w-10 flex-shrink-0">
                                  <AvatarImage src={event.artist?.avatarUrl || avatarPlaceholder} />
                                  <AvatarFallback>{event.artist?.name?.charAt(0) || 'E'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary" className="text-xs">{event.type}</Badge>
                                  </div>
                                  <h3 className="font-semibold text-lg mb-1">{event.title}</h3>
                                  <p className="text-sm text-muted-foreground">by {event.artist?.name || 'Event Organizer'}</p>
                                </div>
                                {priceLabel && (
                                  <Badge className="bg-blue-600 hover:bg-blue-700 text-sm px-3 py-1">
                                    {priceLabel}
                                  </Badge>
                                )}
                              </div>
                              {event.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{event.description}</p>
                              )}
                              <div className="space-y-1 text-sm text-muted-foreground mt-auto">
                                <p className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {formattedDate}
                                </p>
                                {((event as any).location || event.locationName) && (
                                  <p className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {(event as any).location || event.locationName}
                                  </p>
                                )}
                                {(event as any).venue && (
                                  <p className="text-sm text-muted-foreground">{(event as any).venue}</p>
                                )}
              </div>
      </div>
    </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>
        </div>
        </div>
      </div>
    </>
  );
}

export default function DiscoverPage() {
  return (
    <DiscoverErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <ThemeLoading text="" size="lg" />
        </div>
      }>
        <DiscoverPageContent />
      </Suspense>
    </DiscoverErrorBoundary>
  );
}
