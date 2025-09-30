'use client';

import React, { useState } from 'react';
import { Episode, Docuseries } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Heart, 
  MessageCircle, 
  Share2, 
  ExternalLink,
  ArrowLeft,
  X,
  ShoppingBag,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExpandableContentTileProps {
  content: Episode | Docuseries;
  onClose?: () => void;
  className?: string;
}

export function ExpandableContentTile({ 
  content, 
  onClose, 
  className = '' 
}: ExpandableContentTileProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const isEpisode = 'videoUrl' in content;
  const episode = content as Episode;
  const docuseries = content as Docuseries;
  
  // Get the artist from either episode or docuseries
  const artist = isEpisode ? episode.artist : docuseries.featuredArtist;

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: content.title,
        text: content.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${className}`}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold truncate">{content.title}</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Episode Player Section */}
          {isEpisode && (
            <div className="relative bg-black">
              <video
                src={episode.videoUrl}
                poster={episode.thumbnailUrl}
                className="w-full aspect-video"
                controls
                muted={isMuted}
                playsInline
              />
              
              {/* Video Overlay Controls */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handlePlay}
                    className="bg-black/50 hover:bg-black/70"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleMute}
                    className="bg-black/50 hover:bg-black/70"
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleLike}
                    className={`bg-black/50 hover:bg-black/70 ${isLiked ? 'text-red-500' : ''}`}
                  >
                    <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowComments(!showComments)}
                    className="bg-black/50 hover:bg-black/70"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleShare}
                    className="bg-black/50 hover:bg-black/70"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Content Info */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2">{content.title}</h1>
                <p className="text-muted-foreground mb-4">{content.description}</p>
                
                {/* Tags and Categories */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {isEpisode && episode.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                  {isEpisode && episode.categories.map((category) => (
                    <Badge key={category} variant="outline">{category}</Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Artist Bio Section */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={artist.avatarUrl || undefined} />
                    <AvatarFallback>
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{artist.name}</h3>
                      {artist.isVerified && (
                        <Badge variant="secondary" className="text-xs">Verified</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {artist.bio || 'Artist bio coming soon...'}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{artist.followerCount.toLocaleString()} followers</span>
                      <span>{artist.location}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => window.open(`/profile/${artist.id}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Materials List (if available) */}
            {isEpisode && episode.tags.includes('tutorial') && (
              <Card className="mb-6">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingBag className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Materials Used</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">Canvas (16x20 inches)</span>
                      <Button variant="link" size="sm" className="p-0 h-auto">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Shop
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">Acrylic Paint Set</span>
                      <Button variant="link" size="sm" className="p-0 h-auto">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Shop
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">Paint Brushes (Various Sizes)</span>
                      <Button variant="link" size="sm" className="p-0 h-auto">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Shop
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    *Affiliate links help support the artist
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Discussion Section */}
            <Card className="bg-gray-100 dark:bg-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <MessageCircle className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Discussion</h3>
                  <Badge variant="secondary">{isEpisode ? episode.commentsCount : 0} comments</Badge>
                </div>
                
                {/* Comment Input */}
                <div className="mb-4">
                  <textarea
                    placeholder="Share your thoughts about this content..."
                    className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                  />
                  <div className="flex justify-end mt-2">
                    <Button size="sm">Post Comment</Button>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Sample Comments */}
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">John Doe</span>
                        <span className="text-xs text-muted-foreground">2 hours ago</span>
                      </div>
                      <p className="text-sm">Amazing technique! I've been trying to master this style for months.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>SM</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">Sarah Miller</span>
                        <span className="text-xs text-muted-foreground">4 hours ago</span>
                      </div>
                      <p className="text-sm">Where can I find those brushes you mentioned?</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
