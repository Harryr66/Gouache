'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useRef, useDeferredValue, startTransition, useCallback } from 'react';
import { Eye, Filter, Search, X, Palette, Calendar, ShoppingBag, MapPin, ArrowUp } from 'lucide-react';
import { ViewSelector } from '@/components/view-selector';
import { toast } from '@/hooks/use-toast';
import { ArtworkTile } from '@/components/artwork-tile';
import { Artwork, MarketplaceProduct, Event as EventType } from '@/lib/types';
import { db } from '@/lib/firebase';
import { useLikes } from '@/providers/likes-provider';
import { fetchActiveAds, mixAdsIntoContent } from '@/lib/ad-fetcher';
import { AdTile } from '@/components/ad-tile';
import { useAuth } from '@/providers/auth-provider';
import { collection, query, getDocs, orderBy, limit, where, doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { useDiscoverSettings } from '@/providers/discover-settings-provider';
import { ThemeLoading } from '@/components/theme-loading';
import { TypewriterJoke } from '@/components/typewriter-joke';
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

const generatePlaceholderArtworks = (theme: string | undefined, count: number = 12): Artwork[] => {
  // Use Pexels abstract painting as placeholder: https://www.pexels.com/photo/abstract-painting-1546249/
  const placeholderImage = 'https://images.pexels.com/photos/1546249/pexels-photo-1546249.jpeg?auto=compress&cs=tinysrgb&w=800';
  // Landscape placeholder - use same blue placeholder, fallback to taped banana
  const landscapeImage = 'https://images.pexels.com/photos/1546249/pexels-photo-1546249.jpeg?auto=compress&cs=tinysrgb&w=1200';
  const landscapeFallback = 'https://images.pexels.com/photos/1308881/pexels-photo-1308881.jpeg?auto=compress&cs=tinysrgb&w=1200'; // Taped banana placeholder
  
  const artistNames = [
    'Alexandra Chen', 'Marcus Rivera', 'Sophie Laurent', 'David Kim', 'Emma Thompson',
    'James Wilson', 'Isabella Garcia', 'Oliver Brown', 'Maya Patel', 'Lucas Anderson',
    'Chloe Martinez', 'Noah Taylor', 'Ava Johnson', 'Ethan Davis', 'Zoe White',
    'Liam Harris', 'Mia Clark', 'Aiden Lewis', 'Lily Walker', 'Jackson Hall'
  ];
  
  const titles = [
    'Abstract Composition', 'Urban Landscape', 'Portrait Study', 'Nature Series',
    'Geometric Forms', 'Color Exploration', 'Emotional Expression', 'Minimalist Study',
    'Dynamic Movement', 'Still Life', 'Contemporary Vision', 'Traditional Technique',
    'Experimental Work', 'Mixed Media', 'Digital Art', 'Watercolor Study',
    'Oil Painting', 'Charcoal Drawing', 'Acrylic Piece', 'Ink Illustration'
  ];
  
  const landscapeTitles = [
    'Panoramic Cityscape', 'Wide Horizon', 'Expansive Landscape', 'Urban Panorama',
    'Coastal Vista', 'Mountain Range', 'Desert Sunset', 'Forest Path'
  ];
  
  return Array.from({ length: count }, (_, i) => {
    // Every 8th item is a landscape image (roughly 12.5% landscape, majority portrait)
    const isLandscape = i % 8 === 0 && i > 0;
    // Use same blue placeholder for landscape, fallback to taped banana if needed
    const imageUrl = isLandscape 
      ? landscapeImage
      : placeholderImage;
    const title = isLandscape
      ? landscapeTitles[i % landscapeTitles.length]
      : titles[i % titles.length];
    
    return {
      id: `placeholder-${i + 1}`,
      title: title,
      description: isLandscape 
        ? 'A stunning landscape artwork showcasing the beauty of nature and urban environments.'
        : 'A beautiful artwork showcasing artistic expression and creativity.',
      imageUrl: imageUrl,
      imageAiHint: isLandscape ? 'Landscape placeholder artwork' : 'Placeholder artwork',
      isLandscape: isLandscape, // Add flag to identify landscape images
      artist: {
        id: `placeholder-artist-${i + 1}`,
        name: artistNames[i % artistNames.length],
        handle: `artist${i + 1}`,
        avatarUrl: null,
        isVerified: i % 3 === 0,
        isProfessional: true,
        followerCount: Math.floor(Math.random() * 5000) + 100,
        followingCount: Math.floor(Math.random() * 500) + 50,
        createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
      },
      likes: Math.floor(Math.random() * 500) + 10,
      commentsCount: Math.floor(Math.random() * 50) + 2,
      createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
      updatedAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
      category: ['Painting', 'Drawing', 'Digital', 'Mixed Media'][i % 4],
      medium: ['Oil', 'Acrylic', 'Watercolor', 'Charcoal', 'Digital'][i % 5],
      tags: ['art', 'creative', 'contemporary', 'modern', '_placeholder'], // Hidden tag to identify placeholders
      aiAssistance: 'none' as const,
      isAI: false,
    };
  });
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
function MasonryGrid({ items, columnCount, gap, renderItem, loadMoreRef }: {
  items: any[];
  columnCount: number;
  gap: number;
  renderItem: (item: any) => React.ReactNode;
  loadMoreRef: React.RefObject<HTMLDivElement>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [positions, setPositions] = useState<Array<{ top: number; left: number; width: number }>>([]);

  // Calculate positions for masonry layout
  useEffect(() => {
    if (!containerRef.current || columnCount === 0 || items.length === 0) {
      setPositions([]);
      return;
    }

    const calculatePositions = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      if (!containerWidth || containerWidth <= 0 || !columnCount || columnCount <= 0) {
        return; // Safety check: don't calculate if container has no width or invalid column count
      }
      
      // Calculate item width accounting for gaps
      // Total gap space = gap * (columnCount - 1)
      // Each column gets: (containerWidth - totalGapSpace) / columnCount
      const totalGapSpace = gap * (columnCount - 1);
      const itemWidth = (containerWidth - totalGapSpace) / columnCount;
      if (itemWidth <= 0 || !isFinite(itemWidth)) {
        return; // Safety check: prevent invalid width calculations
      }
      
      const columnHeights = new Array(columnCount).fill(0);
      const newPositions: Array<{ top: number; left: number; width: number }> = [];

      itemRefs.current.forEach((itemEl, index) => {
        if (!itemEl || index >= items.length) return;

        // Find shortest column
        const shortestColumnIndex = columnHeights.reduce(
          (minIndex, height, colIndex) => 
            height < columnHeights[minIndex] ? colIndex : minIndex,
          0
        );

        // Measure ACTUAL rendered height
        // Use getBoundingClientRect for accurate measurement, Math.ceil to prevent sub-pixel overlap
        const itemHeight = Math.ceil(itemEl.getBoundingClientRect().height) || 0;
        if (itemHeight <= 0) return; // Skip items with no height
        
        // Calculate left position: column_index * (itemWidth + gap)
        // This ensures uniform gap between columns
        const left = shortestColumnIndex * (itemWidth + gap);
        
        // Calculate top position with ceiling to prevent fractional pixels
        // This ensures uniform gap between rows
        const currentColumnHeight = columnHeights[shortestColumnIndex];
        const top = currentColumnHeight === 0 
          ? 0 
          : Math.ceil(currentColumnHeight) + gap;
        
        // Debug log for verification
        if (index === 0) {
          console.log('🔧 Masonry overlap fix - Gap:', gap, 'px, Height buffer: +2px');
        }

        // Validate calculated values
        if (!isFinite(top) || !isFinite(left) || !isFinite(itemWidth)) {
          return; // Skip invalid positions
        }

        newPositions.push({ top, left, width: itemWidth });
        // Update column height: current top position + item height (gap is already in top calculation)
        columnHeights[shortestColumnIndex] = top + itemHeight;
      });

      if (newPositions.length > 0) {
        setPositions(newPositions);
      }
    };

    // Calculate positions after items render (use requestAnimationFrame for better timing)
    let timeout: NodeJS.Timeout;
    const scheduleCalculation = () => {
      timeout = setTimeout(() => {
        requestAnimationFrame(() => {
          calculatePositions();
        });
      }, 150);
    };
    
    scheduleCalculation();
    
    // Recalculate when images/videos load
    const handleLoad = () => {
      scheduleCalculation();
    };
    
    // Set up load listeners on next frame to ensure DOM is ready
    const observerTimeout = setTimeout(() => {
      itemRefs.current.forEach((itemEl) => {
        if (itemEl) {
          const media = itemEl.querySelectorAll('img, video');
          media.forEach((el) => {
            const imgEl = el as HTMLImageElement;
            const videoEl = el as HTMLVideoElement;
            if ((imgEl.complete !== undefined && imgEl.complete) || (videoEl.readyState !== undefined && videoEl.readyState >= 2)) {
              // Already loaded, trigger calculation
              handleLoad();
            } else {
              el.addEventListener('load', handleLoad);
              el.addEventListener('loadeddata', handleLoad);
            }
          });
        }
      });
    }, 200);

    return () => {
      clearTimeout(timeout);
      clearTimeout(observerTimeout);
      itemRefs.current.forEach((itemEl) => {
        if (itemEl) {
          const media = itemEl.querySelectorAll('img, video');
          media.forEach((el) => {
            el.removeEventListener('load', handleLoad);
            el.removeEventListener('loadeddata', handleLoad);
          });
        }
      });
    };
  }, [items.length, columnCount, gap, items]);

  const containerHeight = positions.length > 0 && itemRefs.current.length > 0
    ? (() => {
        const heights = positions.map((pos, index) => {
          const itemEl = itemRefs.current[index];
          const itemHeight = itemEl?.offsetHeight || 0;
          const height = pos.top + itemHeight;
          return isFinite(height) && height > 0 ? height : 0;
        }).filter(h => h > 0);
        return heights.length > 0 ? Math.max(...heights) : 0;
      })()
    : 0;

  return (
    <div ref={containerRef} className="relative w-full" style={{ minHeight: containerHeight || 'auto' }}>
      {items.map((item, index) => {
        const itemKey = 'id' in item ? item.id : ('campaign' in item ? item.campaign?.id : index);
        return (
          <div
            key={itemKey}
            ref={(el) => { itemRefs.current[index] = el; }}
            style={{
              position: 'absolute',
              top: positions[index]?.top ?? 0,
              left: positions[index]?.left ?? 0,
              width: positions[index]?.width || `${100 / columnCount}%`,
              opacity: positions[index] ? 1 : 0, // Hide until positioned
              margin: 0, // Ensure no margins that could create irregular gaps
              padding: 0, // Ensure no padding that could create irregular gaps
            }}
          >
            {renderItem(item)}
          </div>
        );
      })}
      <div 
        ref={loadMoreRef} 
        className="h-10 w-full" 
        style={{ position: 'absolute', top: containerHeight, left: 0, right: 0 }} 
      />
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
        console.log('🔄 Converted to HLS manifest:', manifestUrl);
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
        console.log('✅ Using native HLS support for:', manifestUrl);
        
        // For Safari, wait for loadedmetadata then play
        video.addEventListener('loadedmetadata', () => {
          console.log('✅ Video metadata loaded');
          video.muted = true;
          setIsVideoReady(true);
          video.play()
            .then(() => console.log('✅ Video playing'))
            .catch(err => console.log('⚠️ Autoplay prevented:', err));
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
          console.log('✅ HLS manifest parsed, video ready:', manifestUrl);
          setIsVideoReady(true);
          video.play().catch((error) => {
            console.log('Autoplay prevented:', error);
          });
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('❌ HLS error:', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('Fatal network error, trying to recover...');
                // Try to recover from network errors
                if (retryCountRef.current < 3) {
                  retryCountRef.current++;
                  setTimeout(() => {
                    hls.startLoad();
                  }, 1000 * retryCountRef.current);
                } else {
                  console.error('Max HLS network retries reached');
                  setHasError(true);
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Fatal media error, trying to recover...');
                // Try to recover from media errors
                if (retryCountRef.current < 3) {
                  retryCountRef.current++;
                  setTimeout(() => {
                    hls.recoverMediaError();
                  }, 1000 * retryCountRef.current);
                } else {
                  console.error('Max HLS media retries reached');
                  setHasError(true);
                }
                break;
              default:
                console.error('Fatal error, destroying HLS instance');
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
        console.warn('⚠️ HLS not supported, trying direct URL:', manifestUrl);
        video.src = manifestUrl;
      }
    } else {
      // Not HLS, use direct URL
      video.src = manifestUrl;
    }

    video.addEventListener('canplay', () => {
      console.log('✅ Video can play:', manifestUrl);
      setIsVideoReady(true);
    });

    video.addEventListener('loadedmetadata', () => {
      console.log('✅ Video metadata loaded:', manifestUrl);
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
          console.log('🔄 404 on customer subdomain, trying videodelivery.net fallback:', fallbackUrl);
          
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

function DiscoverPageContent() {
  const isDev = process.env.NODE_ENV === 'development';
  // Always log critical messages in production for debugging
  const log = (...args: any[]) => { console.log(...args); };
  const warn = (...args: any[]) => { console.warn(...args); };
  const error = (...args: any[]) => { console.error(...args); };
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
  const [hasMore, setHasMore] = useState(true);
  const [lastDocument, setLastDocument] = useState<any>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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
  
  // CLEAN LOADING SCREEN STATE - Simple and straightforward
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [artworksLoaded, setArtworksLoaded] = useState(false);
  const jokeCompleteTimeRef = useRef<number | null>(null);
  const MIN_JOKE_DISPLAY_TIME = 2000; // 2 seconds minimum after joke completes
  const MAX_LOADING_TIME = 15000; // 15 seconds maximum (fallback timeout)
  const loadingStartTimeRef = useRef<number>(Date.now());
  
  // Track items per row with state to handle window resize (needed for itemsToWaitFor calculation)
  const [itemsPerRow, setItemsPerRow] = useState(6);
  // Track column count for masonry layout (CSS columns) - needed for itemsToWaitFor calculation
  const [columnCount, setColumnCount] = useState(5);
  
  // Calculate how many items are in viewport + 1 row (for faster loading)
  // This is what we'll wait for before dismissing the loading screen
  // Wait for viewport + 2 rows to ensure smooth initial display without gaps
  const itemsToWaitFor = useMemo(() => {
    // Viewport typically shows 2-3 rows, plus 2 extra rows for buffer = 4-5 rows total
    // This matches our visibleCount of 24 and ensures no black spaces
    const estimatedRowsInViewport = 2; // Increased from 1 to fill viewport
    const extraRows = 2; // Increased from 1 to prevent gaps
    return columnCount * (estimatedRowsInViewport + extraRows);
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
  
  // Handle joke completion - called AFTER joke finishes typing + 2s pause
  const handleJokeComplete = useCallback(() => {
    console.log('🎭 Joke animation FULLY completed (typing + 2s pause) at:', new Date().toISOString());
    jokeCompleteTimeRef.current = Date.now();
  }, []);
  
  // PARALLEL LOADING LOGIC - Joke and media load simultaneously
  // The joke entertains the user WHILE media loads in the background
  // Dismiss when BOTH conditions are met (whichever comes last):
  // 1. Joke has completed AND been displayed for minimum 2 seconds (ABSOLUTE REQUIREMENT)
  // 2. Media is ready (video posters + threshold of images) - only viewport + 1 row
  useEffect(() => {
    // Don't check if loading screen is already dismissed
    if (!showLoadingScreen) {
      return;
    }
    
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
      // This allows media tracking to start immediately, in parallel with joke
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
      
      // Check joke timing (ABSOLUTE REQUIREMENT: joke must complete + 2s)
      const jokeComplete = !!jokeCompleteTimeRef.current;
      const timeSinceJoke = jokeComplete && jokeCompleteTimeRef.current ? Date.now() - jokeCompleteTimeRef.current : Infinity;
      const jokeTimeMet = jokeComplete && timeSinceJoke >= MIN_JOKE_DISPLAY_TIME;
      
      // Check if we only have placeholders (no real content)
      const hasOnlyPlaceholders = artworks.every((a: any) => {
        const tags = Array.isArray(a.tags) ? a.tags : [];
        return tags.includes('_placeholder') || a.id?.startsWith('placeholder-');
      });
      
      // If only placeholders, dismiss immediately after joke (no need to wait for image loads)
      if (hasOnlyPlaceholders && jokeTimeMet && artworksLoaded && artworks.length > 0) {
        console.log(`✅ Only placeholders detected, dismissing immediately after joke + 2s`);
        setShowLoadingScreen(false);
        return;
      }
      
      // PINTEREST-LEVEL: Wait for ALL initial viewport images to fully load (only for real content)
      // This ensures zero loading states after screen dismisses
      const imagesReady = effectiveImagesTotal > 0 && initialImagesReady >= effectiveImagesTotal;
      const videoPostersReady = effectiveVideoPostersTotal > 0 && initialVideoPostersReady >= effectiveVideoPostersTotal;
      const allMediaReady = imagesReady && videoPostersReady;
      
      // CRITICAL: Only dismiss when BOTH joke time is met AND all media is loaded
      if (jokeTimeMet && allMediaReady && artworksLoaded && artworks.length > 0) {
        console.log(`✅ Ready to dismiss: Joke complete + 2s, ALL ${effectiveImagesTotal} images loaded, ${effectiveVideoPostersTotal} video posters loaded. Zero loading states!`);
        setShowLoadingScreen(false);
        return;
      }
      
      // Fallback timeout: If joke is done + 2s but media still loading, wait max 3s more (reduced from 5s)
      // This prevents infinite waiting if some images fail
      if (jokeTimeMet && jokeCompleteTimeRef.current && Date.now() - jokeCompleteTimeRef.current > 5000) {
        console.warn(`⚠️ Timeout after joke + 2s + 3s: ${initialImagesReady}/${effectiveImagesTotal} images loaded, dismissing anyway`);
        setShowLoadingScreen(false);
        return;
      }
      
      // Log progress for debugging
      if (jokeTimeMet && !allMediaReady) {
        console.log(`⏳ Waiting for media: ${initialImagesReady}/${effectiveImagesTotal} images, ${initialVideoPostersReady}/${effectiveVideoPostersTotal} posters`);
      }
    }
    
    // PARALLEL: Check media readiness continuously (don't wait for joke)
    // Media can start loading immediately while joke plays
    checkIfReadyToDismiss();
    
    // Re-check every 500ms to catch when conditions are met
    const interval = setInterval(() => {
      if (showLoadingScreen) {
        checkIfReadyToDismiss();
      } else {
        clearInterval(interval);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [showLoadingScreen, artworks.length, artworksLoaded, initialImagesReady, initialImagesTotal, initialVideoPostersReady, initialVideoPostersTotal, getConnectionSpeed, itemsToWaitFor]);
  
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
  // Initialize with enough items to fill viewport + 2 rows for smooth scrolling
  // 24 items covers: mobile (2 cols × 4 rows), tablet (3 cols × 3 rows), desktop (6 cols × 2 rows)
  const [visibleCount, setVisibleCount] = useState(24);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  // Default views: Artwork grid, Market list, Events grid on mobile
  const [artworkView, setArtworkView] = useState<'grid' | 'list'>('grid');
  const [marketView, setMarketView] = useState<'grid' | 'list'>('list');
  const [eventsView, setEventsView] = useState<'grid' | 'list'>('grid');
  const [isMobile, setIsMobile] = useState(false);
  const [marketSearchQuery, setMarketSearchQuery] = useState('');
  const [selectedMarketCategory, setSelectedMarketCategory] = useState('All');
  const [marketSortBy, setMarketSortBy] = useState('newest');
  const [showMarketFilters, setShowMarketFilters] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set default views based on device
  useEffect(() => {
    if (!isMobile) {
      // Desktop: default to grid view, but allow user to switch
      // Don't force it - let user's choice persist
    } else {
      // On mobile, ensure correct defaults
      setArtworkView('grid');
      setMarketView('list');
      setEventsView('grid'); // Events use grid view on mobile
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
        
        // Fetch MORE items to ensure we have enough content after filtering inactive artists
        // Fetch 150 items, expect ~100+ after filtering inactive/deleted
        const INITIAL_FETCH_LIMIT = 150;
        
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
              log(`✅ Discover: Found ${portfolioItems.length} items from cached API (instant response)`);
              
              // Store last document for pagination
              if (apiData.lastDoc) {
                // Reconstruct Firestore document reference for pagination
                const { doc } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase');
                setLastDocument(doc(db, 'portfolioItems', apiData.lastDoc.id));
              }
              setHasMore(portfolioItems.length === INITIAL_FETCH_LIMIT);
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
              limit: Math.floor(INITIAL_FETCH_LIMIT / 2), // Half for portfolio items
            });
            
            // Query discover content (videos uploaded via Discover portal)
            const discoverResult = await PortfolioService.getDiscoverPortfolioItems({
              showInPortfolio: false,
              deleted: false,
              hideAI: discoverSettings.hideAiAssistedArt,
              limit: Math.floor(INITIAL_FETCH_LIMIT / 2), // Half for discover content
            });
            
            // Combine results, portfolio items first, then discover content
            portfolioItems = [...portfolioResult.items, ...discoverResult.items];
            
            // Sort combined results by createdAt (newest first)
            portfolioItems.sort((a, b) => {
              const aTime = a.createdAt?.toDate?.()?.getTime() || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
              const bTime = b.createdAt?.toDate?.()?.getTime() || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
              return bTime - aTime;
            });
            
            // Limit to INITIAL_FETCH_LIMIT after combining
            portfolioItems = portfolioItems.slice(0, INITIAL_FETCH_LIMIT);
            log(`📦 Discover: Found ${portfolioItems.length} portfolio items from direct Firestore (fallback)`);
            
            // Store last document for pagination
            if (portfolioItems.length > 0) {
              const lastDoc = portfolioItems[portfolioItems.length - 1];
              setLastDocument(lastDoc as any);
              setHasMore(portfolioItems.length === INITIAL_FETCH_LIMIT);
            } else {
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
        
        let fetchedArtworks: Artwork[] = [];
        let skippedNoImage = 0;
        let skippedAI = 0;
        let skippedNoArtist = 0;
        
        // Only process portfolioItems if we have them and aren't using fallback
        if (!useFallback && portfolioItems.length > 0) {
          // CRITICAL OPTIMIZATION: Don't block on artist profiles - use fallback data immediately
          // Fetch artist profiles in background, update when ready
          const artistIds = new Set<string>(portfolioItems.map(item => item.userId));
          const artistDataMap = new Map<string, any>();
          
          // CRITICAL: AWAIT artist profile fetch BEFORE processing items
          // ONLY show content from ACTIVE artists
          log(`👥 Discover: Fetching ${artistIds.size} artist profiles to verify ACTIVE status...`);
          const artistPromises = Array.from(artistIds).map(async (artistId) => {
            try {
              const artistDoc = await getDoc(doc(db, 'userProfiles', artistId));
              if (artistDoc.exists()) {
                const artistData = artistDoc.data();
                // ONLY include ACTIVE artists
                if (artistData.isActive !== false) {
                  return { id: artistId, data: artistData };
                } else {
                  log(`⚠️ Discover: Skipping inactive artist ${artistId}`);
                }
              }
            } catch (error) {
              console.warn(`⚠️ Failed to fetch artist ${artistId}:`, error);
            }
            return null;
          });
          
          const artistResults = await Promise.all(artistPromises);
          artistResults.forEach(result => {
            if (result) {
              artistDataMap.set(result.id, result.data);
            }
          });
          
          log(`✅ Discover: Loaded ${artistDataMap.size} ACTIVE artist profiles from portfolioItems`);
          
          // Process portfolio items - ONLY from ACTIVE artists
          for (const [index, item] of portfolioItems.entries()) {
            // CRITICAL: Skip if artist is not in our active artists map
            if (!artistDataMap.has(item.userId)) {
              log(`⚠️ Discover: Skipping portfolio item ${item.id} - artist ${item.userId} not active or not found`);
              continue;
            }
            
            const artistData = artistDataMap.get(item.userId);
            
            // Get media URL (support video or image)
            let videoUrl = item.videoUrl || null;
            if (!videoUrl && item.mediaUrls?.[0] && item.mediaTypes?.[0] === 'video') {
              videoUrl = item.mediaUrls[0];
            }
            const imageUrl = item.imageUrl || item.supportingImages?.[0] || item.images?.[0] || (item.mediaUrls?.[0] && item.mediaTypes?.[0] !== 'video' ? item.mediaUrls[0] : '') || '';
            const mediaType = item.mediaType || (videoUrl ? 'video' : 'image');
            
            // Skip items without media
            if (!imageUrl && !videoUrl) {
              skippedNoImage++;
              continue;
            }

            // Convert portfolio item to Artwork object
            const artwork: Artwork = {
              id: item.id,
              title: item.title || 'Untitled',
              description: item.description || '',
              imageUrl: imageUrl,
              imageAiHint: item.description || '',
              ...(videoUrl && { videoUrl: videoUrl as any }),
              ...(mediaType && { mediaType: mediaType as any }),
              artist: {
                id: item.userId,
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
            limit(30) // Reduced for faster initial load
          );
          
          const artistsSnapshot = await getDocs(artistsQuery);
          log(`👥 Discover: Found ${artistsSnapshot.docs.length} artists (fallback method)`);
          
          // Extract portfolio items from each artist (old method)
          for (const artistDoc of artistsSnapshot.docs) {
            const artistData = artistDoc.data();
            
            // CRITICAL: Only show content from ACTIVE users
            if (artistData.isActive === false) {
              log(`⚠️ Discover: Skipping inactive artist ${artistDoc.id}`);
              continue;
            }
            
            const portfolio = artistData.portfolio || [];
            
            if (portfolio.length === 0) continue;
            
            const recentPortfolio = portfolio
              .filter((item: any) => !item.deleted && item.showInPortfolio !== false)
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
                title: item.title || 'Untitled',
                description: item.description || '',
                imageUrl: imageUrl,
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
        
        // PRIMARY SOURCE: Fetch artworks from artworks collection
        // CRITICAL: ONLY show content from ACTIVE artist accounts
        log('🔍 Discover: Fetching artworks from artworks collection (ACTIVE ARTISTS ONLY)...');
        try {
          const artworksQuery = query(
            collection(db, 'artworks'),
            orderBy('createdAt', 'desc'),
            limit(INITIAL_FETCH_LIMIT) // Fetch many items, filter down to active artists
          );
          const artworksSnapshot = await getDocs(artworksQuery);
          log(`📦 Discover: Fetched ${artworksSnapshot.docs.length} artworks from collection`);
          
          // Collect all artist IDs first
          const artistIds = new Set<string>();
          const artworkItems: any[] = [];
          
          for (const artworkDoc of artworksSnapshot.docs) {
            const artworkData = artworkDoc.data();
            
            // CRITICAL: Skip deleted items (strict check)
            if (artworkData.deleted === true || artworkData.deleted === 'true') continue;
            
            // Skip items without required artist fields
            const artistId = artworkData.artist?.id || artworkData.artist?.userId || artworkData.artistId || artworkData.userId;
            if (!artistId) continue;
            
            // Skip events
            if (artworkData.type === 'event' || artworkData.type === 'Event' || artworkData.eventType) continue;
            
            // Skip items with invalid/corrupted imageUrls (data URLs from old uploads)
            if (artworkData.imageUrl && artworkData.imageUrl.startsWith('data:image')) continue;
            
            // Skip items with no valid media
            const hasValidMedia = artworkData.imageUrl || artworkData.videoUrl || artworkData.supportingImages?.[0] || artworkData.images?.[0] || artworkData.mediaUrls?.[0];
            if (!hasValidMedia) continue;
            
            // Apply discover settings filters for AI content
            if (discoverSettings.hideAiAssistedArt && (artworkData.aiAssistance === 'assisted' || artworkData.aiAssistance === 'generated' || artworkData.isAI)) {
              continue;
            }
            
            // Get media URL (support video or image)
            let videoUrl = artworkData.videoUrl || null;
            if (!videoUrl && artworkData.mediaUrls?.[0] && artworkData.mediaTypes?.[0] === 'video') {
              videoUrl = artworkData.mediaUrls[0];
            }
            const imageUrl = artworkData.imageUrl || artworkData.supportingImages?.[0] || artworkData.images?.[0] || (artworkData.mediaUrls?.[0] && artworkData.mediaTypes?.[0] !== 'video' ? artworkData.mediaUrls[0] : '') || '';
            const mediaType = artworkData.mediaType || (videoUrl ? 'video' : 'image');
            
            // Skip items without media
            if (!imageUrl && !videoUrl) continue;
            
            artistIds.add(artistId);
            artworkItems.push({
              artworkDoc,
              artworkData,
              imageUrl,
              videoUrl,
              mediaType,
              artistId
            });
          }
          
          log(`👥 Discover: Found ${artistIds.size} unique artists, fetching profiles to verify ACTIVE status...`);
          
          // CRITICAL: AWAIT artist profile fetch BEFORE processing artworks
          // Only show content from ACTIVE artists
          const artistDataMap = new Map<string, any>();
          if (artistIds.size > 0) {
            const artistPromises = Array.from(artistIds).map(async (artistId) => {
              try {
                const artistDoc = await getDoc(doc(db, 'userProfiles', artistId));
                if (artistDoc.exists()) {
                  const artistData = artistDoc.data();
                  // ONLY include ACTIVE artists
                  if (artistData.isActive !== false) {
                    return { id: artistId, data: artistData };
                  } else {
                    log(`⚠️ Discover: Skipping inactive artist ${artistId}`);
                  }
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
          
          log(`✅ Discover: Loaded ${artistDataMap.size} ACTIVE artist profiles`);
          
          // Now build artwork objects - ONLY from ACTIVE artists
          let lastValidDoc: any = null;
          for (const { artworkDoc, artworkData, imageUrl, videoUrl, mediaType, artistId } of artworkItems) {
            // CRITICAL: Skip if artist doesn't exist or is not active
            if (!artistId || !artistDataMap.has(artistId)) {
              log(`⚠️ Discover: Skipping artwork ${artworkDoc.id} - artist ${artistId} not active or not found`);
              continue;
            }
            
            const artistData = artistDataMap.get(artistId);
            
            // Get artist info from cached data
            let artistName = artistData.displayName || artistData.name || artistData.username || 'Unknown Artist';
            let artistHandle = artistData.username || artistData.handle || '';
            let artistAvatarUrl = artistData.avatarUrl || null;
            
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
              title: artworkData.title || 'Untitled',
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
            lastValidDoc = artworkDoc; // Track last valid document for pagination
            log(`✅ Discover: Added artwork "${artwork.title}" from ACTIVE artist ${artwork.artist.name}`);
          }
          
          // CRITICAL: Set lastDocument for pagination (use last valid document, not last from snapshot)
          if (lastValidDoc) {
            setLastDocument(lastValidDoc);
            log(`📄 Discover: Set lastDocument for pagination (last valid artwork after filtering)`);
          } else if (artworksSnapshot.docs.length > 0) {
            // Fallback: use last document from snapshot if no valid artworks
            setLastDocument(artworksSnapshot.docs[artworksSnapshot.docs.length - 1]);
          }
          setHasMore(fetchedArtworks.length >= INITIAL_FETCH_LIMIT);
        } catch (error) {
          console.error('Error fetching non-portfolio artworks:', error);
        }
        
        // Sort by date (newest first) - SIMPLE AND RELIABLE
        fetchedArtworks.sort((a, b) => {
          const dateA = a.createdAt.getTime();
          const dateB = b.createdAt.getTime();
          return dateB - dateA;
        });
        
        log(`✅ Discover: Sorted ${fetchedArtworks.length} artworks by date (newest first)`);
        
        // No fallback: only show current portfolio items with images, skip deleted/hidden
        
        // AGGRESSIVE: Use all fetched artworks (only 12 initially), no artificial limit
        const safeArtworks = Array.isArray(fetchedArtworks) ? fetchedArtworks : [];
        // Don't slice - use all fetched (only 12 items initially, load more on scroll)
        
        log(`🎯 Discover: Real artworks count: ${safeArtworks.length}`);
        
        // Generate minimal placeholders only if we have very few items
        const placeholderCount = safeArtworks.length < 6 ? 6 - safeArtworks.length : 0;
        const placeholderArtworks = placeholderCount > 0 
          ? generatePlaceholderArtworks(mounted ? theme : undefined, placeholderCount)
          : [];
        
        // CRITICAL: Real content ALWAYS first, placeholders ALWAYS last
        // This ensures users see actual artwork before any placeholders
        const finalArtworks = safeArtworks.length > 0 
          ? [...safeArtworks, ...placeholderArtworks]  // Real first, placeholders last
          : placeholderArtworks;
        
        log(`🎯 Discover: Final artworks count (real + placeholders): ${finalArtworks.length}`);
        
        if (safeArtworks.length === 0) {
          warn('⚠️ Discover: No real artworks found, showing only placeholders');
        } else {
          log(`✅ Discover: Showing ${safeArtworks.length} real artworks + ${placeholderArtworks.length} placeholder artworks`);
        }
        
        setArtworks(Array.isArray(finalArtworks) ? finalArtworks : []);
        setArtworksLoaded(true); // Mark artworks as loaded
        
        // If we only have placeholders, mark images as "ready" immediately (they don't need to load)
        if (safeArtworks.length === 0 && placeholderArtworks.length > 0) {
          // Placeholders don't have real images that need loading, so mark them as ready immediately
          setInitialImagesReady(placeholderArtworks.length);
          setInitialImagesTotal(placeholderArtworks.length);
          console.log(`✅ Placeholders only: Marking ${placeholderArtworks.length} items as ready immediately`);
        }
        
        // Count initial viewport media for preloading with connection-aware limits
        // Strategy: Load poster images first (fast), limit videos to 3 per viewport, connection-aware preload count
        const connectionSpeed = getConnectionSpeed();
        
        // AGGRESSIVE: Preload only 1-2 items (viewport + 1 row is enough)
        const preloadCount = connectionSpeed === 'fast' ? 2 : 1;
        
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
        // Even on error, show placeholder artworks
        const placeholderArtworks = generatePlaceholderArtworks(mounted ? theme : undefined, 6);
        setArtworks(placeholderArtworks);
        setArtworksLoaded(true); // Mark artworks as loaded even on error
        // Mark placeholders as ready immediately (they don't need to load)
        setInitialImagesReady(placeholderArtworks.length);
        setInitialImagesTotal(placeholderArtworks.length);
        log(`⚠️ Discover: Showing ${placeholderArtworks.length} placeholder artworks due to error (marked as ready immediately)`);
        
        // Count initial viewport media for preloading with connection-aware limits
        const connectionSpeed = getConnectionSpeed();
        const preloadCount = connectionSpeed === 'fast' ? 3 : connectionSpeed === 'medium' ? 2 : 1;
        
        // Limit videos to 3 per viewport
        const MAX_VIDEOS_PER_VIEWPORT = 3;
        let videoCount = 0;
        const initialTiles: Artwork[] = [];
        
        for (const artwork of placeholderArtworks) {
          if (initialTiles.length >= preloadCount) break;
          
          const hasVideo = (artwork as any).videoUrl || (artwork as any).mediaType === 'video';
          
          if (hasVideo) {
            if (videoCount < MAX_VIDEOS_PER_VIEWPORT) {
              initialTiles.push(artwork);
              videoCount++;
            }
          } else {
            initialTiles.push(artwork);
          }
        }
        
        // Separate video posters from regular images (same as success case)
        const initialVideoPosters = initialTiles.filter((artwork: Artwork) => {
          const hasVideo = (artwork as any).videoUrl || (artwork as any).mediaType === 'video';
          return hasVideo && artwork.imageUrl;
        });
        const initialRegularImages = initialTiles.filter((artwork: Artwork) => {
          const hasVideo = (artwork as any).videoUrl || (artwork as any).mediaType === 'video';
          return !hasVideo && artwork.imageUrl;
        });
        
        setInitialVideosTotal(initialVideoPosters.length);
        setInitialVideoPostersTotal(initialVideoPosters.length);
        setInitialImagesTotal(initialVideoPosters.length + initialRegularImages.length);
        initialVideoReadyRef.current.clear();
        initialImageReadyRef.current.clear();
        initialVideoPosterRef.current.clear();
        setInitialVideosReady(0);
        setInitialImagesReady(0);
        setInitialVideoPostersReady(0);
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
    if (isLoadingMore || !hasMore || !lastDocument) {
      log(`⏸️ Discover: Cannot load more - isLoadingMore: ${isLoadingMore}, hasMore: ${hasMore}, hasLastDoc: ${!!lastDocument}`);
      return;
    }

    setIsLoadingMore(true);
    log('📥 Discover: Loading more artworks from both portfolioItems and artworks collections...');

    try {
      const { startAfter } = await import('firebase/firestore');
      const LOAD_MORE_LIMIT = 100; // Fetch more to account for filtering
      
      // Load more from artworks collection - ONLY ACTIVE ARTISTS
      const moreArtworksQuery = query(
        collection(db, 'artworks'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDocument),
        limit(LOAD_MORE_LIMIT)
      );
      
      const moreArtworksSnapshot = await getDocs(moreArtworksQuery);
      
      log(`📦 Discover: Fetched ${moreArtworksSnapshot.docs.length} more artworks from collection`);
      
      if (moreArtworksSnapshot.docs.length === 0) {
        setHasMore(false);
        setIsLoadingMore(false);
        log('🏁 Discover: No more artworks to load');
        return;
      }

      // Batch fetch artist data for new items
      const artistIds = new Set<string>();
      const artworkItems: any[] = [];
      
      for (const artworkDoc of moreArtworksSnapshot.docs) {
        const artworkData = artworkDoc.data();
        
        // CRITICAL: Skip deleted items (strict check)
        if (artworkData.deleted === true || artworkData.deleted === 'true') continue;
        
        // Skip events
        if (artworkData.type === 'event' || artworkData.type === 'Event' || artworkData.eventType) continue;
        
        // Skip items with invalid imageUrls (data URLs)
        if (artworkData.imageUrl && artworkData.imageUrl.startsWith('data:image')) continue;
        
        // Skip items without required artist field
        const artistId = artworkData.artist?.id || artworkData.artist?.userId || artworkData.artistId || artworkData.userId;
        if (!artistId) continue;
        
        // Skip items with no valid media
        const hasValidMedia = artworkData.imageUrl || artworkData.videoUrl || artworkData.supportingImages?.[0] || artworkData.images?.[0] || artworkData.mediaUrls?.[0];
        if (!hasValidMedia) continue;
        
        // Apply AI filter
        if (discoverSettings.hideAiAssistedArt && (artworkData.aiAssistance === 'assisted' || artworkData.aiAssistance === 'generated' || artworkData.isAI)) {
          continue;
        }
        
        artistIds.add(artistId);
        
        let videoUrl = artworkData.videoUrl || null;
        if (!videoUrl && artworkData.mediaUrls?.[0] && artworkData.mediaTypes?.[0] === 'video') {
          videoUrl = artworkData.mediaUrls[0];
        }
        const imageUrl = artworkData.imageUrl || artworkData.supportingImages?.[0] || artworkData.images?.[0] || (artworkData.mediaUrls?.[0] && artworkData.mediaTypes?.[0] !== 'video' ? artworkData.mediaUrls[0] : '') || '';
        const mediaType = artworkData.mediaType || (videoUrl ? 'video' : 'image');
        
        if (!imageUrl && !videoUrl) continue;
        
        artworkItems.push({
          artworkDoc,
          artworkData,
          imageUrl,
          videoUrl,
          mediaType,
          artistId
        });
      }
      
      // CRITICAL: AWAIT artist profile fetch - ONLY ACTIVE artists
      const artistDataMap = new Map<string, any>();
      if (artistIds.size > 0) {
        const artistPromises = Array.from(artistIds).map(async (artistId) => {
          try {
            const artistDoc = await getDoc(doc(db, 'userProfiles', artistId));
            if (artistDoc.exists()) {
              const data = artistDoc.data();
              // ONLY include ACTIVE users
              if (data.isActive !== false) {
                return { id: artistId, data };
              }
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

      // Build artwork objects - ONLY from ACTIVE artists
      const newArtworks: Artwork[] = [];
      let lastValidDoc: any = null;
      for (const { artworkDoc, artworkData, imageUrl, videoUrl, mediaType, artistId } of artworkItems) {
        if (!artistId || !artistDataMap.has(artistId)) {
          log(`⏭️ Discover: Skipping artwork ${artworkDoc.id} - artist ${artistId} not active or not found`);
          continue;
        }
        
        const artistData = artistDataMap.get(artistId);

        const artwork: Artwork = {
          id: artworkDoc.id,
          title: artworkData.title || 'Untitled',
          description: artworkData.description || '',
          imageUrl: imageUrl,
          imageAiHint: artworkData.description || '',
          ...(videoUrl && { videoUrl: videoUrl as any }),
          ...(mediaType && { mediaType: mediaType as any }),
          artist: {
            id: artistId,
            name: artistData.displayName || artistData.name || artistData.username || 'Unknown Artist',
            handle: artistData.username || artistData.handle || '',
            avatarUrl: artistData.avatarUrl || artistData.avatar || null,
            isVerified: artistData.isVerified || false,
            isProfessional: true,
            followerCount: artistData.followerCount || 0,
            followingCount: artistData.followingCount || 0,
            createdAt: artistData.createdAt?.toDate?.() || (artistData.createdAt instanceof Date ? artistData.createdAt : new Date()),
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
        
        newArtworks.push(artwork);
        lastValidDoc = artworkDoc; // Track last valid document
      }

      log(`✅ Discover: Loaded ${newArtworks.length} more artworks from ACTIVE artists`);

      // Append new artworks to existing ones
      setArtworks(prev => [...prev, ...newArtworks]);
      
      // CRITICAL: Update pagination - use last valid document after filtering
      if (lastValidDoc) {
        setLastDocument(lastValidDoc);
        setHasMore(moreArtworksSnapshot.docs.length === LOAD_MORE_LIMIT && newArtworks.length > 0);
      } else if (moreArtworksSnapshot.docs.length > 0) {
        // Fallback: use last document from snapshot
        setLastDocument(moreArtworksSnapshot.docs[moreArtworksSnapshot.docs.length - 1]);
        setHasMore(moreArtworksSnapshot.docs.length === LOAD_MORE_LIMIT);
      } else {
        setHasMore(false);
      }
    } catch (error: any) {
      console.error('Error loading more artworks:', error);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, lastDocument, isLoadingMore, discoverSettings]);

  // OPTIMIZED: Prefetch when user scrolls 80% through content
  useEffect(() => {
    if (!hasMore || isLoadingMore || !lastDocument) return;
    
    const handleScroll = () => {
      const scrollPercentage = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      if (scrollPercentage > 0.8 && !fetchingRef.current) {
        prefetchNextPage();
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore, lastDocument, prefetchNextPage]);

  // IntersectionObserver for infinite scroll pagination (Pinterest-style continuous scrolling)
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !isLoadingMore) {
            // Load more content when sentinel comes into view
            loadMoreArtworks();
          }
        });
      },
      {
        rootMargin: '400px', // Start loading 400px before reaching bottom for smoother continuous scroll (Pinterest-style)
        threshold: 0.1, // Trigger when 10% of sentinel is visible
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, loadMoreArtworks]);

  const filteredAndSortedArtworks = useMemo(() => {
    let filtered = Array.isArray(artworks) ? artworks : [];
    
    log('🔍 filteredAndSortedArtworks - Input:', {
      totalArtworks: filtered.length,
      artworkIds: filtered.slice(0, 10).map((a: any) => a.id)
    });

    // Helper function to identify placeholders by hidden tag
    const isPlaceholder = (artwork: any): boolean => {
      const tags = Array.isArray(artwork.tags) ? artwork.tags : [];
      const hasPlaceholderTag = tags.includes('_placeholder');
      // Also check by ID pattern as fallback
      const hasPlaceholderId = artwork.id?.startsWith('placeholder-');
      return hasPlaceholderTag || hasPlaceholderId;
    };
    
    // Separate real artworks from placeholders BEFORE filtering
    const allRealArtworks = filtered.filter((artwork: any) => !isPlaceholder(artwork));
    const allPlaceholderArtworks = filtered.filter((artwork: any) => isPlaceholder(artwork));
    
    log('🔍 Separated artworks:', {
      allRealArtworks: allRealArtworks.length,
      allPlaceholderArtworks: allPlaceholderArtworks.length,
      placeholderIds: allPlaceholderArtworks.slice(0, 5).map((a: any) => a.id)
    });

    // Apply filters only to real artworks
    let realArtworks = [...allRealArtworks];

    // Search filter
    if (deferredSearchQuery) {
      const queryLower = deferredSearchQuery.toLowerCase();
      realArtworks = realArtworks.filter(artwork => {
        const title = (artwork.title || '').toLowerCase();
        const description = (artwork.description || '').toLowerCase();
        const artistName = (artwork.artist?.name || '').toLowerCase();
        const tags = Array.isArray(artwork.tags) ? artwork.tags : [];
        return (
          title.includes(queryLower) ||
          description.includes(queryLower) ||
          artistName.includes(queryLower) ||
          tags.some(tag => (tag || '').toLowerCase().includes(queryLower))
        );
      });
    }

    // Medium filter
    if (selectedMedium !== 'All') {
      realArtworks = realArtworks.filter(artwork => artwork.medium === selectedMedium);
    }

    // Artwork Type filter (Original/Print) - only shows artworks for sale
    if (selectedArtworkType !== 'All') {
      realArtworks = realArtworks.filter(artwork => {
        // Only show artworks that are for sale when filtering by type
        if (!artwork.isForSale) return false;
        
        // Check tags for 'print' or 'original'
        const tags = Array.isArray(artwork.tags) ? artwork.tags : [];
        const hasPrintTag = tags.some(tag => tag.toLowerCase() === 'print');
        const hasOriginalTag = tags.some(tag => tag.toLowerCase() === 'original');
        
        if (selectedArtworkType === 'Print') {
          return hasPrintTag;
        } else if (selectedArtworkType === 'Original') {
          // If no tags found, default to original for artworks for sale
          return !hasPrintTag || hasOriginalTag;
        }
        return true;
      });
    }

    // Apply discover settings filters
    if (discoverSettings.hideAiAssistedArt) {
      realArtworks = realArtworks.filter(artwork => !artwork.isAI && artwork.aiAssistance === 'none');
    }

    // Sort using engagement-based algorithm when 'popular' is selected
    let sorted = Array.isArray(realArtworks) ? [...realArtworks] : [];
    
    // Get followed artist IDs for priority boost
    const followedArtists = getFollowedArtists();
    const followedArtistIds = new Set(followedArtists.map(a => a.id));
    
    if (sortBy === 'popular' && artworkEngagements.size > 0) {
      // Use engagement-based scoring algorithm with follow boost
      const scoredArtworks = engagementScorer.scoreArtworks(sorted, artworkEngagements, followedArtistIds);
      const withDiversity = engagementScorer.applyDiversityBoost(scoredArtworks);
      sorted = engagementScorer.sortByScore(withDiversity);
    } else {
      // Traditional sorting for other options, but still prioritize followed artists
      switch (sortBy) {
        case 'newest':
          // Sort by newest, but prioritize followed artists
          sorted.sort((a, b) => {
            const aIsFollowed = followedArtistIds.has(a.artist.id);
            const bIsFollowed = followedArtistIds.has(b.artist.id);
            if (aIsFollowed && !bIsFollowed) return -1;
            if (!aIsFollowed && bIsFollowed) return 1;
            return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
          });
          break;
        case 'oldest':
          sorted.sort((a, b) => {
            const aIsFollowed = followedArtistIds.has(a.artist.id);
            const bIsFollowed = followedArtistIds.has(b.artist.id);
            if (aIsFollowed && !bIsFollowed) return -1;
            if (!aIsFollowed && bIsFollowed) return 1;
            return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
          });
          break;
        case 'likes':
          sorted.sort((a, b) => {
            const aIsFollowed = followedArtistIds.has(a.artist.id);
            const bIsFollowed = followedArtistIds.has(b.artist.id);
            if (aIsFollowed && !bIsFollowed) return -1;
            if (!aIsFollowed && bIsFollowed) return 1;
            return (b.likes || 0) - (a.likes || 0);
          });
          break;
        case 'recent':
          sorted.sort((a, b) => {
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
            const scoredArtworks = engagementScorer.scoreArtworks(sorted, artworkEngagements, followedArtistIds);
            const withDiversity = engagementScorer.applyDiversityBoost(scoredArtworks);
            sorted = engagementScorer.sortByScore(withDiversity);
          } else {
            // Fallback to newest if no engagement data, but prioritize followed artists
            sorted.sort((a, b) => {
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

    // Always show real artworks first, then append placeholders to fill the grid
    // Placeholders have score 0 so they'll always rank below real artworks
    log('🔍 filteredAndSortedArtworks:', {
      totalFiltered: filtered.length,
      allRealArtworks: allRealArtworks.length,
      allPlaceholderArtworks: allPlaceholderArtworks.length,
      sortedRealArtworks: sorted.length
    });
    
    if (sorted.length === 0 && allPlaceholderArtworks.length > 0) {
      // No real artworks match filters, show only placeholders
      log('📋 Discover: No real artworks match filters, showing placeholders:', allPlaceholderArtworks.length);
      return allPlaceholderArtworks;
    }
    
    // Return real artworks first, then placeholders to fill remaining space
    const result = [...sorted, ...allPlaceholderArtworks];
    log('✅ Discover: Returning', sorted.length, 'real artworks +', allPlaceholderArtworks.length, 'placeholders =', result.length, 'total');
    return result;
  }, [artworks, deferredSearchQuery, selectedMedium, selectedArtworkType, sortBy, discoverSettings.hideAiAssistedArt, artworkEngagements]);

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

  useEffect(() => {
    const updateItemsPerRow = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      const newItemsPerRow = getItemsPerRow();
      setItemsPerRow(newItemsPerRow);
      
      // Calculate column count for masonry layout based on screen width
      let newColumnCount = 2; // mobile default
      if (width >= 1536) newColumnCount = 6; // 2xl - large desktop
      else if (width >= 1280) newColumnCount = 5; // xl - desktop
      else if (width >= 1024) newColumnCount = 4; // lg - large tablet/small desktop
      else if (width >= 768) newColumnCount = 3; // md - tablet
      setColumnCount(newColumnCount);
      
      // Ensure visibleCount is a multiple of itemsPerRow when it changes
      setVisibleCount((prev) => {
        const completeRows = Math.floor(prev / newItemsPerRow);
        return Math.max(newItemsPerRow, completeRows * newItemsPerRow);
      });
    };
    
    updateItemsPerRow();
    window.addEventListener('resize', updateItemsPerRow);
    return () => window.removeEventListener('resize', updateItemsPerRow);
  }, [getItemsPerRow]);

  // Infinite scroll observer for list view - progressively show more items
  // Also triggers loadMoreArtworks when we're near the end of visible items
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // If we're showing most of the available items, load more from server
          if (visibleCount >= filteredAndSortedArtworks.length * 0.8 && hasMore && !isLoadingMore) {
            loadMoreArtworks();
          }
          
          // Also progressively show more items from already loaded data
          startTransition(() => {
            setVisibleCount((prev) => {
              // Load additional rows progressively from top to bottom
              // Add itemsPerRow * 2 to load enough content for smooth scrolling
              const newCount = prev + (itemsPerRow * 2);
              const maxCount = filteredAndSortedArtworks.length || newCount;
              // Ensure we never exceed available items, maintaining complete rows
              return Math.min(newCount, maxCount);
            });
          });
        }
      });
    }, {
      rootMargin: '400px',
      threshold: 0.1,
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredAndSortedArtworks, itemsPerRow, visibleCount, hasMore, isLoadingMore, loadMoreArtworks]);

  // Critical image preloading - preload first 6-12 images for instant display
  useEffect(() => {
    if (typeof window === 'undefined' || filteredAndSortedArtworks.length === 0) return;
    
    // Preload first 24 images (viewport + 2 rows) for instant display without gaps
    const preloadCount = Math.min(columnCount * 4, 24, filteredAndSortedArtworks.length);
    const criticalArtworks = filteredAndSortedArtworks.slice(0, preloadCount);
    
    criticalArtworks.forEach((artwork) => {
      const imageUrl = artwork.imageUrl;
      if (!imageUrl) return;
      
      // PRIORITY: Cloudflare images first (new uploads), Firebase only for legacy
      let preloadUrl = imageUrl;
      if (imageUrl.includes('imagedelivery.net')) {
        // Cloudflare Images: Use appropriate variant based on media type
        const cloudflareMatch = imageUrl.match(/imagedelivery\.net\/([^/]+)\/([^/]+)/);
        if (cloudflareMatch) {
          const [, accountHash, imageId] = cloudflareMatch;
          // Check if this is a video poster (has videoUrl) - use /Thumbnail for videos
          // Use /1080px for regular images to match Instagram/Pinterest quality
          const hasVideo = (artwork as any).videoUrl || (artwork as any).mediaType === 'video';
          preloadUrl = hasVideo
            ? `https://imagedelivery.net/${accountHash}/${imageId}/Thumbnail` // Video poster: thumbnail
            : `https://imagedelivery.net/${accountHash}/${imageId}/1080px`; // Regular image: 1080px (Instagram standard)
        } else {
          // Fallback: determine variant from artwork type
          const hasVideo = (artwork as any).videoUrl || (artwork as any).mediaType === 'video';
          preloadUrl = hasVideo
            ? imageUrl.replace(/\/[^/]+$/, '/Thumbnail')
            : imageUrl.replace(/\/[^/]+$/, '/1080px'); // 1080px (Instagram standard)
        }
      } else if (imageUrl.includes('cloudflarestream.com')) {
        // Cloudflare Stream thumbnails: Use directly (no Next.js optimization needed)
        // These are already optimized thumbnails from Cloudflare Stream
        preloadUrl = imageUrl;
      } else if (imageUrl.includes('firebasestorage') || imageUrl.includes('firebase')) {
        // Firebase (legacy): Use Next.js Image Optimization API with 240px
        // NOTE: These should be migrated to Cloudflare for better performance
        const encodedUrl = encodeURIComponent(imageUrl);
        preloadUrl = `/_next/image?url=${encodedUrl}&w=240&q=75`;
      }
      
      // Create preload link
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = preloadUrl;
      link.setAttribute('fetchpriority', (imageUrl.includes('imagedelivery.net') || imageUrl.includes('cloudflarestream.com')) ? 'high' : 'auto');
      document.head.appendChild(link);
    });
    
    log(`🚀 Preloaded ${preloadCount} critical images for instant display`);
  }, [filteredAndSortedArtworks, columnCount]);

  const visibleFilteredArtworks = useMemo(() => {
    const totalItems = Array.isArray(filteredAndSortedArtworks) ? filteredAndSortedArtworks.length : 0;
    
    // Check how many placeholders are in the array
    const placeholderCount = Array.isArray(filteredAndSortedArtworks) 
      ? filteredAndSortedArtworks.filter((a: any) => {
          const tags = Array.isArray(a.tags) ? a.tags : [];
          return tags.includes('_placeholder');
        }).length
      : 0;
    
    log('🔍 visibleFilteredArtworks calculation:', {
      totalItems,
      visibleCount,
      placeholderCount,
      filteredAndSortedArtworksLength: filteredAndSortedArtworks?.length,
      firstFewIds: filteredAndSortedArtworks?.slice(0, 5).map((a: any) => a.id)
    });
    
    if (totalItems === 0) {
      log('⚠️ visibleFilteredArtworks: No items to display');
      return [];
    }
    
    // Show items up to visibleCount, but don't require complete rows
    // This ensures items display even if there are fewer than itemsPerRow
    const finalCount = Math.min(visibleCount, totalItems);
    
    const artworksSlice = Array.isArray(filteredAndSortedArtworks)
      ? filteredAndSortedArtworks.slice(0, finalCount)
      : [];
    
    // Mix ads into artworks
    const result = mixAdsIntoContent(artworksSlice, ads, 2);
    
    // Separate real artworks from placeholders to preserve ranking
    const isPlaceholder = (item: any): boolean => {
      if ('type' in item && item.type === 'ad') return false; // Ads are not placeholders
      const tags = Array.isArray(item.tags) ? item.tags : [];
      return tags.includes('_placeholder') || item.id?.startsWith('placeholder-');
    };
    
    const realItems = result.filter(item => !isPlaceholder(item));
    const placeholderItems = result.filter(item => isPlaceholder(item));
    
    // Keep artworks in their ranked order (engagement + view time based)
    // No shuffling - maintain stable positions based on ranking
    // Combined: ranked real artworks first, then placeholders
    // Don't interleave - let CSS Grid handle natural column-by-column flow
    const final = [...realItems, ...placeholderItems];
    
    const resultPlaceholderCount = placeholderItems.length;
    
    log('✅ visibleFilteredArtworks: Returning', final.length, 'items', resultPlaceholderCount, 'placeholders');
    return final;
  }, [filteredAndSortedArtworks, visibleCount, ads]);

  useEffect(() => {
    // Reset to fill viewport when filters change (24 items covers most screen sizes)
    setVisibleCount(24);
  }, [searchQuery, selectedMedium, selectedArtworkType, sortBy, selectedEventLocation]);

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
        console.error('Error fetching events:', error);
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
            {/* Always show joke when loading screen appears (navigation click) */}
            <TypewriterJoke key="loading-joke" onComplete={handleJokeComplete} typingSpeed={40} pauseAfterComplete={2000} />
          </div>
        </div>
      ) : null}
      
      <div className="min-h-screen bg-background">
        {/* Main content - render immediately so images/videos can load, but hide visually during loading */}
        <div className={showLoadingScreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}>
        {/* Preload tiles invisibly during loading - render in viewport but hidden so browser loads images */}
        {(showLoadingScreen && initialImagesTotal > 0) && (
          <div className="absolute inset-0 opacity-0 pointer-events-none" style={{ zIndex: -1 }} aria-hidden="true">
            {(() => {
              // Preload enough items to fill viewport + 2 rows (matches itemsToWaitFor)
              const connectionSpeed = getConnectionSpeed();
              const preloadCount = connectionSpeed === 'fast' ? 24 : connectionSpeed === 'medium' ? 18 : 12;
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
                  // Grid view shows ONLY images (no videos)
                  // Videos will only appear in video feed (list view)
                  const imageOnlyArtworks = visibleFilteredArtworks.filter((item) => {
                    // Keep ads
                    if ('type' in item && item.type === 'ad') return true;
                    // Filter out videos - only show images in grid view
                    const artwork = item as Artwork;
                    const hasVideo = (artwork as any).videoUrl || (artwork as any).mediaType === 'video';
                    return !hasVideo; // Only include items without videos
                  });
                  console.log('🖼️ Grid view (images only):', {
                    artworkView,
                    totalArtworks: visibleFilteredArtworks.length,
                    imageArtworksCount: imageOnlyArtworks.length,
                    filteredOut: visibleFilteredArtworks.length - imageOnlyArtworks.length
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
                    
                    // Check for video in multiple ways:
                    // 1. Direct videoUrl field (most reliable)
                    const hasVideoUrl = !!videoUrl && videoUrl.length > 0;
                    // 2. mediaType field
                    const hasVideoMediaType = mediaType === 'video';
                    // 3. mediaUrls array with video type
                    const hasVideoInMediaUrls = Array.isArray(mediaUrls) && mediaUrls.length > 0 && 
                                               Array.isArray(mediaTypes) && mediaTypes.includes('video');
                    // 4. Check if imageUrl is actually a Cloudflare Stream thumbnail (indicates video)
                    const isCloudflareThumbnail = imageUrl.includes('cloudflarestream.com') && 
                                                  (imageUrl.includes('/thumbnails/') || imageUrl.includes('thumbnail'));
                    // 5. Check if videoUrl contains Cloudflare Stream indicators
                    const isCloudflareVideo = videoUrl.includes('cloudflarestream.com') || 
                                             videoUrl.includes('videodelivery.net') ||
                                             videoUrl.includes('.m3u8');
                    
                    const hasVideo = hasVideoUrl || hasVideoMediaType || hasVideoInMediaUrls || isCloudflareThumbnail || isCloudflareVideo;
                    
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
                        <div className="w-full py-12 text-center text-muted-foreground">
                          <p>No videos available</p>
                          <p className="text-sm mt-2">Switch to grid view to see images</p>
                        </div>
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <ThemeLoading text="" size="lg" />
      </div>
    }>
      <DiscoverPageContent />
    </Suspense>
  );
}
