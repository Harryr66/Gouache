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
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ArtworkView {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  tags?: string[];
  price?: number;
  currency?: string;
  isForSale?: boolean;
  priceType?: 'fixed' | 'contact';
  contactForPrice?: boolean;
  deliveryScope?: 'worldwide' | 'specific';
  deliveryCountries?: string;
  artist?: {
    id?: string;
    name?: string;
    handle?: string;
    avatarUrl?: string | null;
    email?: string;
  };
}

export default function ArtworkPage() {
  const params = useParams();
  const router = useRouter();
  const artworkId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);
  const [artwork, setArtwork] = useState<ArtworkView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

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
          // Get artist email if available
          let artistEmail = null;
          if (data.artist?.userId || data.artist?.id) {
            try {
              const artistDoc = await getDoc(doc(db, 'userProfiles', data.artist?.userId || data.artist?.id));
              if (artistDoc.exists()) {
                artistEmail = artistDoc.data().email;
              }
            } catch (err) {
              console.warn('Could not fetch artist email:', err);
            }
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
            priceType: data.priceType || (data.contactForPrice ? 'contact' : 'fixed'),
            contactForPrice: data.contactForPrice || data.priceType === 'contact',
            deliveryScope: data.deliveryScope,
            deliveryCountries: data.deliveryCountries,
            artist: {
              id: data.artist?.userId || data.artist?.id,
              name: data.artist?.name,
              handle: data.artist?.handle,
              avatarUrl: data.artist?.avatarUrl ?? null,
              email: artistEmail,
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
            priceType: match.priceType || (match.contactForPrice ? 'contact' : 'fixed'),
            contactForPrice: match.contactForPrice || match.priceType === 'contact',
            deliveryScope: match.deliveryScope,
            deliveryCountries: match.deliveryCountries,
            artist: {
              id: userDoc.id,
              name: userData.displayName || userData.name || userData.username,
              handle: userData.username || userData.handle,
              avatarUrl: userData.avatarUrl ?? null,
              email: userData.email,
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-2">
            <span className="mr-2">←</span> Back
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Artwork image + actions */}
            <div className="space-y-4">
              <div
                className="relative w-full max-h-[60vh] min-h-[300px] lg:min-h-[400px] rounded-lg overflow-hidden bg-background cursor-zoom-in"
                onClick={() => setShowImageModal(true)}
              >
                <Image
                  src={artwork.imageUrl}
                  alt={artwork.title}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              </div>

              {artwork.isForSale && artwork.priceType === 'contact' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (artwork.artist?.email) {
                        window.location.href = `mailto:${artwork.artist.email}?subject=Inquiry about ${encodeURIComponent(artwork.title)}&body=Hello, I'm interested in learning more about "${artwork.title}". Could you please provide pricing and availability information?`;
                      } else {
                        toast({
                          title: 'Email not available',
                          description: 'The artist has not provided an email address.',
                          variant: 'destructive'
                        });
                      }
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Artist for Price
                  </Button>
                </div>
              )}
              {artwork.isForSale && artwork.price !== undefined && artwork.priceType !== 'contact' && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge className="bg-green-600 hover:bg-green-700 text-sm px-3 py-1">
                    {artwork.currency || 'USD'} {(artwork.price / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Badge>
                  <span className="text-muted-foreground">Available</span>
                </div>
              )}
            </div>

            {/* Details column */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">{artwork.title}</CardTitle>
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
                  {artwork.description && (
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {artwork.description}
                      </p>
                    </div>
                  )}

                  {artwork.tags && artwork.tags.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {artwork.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="capitalize">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 flex-wrap">
                    {artwork.isForSale && (
                      <Badge className="bg-blue-600 hover:bg-blue-700">
                        For sale
                      </Badge>
                    )}
                    {artwork.isForSale && artwork.priceType === 'contact' && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (artwork.artist?.email) {
                              window.location.href = `mailto:${artwork.artist.email}?subject=Inquiry about ${encodeURIComponent(artwork.title)}&body=Hello, I'm interested in learning more about "${artwork.title}". Could you please provide pricing and availability information?`;
                            } else {
                              toast({
                                title: 'Email not available',
                                description: 'The artist has not provided an email address.',
                                variant: 'destructive'
                              });
                            }
                          }}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Contact Artist for Price
                        </Button>
                      </div>
                    )}
                    {artwork.isForSale && artwork.price !== undefined && artwork.priceType !== 'contact' && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Price:</span>
                        <span>{artwork.currency || 'USD'} {(artwork.price / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {artwork.deliveryScope && (
                      <div className="text-xs text-muted-foreground">
                        {artwork.deliveryScope === 'worldwide' 
                          ? 'Worldwide delivery available'
                          : artwork.deliveryCountries 
                            ? `Delivery to: ${artwork.deliveryCountries}`
                            : 'Delivery location specified'}
                      </div>
                    )}
                  </div>
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
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen image dialog */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-2xl w-full max-h-[70vh] p-0 overflow-hidden">
          <button
            aria-label="Close"
            className="absolute top-3 right-3 z-10 rounded-full bg-black/60 text-white p-1 hover:bg-black/80"
            onClick={() => setShowImageModal(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative w-full max-h-[70vh] bg-black flex items-center justify-center">
            <Image
              src={artwork.imageUrl}
              alt={artwork.title}
              width={800}
              height={600}
              className="max-w-full max-h-[70vh] w-auto h-auto object-contain"
              priority
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
