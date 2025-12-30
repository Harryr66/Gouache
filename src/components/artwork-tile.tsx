'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Artwork, Artist } from '@/lib/types';
import { useFollow } from '@/providers/follow-provider';
import { usePlaceholder } from '@/hooks/use-placeholder';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useOptimizedImage } from '@/hooks/use-optimized-image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLikes } from '@/providers/likes-provider';
import { ReportDialog } from '@/components/report-dialog';
import { engagementTracker } from '@/lib/engagement-tracker';
import { useVideoControl } from '@/providers/video-control-provider';
import { useVideoPrefetch } from '@/hooks/use-video-prefetch';
import { 
  UserPlus, 
  UserCheck, 
  Instagram, 
  Globe, 
  Calendar, 
  MapPin, 
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  BookOpen,
  Users,
  Play,
  Heart as HeartIcon,
  X,
  Flag
} from 'lucide-react';

interface ArtworkTileProps {
  artwork: Artwork;
  onClick?: () => void;
  className?: string;
  hideBanner?: boolean;
  onVideoReady?: () => void; // Callback when video is ready (for preloading)
  onImageReady?: (isVideoPoster?: boolean) => void; // Callback when image is ready (for preloading), with flag for video posters
  isInitialViewport?: boolean; // Flag to indicate this is in initial viewport
}

// Memoize to prevent unnecessary re-renders (performance optimization)
export const ArtworkTile = React.memo(function ArtworkTile({ artwork, onClick, className, hideBanner = false, onVideoReady, onImageReady, isInitialViewport: propIsInitialViewport }: ArtworkTileProps) {
  const { isFollowing, followArtist, unfollowArtist } = useFollow();
  const { generatePlaceholderUrl, generateAvatarPlaceholderUrl } = usePlaceholder();
  const { theme, resolvedTheme } = useTheme();
  const router = useRouter();
  const { registerVideo, requestPlay, isPlaying, getConnectionSpeed, registerVisibleVideo, unregisterVisibleVideo, canAutoplay, handleVideoEnded } = useVideoControl();
  const [showArtistPreview, setShowArtistPreview] = useState(false);
  const [selectedPortfolioItem, setSelectedPortfolioItem] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaAspectRatio, setMediaAspectRatio] = useState<number | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fallbackImageUrl, setFallbackImageUrl] = useState<string | null>(null);
  const [isInViewport, setIsInViewport] = useState(false);
  // Track failed URLs to prevent error spam
  const failedUrlsRef = useRef<Set<string>>(new Set());
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [shouldLoadMetadata, setShouldLoadMetadata] = useState(false);
  const [isInitialViewport, setIsInitialViewport] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(true);
  const videoLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile for responsive images
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Check if artwork has video (support both legacy videoUrl and new videoVariants)
  const hasVideo = (artwork as any).videoUrl || (artwork as any).mediaType === 'video' || (artwork as any).videoVariants;
  
  // Detect Cloudflare Stream URLs and handle appropriately
  const isCloudflareStream = (artwork as any).videoUrl?.includes('cloudflarestream.com') || 
                             (artwork as any).videoUrl?.includes('videodelivery.net');
  
  // For Cloudflare Stream, use HLS manifest URL for playback
  // For Firebase/other, use direct video URL
  let videoUrl = (artwork as any).videoVariants?.thumbnail || (artwork as any).videoUrl;
  let fullVideoUrl = (artwork as any).videoVariants?.full || (artwork as any).videoUrl;
  
  // If Cloudflare Stream, ensure we're using the HLS manifest
  if (isCloudflareStream && videoUrl) {
    // If URL already has .m3u8, use it as-is
    if (videoUrl.includes('.m3u8')) {
      fullVideoUrl = videoUrl;
    } else {
      // Extract video ID from Cloudflare Stream URL
      // Handle both formats:
      // 1. https://customer-{accountId}.cloudflarestream.com/{videoId}
      // 2. https://videodelivery.net/{videoId}
      
      // CRITICAL FIX: Always use environment variable account ID, not the one in the URL
      // The account ID in stored URLs might be wrong (from old uploads or different accounts)
      let accountId: string | null = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID || null;
      
      // Extract video ID from various URL formats
      let videoId: string | null = null;
      
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
      
      if (videoId && accountId) {
        // Use environment variable account ID (correct one) instead of URL account ID
        videoUrl = `https://customer-${accountId}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
        fullVideoUrl = videoUrl;
        console.log('✅ Constructed Cloudflare Stream HLS URL:', {
          videoId,
          accountId,
          url: videoUrl,
          originalUrl: (artwork as any).videoUrl
        });
      } else {
        console.error('❌ Failed to extract Cloudflare Stream video ID or account ID:', {
          originalUrl: videoUrl,
          extractedVideoId: videoId,
          envAccountId: accountId,
          hasAccountId: !!process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID
        });
      }
    }
  }
  // For videos, prioritize video poster/thumbnail images - check for video-specific poster first
  // For videos, we need to ensure we have a poster/thumbnail image to display
  const imageUrl = hasVideo 
    ? (
        // For videos, prioritize: imageUrl (poster), then try to use video thumbnail as poster
        artwork.imageUrl || 
        (artwork as any).supportingImages?.[0] || 
        (artwork as any).images?.[0] || 
        (artwork as any).mediaUrls?.[0] || 
        // If no explicit poster, we'll need to show the video element with its poster attribute
        // But for now, use a placeholder that indicates it's a video
        undefined
      )
    : (
        // For images, use standard imageUrl
        artwork.imageUrl || 
        (artwork as any).supportingImages?.[0] || 
        (artwork as any).images?.[0] || 
        (artwork as any).mediaUrls?.[0] || 
        'https://images.pexels.com/photos/1546249/pexels-photo-1546249.jpeg?auto=compress&cs=tinysrgb&w=800'
      );
  
  // OPTIMIZED: Use optimized image hook for Pinterest/Instagram-style performance
  // Force thumbnail size for initial viewport to ensure fast loading (240px instead of full-size)
  // This is critical for Firebase images which don't have variants
  const optimizedImage = useOptimizedImage({
    src: imageUrl || '',
    size: isInitialViewport ? 'thumbnail' : (isMobile ? 'small' : 'large'), // Use 'large' (1080px) for desktop, not 'medium'
    isGrid: true, // Always grid view in discover feed
    isMobile,
    enableBlur: true,
    priority: isInitialViewport,
  });
  
  // Detect media aspect ratio for dynamic height calculation (Pinterest-style masonry)
  useEffect(() => {
    // First check dimensions if available (works for both images and videos)
    if (artwork.dimensions && artwork.dimensions.width && artwork.dimensions.height) {
      const aspectRatio = artwork.dimensions.width / artwork.dimensions.height;
      setMediaAspectRatio(aspectRatio);
      return;
    }
    
    // For videos, only load metadata when shouldLoadMetadata is true (lazy metadata loading)
    if (hasVideo && videoUrl && shouldLoadMetadata) {
      const video = document.createElement('video');
      video.preload = 'metadata'; // Only load metadata, not the video itself
      video.onloadedmetadata = () => {
        const aspectRatio = video.videoWidth / video.videoHeight;
        setMediaAspectRatio(aspectRatio);
        // Don't call play() - just detect aspect ratio
        setIsVideoLoaded(true); // Mark as loaded so placeholder shows correctly
        // Clean up if using object URL
        if (video.src.startsWith('blob:')) {
          window.URL.revokeObjectURL(video.src);
        }
      };
      video.onerror = (error) => {
        console.error('Error loading video metadata:', error, videoUrl);
        setMediaAspectRatio(2/3); // Default to portrait aspect ratio (2:3) on error
        setIsVideoLoaded(true); // Stop showing loader even on error
        // Clean up if using object URL
        if (video.src.startsWith('blob:')) {
          window.URL.revokeObjectURL(video.src);
        }
      };
      video.src = videoUrl;
      return;
    } else if (hasVideo && !shouldLoadMetadata) {
      // Don't reset aspect ratio if already loaded - maintain it to prevent grid disruption
      // Only use default if metadata was never loaded
      if (!mediaAspectRatio) {
        setMediaAspectRatio(2/3); // Default portrait only on initial load
      }
      // If aspect ratio is already set, keep it - don't reset to default
    }
    
    // For images, load image to detect aspect ratio and preload for display
    // CRITICAL: Don't set isImageLoaded here - let the actual <img> tag's onLoad handle it
    // This prevents race conditions where metadata loads but the actual image doesn't
    const img = document.createElement('img');
    img.onload = () => {
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      setMediaAspectRatio(aspectRatio);
      // DON'T set isImageLoaded here - let the actual <img> tag handle it
      // This ensures the image is only marked as loaded when it's actually visible
    };
    img.onerror = () => {
      setMediaAspectRatio(2/3); // Default to portrait aspect ratio (2:3) on error
      setImageError(true);
      // Don't set isImageLoaded here either - let the error handler in the <img> tag handle it
    };
      img.src = imageUrl;
      img.loading = 'eager'; // Start loading immediately
      
      // Reset loading state when image URL changes
      setIsImageLoaded(false);
      setImageError(false);
  }, [imageUrl, videoUrl, hasVideo, artwork.dimensions, shouldLoadMetadata, mediaAspectRatio]);
  
  // Calculate height based on aspect ratio (column width is fixed, height scales dynamically)
  // Default to 2:3 (portrait) if aspect ratio not yet determined - ideal for tall tiles
  const aspectRatio = mediaAspectRatio || (2/3);
  
  // Register/unregister visible videos for 50% autoplay calculation
  useEffect(() => {
    if (!hasVideo || !artwork.id) return;
    
    if (isInViewport) {
      registerVisibleVideo(artwork.id);
    } else {
      unregisterVisibleVideo(artwork.id);
    }
    
    return () => {
      unregisterVisibleVideo(artwork.id);
    };
  }, [hasVideo, artwork.id, isInViewport, registerVisibleVideo, unregisterVisibleVideo]);

  // Register video with video control system for concurrent playback limiting
  useEffect(() => {
    if (!hasVideo || !videoUrl || !videoRef.current || !artwork.id) return;

    const videoId = artwork.id;
    
    const playCallback = () => {
      if (videoRef.current && !videoRef.current.paused) return;
      if (requestPlay(videoId) && videoRef.current) {
        videoRef.current.play().catch((error) => {
          console.log('Video play prevented:', error);
        });
      }
    };

    const pauseCallback = () => {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    };
    
    const onEndedCallback = () => {
      // Video finished - trigger next in queue
      handleVideoEnded(videoId);
      // Reset to start for potential replay
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
    };

    const unregister = registerVideo(videoId, playCallback, pauseCallback, onEndedCallback);

    return () => {
      unregister();
    };
  }, [hasVideo, videoUrl, artwork.id, registerVideo, requestPlay]);


  const handleTileClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent navigation if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button, a, [role="button"]')) {
      return;
    }
    
    // Navigate to artwork detail page only if we have an artwork id
    if (artwork?.id) {
      console.log('🎯 Artwork tile clicked:', artwork.id, artwork.title);
      // Don't prevent default - let navigation happen naturally
      // Record click engagement
      engagementTracker.recordClick(artwork.id);
      // Use window.location directly for more reliable navigation
      const artworkUrl = `/artwork/${encodeURIComponent(artwork.id)}`;
      console.log('🚀 Navigating to:', artworkUrl);
      window.location.href = artworkUrl;
    if (onClick) onClick();
    } else {
      console.warn('⚠️ Artwork tile clicked but no ID:', artwork);
    }
  };

  const handleFollowToggle = () => {
    if (isFollowing(artwork.artist.id)) {
      unfollowArtist(artwork.artist.id);
    } else {
      followArtist(artwork.artist.id);
    }
  };

  // Mock data for artist's additional content
const generateArtistContent = (artist: Artist) => ({
    events: [
      {
        id: `event-${artist.id}-1`,
        title: `${artist.name} - Gallery Opening`,
        description: 'Join us for an exclusive gallery opening featuring new works by the artist.',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000),
        location: artist.location || 'TBA',
        venue: 'Modern Art Gallery',
        type: 'Exhibition',
        bookingUrl: 'https://gallery-booking.com/event1',
        imageUrl: generatePlaceholderUrl(400, 200),
        price: 'Free',
        capacity: 100,
        isEditable: true
      },
      {
        id: `event-${artist.id}-2`,
        title: 'Live Art Workshop',
        description: 'Learn advanced techniques in a hands-on workshop with the artist.',
        date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
        location: 'Virtual Event',
        venue: 'Online Studio',
        type: 'Workshop',
        bookingUrl: 'https://workshop-booking.com/event2',
        imageUrl: generatePlaceholderUrl(400, 200),
        price: '$75',
        capacity: 25,
        isEditable: true
      },
      {
        id: `event-${artist.id}-3`,
        title: 'Artist Talk & Q&A',
        description: 'An intimate conversation about the creative process and artistic journey.',
        date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        location: 'Community Center',
        venue: 'Downtown Arts Center',
        type: 'Talk',
        bookingUrl: 'https://talk-booking.com/event3',
        imageUrl: generatePlaceholderUrl(400, 200),
        price: '$25',
        capacity: 50,
        isEditable: true
      }
    ],
    courses: [
      {
        id: `course-${artist.id}-1`,
        title: `${artist.name} - Masterclass`,
        price: Math.floor(Math.random() * 200) + 50,
        students: Math.floor(Math.random() * 100) + 10,
        rating: 4.5 + Math.random() * 0.5
      }
    ],
  shopItems: [
    {
      id: `shop-${artist.id}-1`,
      title: `${artist.name} Limited Print`,
      description: 'Signed archival print on museum-grade paper. Edition of 50.',
      price: Math.floor(Math.random() * 300) + 150,
      available: Math.floor(Math.random() * 20) + 5,
      imageUrl: generatePlaceholderUrl(480, 320),
      shipping: 'Worldwide shipping available'
    },
    {
      id: `shop-${artist.id}-2`,
      title: `${artist.name} Original Canvas`,
      description: 'Original mixed media canvas piece with certificate of authenticity.',
      price: Math.floor(Math.random() * 1500) + 500,
      available: 1,
      imageUrl: generatePlaceholderUrl(480, 320),
      shipping: 'Ships from artist studio'
    }
  ],
    communities: [
      {
        id: `community-${artist.id}-1`,
        name: `${artist.name}'s Art Circle`,
        members: Math.floor(Math.random() * 500) + 50,
        isPrivate: Math.random() > 0.5
      }
    ]
  });

  const artistContent = generateArtistContent(artwork.artist);
  const following = isFollowing(artwork.artist.id);

  const { toggleLike, isLiked, loading: likesLoading } = useLikes();
  const liked = isLiked(artwork.id);
  const [isBannerExpanded, setIsBannerExpanded] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const tileRef = useRef<HTMLDivElement>(null);
  
  // Prefetch video metadata when near viewport, full video on hover
  const { handleMouseEnter } = useVideoPrefetch(
    videoUrl,
    fullVideoUrl,
    isInViewport || isInitialViewport,
    hasVideo && !!videoUrl
  );

  // If prop indicates initial viewport, start loading immediately
  useEffect(() => {
    if (propIsInitialViewport && hasVideo && videoUrl && !shouldLoadVideo) {
      setIsInitialViewport(true);
      setShouldLoadVideo(true);
    }
  }, [propIsInitialViewport, hasVideo, videoUrl, shouldLoadVideo]);

  // Check if tile is in initial viewport (visible on first page load)
  useEffect(() => {
    if (!tileRef.current || !hasVideo || !videoUrl || propIsInitialViewport) return;

    // Check if element is in viewport immediately (before IntersectionObserver)
    const checkInitialViewport = () => {
      if (!tileRef.current) return;
      
      const rect = tileRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const windowWidth = window.innerWidth || document.documentElement.clientWidth;
      
      // Check if tile is visible in initial viewport (within first screen)
      // More lenient check - if any part is visible in viewport
      const isVisible = (
        rect.top < windowHeight + 200 && // Add buffer for preloading
        rect.bottom > -200 && // Add buffer
        rect.left < windowWidth + 200 &&
        rect.right > -200
      );
      
      if (isVisible && !shouldLoadVideo) {
        setIsInitialViewport(true);
        setShouldLoadVideo(true); // Start loading immediately for initial viewport
      }
    };

    // Check immediately, after layout, and after a longer delay to catch all initial tiles
    checkInitialViewport();
    const timeout1 = setTimeout(checkInitialViewport, 100);
    const timeout2 = setTimeout(checkInitialViewport, 500);
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [hasVideo, videoUrl, shouldLoadVideo, propIsInitialViewport]);

  // IntersectionObserver for lazy loading videos, metadata, and tracking views
  // Connection-based loading: Adjust rootMargin based on connection speed
  useEffect(() => {
    if (!tileRef.current || !artwork?.id) return;

    const connectionSpeed = getConnectionSpeed();
    // Aggressive preloading: Start loading images 500-800px before viewport (Pinterest/Instagram style)
    const rootMargin = connectionSpeed === 'fast' ? '800px' : connectionSpeed === 'medium' ? '500px' : '300px';

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Use intersectionRatio to check exact visibility percentage
          const intersectionRatio = entry.intersectionRatio;
          const isIntersecting = entry.isIntersecting;
          // Consider in viewport only if at least 50% is visible
          const isInViewportEnough = intersectionRatio >= 0.5;
          setIsInViewport(isInViewportEnough);
          
          if (isInViewportEnough) {
            // Start tracking view time
            engagementTracker.startTracking(artwork.id);
            
            // Load metadata when tile is near viewport (lazy metadata loading)
            if (hasVideo && videoUrl && !shouldLoadMetadata) {
              setShouldLoadMetadata(true);
            }
            
            // Load video based on connection speed
            if (hasVideo && videoUrl && !shouldLoadVideo) {
              // Only load video immediately on fast connections, otherwise wait
              if (connectionSpeed === 'fast' || isInitialViewport) {
                setShouldLoadVideo(true);
              } else {
                // On slower connections, wait a bit before loading video
                setTimeout(() => {
                  setShouldLoadVideo(true);
                }, 500);
              }
            }
          } else {
            // Stop tracking when less than 50% visible
            engagementTracker.stopTracking(artwork.id);
            
            // Pause video when less than 50% is visible (not just when completely out)
            if (videoRef.current && !videoRef.current.paused) {
              videoRef.current.pause();
            }
            
            // Don't reset metadata loading flag - keep aspect ratio to prevent grid disruption
            // Once metadata is loaded, maintain it even when out of viewport
          }
        });
      },
      {
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0], // Multiple thresholds for granular updates
        rootMargin, // Dynamic rootMargin based on connection speed
      }
    );

    observer.observe(tileRef.current);
    intersectionObserverRef.current = observer;

    return () => {
      observer.disconnect();
      engagementTracker.stopTracking(artwork.id);
      // Cleanup video timeout on unmount
      if (videoLoadTimeoutRef.current) {
        clearTimeout(videoLoadTimeoutRef.current);
        videoLoadTimeoutRef.current = null;
      }
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
    };
  }, [artwork.id, hasVideo, videoUrl, shouldLoadVideo, shouldLoadMetadata, isInitialViewport, getConnectionSpeed]);

  // Track like engagement
  useEffect(() => {
    if (liked && artwork?.id) {
      engagementTracker.recordLike(artwork.id, true);
    }
  }, [liked, artwork.id]);

  // Preload video immediately if in initial viewport
  useEffect(() => {
    if (hasVideo && videoUrl && isInitialViewport && !shouldLoadVideo) {
      // Start loading video immediately for initial viewport tiles
      setShouldLoadVideo(true);
    }
  }, [hasVideo, videoUrl, isInitialViewport, shouldLoadVideo]);

  // Autoplay video when in viewport (muted, looped) with 50% autoplay rule
  useEffect(() => {
    if (!hasVideo || !videoRef.current || !shouldLoadVideo || !artwork.id) return;
    
    const video = videoRef.current;
    const isVisible = isInViewport || isInitialViewport;
    
    if (isVisible) {
      // Start loading video immediately when in viewport
      if (video.readyState === 0) {
        video.load();
      }
      
      // Try to play when video can play (with 50% autoplay rule)
      const tryPlay = () => {
        if (video.readyState >= 2 && video.paused) {
          // Use requestAnimationFrame to ensure registration has completed
          requestAnimationFrame(() => {
            // Check if this video can autoplay (50% rule)
            if (canAutoplay(artwork.id) && requestPlay(artwork.id)) {
              video.play().catch((error) => {
                console.error('Error autoplaying video:', error);
              });
              setIsVideoPaused(false);
            } else {
              // Can't autoplay - keep paused, show play button
              setIsVideoPaused(true);
            }
          });
        }
      };
      
      // Try immediately and on various events
      tryPlay();
      
      // Try immediately and on various events
      video.addEventListener('canplay', tryPlay);
      video.addEventListener('canplaythrough', tryPlay);
      video.addEventListener('loadeddata', tryPlay);
      
      return () => {
        video.removeEventListener('canplay', tryPlay);
        video.removeEventListener('canplaythrough', tryPlay);
        video.removeEventListener('loadeddata', tryPlay);
        if (previewTimerRef.current) {
          clearTimeout(previewTimerRef.current);
        }
      };
    } else {
      // Pause when less than 50% visible (lazy loading - don't play when out of view)
      if (video && !video.paused) {
        video.pause();
        setIsVideoPaused(true);
        // Show poster image when video is paused (out of view)
        setIsImageLoaded(true);
        // Reset to start for next time it becomes visible
        video.currentTime = 0;
      }
      // Clear preview timer when not visible
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
    }
  }, [hasVideo, shouldLoadVideo, isInViewport, isInitialViewport, artwork.id, requestPlay, canAutoplay]);
  // Use artist ID for profile link - this should be the Firestore document ID
  const profileSlug = artwork.artist.id;
  const handleViewProfile = () => {
    setShowArtistPreview(false);
    if (profileSlug) {
      // Always use the artist ID (Firestore document ID) for profile links
      router.push(`/profile/${profileSlug}`);
    } else {
      console.warn('⚠️ No artist ID found for profile link');
      router.push('/profile');
    }
  };

  // Swipe up/down gesture handlers
  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isDownSwipe = distance < -minSwipeDistance; // Swiping down (touchEnd > touchStart)
    const isUpSwipe = distance > minSwipeDistance; // Swiping up (touchEnd < touchStart)
    
    if (isDownSwipe && isBannerExpanded) {
      // Swipe down to close when expanded
      setIsBannerExpanded(false);
    } else if (isUpSwipe && !isBannerExpanded) {
      // Swipe up to open when collapsed
      setIsBannerExpanded(true);
    }
  };

  return (
    <>
    <Card 
        ref={tileRef}
        className={`group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden border-0 flex flex-col rounded-none relative break-inside-avoid ${className || ''}`}
        onClick={handleTileClick}
        onMouseEnter={handleMouseEnter}
        style={{
          width: '100%', // Fill column width completely
          pointerEvents: 'auto', // Ensure clicks work
          zIndex: 1, // Ensure tile is above background
          margin: 0, // Ensure no margins that could create irregular gaps
          padding: 0, // Ensure no padding that could create irregular gaps
        }}
    >
      <div 
        className="relative overflow-hidden w-full cursor-pointer"
        onClick={handleTileClick}
        style={{
          // Use padding-bottom trick to maintain aspect ratio
          paddingBottom: `${(1 / aspectRatio) * 100}%`,
        }}
      >
        <div className="absolute inset-0 bg-muted pointer-events-none">
          {/* Loading skeleton - only show if poster not loaded yet */}
          {((hasVideo && !isImageLoaded) || (!hasVideo && !isImageLoaded)) && (
            <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse z-0 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            </div>
          )}
          
          {/* Media content */}
          {hasVideo && videoUrl ? (
            <>
              {/* Poster image - ALWAYS show immediately, stays visible until video is ready */}
              {/* For videos, always try to show a poster/thumbnail - use imageUrl if available, otherwise use video's first frame via poster attribute */}
              {(imageUrl || videoUrl) ? (
                <>
                  {/* Skeleton loader for video poster - prevents black squares */}
                  {imageUrl && !isImageLoaded && !imageError && (
                    <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse z-0">
                      <div className="absolute inset-0 flex items-center justify-center opacity-20">
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      </div>
                    </div>
                  )}
                  {imageUrl ? (
        <Image
                      src={imageUrl}
                      alt={artwork.imageAiHint || artwork.title || 'Video thumbnail'}
                      fill
                      className={`object-cover transition-opacity duration-500 absolute inset-0 z-10 pointer-events-none ${isVideoLoaded && !isVideoPaused && isInViewport ? 'opacity-0' : 'opacity-100'}`}
                      loading="eager"
                      priority={true}
                      onLoad={() => {
                        setIsImageLoaded(true);
                        // Call onImageReady if this is in initial viewport (for preloading)
                        // Pass true for video posters so we can track them separately
                        if (isInitialViewport && onImageReady) {
                          onImageReady(true); // true = this is a video poster
                        }
                      }}
                        onError={() => {
                          // Retry up to 3 times with exponential backoff
                          if (retryCount < 3 && !fallbackImageUrl) {
                            const retryDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
                            setTimeout(() => {
                              setRetryCount(prev => prev + 1);
                              setIsImageLoaded(false); // Force retry
                            }, retryDelay);
                            return; // Don't set error yet, will retry
                          }
                          // After all retries failed, use placeholder - DO NOT call onImageReady
                          // This ensures failed images don't count as "ready" and loading screen waits for successful loads
                          setImageError(true);
                          setFallbackImageUrl(generatePlaceholderUrl(400, 600));
                          setIsImageLoaded(true);
                          // DO NOT call onImageReady on error - loading screen must wait for successful loads
                        }}
                    />
                  ) : (
                    // If no explicit poster image, show a hidden video element to extract first frame as thumbnail
                    <video
                      src={videoUrl}
                      className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none opacity-100"
                      preload="metadata"
                      muted
                      playsInline
                      onLoadedMetadata={() => {
                        setIsImageLoaded(true);
                        if (isInitialViewport && onImageReady) {
                          onImageReady(true);
                        }
                      }}
                      onError={() => {
                        // Retry up to 3 times with exponential backoff
                        if (retryCount < 3 && !fallbackImageUrl) {
                          const retryDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
                          setTimeout(() => {
                            setRetryCount(prev => prev + 1);
                            setIsImageLoaded(false); // Force retry
                          }, retryDelay);
                          return; // Don't set error yet, will retry
                        }
                        // After all retries failed, use placeholder - DO NOT call onImageReady
                        setImageError(true);
                        setFallbackImageUrl(generatePlaceholderUrl(400, 600));
                        setIsImageLoaded(true);
                        // DO NOT call onImageReady on error - loading screen must wait for successful loads
                      }}
                    />
                  )}
                  {/* Error state for video poster - show placeholder instead of error message */}
                  {imageError && fallbackImageUrl && (
                    <Image
                      src={fallbackImageUrl}
                      alt={artwork.imageAiHint || artwork.title || 'Video thumbnail placeholder'}
                      fill
                      className="object-cover absolute inset-0 z-15 pointer-events-none"
                    />
                  )}
                </>
              ) : (
                // Fallback: show loading placeholder if no imageUrl or videoUrl
                <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted flex items-center justify-center z-10 pointer-events-none">
                  <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}
              
              {/* Video element - loads when in viewport, replaces poster thumbnail when playing */}
              {/* Use preload based on connection speed - metadata for slow, auto for fast */}
              {shouldLoadVideo && !videoError && (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className={`w-full h-full object-cover group-hover:scale-105 transition-opacity duration-500 absolute inset-0 pointer-events-none ${!isVideoLoaded || isVideoPaused ? 'opacity-0' : 'opacity-100 z-20'}`}
                  muted={true}
                  loop={true}
                  playsInline={true}
                  webkit-playsinline="true"
                  x5-playsinline="true"
                  preload={getConnectionSpeed() === 'fast' ? 'metadata' : 'none'}
                  controls={false}
                  autoPlay={false}
                  poster={imageUrl || undefined}
                  onLoadedMetadata={() => {
                    if (videoLoadTimeoutRef.current) {
                      clearTimeout(videoLoadTimeoutRef.current);
                      videoLoadTimeoutRef.current = null;
                    }
                    // Metadata loaded - video dimensions known, can start buffering
                    // Poster image is already visible, video will fade in when ready
                  }}
                  onCanPlay={() => {
                    if (videoLoadTimeoutRef.current) {
                      clearTimeout(videoLoadTimeoutRef.current);
                      videoLoadTimeoutRef.current = null;
                    }
                    // Video is ready to play - mark as loaded
                    setIsVideoLoaded(true);
                    setVideoError(false);
                    
                    // CRITICAL: Hide poster image when video is ready (replaces thumbnail)
                    // The video will fade in and replace the poster
                    setIsImageLoaded(false); // Hide poster to show video
                    
                    // Autoplay immediately when ready and in viewport
                    if ((isInViewport || isInitialViewport) && videoRef.current && videoRef.current.paused && artwork.id) {
                      if (canAutoplay(artwork.id) && requestPlay(artwork.id)) {
                        // Autoplay immediately - video will replace poster thumbnail
                        videoRef.current.play().then(() => {
                          setIsVideoPaused(false);
                          // Ensure poster is hidden when video starts playing
                          setIsImageLoaded(false);
                        }).catch((error) => {
                          console.error('Error autoplaying video:', error);
                          setIsVideoPaused(true);
                          // If autoplay fails, show poster again
                          setIsImageLoaded(true);
                        });
                      } else {
                        // Can't autoplay - keep paused, show play button and poster
                        setIsVideoPaused(true);
                        setIsImageLoaded(true); // Keep poster visible
                      }
                    } else if (!isInViewport && !isInitialViewport) {
                      // Not in viewport - keep paused and show poster
                      setIsVideoPaused(true);
                      setIsImageLoaded(true);
                    }
                  }}
                  onPlay={() => {
                    setIsVideoPaused(false);
                    // Hide poster image when video starts playing (replaces thumbnail)
                    setIsImageLoaded(false);
                    // Notify parent that video is playing
                    if (onVideoReady) {
                      onVideoReady();
                    }
                  }}
                  onPause={() => {
                    setIsVideoPaused(true);
                    // Show poster image when video is paused
                    setIsImageLoaded(true);
                  }}
                  onEnded={() => {
                    // Video finished - trigger next in queue via video control provider
                    setIsVideoPaused(true);
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                    }
                    // The onEnded callback in registerVideo will handle queue
                  }}
                  onLoadedData={() => {
                    // Data loaded - video is ready
                    setIsVideoLoaded(true);
                    setVideoError(false);
                    // Try to autoplay if in viewport
                    if ((isInViewport || isInitialViewport) && videoRef.current && videoRef.current.paused && artwork.id) {
                      if (canAutoplay(artwork.id) && requestPlay(artwork.id)) {
                        videoRef.current.play().then(() => {
                          setIsVideoPaused(false);
                          setIsImageLoaded(false); // Hide poster when video plays
                        }).catch(() => {
                          setIsVideoPaused(true);
                          setIsImageLoaded(true); // Show poster if autoplay fails
                        });
                      }
                    }
                  }}
                  onProgress={() => {
                    // Video is buffering - mark as loaded when ready
                    if (!isVideoLoaded && videoRef.current && videoRef.current.readyState >= 2) {
                      setIsVideoLoaded(true);
                    }
                  }}
                  onError={(e) => {
                    console.error('Error loading video:', e, videoUrl, {
                      error: e.currentTarget.error,
                      networkState: e.currentTarget.networkState,
                      readyState: e.currentTarget.readyState
                    });
                    if (videoLoadTimeoutRef.current) {
                      clearTimeout(videoLoadTimeoutRef.current);
                      videoLoadTimeoutRef.current = null;
                    }
                    setVideoError(true);
                    setIsVideoLoaded(true);
                    setIsImageLoaded(true); // Show poster on error
                  }}
                  onLoadStart={() => {
                    // Set a timeout for video loading (10 seconds)
                    if (videoLoadTimeoutRef.current) {
                      clearTimeout(videoLoadTimeoutRef.current);
                    }
                    videoLoadTimeoutRef.current = setTimeout(() => {
                      console.warn('Video loading timeout:', videoUrl);
                      // Show poster if timeout
                      setIsImageLoaded(true);
                      if (imageUrl) {
                        setIsVideoLoaded(true);
                      }
                    }, 10000);
                  }}
                />
              )}
              
              {/* Play button overlay - show when video is paused */}
              {hasVideo && isVideoLoaded && isVideoPaused && isInViewport && (
                <div 
                  className="absolute top-2 right-2 z-30 pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (videoRef.current && videoRef.current.paused) {
                      if (requestPlay(artwork.id)) {
                        videoRef.current.play().catch((error) => {
                          console.error('Error playing video:', error);
                        });
                        setIsVideoPaused(false);
                      }
                    }
                  }}
                >
                  <div className="bg-black/60 backdrop-blur-sm rounded-full p-2 hover:bg-black/80 transition-colors">
                    <Play className="h-5 w-5 text-white fill-white" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Blur-up placeholder (Pinterest/Instagram style) - shows instantly */}
              {!isImageLoaded && !imageError && (artwork.blurPlaceholder || optimizedImage.placeholder) && (
                <div 
                  className="absolute inset-0 z-0 blur-xl scale-110"
                  style={{
                    backgroundImage: `url(${artwork.blurPlaceholder || optimizedImage.placeholder})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(20px)',
                    opacity: 0.6,
                  }}
                />
              )}
              {/* Skeleton loader fallback */}
              {!isImageLoaded && !imageError && !optimizedImage.placeholder && (
                <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse z-0">
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                </div>
              )}
              {/* Use native img for ALL CDN images (faster), Next.js Image only as fallback */}
              {(() => {
                // CRITICAL FIX: Always use original imageUrl directly - never use optimizedImage.src
                // optimizedImage.src can be broken/empty, causing images to not load
                const imageSrc = imageError && fallbackImageUrl ? fallbackImageUrl : (imageUrl || '');
                const isCloudflareImage = imageSrc.includes('imagedelivery.net');
                const isCloudflareStreamThumbnail = imageSrc.includes('cloudflarestream.com');
                const isFirebaseImage = imageSrc.includes('firebasestorage') || imageSrc.includes('firebase');
                
                // Debug: Log image URL for troubleshooting
                if (!imageUrl || imageUrl === '') {
                  console.warn('⚠️ ArtworkTile: Missing imageUrl', {
                    artworkId: artwork.id,
                    title: artwork.title,
                    hasVideo: hasVideo,
                    videoUrl: (artwork as any).videoUrl,
                    supportingImages: (artwork as any).supportingImages,
                    mediaUrls: (artwork as any).mediaUrls,
                    fullArtwork: artwork
                  });
                }
                
                // If no image URL at all, show placeholder
                if (!imageSrc || imageSrc === '') {
                  return (
                    <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted flex items-center justify-center z-10">
                      <div className="text-muted-foreground text-xs text-center px-2">No image</div>
                    </div>
                  );
                }
                
                // Debug: Log the actual image source being used
                if (process.env.NODE_ENV === 'development') {
                  console.log('🖼️ ArtworkTile loading image:', {
                    artworkId: artwork.id,
                    imageSrc,
                    isCloudflareImage: isCloudflareImage,
                    isCloudflareStreamThumbnail: isCloudflareStreamThumbnail,
                    isFirebase: isFirebaseImage,
                    isInitialViewport
                  });
                }
                
                // PRIORITY 1: Cloudflare Stream thumbnails (use directly, no variant manipulation)
                if (isCloudflareStreamThumbnail) {
                  // Cloudflare Stream thumbnails are already optimized and should be used as-is
                  // Format: https://customer-{accountId}.cloudflarestream.com/{videoId}/thumbnails/thumbnail.jpg
                  const cloudflareUrl = imageSrc;
                  
                  // Calculate dimensions from aspect ratio to prevent layout shift
                  const tileWidth = 400;
                  const calculatedHeight = Math.round(tileWidth / aspectRatio);
                  const imgWidth = artwork.imageWidth || tileWidth;
                  const imgHeight = artwork.imageHeight || calculatedHeight;
                  const finalWidth = imgWidth && imgWidth > 0 ? imgWidth : tileWidth;
                  const finalHeight = imgHeight && imgHeight > 0 ? imgHeight : calculatedHeight;
                  
                  // Add timeout fallback to show image even if onLoad doesn't fire
                  React.useEffect(() => {
                    if (!isImageLoaded && !imageError && cloudflareUrl) {
                      const timeout = setTimeout(() => {
                        // If image hasn't loaded after 3 seconds, assume it's loaded or show it anyway
                        if (!isImageLoaded) {
                          console.warn('⏱️ Image load timeout, showing anyway:', cloudflareUrl);
                          setIsImageLoaded(true);
                        }
                      }, 3000);
                      return () => clearTimeout(timeout);
                    }
                  }, [cloudflareUrl, isImageLoaded, imageError]);
                  
                  return (
                    <img
                      src={cloudflareUrl}
                      alt={artwork.imageAiHint || artwork.title || 'Artwork'}
                      width={finalWidth}
                      height={finalHeight}
                      className={`absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-opacity duration-300 z-10 pointer-events-none ${imageError ? 'opacity-0' : 'opacity-100'}`}
                      loading={isInitialViewport ? "eager" : "lazy"}
                      fetchPriority={isInitialViewport ? "high" : "auto"}
                      decoding="async"
                      key={`${cloudflareUrl}-${retryCount}`}
                      onLoadStart={() => {
                        // Debug: Log when image starts loading
                        if (process.env.NODE_ENV === 'development') {
                          console.log('🔄 Image load started:', cloudflareUrl);
                        }
                      }}
                      onLoad={() => {
                        setIsImageLoaded(true);
                        setImageError(false);
                        setRetryCount(0);
                        if (isInitialViewport && onImageReady) {
                          onImageReady(false);
                        }
                        // Debug logging
                        if (process.env.NODE_ENV === 'development') {
                          console.log('✅ Image loaded successfully:', cloudflareUrl);
                        }
                      }}
                      onError={(e) => {
                        // Log error for debugging (but only once per URL)
                        if (!failedUrlsRef.current.has(cloudflareUrl)) {
                          failedUrlsRef.current.add(cloudflareUrl);
                          console.warn('⚠️ Cloudflare Stream thumbnail load error:', {
                            url: cloudflareUrl,
                            artworkId: artwork.id,
                            retryCount,
                            originalUrl: imageSrc
                          });
                        }
                        setImageError(true);
                        setIsImageLoaded(false);
                      }}
                    />
                  );
                }
                
                // PRIORITY 2: Cloudflare Images (new uploads)
                if (isCloudflareImage) {
                  let cloudflareUrl = imageSrc;
                  
                  // Extract Cloudflare image ID and account hash to construct proper variant URL
                  // URL format: https://imagedelivery.net/{accountHash}/{imageId}/{variant}
                  // The regex needs to extract accountHash and imageId, ignoring the variant at the end
                  const cloudflareMatch = imageSrc.match(/imagedelivery\.net\/([^/]+)\/([^/]+)(?:\/([^/]+))?/);
                  if (cloudflareMatch) {
                    const [, accountHash, imageId, existingVariant] = cloudflareMatch;
                    
                    // CRITICAL: Use /Thumbnail ONLY for video posters (placeholders before autoplay)
                    // Use /1080px for regular image artworks to match Instagram/Pinterest quality
                    if (hasVideo) {
                      // Video poster: Use /Thumbnail variant (240px, ~30KB - fast placeholder)
                      cloudflareUrl = `https://imagedelivery.net/${accountHash}/${imageId}/Thumbnail`;
                    } else {
                      // Regular image artwork: Use /1080px variant - Instagram/Pinterest standard
                      // This matches Instagram's 1080px feed resolution for best quality
                      cloudflareUrl = `https://imagedelivery.net/${accountHash}/${imageId}/1080px`;
                    }
                    
                    // Debug logging
                    if (process.env.NODE_ENV === 'development') {
                      console.log('🖼️ Cloudflare URL construction:', {
                        original: imageSrc,
                        accountHash,
                        imageId,
                        existingVariant,
                        constructed: cloudflareUrl,
                        hasVideo
                      });
                    }
                  } else {
                    // Fallback: Determine variant based on whether it's a video
                    if (hasVideo) {
                      // Video poster: Use /Thumbnail
                      if (!imageSrc.includes('/Thumbnail') && !imageSrc.includes('/thumbnail')) {
                        cloudflareUrl = imageSrc.replace(/\/[^/]+$/, '/Thumbnail');
                      }
                    } else {
                      // Regular image: Use /1080px (Instagram/Pinterest standard)
                      if (!imageSrc.includes('/1080px') && !imageSrc.includes('/public')) {
                        cloudflareUrl = imageSrc.replace(/\/[^/]+$/, '/1080px');
                      }
                    }
                    
                    // Debug logging for fallback
                    if (process.env.NODE_ENV === 'development') {
                      console.warn('⚠️ Cloudflare URL regex failed, using fallback:', {
                        original: imageSrc,
                        fallback: cloudflareUrl
                      });
                    }
                  }
                  
                  // Calculate dimensions from aspect ratio to prevent layout shift
                  const tileWidth = 400;
                  const calculatedHeight = Math.round(tileWidth / aspectRatio);
                  const imgWidth = artwork.imageWidth || tileWidth;
                  const imgHeight = artwork.imageHeight || calculatedHeight;
                  const finalWidth = imgWidth && imgWidth > 0 ? imgWidth : tileWidth;
                  const finalHeight = imgHeight && imgHeight > 0 ? imgHeight : calculatedHeight;
                  
                  // Add timeout fallback to show image even if onLoad doesn't fire
                  React.useEffect(() => {
                    if (!isImageLoaded && !imageError && cloudflareUrl) {
                      const timeout = setTimeout(() => {
                        // If image hasn't loaded after 3 seconds, assume it's loaded or show it anyway
                        if (!isImageLoaded) {
                          console.warn('⏱️ Image load timeout, showing anyway:', cloudflareUrl);
                          setIsImageLoaded(true);
                        }
                      }, 3000);
                      return () => clearTimeout(timeout);
                    }
                  }, [cloudflareUrl, isImageLoaded, imageError]);
                  
                  return (
                    <img
                      src={cloudflareUrl}
                      alt={artwork.imageAiHint || artwork.title || 'Artwork'}
                      width={finalWidth}
                      height={finalHeight}
                      className={`absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-opacity duration-300 z-10 pointer-events-none ${imageError ? 'opacity-0' : 'opacity-100'}`}
                      loading={isInitialViewport ? "eager" : "lazy"}
                      fetchPriority={isInitialViewport ? "high" : "auto"}
                      decoding="async"
                      key={`${cloudflareUrl}-${retryCount}`}
                      onLoadStart={() => {
                        // Debug: Log when image starts loading
                        if (process.env.NODE_ENV === 'development') {
                          console.log('🔄 Image load started:', cloudflareUrl);
                        }
                      }}
                      onLoad={() => {
                        setIsImageLoaded(true);
                        setImageError(false);
                        setRetryCount(0);
                        if (isInitialViewport && onImageReady) {
                          onImageReady(false);
                        }
                        // Debug logging
                        if (process.env.NODE_ENV === 'development') {
                          console.log('✅ Image loaded successfully:', cloudflareUrl);
                        }
                      }}
                      onError={(e) => {
                        // Log error for debugging (but only once per URL)
                        if (!failedUrlsRef.current.has(cloudflareUrl)) {
                          failedUrlsRef.current.add(cloudflareUrl);
                          console.warn('⚠️ Cloudflare image load error:', {
                            url: cloudflareUrl,
                            artworkId: artwork.id,
                            variant: hasVideo ? 'Thumbnail' : '1080px',
                            retryCount,
                            originalUrl: imageSrc
                          });
                        }
                        
                        // Fallback: Try alternative variant if current one fails
                        if (retryCount < 2 && !fallbackImageUrl) {
                          const cloudflareMatch = imageSrc.match(/imagedelivery\.net\/([^/]+)\/([^/]+)/);
                          if (cloudflareMatch) {
                            const [, accountHash, imageId] = cloudflareMatch;
                            // Try /public variant as fallback (most compatible)
                            const fallbackUrl = `https://imagedelivery.net/${accountHash}/${imageId}/public`;
                            
                            if (fallbackUrl !== cloudflareUrl && !failedUrlsRef.current.has(fallbackUrl)) {
                              console.log('🔄 Retrying with /public variant:', fallbackUrl);
                              setTimeout(() => {
                                setRetryCount(prev => prev + 1);
                                setIsImageLoaded(false);
                                (e.target as HTMLImageElement).src = fallbackUrl;
                              }, 500);
                              return;
                            }
                          }
                        }
                        
                        // Final fallback: use original URL or placeholder
                        if (retryCount >= 2) {
                          console.warn('❌ All variants failed, using original URL:', imageSrc);
                          // Try original URL as last resort
                          if (imageSrc !== cloudflareUrl && !failedUrlsRef.current.has(imageSrc)) {
                            setTimeout(() => {
                              setRetryCount(prev => prev + 1);
                              setIsImageLoaded(false);
                              (e.target as HTMLImageElement).src = imageSrc;
                            }, 500);
                            return;
                          }
                        }
                        
                        // Ultimate fallback: show placeholder but mark as loaded so it's visible
                        console.error('❌ Image failed to load after all retries:', cloudflareUrl);
                        setImageError(true);
                        setFallbackImageUrl(generatePlaceholderUrl(400, 600));
                        setIsImageLoaded(true); // Show placeholder
                      }}
                    />
                  );
                }
                
                // PRIORITY 2: Firebase Images (legacy content only) - use direct URL
                // NOTE: New uploads go to Cloudflare, but old content may still have Firebase URLs
                // These should be migrated to Cloudflare using the migration tool
                if (isFirebaseImage) {
                  console.warn('⚠️ Loading legacy Firebase image (should be migrated to Cloudflare):', imageSrc);
                  const tileWidth = 400;
                  const calculatedHeight = Math.round(tileWidth / aspectRatio);
                  const imgWidth = artwork.imageWidth || tileWidth;
                  const imgHeight = artwork.imageHeight || calculatedHeight;
                  const finalWidth = imgWidth && imgWidth > 0 ? imgWidth : tileWidth;
                  const finalHeight = imgHeight && imgHeight > 0 ? imgHeight : calculatedHeight;
                  
                  return (
                    <img
                      src={imageSrc}
                      alt={artwork.imageAiHint || artwork.title || 'Artwork'}
                      width={finalWidth}
                      height={finalHeight}
                      className={`absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-all duration-300 z-10 pointer-events-none ${!isImageLoaded ? 'opacity-0' : 'opacity-100'}`}
                      loading={isInitialViewport ? "eager" : "lazy"}
                      fetchPriority={isInitialViewport ? "high" : "auto"}
                      decoding="async"
                      key={`${imageSrc}-${retryCount}`}
                      onLoad={() => {
                        setIsImageLoaded(true);
                        setImageError(false);
                        setRetryCount(0);
                        if (isInitialViewport && onImageReady) {
                          onImageReady(false);
                        }
                      }}
                      onError={(e) => {
                        console.error('❌ Firebase image load error:', {
                          url: imageSrc,
                          artworkId: artwork.id,
                          title: artwork.title,
                          error: e,
                          retryCount,
                          hasFallback: !!fallbackImageUrl,
                          imageUrl: imageUrl,
                          fullArtwork: artwork
                        });
                        
                        // Check if URL is actually valid
                        if (!imageSrc || imageSrc === '' || !imageSrc.startsWith('http')) {
                          console.error('❌ Invalid image URL:', imageSrc);
                          setImageError(true);
                          setFallbackImageUrl(generatePlaceholderUrl(400, 600));
                          setIsImageLoaded(true);
                          return;
                        }
                        
                        if (retryCount < 1 && !fallbackImageUrl) {
                          // Retry once with original URL
                          console.log('🔄 Retrying image load:', imageSrc);
                          setTimeout(() => {
                            setRetryCount(prev => prev + 1);
                            setIsImageLoaded(false);
                          }, 1000);
                          return;
                        }
                        setImageError(true);
                        setFallbackImageUrl(generatePlaceholderUrl(400, 600));
                        setIsImageLoaded(true);
                      }}
                    />
                  );
                }
                
                // For other URLs, use Next.js Image with proper size optimization
                // CRITICAL: Use sizes prop to force Next.js to generate 240px images for grid view
                // This ensures Firebase images load at thumbnail size (240px) instead of full-size
                const firebaseSizes = isInitialViewport 
                  ? "240px" // Force 240px for initial viewport (thumbnail)
                  : "(max-width: 640px) 240px, (max-width: 1024px) 480px, 720px"; // Responsive for others
                
                return (
                  <Image
                    src={imageSrc}
                    alt={artwork.imageAiHint || artwork.title || 'Artwork'}
                    fill
                    className={`object-cover group-hover:scale-105 transition-all duration-300 z-10 pointer-events-none ${!isImageLoaded ? 'opacity-0' : 'opacity-100'}`}
                    loading={isInitialViewport ? "eager" : "lazy"}
                    priority={isInitialViewport}
                    sizes={firebaseSizes} // CRITICAL: Forces Next.js to generate 240px images for grid
                    quality={isInitialViewport ? 75 : 85} // Lower quality for thumbnails (faster load)
                    key={retryCount}
                    onLoad={() => {
                      setIsImageLoaded(true);
                      setImageError(false);
                      setRetryCount(0);
                      if (isInitialViewport && onImageReady) {
                        onImageReady(false);
                      }
                    }}
                    onError={() => {
                      if (retryCount < 3 && !fallbackImageUrl) {
                        const retryDelay = Math.pow(2, retryCount) * 1000;
                        setTimeout(() => {
                          setRetryCount(prev => prev + 1);
                          setIsImageLoaded(false);
                        }, retryDelay);
                        return;
                      }
                      setImageError(true);
                      setFallbackImageUrl(generatePlaceholderUrl(400, 600));
                      setIsImageLoaded(true);
                    }}
                  />
                );
              })()}
              {/* Error state - show placeholder instead of error message */}
              {imageError && fallbackImageUrl && (
                <Image
                  src={fallbackImageUrl}
                  alt={artwork.imageAiHint || artwork.title || 'Image placeholder'}
                  fill
                  className="object-cover absolute inset-0 z-20 pointer-events-none"
                />
              )}
            </>
          )}
        </div>
        {/* Sale status badge */}
        {artwork.sold ? (
          <div className="absolute top-2 left-2 z-10 pointer-events-none">
            <Badge variant="destructive" className="text-xs px-2 py-1">
              Sold
            </Badge>
          </div>
        ) : artwork.isForSale ? (
          <div className="absolute top-2 left-2 z-10 pointer-events-none">
            <Badge className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1">
              {artwork.priceType === 'contact' || artwork.contactForPrice ? 'For Sale' : artwork.price ? `$${artwork.price.toLocaleString()}` : 'For Sale'}
            </Badge>
          </div>
        ) : null}

        {/* Followed artist indicator - subtle tag */}
        {following && (
          <div className="absolute top-2 right-2 z-10 pointer-events-none">
            <Badge variant="outline" className="text-xs px-2 py-1 bg-background/80 backdrop-blur-sm border-primary/30 text-primary">
              Following
            </Badge>
          </div>
        )}

        {/* AI badge */}
        {artwork.isAI && (
          <div className="absolute top-2 left-2 pointer-events-none">
            <Badge variant="secondary" className="text-xs">
              AI {artwork.aiAssistance}
            </Badge>
          </div>
        )}

          {/* Artist banner at bottom */}
          {!hideBanner && (
          <div
            className={`absolute bottom-0 left-0 right-0 backdrop-blur-sm p-2 pointer-events-none ${
              (resolvedTheme || theme) === 'dark' ? 'bg-gray-900/90' : 'bg-white/90'
            }`}
          >
            <div className="flex items-center gap-2 pointer-events-none">
              <Avatar className="h-6 w-6 pointer-events-none">
                <AvatarImage 
                  src={artwork.artist.avatarUrl || generateAvatarPlaceholderUrl(24, 24)} 
                  alt={artwork.artist.name}
                  className="object-cover pointer-events-none"
                />
                <AvatarFallback className="text-xs pointer-events-none">
                  {(typeof artwork.artist?.name === 'string' ? artwork.artist.name : '')
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 pointer-events-none">
                <div className="flex items-center gap-1 pointer-events-none">
                  <span className="text-sm font-medium truncate pointer-events-none">
                    {artwork.artist.name}
                  </span>
                </div>
                {artwork.artist.location && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground pointer-events-none">
                    <MapPin className="h-3 w-3 pointer-events-none" />
                    <span className="truncate pointer-events-none">{artwork.artist.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
      </div>
    </Card>

      {/* Artist Preview Dialog */}
      <Dialog open={showArtistPreview} onOpenChange={(open) => {
        setShowArtistPreview(open);
        if (!open) setIsBannerExpanded(false);
      }}>
        <DialogContent className="max-w-4xl w-full h-full md:h-auto p-0 md:p-6 overflow-hidden border-0 md:border-border rounded-none md:rounded-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>Artist Profile</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col md:flex-row h-full md:max-h-[80vh]">
            {/* Hero Artwork - Fullscreen on mobile */}
            <div className={`relative w-full h-full md:w-3/5 flex flex-col ${
              (resolvedTheme || theme) === 'dark' 
                ? 'bg-slate-900' 
                : 'bg-slate-50'
            }`}>
              {/* Close button - mobile only */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 md:hidden bg-background/80 backdrop-blur-sm"
                onClick={() => setShowArtistPreview(false)}
              >
                <X className="h-5 w-5" />
              </Button>
              
              <div className="flex-1 flex items-center justify-center p-0 md:p-6 relative">
                <div className="relative w-full h-full md:max-h-[75vh] md:max-w-full md:rounded-2xl overflow-hidden">
                  {hasVideo && videoUrl ? (
                    <video
                      src={videoUrl}
                      className="w-full h-full object-contain"
                      controls
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : (
                  <Image
                      src={imageUrl}
                    alt={artwork.title || artwork.imageAiHint}
                    fill
                    priority
                    className="object-contain"
                  />
                  )}
                  {/* Sale status badge */}
                  {artwork.sold ? (
                    <div className="absolute top-3 left-3 z-10">
                      <Badge variant="destructive" className="text-xs px-2 py-1">
                        Sold
                      </Badge>
                    </div>
                  ) : artwork.isForSale ? (
                    <div className="absolute top-3 left-3 z-10">
                      <Badge className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1">
                        {artwork.priceType === 'contact' || artwork.contactForPrice ? 'For Sale' : artwork.price ? `$${artwork.price.toLocaleString()}` : 'For Sale'}
                      </Badge>
                    </div>
                  ) : null}
                  
                  {/* Followed artist indicator - subtle tag */}
                  {following && (
                    <div className="absolute top-3 right-3 z-10">
                      <Badge variant="outline" className="text-xs px-2 py-1 bg-background/80 backdrop-blur-sm border-primary/30 text-primary">
                        Following
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action buttons - desktop only */}
              <div className="hidden md:flex items-center justify-start gap-3 border-t border-border bg-background/90 px-4 py-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(artwork.id);
                  }}
                  disabled={likesLoading}
                  className={`h-12 w-12 rounded-xl border-2 transition ${
                    liked ? 'border-red-500 text-red-500' : ''
                  }`}
                >
                  <HeartIcon className={`h-6 w-6 ${liked ? 'fill-current' : 'fill-none'}`} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-xl border-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <ReportDialog
                  contentId={artwork.id}
                  contentType="Artwork"
                  content={artwork.title || artwork.description || 'Artwork'}
                  offenderId={artwork.artist.id}
                  offenderHandle={artwork.artist.handle || artwork.artist.name}
                  onReport={async () => {}}
                />
              </div>
              
              {/* Mobile: Collapsible Artist Banner */}
              <Collapsible 
                open={isBannerExpanded} 
                onOpenChange={setIsBannerExpanded}
                className="md:hidden"
              >
                <div 
                  className="bg-background/95 backdrop-blur-sm border-t border-border"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-3 px-4 py-5 w-full cursor-pointer touch-none">
                      <Avatar className="h-12 w-12 border-2 border-background">
                        <AvatarImage
                          src={artwork.artist.avatarUrl || generateAvatarPlaceholderUrl(48, 48)}
                          alt={artwork.artist.name}
                          className="object-cover"
                        />
                        <AvatarFallback>
                          {(typeof artwork.artist?.name === 'string' ? artwork.artist.name : '')
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base truncate">{artwork.artist.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">@{artwork.artist.handle}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await toggleLike(artwork.id);
                        }}
                        disabled={likesLoading}
                      >
                        <HeartIcon className={`h-7 w-7 ${liked ? 'fill-current text-red-500' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Share2 className="h-5 w-5" />
                      </Button>
                      <div onClick={(e) => e.stopPropagation()}>
                        <ReportDialog
                          contentId={artwork.id}
                          contentType="Artwork"
                          content={artwork.title || artwork.description || 'Artwork'}
                          offenderId={artwork.artist.id}
                          offenderHandle={artwork.artist.handle || artwork.artist.name}
                          onReport={async () => {}}
                        />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent 
                    className="px-4 pb-4 space-y-3"
                    onClick={(e) => {
                      // Allow clicks inside content but collapse on swipe
                      e.stopPropagation();
                    }}
                  >
                    <div className="flex flex-col gap-2">
                      <Button
                        variant={following ? 'outline' : 'default'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollowToggle();
                        }}
                        className="flex items-center justify-center gap-2 w-full"
                      >
                        {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                        {following ? 'Following' : 'Follow'}
                      </Button>
                      <Button 
                        variant="gradient" 
                        className="flex items-center justify-center gap-2 w-full" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewProfile();
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Profile
                      </Button>
                    </div>
                    
                    {artwork.artist.bio && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {artwork.artist.bio}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div>
                        <span className="font-bold text-foreground">{artwork.artist.followerCount.toLocaleString()}</span>
                        <span className="ml-1">followers</span>
                      </div>
                      <div>
                        <span className="font-bold text-foreground">{artwork.artist.followingCount.toLocaleString()}</span>
                        <span className="ml-1">following</span>
                      </div>
                      {artwork.artist.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{artwork.artist.location}</span>
                        </div>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Artwork Details
                      </h4>
                      {artwork.title && (
                        <p className="text-sm font-medium text-foreground">{artwork.title}</p>
                      )}
                      {artwork.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{artwork.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {artwork.medium && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {artwork.medium}
                          </Badge>
                        )}
                        {(Array.isArray(artwork.tags) ? artwork.tags : []).slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs capitalize">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>

            {/* Details - Desktop only */}
            <div className="hidden md:flex w-full md:w-2/5 bg-card border-t md:border-t-0 md:border-l border-border overflow-y-auto">
              <div className="h-full flex flex-col">
                <div className="p-6 space-y-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3 flex-wrap">
                      <Avatar className="h-16 w-16 border-4 border-background shadow-lg">
                        <AvatarImage
                          src={artwork.artist.avatarUrl || generateAvatarPlaceholderUrl(96, 96)}
                          alt={artwork.artist.name}
                          className="object-cover"
                        />
                        <AvatarFallback>
                          {(typeof artwork.artist?.name === 'string' ? artwork.artist.name : '')
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-2xl font-bold">{artwork.artist.name}</h2>
                        </div>
                        <p className="text-muted-foreground">@{artwork.artist.handle}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <Button
                        variant={following ? 'gradient' : 'secondary'}
                        onClick={handleFollowToggle}
                        className="flex items-center gap-2 w-full sm:w-auto"
                      >
                        {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                        {following ? 'Following' : 'Follow'}
                      </Button>
                      <Button variant="gradient" className="flex items-center gap-2 w-full sm:w-auto" onClick={handleViewProfile}>
                        <ExternalLink className="h-4 w-4" />
                        View Profile
                      </Button>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">{artwork.artist.bio}</p>

                    <div className="flex items-center gap-5 flex-wrap text-sm">
                      <div>
                        <span className="font-bold">{artwork.artist.followerCount.toLocaleString()}</span>
                        <span className="text-muted-foreground ml-1">followers</span>
                      </div>
                      <div>
                        <span className="font-bold">{artwork.artist.followingCount.toLocaleString()}</span>
                        <span className="text-muted-foreground ml-1">following</span>
                      </div>
                      {artwork.artist.location && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {artwork.artist.location}
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Artwork Details
                    </h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {artwork.title && <p className="text-base font-medium text-foreground">{artwork.title}</p>}
                      {artwork.description && <p>{artwork.description}</p>}
                      <div className="flex flex-wrap gap-3">
                        {artwork.medium && (
                          <Badge variant="outline" className="capitalize">
                            {artwork.medium}
                          </Badge>
                        )}
                        {(Array.isArray(artwork.tags) ? artwork.tags : []).slice(0, 4).map((tag) => (
                          <Badge key={tag} variant="secondary" className="capitalize">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Portfolio Item Expanded View */}
      {selectedPortfolioItem && (
        <Dialog open={!!selectedPortfolioItem} onOpenChange={() => setSelectedPortfolioItem(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="sr-only">Portfolio Item</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Image */}
              <div className="relative allow-pinch-zoom">
                <Image
                  src={selectedPortfolioItem.imageUrl}
                  alt={selectedPortfolioItem.title}
                  width={800}
                  height={600}
                  className="w-full h-auto rounded-lg"
                />
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold">{selectedPortfolioItem.title}</h3>
                  {selectedPortfolioItem.description && (
                    <p className="text-muted-foreground mt-2">{selectedPortfolioItem.description}</p>
                  )}
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {selectedPortfolioItem.medium && (
                    <div>
                      <span className="font-medium">Medium:</span>
                      <p className="text-muted-foreground">{selectedPortfolioItem.medium}</p>
                    </div>
                  )}
                  {selectedPortfolioItem.year && (
                    <div>
                      <span className="font-medium">Year:</span>
                      <p className="text-muted-foreground">{selectedPortfolioItem.year}</p>
                    </div>
                  )}
                  {selectedPortfolioItem.tags && selectedPortfolioItem.tags.length > 0 && (
                    <div className="col-span-2">
                      <span className="font-medium">Tags:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedPortfolioItem.tags.map((tag: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Discussion Section */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold">Discussion</h4>
                  <div className="space-y-3">
                    {/* Mock discussion comments */}
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={generateAvatarPlaceholderUrl(32, 32)} />
                          <AvatarFallback className="text-xs">JD</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">John Doe</span>
                            <span className="text-xs text-muted-foreground">2 hours ago</span>
                          </div>
                          <p className="text-sm">This piece really captures the emotion beautifully. The use of color is incredible!</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={generateAvatarPlaceholderUrl(32, 32)} />
                          <AvatarFallback className="text-xs">SM</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">Sarah Miller</span>
                            <span className="text-xs text-muted-foreground">1 day ago</span>
                          </div>
                          <p className="text-sm">Amazing technique! What inspired this particular composition?</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Add Comment */}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      className="resize-none"
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <Button size="sm">Post Comment</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if artwork data actually changed
  return (
    prevProps.artwork.id === nextProps.artwork.id &&
    prevProps.artwork.imageUrl === nextProps.artwork.imageUrl &&
    prevProps.artwork.title === nextProps.artwork.title &&
    prevProps.hideBanner === nextProps.hideBanner &&
    prevProps.isInitialViewport === nextProps.isInitialViewport
  );
});