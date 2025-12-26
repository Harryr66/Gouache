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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLikes } from '@/providers/likes-provider';
import { ReportDialog } from '@/components/report-dialog';
import { engagementTracker } from '@/lib/engagement-tracker';
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
  isInitialViewport?: boolean; // Flag to indicate this is in initial viewport
}

export function ArtworkTile({ artwork, onClick, className, hideBanner = false, onVideoReady, isInitialViewport: propIsInitialViewport }: ArtworkTileProps) {
  const { isFollowing, followArtist, unfollowArtist } = useFollow();
  const { generatePlaceholderUrl, generateAvatarPlaceholderUrl } = usePlaceholder();
  const { theme, resolvedTheme } = useTheme();
  const router = useRouter();
  const [showArtistPreview, setShowArtistPreview] = useState(false);
  const [selectedPortfolioItem, setSelectedPortfolioItem] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaAspectRatio, setMediaAspectRatio] = useState<number | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [isInitialViewport, setIsInitialViewport] = useState(false);
  const videoLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  
  // Check if artwork has video
  const hasVideo = (artwork as any).videoUrl || (artwork as any).mediaType === 'video';
  const videoUrl = (artwork as any).videoUrl;
  // For videos, ensure we have a poster image - use imageUrl, supportingImages, or fallback
  const imageUrl = artwork.imageUrl || 
                   (artwork as any).supportingImages?.[0] || 
                   (artwork as any).images?.[0] || 
                   (artwork as any).mediaUrls?.[0] || 
                   'https://images.pexels.com/photos/1546249/pexels-photo-1546249.jpeg?auto=compress&cs=tinysrgb&w=800';
  
  // Detect media aspect ratio for dynamic height calculation (Pinterest-style masonry)
  useEffect(() => {
    // First check dimensions if available (works for both images and videos)
    if (artwork.dimensions && artwork.dimensions.width && artwork.dimensions.height) {
      const aspectRatio = artwork.dimensions.width / artwork.dimensions.height;
      setMediaAspectRatio(aspectRatio);
      return;
    }
    
    // For videos, load video metadata to detect aspect ratio (but don't preload or play)
    if (hasVideo && videoUrl) {
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
      video.oncanplay = () => {
        setIsVideoLoaded(true);
      };
      video.src = videoUrl;
      return;
    }
    
    // For images, load image to detect aspect ratio and preload for display
    const img = document.createElement('img');
    img.onload = () => {
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      setMediaAspectRatio(aspectRatio);
      setIsImageLoaded(true); // Image is fully loaded
    };
    img.onerror = () => {
      setMediaAspectRatio(2/3); // Default to portrait aspect ratio (2:3) on error
      setImageError(true);
      setIsImageLoaded(true); // Stop showing loader even on error
    };
    img.src = imageUrl;
    img.loading = 'eager'; // Start loading immediately
    
    // Reset loading state when image URL changes
    setIsImageLoaded(false);
    setImageError(false);
  }, [imageUrl, videoUrl, hasVideo, artwork.dimensions]);
  
  // Calculate height based on aspect ratio (column width is fixed, height scales dynamically)
  // Default to 2:3 (portrait) if aspect ratio not yet determined - ideal for tall tiles
  const aspectRatio = mediaAspectRatio || (2/3);
  
  // Intersection Observer for video autoplay on Discover feed
  useEffect(() => {
    if (!hasVideo || !videoUrl || !videoRef.current || !tileRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Video is in view - play it
            if (videoRef.current) {
              videoRef.current.play().catch((error) => {
                // Autoplay failed (browser policy) - this is expected on some browsers
                console.log('Video autoplay prevented by browser:', error);
              });
            }
          } else {
            // Video is out of view - pause it
            if (videoRef.current) {
              videoRef.current.pause();
            }
          }
        });
      },
      { threshold: 0.5 } // Trigger when 50% of video is visible
    );

    observer.observe(tileRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasVideo, videoUrl]);

  const handleTileClick = () => {
    // Navigate to artwork detail page only if we have an artwork id
    if (artwork?.id) {
      // Record click engagement
      engagementTracker.recordClick(artwork.id);
      router.push(`/artwork/${encodeURIComponent(artwork.id)}`);
      if (onClick) onClick();
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

  // IntersectionObserver for lazy loading videos and tracking views
  useEffect(() => {
    if (!tileRef.current || !artwork?.id) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isIntersecting = entry.isIntersecting;
          setIsInViewport(isIntersecting);
          
          if (isIntersecting) {
            // Start tracking view time
            engagementTracker.startTracking(artwork.id);
            
            // Lazy load video when tile enters viewport (50% visible)
            if (hasVideo && videoUrl && !shouldLoadVideo) {
              setShouldLoadVideo(true);
            }
          } else {
            // Stop tracking when not visible
            engagementTracker.stopTracking(artwork.id);
            
            // Pause video when out of viewport
            if (videoRef.current && !videoRef.current.paused) {
              videoRef.current.pause();
            }
          }
        });
      },
      {
        threshold: 0.5, // Consider visible when 50% is in viewport
        rootMargin: '50px', // Start loading slightly before entering viewport
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
    };
  }, [artwork.id, hasVideo, videoUrl, shouldLoadVideo]);

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

  // Autoplay video when in viewport (muted, looped)
  useEffect(() => {
    if (!hasVideo || !videoRef.current || !shouldLoadVideo) return;
    
    const video = videoRef.current;
    const isVisible = isInViewport || isInitialViewport;
    
    if (isVisible) {
      // Start loading video immediately when in viewport
      if (video.readyState === 0) {
        video.load();
      }
      
      // Try to play when video can play (don't wait for isVideoLoaded)
      const tryPlay = () => {
        if (video.readyState >= 2 && video.paused) {
          video.play().catch((error) => {
            console.error('Error autoplaying video:', error);
          });
        }
      };
      
      // Try immediately and on various events
      tryPlay();
      video.addEventListener('canplay', tryPlay);
      video.addEventListener('canplaythrough', tryPlay);
      video.addEventListener('loadeddata', tryPlay);
      
      return () => {
        video.removeEventListener('canplay', tryPlay);
        video.removeEventListener('canplaythrough', tryPlay);
        video.removeEventListener('loadeddata', tryPlay);
      };
    } else {
      // Pause when out of viewport
      if (!video.paused) {
        video.pause();
      }
    }
  }, [hasVideo, shouldLoadVideo, isInViewport, isInitialViewport]);
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
        className={`group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden border-0 flex flex-col mb-1 break-inside-avoid rounded-none ${className || ''}`}
        onClick={handleTileClick}
        style={{
          // Dynamic height based on aspect ratio: height = width / aspectRatio
          // Column width is fixed by CSS columns, so we calculate height accordingly
          // For masonry, we use padding-bottom trick to maintain aspect ratio
        }}
    >
      <div 
        className="relative overflow-hidden w-full"
        style={{
          // Use padding-bottom trick to maintain aspect ratio
          paddingBottom: `${(1 / aspectRatio) * 100}%`,
        }}
      >
        <div className="absolute inset-0">
          {/* Loading skeleton - only show if poster not loaded yet */}
          {((hasVideo && !isImageLoaded) || (!hasVideo && !isImageLoaded)) && (
            <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            </div>
          )}
          
          {/* Media content */}
          {hasVideo && videoUrl ? (
            <>
              {/* Poster image - ALWAYS show immediately, stays visible until video is ready */}
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={artwork.imageAiHint || artwork.title || 'Video thumbnail'}
                  fill
                  className={`object-cover transition-opacity duration-500 absolute inset-0 z-10 ${isVideoLoaded && !videoError ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                  loading="eager"
                  priority={true}
                  onLoad={() => {
                    setIsImageLoaded(true);
                  }}
                  onError={() => {
                    setImageError(true);
                    setIsImageLoaded(true);
                  }}
                />
              ) : (
                // Fallback: show loading placeholder if no imageUrl
                <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted flex items-center justify-center z-10">
                  <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}
              
              {/* Video element - loads when in viewport, positioned behind poster until ready */}
              {shouldLoadVideo && !videoError && (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className={`w-full h-full object-cover group-hover:scale-105 transition-opacity duration-500 absolute inset-0 pointer-events-none ${!isVideoLoaded ? 'opacity-0' : 'opacity-100 z-20'}`}
                  muted={true}
                  loop={true}
                  playsInline={true}
                  webkit-playsinline="true"
                  x5-playsinline="true"
                  preload="auto"
                  controls={false}
                  autoPlay={isInitialViewport || isInViewport}
                  poster={imageUrl || undefined}
                  onLoadedMetadata={() => {
                    if (videoLoadTimeoutRef.current) {
                      clearTimeout(videoLoadTimeoutRef.current);
                      videoLoadTimeoutRef.current = null;
                    }
                    // Metadata loaded - start showing video when ready
                    if (videoRef.current && videoRef.current.readyState >= 2) {
                      setIsVideoLoaded(true);
                    }
                  }}
                  onCanPlay={() => {
                    if (videoLoadTimeoutRef.current) {
                      clearTimeout(videoLoadTimeoutRef.current);
                      videoLoadTimeoutRef.current = null;
                    }
                    // Video is ready - fade in smoothly
                    setIsVideoLoaded(true);
                    setVideoError(false);
                    
                    // Notify parent that video is ready (for preloading tracking)
                    if (onVideoReady && isInitialViewport) {
                      onVideoReady();
                    }
                    
                    // Autoplay if in viewport (muted, looped)
                    if ((isInViewport || isInitialViewport) && videoRef.current && videoRef.current.paused) {
                      videoRef.current.play().catch((error) => {
                        console.error('Error autoplaying video:', error);
                      });
                    }
                  }}
                  onLoadedData={() => {
                    // Data loaded - ensure visibility
                    setIsVideoLoaded(true);
                    setVideoError(false);
                  }}
                  onProgress={() => {
                    // Video is buffering - keep it visible once it starts
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
            </>
          ) : (
            <Image
              src={imageUrl}
              alt={artwork.imageAiHint}
              fill
              className={`object-cover group-hover:scale-105 transition-all duration-300 ${!isImageLoaded ? 'opacity-0' : 'opacity-100'}`}
              loading="eager"
              priority={false}
              onLoad={() => setIsImageLoaded(true)}
              onError={() => {
                setImageError(true);
                setIsImageLoaded(true);
              }}
            />
          )}
          
          {/* Error state - show placeholder if media fails to load */}
          {imageError && !hasVideo && (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <div className="text-muted-foreground text-xs text-center p-4">
                Failed to load image
              </div>
            </div>
          )}
        </div>
        {/* Sale status badge */}
        {artwork.sold ? (
          <div className="absolute top-2 left-2 z-10">
            <Badge variant="destructive" className="text-xs px-2 py-1">
              Sold
            </Badge>
          </div>
        ) : artwork.isForSale ? (
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1">
              {artwork.priceType === 'contact' || artwork.contactForPrice ? 'For Sale' : artwork.price ? `$${artwork.price.toLocaleString()}` : 'For Sale'}
            </Badge>
          </div>
        ) : null}

        {/* Followed artist indicator - subtle tag */}
        {following && (
          <div className="absolute top-2 right-2 z-10">
            <Badge variant="outline" className="text-xs px-2 py-1 bg-background/80 backdrop-blur-sm border-primary/30 text-primary">
              Following
            </Badge>
          </div>
        )}

        {/* AI badge */}
        {artwork.isAI && (
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="text-xs">
              AI {artwork.aiAssistance}
            </Badge>
          </div>
        )}

          {/* Artist banner at bottom */}
          {!hideBanner && (
          <div
            className={`absolute bottom-0 left-0 right-0 backdrop-blur-sm p-2 ${
              (resolvedTheme || theme) === 'dark' ? 'bg-gray-900/90' : 'bg-white/90'
            }`}
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage 
                  src={artwork.artist.avatarUrl || generateAvatarPlaceholderUrl(24, 24)} 
                  alt={artwork.artist.name}
                  className="object-cover"
                />
                <AvatarFallback className="text-xs">
                  {(typeof artwork.artist?.name === 'string' ? artwork.artist.name : '')
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium truncate">
                    {artwork.artist.name}
                  </span>
                </div>
                {artwork.artist.location && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{artwork.artist.location}</span>
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
                        variant={following ? 'outline' : 'secondary'}
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
}