'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdCampaign, TileSize } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Video, ExternalLink } from 'lucide-react';
import { trackAdClick, trackAdImpression } from '@/lib/ad-tracking';

type AdTileProps = {
  campaign: AdCampaign;
  placement: 'news' | 'discover' | 'learn';
  userId?: string;
  isMobile?: boolean;
  format?: 'square' | 'portrait' | 'large'; // Override format for tile rendering
  tileSize?: TileSize; // Grid tile size for structured layout
};

/**
 * Map ad format to grid tile size
 */
function getAdTileSize(adFormat: string | undefined): TileSize {
  switch (adFormat) {
    case 'square':
      return 'square';
    case 'landscape':
      return 'landscape';
    case 'portrait':
    case 'large':
    default:
      return 'portrait';
  }
}

export function AdTile({ campaign, placement, userId, isMobile = false, format, tileSize }: AdTileProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);
  const impressionTracked = useRef(false);
  const tileRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoWatchTimer = useRef<NodeJS.Timeout | null>(null);
  const videoWatchStartTime = useRef<number | null>(null);
  
  // Determine actual format to use (prop override or campaign setting)
  const actualFormat = format || campaign.adFormat || 'portrait';
  
  // Get tile size for structured grid (use prop, or derive from adFormat)
  const effectiveTileSize = tileSize || getAdTileSize(campaign.adFormat);
  
  // Detect video aspect ratio for max-width format
  useEffect(() => {
    if (campaign.mediaType === 'video' && campaign.videoUrl && campaign.maxWidthFormat) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const aspectRatio = video.videoWidth / video.videoHeight;
        setVideoAspectRatio(aspectRatio);
        window.URL.revokeObjectURL(video.src);
      };
      video.onerror = () => {
        setVideoAspectRatio(16/9); // Default to 16:9 for max-width format
        window.URL.revokeObjectURL(video.src);
      };
      video.src = campaign.videoUrl;
    }
  }, [campaign.videoUrl, campaign.mediaType, campaign.maxWidthFormat]);

  // Track impression when ad comes into view
  // For images: track when 50% visible
  // For videos: track after 2+ seconds of watch time
  useEffect(() => {
    if (impressionTracked.current) return;

    const isVideo = campaign.mediaType === 'video';

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !impressionTracked.current) {
            if (isVideo) {
              // For video ads: start watching timer when visible
              // Only count impression after 2+ seconds of actual playback
              if (!videoWatchStartTime.current) {
                videoWatchStartTime.current = Date.now();
                
                // Start playing the video when in view
                if (videoRef.current) {
                  videoRef.current.play().catch(() => {
                    // Autoplay blocked - still track based on visibility time
                  });
                }
                
                // Check every 100ms if 2 seconds have passed
                videoWatchTimer.current = setInterval(() => {
                  if (videoWatchStartTime.current && !impressionTracked.current) {
                    const watchTime = Date.now() - videoWatchStartTime.current;
                    if (watchTime >= 2000) {
                      // 2+ seconds watched - count as impression
                      impressionTracked.current = true;
                      trackAdImpression(campaign.id, userId, placement).catch(console.error);
                      if (videoWatchTimer.current) {
                        clearInterval(videoWatchTimer.current);
                        videoWatchTimer.current = null;
                      }
                      observer.disconnect();
                    }
                  }
                }, 100);
              }
            } else {
              // For image ads: immediate impression on visibility
              impressionTracked.current = true;
              trackAdImpression(campaign.id, userId, placement).catch(console.error);
              observer.disconnect();
            }
          } else if (!entry.isIntersecting && isVideo) {
            // Video scrolled out of view - pause timer and video
            if (videoWatchTimer.current) {
              clearInterval(videoWatchTimer.current);
              videoWatchTimer.current = null;
            }
            videoWatchStartTime.current = null;
            
            if (videoRef.current) {
              videoRef.current.pause();
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    if (tileRef.current) {
      observer.observe(tileRef.current);
    }

    return () => {
      observer.disconnect();
      if (videoWatchTimer.current) {
        clearInterval(videoWatchTimer.current);
      }
    };
  }, [campaign.id, userId, placement, campaign.mediaType]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    try {
      // Track click
      await trackAdClick(campaign.id, userId, placement);
      
      // Open URL in new tab
      window.open(campaign.clickUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error tracking ad click:', error);
      // Still open the URL even if tracking fails
      window.open(campaign.clickUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setIsLoading(false);
    }
  };

  const mediaUrl = campaign.videoUrl || campaign.imageUrl;
  const isVideo = campaign.mediaType === 'video';
  const isMaxWidthFormat = campaign.maxWidthFormat && isVideo && isMobile;

  // Calculate aspect ratio based on format or tileSize
  const getAspectRatioPadding = () => {
    if (isMaxWidthFormat && videoAspectRatio) {
      return `${(1 / videoAspectRatio) * 100}%`;
    }
    // Use tileSize for structured grid layout
    switch (effectiveTileSize) {
      case 'square':
        return '100%'; // 1:1
      case 'landscape':
        return '50%'; // 2:1
      case 'portrait':
      default:
        return '150%'; // 2:3 (portrait)
    }
  };

  return (
    <Card 
      ref={tileRef} 
      className={cn(
        'overflow-hidden transition hover:shadow-lg group flex flex-col cursor-pointer relative mb-1 rounded-none',
        // For max-width format in CSS columns, we need to break out of columns
        isMaxWidthFormat ? 'column-span-all w-full' : 'break-inside-avoid'
      )}
      style={isMaxWidthFormat ? { 
        columnSpan: 'all',
        width: '100%',
        gridColumn: '1 / -1' // Fallback for grid layouts
      } : undefined}
    >
      <div className="absolute top-2 left-2 z-10">
        <span className="text-[10px] font-medium text-white/80 bg-black/40 px-1.5 py-0.5 rounded">
          Sponsored
        </span>
      </div>
      <a
        href={campaign.clickUrl}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col h-full"
      >
        <div 
          className="relative w-full overflow-hidden"
          style={{
            paddingBottom: getAspectRatioPadding()
          }}
        >
          <div className="absolute inset-0">
            {/* Loading skeleton */}
            {!isMediaLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              </div>
            )}
            
            {/* Media content */}
            {isVideo && campaign.videoUrl ? (
              <video
                ref={videoRef}
                src={campaign.videoUrl}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${!isMediaLoaded ? 'opacity-0' : 'opacity-100'}`}
                muted
                loop
                playsInline
                preload="auto"
                onLoadedData={() => setIsMediaLoaded(true)}
                onCanPlay={() => setIsMediaLoaded(true)}
                onError={() => setIsMediaLoaded(true)}
              />
            ) : (
              <img
                src={campaign.imageUrl || ''}
                alt={campaign.title}
                className={`absolute inset-0 h-full w-full transition-all duration-500 group-hover:scale-105 object-cover ${!isMediaLoaded ? 'opacity-0' : 'opacity-100'}`}
                loading="eager"
                onLoad={() => setIsMediaLoaded(true)}
                onError={() => setIsMediaLoaded(true)}
              />
            )}
          </div>
        </div>

        <CardContent className="flex flex-col justify-between flex-1 p-5">
          <div className="flex items-center justify-end text-xs">
            <span className="font-medium text-primary flex items-center gap-1">
              Learn more <ExternalLink className="h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </a>
    </Card>
  );
}
