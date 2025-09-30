'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Clock, Eye, Heart, MessageCircle, Bookmark } from 'lucide-react';
import { Episode, Docuseries } from '@/lib/types';
import { cn } from '@/lib/utils';
import { LikeButton } from './like-button';

interface EpisodeCardProps {
  episode: Episode;
  docuseries?: Docuseries;
  variant?: 'default' | 'compact' | 'featured';
  showProgress?: boolean;
  progress?: number;
  className?: string;
  onPlay?: (episode: Episode) => void;
  onAddToWatchlist?: (docuseriesId: string) => void;
  onExpand?: (episode: Episode) => void;
}

export function EpisodeCard({
  episode,
  docuseries,
  variant = 'default',
  showProgress = false,
  progress = 0,
  className,
  onPlay,
  onAddToWatchlist,
  onExpand
}: EpisodeCardProps) {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatViewCount = (count: number) => {
    if (!count || count < 0) return '0';
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  if (variant === 'compact') {
    return (
      <Card 
        className={cn('group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer', className)}
        onClick={() => onExpand?.(episode)}
      >
        <div className="relative aspect-video overflow-hidden">
          {episode.thumbnailUrl ? (
            <img
              src={episode.thumbnailUrl}
              alt={episode.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Play className="h-12 w-12 text-primary/60" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              size="sm"
              className="h-10 w-10 rounded-full bg-black/80 hover:bg-black text-white shadow-lg border border-white/20"
              onClick={(e) => {
                e.stopPropagation();
                onPlay?.(episode);
              }}
            >
              <Play className="h-4 w-4" />
            </Button>
          </div>
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-xs bg-black/50 text-white">
              {formatDuration(episode.duration)}
            </Badge>
          </div>
          {showProgress && progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
              <div 
                className="h-full bg-white transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        
        <CardContent className="p-3">
          <h4 className="font-medium text-sm line-clamp-2 mb-1">{episode.title}</h4>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {docuseries?.title} • Episode {episode.episodeNumber}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'featured') {
    return (
      <Card 
        className={cn('group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer', className)}
        onClick={() => onExpand?.(episode)}
      >
        <div className="relative aspect-video overflow-hidden">
          {episode.thumbnailUrl ? (
            <img
              src={episode.thumbnailUrl}
              alt={episode.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Play className="h-12 w-12 text-primary/60" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              size="lg"
              className="h-12 w-12 rounded-full bg-black/80 hover:bg-black text-white shadow-lg border-2 border-white/20"
              onClick={(e) => {
                e.stopPropagation();
                onPlay?.(episode);
              }}
            >
              <Play className="h-6 w-6" />
            </Button>
          </div>
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="text-sm bg-black/50 text-white">
              {formatDuration(episode.duration)}
            </Badge>
          </div>
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h3 className="text-xl font-bold mb-2 line-clamp-2">{episode.title}</h3>
            <p className="text-sm text-white/80 mb-2 line-clamp-2">{episode.description}</p>
            <div className="flex items-center space-x-4 text-sm">
              <span className="flex items-center">
                <Eye className="h-4 w-4 mr-1" />
                {formatViewCount(episode.viewCount)}
              </span>
              <LikeButton
                episodeId={episode.id}
                initialLikes={episode.likes}
                initialLikedBy={episode.likedBy || []}
                size="sm"
                variant="ghost"
                showCount={true}
              />
              <span className="flex items-center">
                <MessageCircle className="h-4 w-4 mr-1" />
                {episode.commentsCount}
              </span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Default variant
  return (
    <Card 
      className={cn('group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer', className)}
      onClick={() => onExpand?.(episode)}
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          src={episode.thumbnailUrl}
          alt={episode.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button
            size="sm"
            className="h-10 w-10 rounded-full bg-black/80 hover:bg-black text-white shadow-lg border border-white/20"
            onClick={(e) => {
              e.stopPropagation();
              onPlay?.(episode);
            }}
          >
            <Play className="h-4 w-4" />
          </Button>
        </div>
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="text-xs bg-black/50 text-white">
            {formatDuration(episode.duration)}
          </Badge>
        </div>
        {showProgress && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
            <div 
              className="h-full bg-white transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-sm line-clamp-2 flex-1 mr-2">{episode.title}</h4>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onAddToWatchlist?.(episode.docuseriesId);
            }}
          >
            <Bookmark className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {docuseries?.title} • Episode {episode.episodeNumber}
        </p>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-3">
            <span className="flex items-center">
              <Eye className="h-3 w-3 mr-1" />
              {formatViewCount(episode.viewCount)}
            </span>
            <LikeButton
              episodeId={episode.id}
              initialLikes={episode.likes}
              initialLikedBy={episode.likedBy || []}
              size="sm"
              variant="ghost"
              showCount={true}
            />
            <span className="flex items-center">
              <MessageCircle className="h-3 w-3 mr-1" />
              {episode.commentsCount}
            </span>
          </div>
          <span className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {new Date(episode.releaseDate).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
