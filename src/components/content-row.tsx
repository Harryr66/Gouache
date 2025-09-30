'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Episode, Docuseries } from '@/lib/types';
import { EpisodeCard } from '@/components/episode-card';
import { DocuseriesCard } from '@/components/docuseries-card';
import { cn } from '@/lib/utils';

interface ContentRowProps {
  title: string;
  subtitle?: string;
  items: (Episode | Docuseries)[];
  type: 'episodes' | 'docuseries';
  variant?: 'default' | 'featured' | 'compact';
  showScrollButtons?: boolean;
  className?: string;
  onItemClick?: (item: Episode | Docuseries) => void;
  onAddToWatchlist?: (docuseriesId: string) => void;
  isInWatchlist?: (docuseriesId: string) => boolean;
  getWatchProgress?: (episodeId: string) => number;
  onExpand?: (item: Episode | Docuseries) => void;
}

export function ContentRow({
  title,
  subtitle,
  items,
  type,
  variant = 'default',
  showScrollButtons = true,
  className,
  onItemClick,
  onAddToWatchlist,
  isInWatchlist,
  getWatchProgress,
  onExpand
}: ContentRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      const currentScroll = scrollContainerRef.current.scrollLeft;
      const targetScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  };

  const getCardVariant = () => {
    if (variant === 'featured') return 'featured';
    if (variant === 'compact') return 'compact';
    return 'default';
  };

  const getCardSize = () => {
    if (variant === 'featured') return 'w-80';
    if (variant === 'compact') return 'w-48';
    return 'w-64';
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Row Header */}
      <div className="flex items-center justify-between px-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {showScrollButtons && (
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-foreground hover:bg-muted/50"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-foreground hover:bg-muted/50"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="flex space-x-4 overflow-x-auto scrollbar-hide px-4 pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                'flex-shrink-0',
                getCardSize()
              )}
            >
              {type === 'episodes' ? (
                <EpisodeCard
                  episode={item as Episode}
                  docuseries={(item as Episode).docuseriesId ? items.find(d => d.id === (item as Episode).docuseriesId) as Docuseries : undefined}
                  variant={getCardVariant() as any}
                  showProgress={true}
                  progress={getWatchProgress ? getWatchProgress((item as Episode).id) : 0}
                  onPlay={onItemClick}
                  onAddToWatchlist={onAddToWatchlist}
                  onExpand={onExpand}
                />
              ) : (
                <DocuseriesCard
                  docuseries={item as Docuseries}
                  variant={getCardVariant() as any}
                  onPlay={onItemClick}
                  onAddToWatchlist={onAddToWatchlist}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

