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
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { AboutTheArtist } from '@/components/about-the-artist';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, Mail, Heart } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useLikes } from '@/providers/likes-provider';

interface ArtworkView {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video';
  tags?: string[];
  price?: number;
  currency?: string;
  isForSale?: boolean;
  priceType?: 'fixed' | 'contact';
  contactForPrice?: boolean;
  deliveryScope?: 'worldwide' | 'specific';
  deliveryCountries?: string;
  likes?: number;
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
  const { toggleLike, isLiked, loading: likesLoading } = useLikes();
  // Extract and clean the ID from URL params
  const rawId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);
  // Decode URL encoding and remove trailing slashes
  const artworkId = rawId ? decodeURIComponent(rawId).replace(/\/$/, '').trim() : undefined;
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
      
      console.log('🔍 Fetching artwork with ID:', artworkId);
      
      try {
        // First try the artworks collection (this includes Discover content)
        // The ID should already be clean from URL params extraction above
        const cleanId = artworkId;
        
        console.log('🧹 Using ID:', cleanId);
        
        // Try to find the document - first with the exact ID, then try variations
        let ref = doc(db, 'artworks', cleanId);
        let snap = await getDoc(ref);
        
        // If not found and ID doesn't start with 'artwork-', try adding the prefix
        if (!snap.exists() && !cleanId.startsWith('artwork-')) {
          console.log('⚠️ Document not found, trying with artwork- prefix...');
          ref = doc(db, 'artworks', `artwork-${cleanId}`);
          snap = await getDoc(ref);
        }
        
        // If still not found and ID starts with 'artwork-', try without the prefix
        if (!snap.exists() && cleanId.startsWith('artwork-')) {
          console.log('⚠️ Document not found, trying without artwork- prefix...');
          const idWithoutPrefix = cleanId.replace(/^artwork-/, '');
          ref = doc(db, 'artworks', idWithoutPrefix);
          snap = await getDoc(ref);
        }
        
        console.log('📄 Artwork document exists:', snap.exists(), 'for ID:', snap.exists() ? snap.id : cleanId);
        
        if (snap.exists()) {
          const data = snap.data();
          console.log('✅ Found artwork document, data keys:', Object.keys(data || {}));
          console.log('📊 Artwork data:', {
            documentId: snap.id,
            dataId: data.id,
            hasImageUrl: !!data.imageUrl,
            hasVideoUrl: !!data.videoUrl,
            hasMediaUrls: !!data.mediaUrls?.length,
            showInPortfolio: data.showInPortfolio,
            title: data.title,
            description: data.description
          });
          const imageUrl = data.imageUrl || data.supportingImages?.[0] || data.images?.[0] || '';
          const videoUrl = data.videoUrl || data.mediaUrls?.[0] || '';
          const hasMedia = imageUrl || videoUrl || data.mediaUrls?.length > 0;
          
          // Always proceed if document exists - Discover content (showInPortfolio === false) should always be displayable
          // Even if media detection fails, we should still show the artwork with available data
          // If document exists in artworks collection, always display it (it's valid content)
          // Use document ID (snap.id) as the primary ID, fallback to data.id if different
          const artworkDocumentId = snap.id || data.id || cleanId;
          
          if (true) { // Document exists, so display it
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
              id: artworkDocumentId,
              title: data.title || 'Untitled',
              description: data.description || '',
              imageUrl: imageUrl || '', // Keep imageUrl separate
              videoUrl: videoUrl || '', // Add videoUrl
              mediaType: (data.mediaType || (videoUrl ? 'video' : (imageUrl ? 'image' : undefined))) as 'image' | 'video' | undefined,
              tags: Array.isArray(data.tags) ? data.tags : [],
              price: data.price,
              currency: data.currency || 'USD',
              isForSale: data.isForSale,
              priceType: data.priceType || (data.contactForPrice ? 'contact' : 'fixed'),
              contactForPrice: data.contactForPrice || data.priceType === 'contact',
              deliveryScope: data.deliveryScope,
              deliveryCountries: data.deliveryCountries,
              likes: data.likes || 0,
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
          // Document exists but condition failed (shouldn't happen now) - continue to portfolio fallback
          console.log('Artwork found in artworks collection but condition check failed, trying portfolio fallback...');
        } else {
          console.log('❌ Artwork document does not exist in artworks collection for ID:', cleanId);
          
          // Try querying by the id field in case document ID doesn't match
          console.log('🔍 Trying to find artwork by id field...');
          try {
            const artworksQuery = query(
              collection(db, 'artworks'),
              where('id', '==', cleanId)
            );
            const querySnapshot = await getDocs(artworksQuery);
            
            if (!querySnapshot.empty) {
              const foundDoc = querySnapshot.docs[0];
              console.log('✅ Found artwork by id field query, document ID:', foundDoc.id);
              const data = foundDoc.data() as any;
              const imageUrl = data.imageUrl || data.supportingImages?.[0] || data.images?.[0] || '';
              const videoUrl = data.videoUrl || data.mediaUrls?.[0] || '';
              
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
                id: foundDoc.id, // Use the actual document ID
                title: data.title || 'Untitled',
                description: data.description || '',
                imageUrl: imageUrl || '',
                videoUrl: videoUrl || '',
                mediaType: (data.mediaType || (videoUrl ? 'video' : (imageUrl ? 'image' : undefined))) as 'image' | 'video' | undefined,
                tags: Array.isArray(data.tags) ? data.tags : [],
                price: data.price,
                currency: data.currency || 'USD',
                isForSale: data.isForSale,
                priceType: data.priceType || (data.contactForPrice ? 'contact' : 'fixed'),
                contactForPrice: data.contactForPrice || data.priceType === 'contact',
                deliveryScope: data.deliveryScope,
                deliveryCountries: data.deliveryCountries,
                likes: data.likes || 0,
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
          } catch (queryError) {
            console.warn('Error querying artworks by id field:', queryError);
          }
        }

        // Fallback: search userProfiles portfolios for this item id
        console.log('Searching portfolios for artwork ID:', cleanId);
        const usersSnap = await getDocs(collection(db, 'userProfiles'));
        let found = false;
        
        for (const userDoc of usersSnap.docs) {
          if (found) break;
          const userData = userDoc.data();
          const portfolio = Array.isArray(userData.portfolio) ? userData.portfolio : [];
          const match = portfolio.find((item: any) => item?.id === cleanId);
          
          if (match) {
            const imageUrl = match.imageUrl || match.supportingImages?.[0] || match.images?.[0] || '';
            if (imageUrl) {
              found = true;
              console.log('Found artwork in portfolio for user:', userDoc.id);
              setArtwork({
                id: cleanId,
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
                likes: match.likes || 0,
                artist: {
                  id: userDoc.id,
                  name: userData.displayName || userData.name || userData.username,
                  handle: userData.username || userData.handle,
                  avatarUrl: userData.avatarUrl ?? null,
                  email: userData.email,
                },
              });
              break;
            } else {
              console.log('Found artwork in portfolio but no imageUrl:', cleanId, 'user:', userDoc.id);
            }
          }
        }

        if (!found) {
          // Also check posts collection as fallback (for Discover content)
          console.log('Checking posts collection for artwork ID:', cleanId);
          try {
            // First, try to find post by ID
            const postDocRef = doc(db, 'posts', cleanId);
            const postDoc = await getDoc(postDocRef);
            
            if (postDoc.exists()) {
              const postData = postDoc.data();
              const associatedArtworkId = postData.artworkId || postDoc.id;
              const artworkDoc = await getDoc(doc(db, 'artworks', associatedArtworkId));
              
              if (artworkDoc.exists()) {
                const artworkData = artworkDoc.data();
                const imageUrl = artworkData.imageUrl || artworkData.supportingImages?.[0] || artworkData.images?.[0] || '';
                const videoUrl = artworkData.videoUrl || artworkData.mediaUrls?.[0] || '';
                const hasMedia = imageUrl || videoUrl || artworkData.mediaUrls?.length > 0;
                
                if (hasMedia) {
                  let artistEmail = null;
                  if (artworkData.artist?.userId || artworkData.artist?.id) {
                    try {
                      const artistDoc = await getDoc(doc(db, 'userProfiles', artworkData.artist?.userId || artworkData.artist?.id));
                      if (artistDoc.exists()) {
                        artistEmail = artistDoc.data().email;
                      }
                    } catch (err) {
                      console.warn('Could not fetch artist email:', err);
                    }
                  }
                  
                  setArtwork({
                    id: associatedArtworkId,
                    title: artworkData.title || postData.caption || 'Untitled',
                    description: artworkData.description || postData.caption || '',
                    imageUrl: imageUrl || '',
                    videoUrl: videoUrl || '',
                    mediaType: (artworkData.mediaType || (videoUrl ? 'video' : 'image')) as 'image' | 'video',
                    tags: Array.isArray(artworkData.tags) ? artworkData.tags : [],
                    price: artworkData.price,
                    currency: artworkData.currency || 'USD',
                    isForSale: artworkData.isForSale,
                    priceType: artworkData.priceType || (artworkData.contactForPrice ? 'contact' : 'fixed'),
                    contactForPrice: artworkData.contactForPrice || artworkData.priceType === 'contact',
                    deliveryScope: artworkData.deliveryScope,
                    deliveryCountries: artworkData.deliveryCountries,
                    likes: artworkData.likes || postData.likes || 0,
                    artist: {
                      id: artworkData.artist?.userId || artworkData.artist?.id,
                      name: artworkData.artist?.name,
                      handle: artworkData.artist?.handle,
                      avatarUrl: artworkData.artist?.avatarUrl ?? null,
                      email: artistEmail,
                    },
                  });
                  setLoading(false);
                  return;
                }
              }
            }
            
            // If not found by direct ID, search all posts for matching artworkId
            const postsQuery = collection(db, 'posts');
            const postsSnapshot = await getDocs(postsQuery);
            
            for (const postDoc of postsSnapshot.docs) {
              const postData = postDoc.data();
              if (postData.artworkId === cleanId) {
                // Found post with matching artworkId - get the artwork
                const artworkDoc = await getDoc(doc(db, 'artworks', cleanId));
                
                if (artworkDoc.exists()) {
                  const artworkData = artworkDoc.data();
                  const imageUrl = artworkData.imageUrl || artworkData.supportingImages?.[0] || artworkData.images?.[0] || '';
                  const videoUrl = artworkData.videoUrl || artworkData.mediaUrls?.[0] || '';
                  const hasMedia = imageUrl || videoUrl || artworkData.mediaUrls?.length > 0;
                  
                  if (hasMedia) {
                    let artistEmail = null;
                    if (artworkData.artist?.userId || artworkData.artist?.id) {
                      try {
                        const artistDoc = await getDoc(doc(db, 'userProfiles', artworkData.artist?.userId || artworkData.artist?.id));
                        if (artistDoc.exists()) {
                          artistEmail = artistDoc.data().email;
                        }
                      } catch (err) {
                        console.warn('Could not fetch artist email:', err);
                      }
                    }
                    
                    setArtwork({
                      id: cleanId,
                      title: artworkData.title || postData.caption || 'Untitled',
                      description: artworkData.description || postData.caption || '',
                      imageUrl: imageUrl || '',
                      videoUrl: videoUrl || '',
                      mediaType: (artworkData.mediaType || (videoUrl ? 'video' : 'image')) as 'image' | 'video',
                      tags: Array.isArray(artworkData.tags) ? artworkData.tags : [],
                      price: artworkData.price,
                      currency: artworkData.currency || 'USD',
                      isForSale: artworkData.isForSale,
                      priceType: artworkData.priceType || (artworkData.contactForPrice ? 'contact' : 'fixed'),
                      contactForPrice: artworkData.contactForPrice || artworkData.priceType === 'contact',
                      deliveryScope: artworkData.deliveryScope,
                      deliveryCountries: artworkData.deliveryCountries,
                      likes: artworkData.likes || postData.likes || 0,
                      artist: {
                        id: artworkData.artist?.userId || artworkData.artist?.id,
                        name: artworkData.artist?.name,
                        handle: artworkData.artist?.handle,
                        avatarUrl: artworkData.artist?.avatarUrl ?? null,
                        email: artistEmail,
                      },
                    });
                    setLoading(false);
                    return;
                  }
                }
              }
            }
          } catch (postErr) {
            console.warn('Error checking posts collection:', postErr);
          }
          
          console.error('Artwork not found in artworks collection, portfolios, or posts:', cleanId);
          console.error('Tried ID variations:', {
            original: artworkId,
            cleaned: cleanId,
            withPrefix: `artwork-${cleanId}`,
            withoutPrefix: cleanId.replace(/^artwork-/, '')
          });
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
      <div className="max-w-3xl mx-auto p-6 space-y-4 text-center w-full max-w-full overflow-x-hidden px-4">
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
      <div className="container mx-auto px-4 py-6 w-full max-w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-6 w-full">
          <Button variant="ghost" onClick={() => router.back()} className="mb-2">
            <span className="mr-2">←</span> Back
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Artwork image + actions */}
            <div className="space-y-4">
              <div
                className="relative w-full max-h-[60vh] min-h-[300px] lg:min-h-[400px] rounded-lg overflow-hidden bg-background"
                onClick={() => {
                  // Only open modal for images, videos have their own controls
                  if (!artwork.videoUrl || artwork.mediaType !== 'video') {
                    setShowImageModal(true);
                  }
                }}
              >
                {artwork.videoUrl && artwork.mediaType === 'video' ? (
                  <video
                    src={(artwork as any).videoVariants?.full || artwork.videoUrl}
                    controls
                    className="w-full h-full object-contain"
                    playsInline
                  />
                ) : (
                  <div className="cursor-zoom-in">
                    <Image
                      src={artwork.imageUrl || artwork.videoUrl || '/assets/placeholder-light.png'}
                      alt={artwork.title}
                      fill
                      className="object-contain"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      priority
                    />
                  </div>
                )}
              </div>

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
                    {/* Like Button */}
                    <Button
                      variant={artwork?.id && isLiked(artwork.id) ? 'gradient' : 'outline'}
                      size="default"
                      onClick={() => {
                        if (artwork?.id) {
                          toggleLike(artwork.id);
                        }
                      }}
                      disabled={likesLoading}
                      className="flex items-center gap-2"
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          artwork?.id && isLiked(artwork.id) ? 'fill-current' : 'fill-none'
                        }`}
                      />
                      <span>
                        {artwork?.id && isLiked(artwork.id) ? 'Liked' : 'Like'}
                      </span>
                      {artwork?.likes !== undefined && artwork.likes > 0 && (
                        <span className="text-sm text-muted-foreground">
                          ({artwork.likes})
                        </span>
                      )}
                    </Button>

                    {artwork.isForSale && (
                      <Badge className="bg-blue-600 hover:bg-blue-700">
                        For sale
                      </Badge>
                    )}
                    {artwork.isForSale && artwork.priceType === 'contact' && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="gradient"
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

      {/* Fullscreen image/video dialog */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-2xl w-full max-h-[70vh] p-0 overflow-hidden">
          <button
            aria-label="Close"
            className="absolute top-3 right-3 z-10 rounded-full bg-black/60 text-white p-1 hover:bg-black/80"
            onClick={() => setShowImageModal(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative w-full max-h-[70vh] bg-black flex items-center justify-center allow-pinch-zoom">
            {artwork.videoUrl && artwork.mediaType === 'video' ? (
              <video
                src={artwork.videoUrl}
                controls
                className="max-w-full max-h-[70vh] w-auto h-auto"
                playsInline
              />
            ) : (
              <Image
                src={artwork.imageUrl || artwork.videoUrl || '/assets/placeholder-light.png'}
                alt={artwork.title}
                width={800}
                height={600}
                className="max-w-full max-h-[70vh] w-auto h-auto object-contain"
                priority
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
