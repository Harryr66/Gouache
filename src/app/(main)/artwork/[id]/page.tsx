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
import { AboutTheArtist } from '@/components/about-the-artist';

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

          {/* Artwork details */}
          <Card className="border">
              <CardHeader>
              <CardTitle className="text-lg">Artwork details</CardTitle>
              </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-2 items-center">
                <span className="font-medium text-foreground">For sale:</span>
                <span>{artwork.isForSale ? 'Yes' : 'No'}</span>
                </div>
              {artwork.price !== undefined && (
                <div className="flex gap-2 items-center">
                  <span className="font-medium text-foreground">Price:</span>
                  <span>{artwork.currency || 'USD'} {artwork.price.toLocaleString()}</span>
                </div>
              )}
              {artwork.tags && artwork.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {artwork.tags.map((tag) => (
                    <Badge key={`detail-${tag}`} variant="outline" className="capitalize">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
              </CardContent>
            </Card>

          {/* About the artist */}
          {artwork.artist?.id && (
            <AboutTheArtist
              artistId={artwork.artist.id}
              artistName={artwork.artist.name}
              artistHandle={artwork.artist.handle}
              className="border"
              compact
            />
          )}
              </CardContent>
            </Card>
    </div>
  );
}
