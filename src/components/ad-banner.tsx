'use client';

import { useState, useEffect, useRef } from 'react';
import { AdCampaign } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';
import { trackAdClick, trackAdImpression } from '@/lib/ad-tracking';

type AdBannerProps = {
  campaign: AdCampaign;
  placement: 'news' | 'discover' | 'learn';
  userId?: string;
};

export function AdBanner({ campaign, placement, userId }: AdBannerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);
  const impressionTracked = useRef(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  
  // BANNERS ARE IMAGE-ONLY to reduce system strain
  // If a video campaign somehow gets here, don't render
  if (campaign.mediaType === 'video') {
    console.warn('[AdBanner] Video ads not supported for banners, skipping:', campaign.id);
    return null;
  }
  
  // Track impression when banner comes into view (images only)
  useEffect(() => {
    if (impressionTracked.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !impressionTracked.current) {
            // Image ads: immediate impression on visibility
            impressionTracked.current = true;
            trackAdImpression(campaign.id, userId, placement).catch(console.error);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (bannerRef.current) {
      observer.observe(bannerRef.current);
    }

    return () => {
      observer.disconnect();
    };
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

  return (
    <div 
      ref={bannerRef}
      className="w-full my-6"
    >
      <a
        href={campaign.clickUrl}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "relative block w-full rounded-lg overflow-hidden group cursor-pointer",
          "transition-shadow duration-300 hover:shadow-xl",
          "border border-border/50"
        )}
      >
        {/* Sponsored badge */}
        <div className="absolute top-3 left-3 z-10">
          <span className="text-xs font-medium text-white bg-black/60 px-2 py-1 rounded">
            Sponsored
          </span>
        </div>

        {/* Learn more badge */}
        <div className="absolute top-3 right-3 z-10">
          <span className="text-xs font-medium text-white bg-primary/80 px-2 py-1 rounded flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            Learn more <ExternalLink className="h-3 w-3" />
          </span>
        </div>

        {/* Media container - aspect ratio 6:1 for banner (IMAGE ONLY) */}
        <div 
          className="relative w-full overflow-hidden bg-muted"
          style={{
            paddingBottom: `${(1 / 6) * 100}%` // 6:1 aspect ratio for banner
          }}
        >
          <div className="absolute inset-0">
            {/* Loading skeleton */}
            {!isMediaLoaded && (
              <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/80 to-muted animate-pulse">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              </div>
            )}
            
            {/* Image only - banners don't support video to reduce system strain */}
            <img
              src={campaign.imageUrl || ''}
              alt="Advertisement"
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 ${!isMediaLoaded ? 'opacity-0' : 'opacity-100'} group-hover:scale-105`}
              loading="eager"
              onLoad={() => setIsMediaLoaded(true)}
              onError={() => setIsMediaLoaded(true)}
            />
          </div>
        </div>
      </a>
    </div>
  );
}
