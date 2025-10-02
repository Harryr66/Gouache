'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal } from 'lucide-react';
import { Artwork } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import Image from 'next/image';

interface ArtworkCardProps {
  artwork: Artwork;
  onMore?: (artworkId: string) => void;
  onClick?: () => void;
}

export function ArtworkCard({ 
  artwork, 
  onMore,
  onClick
}: ArtworkCardProps) {
  const { user } = useAuth();
  const [likeCount, setLikeCount] = useState(artwork.likes || 0);

  const isAuthor = user?.id === artwork.artist.id;

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMore?.(artwork.id);
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={onClick}>
      <div className="relative overflow-hidden rounded-t-lg">
        <div className="aspect-square relative">
          <Image
            src={artwork.imageUrl}
            alt={artwork.imageAiHint}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        

        {/* Price badge */}
        {artwork.isForSale && artwork.price && (
          <div className="absolute top-4 right-4">
            <Badge className="bg-green-600 hover:bg-green-700">
              ${artwork.price.toLocaleString()}
            </Badge>
          </div>
        )}

        {/* AI badge */}
        {artwork.isAI && (
          <div className="absolute top-4 left-4">
            <Badge variant="secondary">
              AI {artwork.aiAssistance}
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-2 p-2 md:p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm md:text-lg line-clamp-1">{artwork.title}</CardTitle>
            <CardDescription className="flex items-center space-x-2 mt-1">
              <span className="text-xs md:text-sm">by {artwork.artist.name}</span>
              {artwork.artist.isVerified && (
                <Badge variant="outline" className="text-xs">
                  Verified
                </Badge>
              )}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMoreClick}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 p-2 md:p-6">
        {artwork.description && (
          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-2 md:mb-3">
            {artwork.description}
          </p>
        )}

        {/* Tags - Hidden on mobile to save space */}
        {artwork.tags && artwork.tags.length > 0 && (
          <div className="hidden md:flex flex-wrap gap-1 mb-3">
            {artwork.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
            {artwork.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{artwork.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-xs md:text-sm text-muted-foreground">
          <div className="flex items-center space-x-2 md:space-x-4">
            <span>{artwork.views || 0} views</span>
            <span>{artwork.commentsCount || 0} comments</span>
          </div>
          <div className="flex items-center space-x-1 md:space-x-2">
            {artwork.category && (
              <Badge variant="secondary" className="text-xs">
                {artwork.category}
              </Badge>
            )}
            {artwork.medium && (
              <Badge variant="outline" className="text-xs">
                {artwork.medium}
              </Badge>
            )}
          </div>
        </div>

        {/* Dimensions - Hidden on mobile to save space */}
        {artwork.dimensions && (
          <div className="hidden md:block mt-2 text-xs text-muted-foreground">
            {artwork.dimensions.width} × {artwork.dimensions.height} {artwork.dimensions.unit}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
