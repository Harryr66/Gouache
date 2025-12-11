'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';

interface ArtworkView {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  tags?: string[];
  price?: number;
  currency?: string;
  isForSale?: boolean;
  artist?: {
    id?: string;
    name?: string;
    handle?: string;
    avatarUrl?: string | null;
  };
}

export default function ArtworkPage() {
  const params = useParams();
  const router = useRouter();
  const artworkId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);
  const [artwork, setArtwork] = useState<ArtworkView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtwork = async () => {
      if (!artworkId) {
        setError('Artwork not found.');
        setLoading(false);
        return;
      }
      try {
        // First try the artworks collection
        const ref = doc(db, 'artworks', artworkId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          const imageUrl = data.imageUrl || data.supportingImages?.[0] || data.images?.[0] || '';
          if (!imageUrl) {
            setError('Artwork image not available.');
            setLoading(false);
            return;
          }
          setArtwork({
            id: artworkId,
            title: data.title || 'Untitled',
            description: data.description || '',
            imageUrl,
            tags: Array.isArray(data.tags) ? data.tags : [],
            price: data.price,
            currency: data.currency || 'USD',
            isForSale: data.isForSale,
            artist: {
              id: data.artist?.userId || data.artist?.id,
              name: data.artist?.name,
              handle: data.artist?.handle,
              avatarUrl: data.artist?.avatarUrl ?? null,
            },
          });
          setLoading(false);
          return;
        }

        // Fallback: search userProfiles portfolios for this item id
        const usersSnap = await getDocs(collection(db, 'userProfiles'));
        let found = false;
        usersSnap.forEach((userDoc) => {
          if (found) return;
          const userData = userDoc.data();
          const portfolio = Array.isArray(userData.portfolio) ? userData.portfolio : [];
          const match = portfolio.find((item: any) => item?.id === artworkId);
          if (!match) return;
          const imageUrl = match.imageUrl || match.supportingImages?.[0] || match.images?.[0] || '';
          if (!imageUrl) return;
          found = true;
          setArtwork({
            id: artworkId,
            title: match.title || 'Untitled',
            description: match.description || '',
            imageUrl,
            tags: Array.isArray(match.tags) ? match.tags : [],
            price: match.price,
            currency: match.currency || 'USD',
            isForSale: match.isForSale,
            artist: {
              id: userDoc.id,
              name: userData.displayName || userData.name || userData.username,
              handle: userData.username || userData.handle,
              avatarUrl: userData.avatarUrl ?? null,
            },
          });
        });

        if (!found) {
          setError('Artwork not found.');
        }
      } catch (err) {
        console.error('Failed to load artwork', err);
        setError('Failed to load artwork.');
      } finally {
        setLoading(false);
      }
    };
    fetchArtwork();
  }, [artworkId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    );
  }

  if (error || !artwork) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4 text-center">
        <p className="text-lg font-semibold">Unable to load artwork.</p>
        <p className="text-muted-foreground">{error || 'Please try again later.'}</p>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Card className="overflow-hidden">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-2xl font-semibold">{artwork.title}</CardTitle>
            {artwork.isForSale && artwork.price !== undefined && (
              <Badge className="bg-green-600 hover:bg-green-700 text-sm px-3 py-1">
                {artwork.currency || 'USD'} {artwork.price.toLocaleString()}
              </Badge>
            )}
          </div>
          {artwork.artist?.id && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>by</span>
              <Link href={`/profile/${artwork.artist.id}`} className="font-medium hover:underline">
                {artwork.artist.name || artwork.artist.handle || 'View artist'}
              </Link>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden">
            <Image
              src={artwork.imageUrl}
              alt={artwork.title}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 640px, 100vw"
            />
          </div>
          {artwork.description && (
            <p className="text-muted-foreground whitespace-pre-line">{artwork.description}</p>
          )}
          {artwork.tags && artwork.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {artwork.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="capitalize">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Share2, ArrowLeft, Clock, Palette, Ruler } from 'lucide-react';
import { Artwork } from '@/lib/types';
import Image from 'next/image';
import { AboutTheArtist } from '@/components/about-the-artist';

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

export default function ArtworkThreadPage() {
  const params = useParams();
  const router = useRouter();
  const [artwork, setArtwork] = useState<Artwork>(mockArtwork);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(artwork.likes || 0);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
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
            {/* Artwork Image - Full Screen View */}
            <div className="space-y-4">
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted">
                <Image
                  src={artwork.imageUrl}
                  alt={artwork.imageAiHint}
                  fill
                  className="object-contain"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
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
              <Button variant="outline">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Artwork Details */}
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

            {/* About the Artist */}
            {artwork.artist.id && (
              <AboutTheArtist
                artistId={artwork.artist.id}
                artistName={artwork.artist.name}
                artistHandle={artwork.artist.handle}
              />
            )}

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

          </div>
        </div>
      </div>
    </div>
  );
}
