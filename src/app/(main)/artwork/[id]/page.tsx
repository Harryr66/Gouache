'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { AboutTheArtist } from '@/components/about-the-artist';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Mail, Heart, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useLikes } from '@/providers/likes-provider';
import { useAuth } from '@/providers/auth-provider';
import Hls from 'hls.js';

// Use shared Stripe promise utility

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
  sold?: boolean; // Added for purchase validation
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
  const searchParams = useSearchParams();
  const { toggleLike, isLiked, loading: likesLoading } = useLikes();
  const { user } = useAuth();
  // Extract and clean the ID from URL params
  const rawId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);
  // Decode URL encoding and remove trailing slashes
  const artworkId = rawId ? decodeURIComponent(rawId).replace(/\/$/, '').trim() : undefined;
  const [artwork, setArtwork] = useState<ArtworkView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const modalHlsRef = useRef<Hls | null>(null);

  // Handle Stripe checkout for artwork purchases
  const handleBuyNow = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to purchase artwork.",
        variant: "destructive"
      });
      return;
    }

    if (!artwork) return;

    setIsProcessingCheckout(true);
    
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: artwork.id,
          itemType: 'artwork',
          buyerId: user.id,
          buyerEmail: user.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout failed",
        description: error.message || "Failed to start checkout process. Please try again.",
        variant: "destructive"
      });
      setIsProcessingCheckout(false);
    }
  };

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
              sold: data.sold || false, // Added for purchase validation
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
            
            // DEBUG: Log the raw data from Firebase to see what videoUrl format we have
            console.log('🔍 ARTWORK DEBUG - Raw Firebase data:', {
              documentId: artworkDocumentId,
              title: data.title,
              hasVideoUrl: !!data.videoUrl,
              videoUrl: data.videoUrl,
              hasMediaUrls: !!data.mediaUrls,
              mediaUrls: data.mediaUrls,
              mediaType: data.mediaType,
              hasVideoVariants: !!(data as any).videoVariants,
              videoVariants: (data as any).videoVariants
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
                sold: data.sold || false, // Added for purchase validation
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

  // Setup HLS video player when artwork loads
  useEffect(() => {
    const video = videoRef.current;
    if (!artwork || !artwork.videoUrl || artwork.mediaType !== 'video' || !video) return;

    // Extract 32-character hex video ID from any Cloudflare URL
    const videoIdMatch = artwork.videoUrl.match(/([a-f0-9]{32})/);
    if (!videoIdMatch) {
      console.error('Could not extract video ID from:', artwork.videoUrl);
      return;
    }
    
    const videoId = videoIdMatch[1];
    // Construct manifest URL - use videodelivery.net (universal)
    const manifestUrl = `https://videodelivery.net/${videoId}/manifest/video.m3u8`;
    
    console.log('Video ID:', videoId);
    console.log('Manifest URL:', manifestUrl);
    
    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Check if browser natively supports HLS (Safari/iOS)
    const canPlayHLS = video.canPlayType('application/vnd.apple.mpegurl') !== '';
    
    if (canPlayHLS) {
      // Native HLS support - Safari/iOS
      console.log('Using native HLS (Safari)');
      video.src = manifestUrl;
      
      // Wait for video to be ready
      video.addEventListener('loadedmetadata', () => {
        console.log('✅ Video metadata loaded');
        video.muted = true;
        video.play()
          .then(() => console.log('✅ Video playing'))
          .catch(err => console.log('⚠️ Autoplay prevented:', err));
      }, { once: true });
      
      video.addEventListener('error', (e) => {
        console.error('❌ Video element error:', {
          error: video.error,
          code: video.error?.code,
          message: video.error?.message,
          networkState: video.networkState,
          readyState: video.readyState
        });
      });
      
      video.load();
      console.log('Video load() called');
    } else if (Hls.isSupported()) {
      // Use hls.js for other browsers
      console.log('Using HLS.js');
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
        debug: true,
      });
      
      hls.loadSource(manifestUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('✅ HLS manifest parsed');
        video.muted = true;
        video.play()
          .then(() => console.log('✅ Video playing'))
          .catch(err => console.log('⚠️ Autoplay prevented:', err));
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('❌ HLS error:', data);
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            console.log('🔄 Retrying after network error...');
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            console.log('🔄 Recovering from media error...');
            hls.recoverMediaError();
          } else {
            console.error('💀 Fatal error, cannot recover');
          }
        }
      });
    } else {
      console.error('❌ HLS not supported in this browser');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [artwork]);

  // Handle Stripe Checkout success return
  useEffect(() => {
    const sessionId = searchParams?.get('session_id');
    if (sessionId && artwork && user) {
      // User returned from Stripe Checkout
      console.log('[Artwork] Returned from Stripe Checkout with session:', sessionId);
      
      toast({
        title: "Payment Successful!",
        description: "Your purchase has been confirmed. You should receive an email confirmation shortly.",
        duration: 5000,
      });
      
      // Clear the session_id from URL to prevent showing message again on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('session_id');
      window.history.replaceState({}, '', url.toString());
      
      // Refresh artwork data to show sold status
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [searchParams, artwork, user, toast]);

  // Setup HLS video player for modal
  useEffect(() => {
    const video = modalVideoRef.current;
    if (!showImageModal || !artwork || !artwork.videoUrl || artwork.mediaType !== 'video' || !video) return;

    // Extract 32-character hex video ID from any Cloudflare URL
    const videoIdMatch = artwork.videoUrl.match(/([a-f0-9]{32})/);
    if (!videoIdMatch) {
      console.error('Modal: Could not extract video ID from:', artwork.videoUrl);
      return;
    }
    
    const videoId = videoIdMatch[1];
    const manifestUrl = `https://videodelivery.net/${videoId}/manifest/video.m3u8`;
    
    // Cleanup previous HLS instance
    if (modalHlsRef.current) {
      modalHlsRef.current.destroy();
      modalHlsRef.current = null;
    }

    // Check if browser natively supports HLS (Safari/iOS)
    const canPlayHLS = video.canPlayType('application/vnd.apple.mpegurl') !== '';
    
    if (canPlayHLS) {
      video.src = manifestUrl;
      
      video.addEventListener('loadedmetadata', () => {
        video.muted = true;
        video.play().catch(err => console.log('Modal autoplay prevented:', err));
      }, { once: true });
      
      video.load();
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      
      hls.loadSource(manifestUrl);
      hls.attachMedia(video);
      modalHlsRef.current = hls;
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.muted = true;
        video.play().catch(err => console.log('Modal autoplay prevented:', err));
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          }
        }
      });
    }

    return () => {
      if (modalHlsRef.current) {
        modalHlsRef.current.destroy();
        modalHlsRef.current = null;
      }
    };
  }, [showImageModal, artwork]);

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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 text-center w-full max-w-full overflow-x-hidden">
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
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 w-full max-w-full overflow-x-hidden">
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
                    ref={videoRef}
                    controls
                    className="w-full h-full object-contain bg-black"
                    playsInline
                    muted
                    loop={false}
                    poster={artwork.imageUrl || undefined}
                    preload="auto"
                  />
                ) : (
                  <div className="cursor-zoom-in">
                    {(() => {
                      const imageSrc = artwork.imageUrl || artwork.videoUrl || '/assets/placeholder-light.png';
                      // Use native img for Cloudflare Stream URLs to prevent Next.js Image optimization
                      if (imageSrc.includes('cloudflarestream.com')) {
                        return (
                          <img
                            src={imageSrc}
                            alt={artwork.title}
                            className="w-full h-full object-contain"
                            style={{ maxHeight: '60vh', minHeight: '300px' }}
                          />
                        );
                      }
                      // Use Next.js Image for other URLs
                      return (
                        <Image
                          src={imageSrc}
                          alt={artwork.title}
                          fill
                          className="object-contain"
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          priority
                        />
                      );
                    })()}
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
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {artwork.title && <CardTitle className="text-2xl">{artwork.title}</CardTitle>}
                      {artwork.artist?.id && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                          <span>by</span>
                          <Link href={`/profile/${artwork.artist.id}`} className="font-medium hover:underline">
                            {artwork.artist.name || artwork.artist.handle || 'View artist'}
                          </Link>
                        </div>
                      )}
                    </div>
                    {/* Like Button - moved next to title for better layout */}
                    <Button
                      variant={artwork?.id && isLiked(artwork.id) ? 'gradient' : 'outline'}
                      size="default"
                      onClick={() => {
                        if (artwork?.id) {
                          toggleLike(artwork.id);
                        }
                      }}
                      disabled={likesLoading}
                      className="flex items-center gap-2 flex-shrink-0"
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          artwork?.id && isLiked(artwork.id) 
                            ? 'fill-current text-blue-500 dark:text-white' 
                            : 'fill-none'
                        }`}
                      />
                      <span className="hidden sm:inline">
                        {artwork?.id && isLiked(artwork.id) ? 'Liked' : 'Like'}
                      </span>
                      {artwork?.likes !== undefined && artwork.likes > 0 && (
                        <span className="text-sm text-muted-foreground">
                          ({artwork.likes})
                        </span>
                      )}
                    </Button>
                  </div>
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
                          variant="gradient"
                          onClick={() => {
                            if (!user) {
                              toast({
                                title: 'Sign in Required',
                                description: 'Please sign in to contact the artist.',
                                variant: 'destructive'
                              });
                              router.push('/login');
                              return;
                            }
                            setShowContactDialog(true);
                          }}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Contact Artist for Price
                        </Button>
                      </div>
                    )}
                    {artwork.isForSale && artwork.price !== undefined && artwork.priceType !== 'contact' && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="gradient"
                          onClick={handleBuyNow}
                          disabled={isProcessingCheckout || artwork.sold}
                        >
                          {isProcessingCheckout ? 'Processing...' : 'Buy Now'}
                          {artwork.price && artwork.price > 0 && (
                            <span className="ml-2">
                              - {artwork.currency || 'USD'} {(artwork.price / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </Button>
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
                  artistAvatarUrl={artwork.artist.avatarUrl}
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
                ref={modalVideoRef}
                controls
                className="max-w-full max-h-[70vh] w-auto h-auto"
                playsInline
                autoPlay
                muted={false}
                loop={false}
                poster={artwork.imageUrl || undefined}
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

      {/* Contact Artist Dialog */}
      {artwork && artwork.artist && (
        <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Contact Artist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-4">
                <User className="h-10 w-10 text-muted-foreground" />
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="font-medium">{artwork.artist.name}</p>
                    <p className="text-sm text-muted-foreground">@{artwork.artist.handle}</p>
                  </div>
                  {artwork.price && artwork.price > 0 && artwork.priceType !== 'contact' && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">Listed Price:</p>
                      <p className="text-lg font-bold">
                        {artwork.currency || 'USD'} {(artwork.price / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm font-medium mb-2">Artist Contact Email:</p>
                {artwork.artist.email ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-2 bg-background rounded border">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`mailto:${artwork.artist.email}?subject=Inquiry about ${encodeURIComponent(artwork.title)}`}
                        className="text-sm font-medium text-blue-600 hover:underline break-all"
                      >
                        {artwork.artist.email}
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Contact the artist directly to discuss purchase details, shipping, and payment arrangements.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Artist email not available. Please try contacting through their profile.
                  </p>
                )}
              </div>
              
              {artwork.deliveryScope && (
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Delivery:</p>
                  <p>
                    {artwork.deliveryScope === 'worldwide' 
                      ? 'Worldwide delivery available'
                      : artwork.deliveryCountries 
                        ? `Delivery to: ${artwork.deliveryCountries}`
                        : 'Delivery location specified'}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowContactDialog(false)} className="flex-1">
                Close
              </Button>
              {artwork.artist?.email && (
                <Button 
                  variant="gradient" 
                  onClick={() => {
                    window.location.href = `mailto:${artwork.artist?.email}?subject=Inquiry about ${encodeURIComponent(artwork.title)}&body=Hello,\n\nI'm interested in purchasing "${artwork.title}".${artwork.price && artwork.price > 0 && artwork.priceType !== 'contact' ? `\n\nI saw it is listed at ${artwork.currency || 'USD'} ${(artwork.price / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.` : ''}\n\nPlease let me know about availability and how we can proceed with the purchase.\n\nThank you!`;
                  }}
                  className="flex-1"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
