'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdCampaign } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Video, ExternalLink } from 'lucide-react';
import { trackAdClick, trackAdImpression } from '@/lib/ad-tracking';

type AdTileProps = {
  campaign: AdCampaign;
  placement: 'news' | 'discover' | 'learn';
  userId?: string;
  isMobile?: boolean;
};

export function AdTile({ campaign, placement, userId, isMobile = false }: AdTileProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);
  const impressionTracked = useRef(false);
  const tileRef = useRef<HTMLDivElement>(null);
  
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
  useEffect(() => {
    if (impressionTracked.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !impressionTracked.current) {
            impressionTracked.current = true;
            trackAdImpression(campaign.id, userId, placement).catch(console.error);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (tileRef.current) {
      observer.observe(tileRef.current);
    }

    return () => observer.disconnect();
  }, [campaign.id, userId, placement]);

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

  return (
    <Card 
      ref={tileRef} 
      className={cn(
        'overflow-hidden transition hover:shadow-lg group flex flex-col cursor-pointer relative mb-1',
        // For max-width format in CSS columns, we need to break out of columns
        isMaxWidthFormat ? 'column-span-all w-full' : 'break-inside-avoid'
      )}
      style={isMaxWidthFormat ? { 
        columnSpan: 'all',
        width: '100%',
        gridColumn: '1 / -1' // Fallback for grid layouts
      } : undefined}
    >
      <div className="absolute top-2 right-2 z-10">
        <Badge variant="secondary" className="text-xs">Ad</Badge>
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
            // For max-width format: use detected video aspect ratio (1:1 or 16:9), otherwise default to 16:9
            // Standard ads use portrait 2:3 ratio for masonry layout
            paddingBottom: isMaxWidthFormat 
              ? videoAspectRatio 
                ? `${(1 / videoAspectRatio) * 100}%` // Use detected aspect ratio (1:1 or 16:9)
                : `${(9 / 16) * 100}%` // Default to 16:9 for max-width format if not detected yet
              : `${(2 / 3) * 100}%` // Standard portrait aspect ratio (2:3) for masonry
          }}
        >
          <div className="absolute inset-0">
            {isVideo && campaign.videoUrl ? (
              <video
                src={campaign.videoUrl}
                className="absolute inset-0 h-full w-full object-cover"
                muted
                loop
                playsInline
              />
            ) : (
              <img
                src={campaign.imageUrl || ''}
                alt={campaign.title}
                className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-105 object-cover"
              />
            )}
          </div>
        </div>

        <CardContent className="flex flex-col justify-between flex-1 p-5 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg leading-tight text-foreground">
                {campaign.title}
              </h3>
              {isVideo && <Video className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Sponsored</span>
            <span className="font-medium text-primary flex items-center gap-1">
              Learn more <ExternalLink className="h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </a>
    </Card>
    </div>
  );
}
