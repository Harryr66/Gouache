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
  const impressionTracked = useRef(false);
  const tileRef = useRef<HTMLDivElement>(null);

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
        'overflow-hidden transition hover:shadow-lg group flex flex-col cursor-pointer relative mb-1 break-inside-avoid',
        isMaxWidthFormat ? 'col-span-full w-full' : ''
      )}
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
            // For max-width format: use 16:9 or 1:1 aspect ratio, otherwise standard
            paddingBottom: isMaxWidthFormat 
              ? `${(9 / 16) * 100}%` // Default to 16:9 for max-width, could be 1:1 if square
              : `${(3 / 4) * 100}%` // Standard portrait aspect ratio
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
  );
}
