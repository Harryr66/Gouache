'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Share, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Post } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ArtworkGridProps {
  posts: Post[];
  className?: string;
}

export function ArtworkGrid({ posts, className }: ArtworkGridProps) {
  const router = useRouter();

  const handleCardClick = (postId: string) => {
    router.push(`/artwork/${postId}`);
  };

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4', className)}>
      {posts.map((post) => (
        <Card 
          key={post.id} 
          className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
          onClick={() => handleCardClick(post.id)}
        >
          <div className="relative aspect-square overflow-hidden">
            <img
              src={post.imageUrl}
              alt={post.imageAiHint}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Button size="sm" variant="secondary" className="h-8 w-8 p-0 rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={post.artist.avatarUrl ?? undefined} alt={post.artist.name} />
                <AvatarFallback>{post.artist.name?.charAt(0)?.toUpperCase() || 'A'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{post.artist.name}</h4>
                <p className="text-xs text-muted-foreground">@{post.artist.handle}</p>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {post.caption}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <Heart className="h-4 w-4 mr-1" />
                  {post.likes}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {post.commentsCount}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <Share className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">{post.timestamp}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
