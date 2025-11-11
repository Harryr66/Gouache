'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Share2, ArrowLeft, ThumbsUp, ThumbsDown, Clock, Palette, Ruler } from 'lucide-react';
import { Artwork } from '@/lib/types';
import Image from 'next/image';

// Generate Gouache placeholder URLs
const generatePlaceholderUrl = (width: number = 800, height: number = 800) => {
  // Default to light mode colors, will be overridden by theme detection
  let backgroundColor = '#f8f9fa'; // very light gray
  let textColor = '#6b7280'; // medium gray
  
  // Try to detect theme if we're in a browser environment
  if (typeof window !== 'undefined') {
    try {
      // Check for explicit light/dark class
      if (document.documentElement.classList.contains('dark')) {
        backgroundColor = '#1f2937'; // dark gray
        textColor = '#ffffff'; // white
      } else if (document.documentElement.classList.contains('light')) {
        backgroundColor = '#f8f9fa'; // very light gray
        textColor = '#6b7280'; // medium gray
      } else {
        // No explicit theme class, check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          backgroundColor = '#1f2937'; // dark gray
          textColor = '#ffffff'; // white
        }
        // Otherwise keep light mode defaults
      }
    } catch (error) {
      // If theme detection fails, keep light mode defaults
      console.warn('Theme detection failed, using light mode defaults:', error);
    }
  }
  
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}" stroke="#e5e7eb" stroke-width="1"/>
      <text x="50%" y="50%" text-anchor="middle" fill="${textColor}" font-family="Arial, sans-serif" font-size="32" font-weight="bold">Gouache</text>
    </svg>
  `)}`;
};

// Generate Gouache avatar placeholder URLs
const generateAvatarPlaceholderUrl = (width: number = 150, height: number = 150) => {
  // Check if we're in light mode by looking at the document's class or theme
  const isLightMode = typeof window !== 'undefined' && 
    (document.documentElement.classList.contains('light') || 
     !document.documentElement.classList.contains('dark'));
  
  const backgroundColor = isLightMode ? '#f8f9fa' : '#1f2937'; // very light gray or dark gray
  const textColor = isLightMode ? '#6b7280' : '#ffffff'; // medium gray or white
  
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}"/>
      <text x="50%" y="50%" text-anchor="middle" fill="${textColor}" font-family="Arial, sans-serif" font-size="24" font-weight="bold">Gouache</text>
    </svg>
  `)}`;
};

// Mock data for artwork thread
const mockArtwork: Artwork = {
  id: '1',
  artist: {
    id: 'elena',
    name: 'Elena Vance',
    handle: 'elena_vance',
    avatarUrl: generateAvatarPlaceholderUrl(150, 150),
    followerCount: 1250,
    followingCount: 89,
    createdAt: new Date('2023-01-15')
  },
  title: 'Abstract Harmony',
  description: 'A vibrant abstract piece exploring the relationship between color and emotion.',
  imageUrl: generatePlaceholderUrl(800, 800),
  imageAiHint: 'Abstract painting with vibrant colors',
  discussionId: 'discussion-1',
  tags: ['abstract', 'color', 'emotion'],
  price: 250,
  currency: 'USD',
  isForSale: true,
  category: 'Abstract',
  medium: 'Oil on Canvas',
  dimensions: { width: 24, height: 30, unit: 'in' },
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
  views: 156,
  likes: 42,
  isAI: false,
  aiAssistance: 'none'
};

// Mock comments data
const mockComments = [
  {
    id: '1',
    author: {
      id: 'user1',
      name: 'Art Lover',
      handle: 'art_lover',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
    },
    content: 'This piece is absolutely stunning! The color palette is so vibrant and the composition is perfect.',
    createdAt: new Date('2024-01-16'),
    upvotes: 12,
    downvotes: 1,
    userVote: null
  },
  {
    id: '2',
    author: {
      id: 'user2',
      name: 'Creative Soul',
      handle: 'creative_soul',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
    },
    content: 'I love how the artist explores the emotional connection through color. Really inspiring work!',
    createdAt: new Date('2024-01-17'),
    upvotes: 8,
    downvotes: 0,
    userVote: null
  },
  {
    id: '3',
    author: {
      id: 'user3',
      name: 'Art Critic',
      handle: 'art_critic',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
    },
    content: 'The technique is impressive, but I think the composition could be stronger. Still, a solid piece overall.',
    createdAt: new Date('2024-01-18'),
    upvotes: 3,
    downvotes: 5,
    userVote: null
  }
];

interface Comment {
  id: string;
  author: {
    id: string;
    name: string;
    handle: string;
    avatarUrl: string;
  };
  content: string;
  createdAt: Date;
  upvotes: number;
  downvotes: number;
  userVote: 'up' | 'down' | null;
}

export default function ArtworkThreadPage() {
  const params = useParams();
  const router = useRouter();
  const [artwork, setArtwork] = useState<Artwork>(mockArtwork);
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(artwork.likes || 0);

  // Sort comments by upvotes (most upvoted first)
  const sortedComments = [...comments].sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleCommentVote = (commentId: string, vote: 'up' | 'down') => {
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        const currentVote = comment.userVote;
        let newUpvotes = comment.upvotes;
        let newDownvotes = comment.downvotes;
        let newUserVote: 'up' | 'down' | null = vote;

        // Handle vote changes
        if (currentVote === vote) {
          // Remove vote
          newUserVote = null;
          if (vote === 'up') newUpvotes -= 1;
          else newDownvotes -= 1;
        } else if (currentVote === null) {
          // Add new vote
          if (vote === 'up') newUpvotes += 1;
          else newDownvotes += 1;
        } else {
          // Change vote
          if (currentVote === 'up') newUpvotes -= 1;
          else newDownvotes -= 1;
          if (vote === 'up') newUpvotes += 1;
          else newDownvotes += 1;
        }

        return {
          ...comment,
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          userVote: newUserVote
        };
      }
      return comment;
    }));
  };

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: `comment-${Date.now()}`,
      author: {
        id: 'current-user',
        name: 'You',
        handle: 'you',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      },
      content: newComment,
      createdAt: new Date(),
      upvotes: 0,
      downvotes: 0,
      userVote: null
    };

    setComments(prev => [comment, ...prev]);
    setNewComment('');
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Artwork Image */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-lg overflow-hidden">
              <Image
                src={artwork.imageUrl}
                alt={artwork.imageAiHint}
                fill
                className="object-cover"
              />
              
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

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <Button
                variant={isLiked ? "default" : "outline"}
                onClick={handleLike}
                className="flex items-center space-x-2"
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                <span>{likeCount}</span>
              </Button>
              <Button variant="outline" className="flex items-center space-x-2">
                <MessageCircle className="h-4 w-4" />
                <span>{comments.length}</span>
              </Button>
              <Button variant="outline">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Artwork Details and Comments */}
          <div className="space-y-6">
            {/* Artwork Info */}
            <Card>
              <CardHeader>
                <div className="flex items-start space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={artwork.artist.avatarUrl ?? undefined} />
                    <AvatarFallback>{artwork.artist.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-2xl">{artwork.title}</CardTitle>
                    <p className="text-muted-foreground">by {artwork.artist.name}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="outline">{artwork.category}</Badge>
                      <Badge variant="secondary">{artwork.medium}</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{artwork.description}</p>
                
                {/* Tags */}
                {artwork.tags && artwork.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {artwork.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{artwork.views} views</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Palette className="h-4 w-4" />
                    <span>{artwork.medium}</span>
                  </div>
                  {artwork.dimensions && (
                    <div className="flex items-center space-x-1">
                      <Ruler className="h-4 w-4" />
                      <span>{artwork.dimensions.width} × {artwork.dimensions.height} {artwork.dimensions.unit}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Artist Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Artist Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">The Story Behind This Work</h4>
                  <p className="text-muted-foreground">
                    This piece was inspired by a particularly emotional period in my life. I wanted to capture 
                    the complexity of human emotions through the interplay of colors and forms. The vibrant 
                    reds represent passion and intensity, while the cooler blues bring a sense of calm and 
                    reflection. The abstract nature allows viewers to interpret their own emotions and 
                    experiences within the composition.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Materials Used</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Oil paints (Winsor & Newton Professional)</li>
                    <li>• Canvas (24" × 30" stretched cotton)</li>
                    <li>• Brushes (various sizes, synthetic and natural hair)</li>
                    <li>• Medium: Linseed oil and turpentine</li>
                    <li>• Varnish: Gamvar satin finish</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Creation Process</h4>
                  <p className="text-muted-foreground">
                    I started with a loose charcoal sketch to establish the basic composition, then built up 
                    layers of color using both wet-on-wet and wet-on-dry techniques. The final layer was 
                    applied with palette knives to create texture and depth. The entire process took about 
                    3 weeks, with several days of drying time between layers.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Comments ({comments.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Comment */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Share your thoughts on this artwork..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleSubmitComment} disabled={!newComment.trim()}>
                      Post Comment
                    </Button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-4">
                  {sortedComments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.author.avatarUrl} />
                        <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-sm">{comment.author.name}</span>
                          <span className="text-muted-foreground text-sm">@{comment.author.handle}</span>
                          <span className="text-muted-foreground text-sm">
                            {comment.createdAt.toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCommentVote(comment.id, 'up')}
                            className={`h-8 px-2 ${
                              comment.userVote === 'up' ? 'text-green-600' : 'text-muted-foreground'
                            }`}
                          >
                            <ThumbsUp className="h-3 w-3 mr-1" />
                            {comment.upvotes}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCommentVote(comment.id, 'down')}
                            className={`h-8 px-2 ${
                              comment.userVote === 'down' ? 'text-red-600' : 'text-muted-foreground'
                            }`}
                          >
                            <ThumbsDown className="h-3 w-3 mr-1" />
                            {comment.downvotes}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
