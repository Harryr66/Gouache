'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share2, Bookmark, Flag, MoreHorizontal } from 'lucide-react';
import { Artwork, Discussion } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { useContent } from '@/providers/content-provider';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

interface ExpandedArtworkViewProps {
    artwork: Artwork;
    discussion?: Discussion;
    onClose: () => void;
}

export function ExpandedArtworkView({ artwork, discussion, onClose }: ExpandedArtworkViewProps) {
    const { user } = useAuth();
    const { updateDiscussion } = useContent();
    const [isLiked, setIsLiked] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showComments, setShowComments] = useState(false);

    const isCreator = useMemo(() => {
        if (!user || !discussion) return false;
        return user.id === discussion.author.id;
    }, [user, discussion]);

    const handleLike = () => setIsLiked(!isLiked);
    const handleBookmark = () => setIsBookmarked(!isBookmarked);
    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: artwork.title,
                text: artwork.description,
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
        }
    };

    const handleReport = () => {
        // Handle report logic
        console.log('Report artwork:', artwork.id);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 md:p-6">
            <div className="bg-background rounded-lg max-w-2xl w-full max-h-[70vh] overflow-hidden shadow-2xl">
                <div className="flex flex-col lg:flex-row h-full">
                    {/* Image Section */}
                    <div className="lg:w-2/3 bg-muted flex items-center justify-center p-4">
                        <div className="relative w-full h-full max-w-full max-h-full flex items-center justify-center">
                            <Image
                                src={artwork.imageUrl}
                                alt={artwork.imageAiHint}
                                width={800}
                                height={600}
                                className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
                                style={{ maxWidth: '100%', maxHeight: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Details Section */}
                    <div className="lg:w-1/3 flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Artwork Details</h2>
                            <Button variant="ghost" size="sm" onClick={onClose}>
                                ×
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Title and Artist */}
                            <div>
                                <h3 className="text-lg font-semibold mb-2">{artwork.title}</h3>
                                <div className="flex items-center space-x-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={artwork.artist.avatarUrl ?? undefined} alt={artwork.artist.name} />
                                        <AvatarFallback>{artwork.artist.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium text-sm">{artwork.artist.name}</p>
                                        <p className="text-xs text-muted-foreground">@{artwork.artist.handle}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            {artwork.description && (
                                <div>
                                    <h4 className="font-medium mb-2">Description</h4>
                                    <p className="text-sm text-muted-foreground">{artwork.description}</p>
                                </div>
                            )}

                            {/* Tags */}
                            {artwork.tags && artwork.tags.length > 0 && (
                                <div>
                                    <h4 className="font-medium mb-2">Tags</h4>
                                    <div className="flex flex-wrap gap-1">
                                        {artwork.tags.map((tag) => (
                                            <Badge key={tag} variant="outline" className="text-xs">
                                                #{tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Details */}
                            <div className="space-y-2">
                                <h4 className="font-medium">Details</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    {artwork.category && (
                                        <div>
                                            <span className="text-muted-foreground">Category:</span>
                                            <span className="ml-1">{artwork.category}</span>
                                        </div>
                                    )}
                                    {artwork.medium && (
                                        <div>
                                            <span className="text-muted-foreground">Medium:</span>
                                            <span className="ml-1">{artwork.medium}</span>
                                        </div>
                                    )}
                                    {artwork.dimensions && (
                                        <div className="col-span-2">
                                            <span className="text-muted-foreground">Dimensions:</span>
                                            <span className="ml-1">
                                                {artwork.dimensions.width} × {artwork.dimensions.height} {artwork.dimensions.unit}
                                            </span>
                                        </div>
                                    )}
                                    {artwork.isAI && (
                                        <div className="col-span-2">
                                            <span className="text-muted-foreground">AI Assistance:</span>
                                            <span className="ml-1">{artwork.aiAssistance}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Price */}
                            {artwork.isForSale && artwork.price && (
                                <div className="p-4 bg-muted rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Price</p>
                                            <p className="text-2xl font-bold">${artwork.price.toLocaleString()}</p>
                                        </div>
                                        <Button>Buy Now</Button>
                                    </div>
                                </div>
                            )}

                            {/* Stats */}
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>{artwork.views || 0} views</span>
                                <span>{discussion?.replyCount || 0} comments</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 border-t">
                            <div className="flex items-center justify-between">
                                <div className="flex space-x-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleLike}
                                        className={isLiked ? 'text-red-500' : ''}
                                    >
                                        <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                                        Like
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowComments(!showComments)}
                                    >
                                        <MessageCircle className="h-4 w-4 mr-1" />
                                        Comment
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={handleShare}>
                                        <Share2 className="h-4 w-4 mr-1" />
                                        Share
                                    </Button>
                                </div>
                                <div className="flex space-x-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleBookmark}
                                        className={isBookmarked ? 'text-yellow-500' : ''}
                                    >
                                        <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={handleReport}>
                                        <Flag className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
