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
import { X, Mail, Heart, ShoppingCart, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useLikes } from '@/providers/likes-provider';
import { useAuth } from '@/providers/auth-provider';
import { CheckoutForm } from '@/components/checkout-form';
import { Elements } from '@stripe/react-stripe-js';
import { getStripePromise } from '@/lib/stripe-client';
import Hls from 'hls.js';
import { verifyArtworkPurchase } from '@/lib/purchase-verification';

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
  const [showCheckout, setShowCheckout] = useState(false);
  const [isPrint, setIsPrint] = useState(false);
  
  // CRITICAL: Payment safety states
  const [isProcessingPayment, setIsProcessingPayment] = useState(false); // Prevents double-clicks
  const [isVerifying, setIsVerifying] = useState(false); // Shows verification overlay

  // ============================================
  // PAYMENT SUCCESS HANDLER - WAIT FOR WEBHOOK
  // ============================================
  const handleCheckoutSuccess = async (paymentIntentId: string) => {
    console.log('[Artwork] Payment AUTHORIZED, marking as sold...');
    
    setIsVerifying(true);
    setShowCheckout(false);
    
    try {
      toast({
        title: "Processing Purchase...",
        description: "Please wait, do not close this page.",
        duration: 30000,
      });
      
      // STEP 1: Mark artwork as sold (via webhook trigger OR immediate update)
      // For now, let webhook handle it, but capture payment ONLY after confirming sold status
      console.log('[Artwork] Step 1: Checking if artwork marked as sold...');
      
      // Poll briefly to confirm webhook processed the sale
      const verified = await verifyArtworkPurchase(artwork!.id, paymentIntentId, 5); // 10 seconds
      
      if (verified) {
        // Artwork marked as sold, now capture payment
        console.log('[Artwork] Step 2: Capturing payment...');
        const captureResponse = await fetch('/api/stripe/capture-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId }),
        });

        if (!captureResponse.ok) {
          throw new Error('Failed to capture payment');
        }

        console.log('[Artwork] ✅ Payment captured, purchase complete');
        
        toast({
          title: "Purchase Complete!",
          description: "You will receive a confirmation email shortly.",
        });
        
        window.location.reload();
      } else {
        // Webhook didn't fire yet, payment still authorized but NOT captured
        toast({
          title: "Processing...",
          description: "Your payment is being processed. Your card has NOT been charged yet. Please refresh in a moment.",
          duration: 10000,
        });
      }
    } catch (error: any) {
      console.error('[Artwork] Error:', error);
      
      toast({
        title: "Purchase Processing",
        description: "Your card was NOT charged. Error: " + error.message,
        variant: "destructive",
        duration: 30000,
      });
    } finally {
      setIsVerifying(false);
      setIsProcessingPayment(false);
    }
  };
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const modalHlsRef = useRef<Hls | null>(null);

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

            // Check if artwork is a print (check multiple fields)
            const artworkIsPrint = data.isPrint || data.type === 'print' || data.artworkType === 'print' || (data.stock !== undefined && data.stock !== null);
            setIsPrint(artworkIsPrint);

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

              // Check if artwork is a print (check multiple fields)
              const artworkIsPrint = data.isPrint || data.type === 'print' || data.artworkType === 'print' || (data.stock !== undefined && data.stock !== null);
              setIsPrint(artworkIsPrint);
              
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

    let videoUrl = (artwork as any).videoVariants?.full || artwork.videoUrl;
    
    console.log('🎬 Video player initializing with URL:', videoUrl);
    
    // Handle Cloudflare Stream URLs - need to use HLS manifest
    const isCloudflareStream = videoUrl?.includes('cloudflarestream.com') || 
                               videoUrl?.includes('videodelivery.net');
    
    if (isCloudflareStream && videoUrl) {
      // Extract video ID first (needed for fallback)
      let videoId: string | null = null;
      
      // Try customer subdomain format: customer-{accountId}.cloudflarestream.com/{videoId}
      const customerMatch = videoUrl.match(/customer-[^/]+\.cloudflarestream\.com\/([^/?]+)/);
      if (customerMatch) {
        videoId = customerMatch[1];
        console.log('📹 Extracted video ID from customer subdomain:', videoId);
      } else {
        // Try videodelivery.net format: videodelivery.net/{videoId}
        const videoDeliveryMatch = videoUrl.match(/videodelivery\.net\/([^/?]+)/);
        if (videoDeliveryMatch) {
          videoId = videoDeliveryMatch[1];
          console.log('📹 Extracted video ID from videodelivery.net:', videoId);
        } else {
          // Fallback: try to extract from any cloudflarestream.com URL
          const fallbackMatch = videoUrl.match(/cloudflarestream\.com\/([^/?]+)/);
          if (fallbackMatch) {
            videoId = fallbackMatch[1];
            console.log('📹 Extracted video ID from cloudflarestream.com:', videoId);
          }
        }
      }
      
      // If URL already has .m3u8, use it as-is but store videoId for fallback
      if (videoUrl.includes('.m3u8')) {
        console.log('✅ Video URL already has .m3u8, using as-is:', videoUrl);
        // Store videoId for potential fallback if this URL fails
        if (!videoId) {
          // Extract from .m3u8 URL
          const m3u8Match = videoUrl.match(/\/([^/]+)\/manifest\/video\.m3u8/);
          if (m3u8Match) videoId = m3u8Match[1];
        }
      } else if (videoId) {
        // Construct HLS manifest URL - USE VIDEODELIVERY.NET as primary (works universally)
        // This is more reliable than customer subdomain which requires account ID
        videoUrl = `https://videodelivery.net/${videoId}/manifest/video.m3u8`;
        console.log('✅ Constructed HLS manifest URL (videodelivery.net):', videoUrl);
      } else {
        console.error('❌ Could not extract video ID from Cloudflare Stream URL:', videoUrl);
      }
    }
    
    const isHLS = videoUrl.includes('.m3u8') || isCloudflareStream;
    
    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHLS) {
      // Check if browser natively supports HLS (Safari)
      const canPlayHLS = video.canPlayType('application/vnd.apple.mpegurl') !== '';
      
      if (canPlayHLS) {
        // Native HLS support (Safari)
        console.log('✅ Using native HLS support (Safari)');
        video.src = videoUrl;
        video.load(); // Ensure video is loaded
        
        // Don't force autoplay - let user click play with controls
        video.addEventListener('loadeddata', () => {
          console.log('✅ Video loaded successfully');
        }, { once: true });
      } else if (Hls.isSupported()) {
        // Use hls.js for browsers that don't support HLS natively
        console.log('✅ Using HLS.js for video playback');
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          startLevel: -1, // Auto quality selection
          debug: false,
        });
        
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
        hlsRef.current = hls;
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('✅ HLS manifest parsed, video ready');
          // Don't force autoplay - let user click play with controls
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error('❌ HLS fatal error:', data);
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              console.log('🔄 Attempting to recover from network error...');
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              console.log('🔄 Attempting to recover from media error...');
              hls.recoverMediaError();
            } else {
              console.error('💀 Unrecoverable HLS error, destroying player');
              hls.destroy();
            }
          }
        });
      } else {
        console.error('❌ HLS not supported in this browser');
      }
    } else {
      // Non-HLS video (MP4, etc.)
      console.log('✅ Using direct video (MP4)');
      video.src = videoUrl;
      video.load();
      
      // Don't force autoplay - let user click play with controls
      video.addEventListener('loadeddata', () => {
        console.log('✅ Direct video loaded successfully');
      }, { once: true });
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

    let videoUrl = (artwork as any).videoVariants?.full || artwork.videoUrl;
    
    console.log('🎬 Modal video player initializing with URL:', videoUrl);
    
    // Handle Cloudflare Stream URLs - need to use HLS manifest
    const isCloudflareStream = videoUrl?.includes('cloudflarestream.com') || 
                               videoUrl?.includes('videodelivery.net');
    
    if (isCloudflareStream && videoUrl) {
      // Extract video ID first (needed for fallback)
      let videoId: string | null = null;
      
      // Try customer subdomain format: customer-{accountId}.cloudflarestream.com/{videoId}
      const customerMatch = videoUrl.match(/customer-[^/]+\.cloudflarestream\.com\/([^/?]+)/);
      if (customerMatch) {
        videoId = customerMatch[1];
        console.log('📹 Modal: Extracted video ID from customer subdomain:', videoId);
      } else {
        // Try videodelivery.net format: videodelivery.net/{videoId}
        const videoDeliveryMatch = videoUrl.match(/videodelivery\.net\/([^/?]+)/);
        if (videoDeliveryMatch) {
          videoId = videoDeliveryMatch[1];
          console.log('📹 Modal: Extracted video ID from videodelivery.net:', videoId);
        } else {
          // Fallback: try to extract from any cloudflarestream.com URL
          const fallbackMatch = videoUrl.match(/cloudflarestream\.com\/([^/?]+)/);
          if (fallbackMatch) {
            videoId = fallbackMatch[1];
            console.log('📹 Modal: Extracted video ID from cloudflarestream.com:', videoId);
          }
        }
      }
      
      // If URL already has .m3u8, use it as-is
      if (videoUrl.includes('.m3u8')) {
        console.log('✅ Modal video URL already has .m3u8, using as-is:', videoUrl);
      } else if (videoId) {
        // Construct HLS manifest URL - USE VIDEODELIVERY.NET as primary (works universally)
        videoUrl = `https://videodelivery.net/${videoId}/manifest/video.m3u8`;
        console.log('✅ Constructed HLS manifest URL for modal (videodelivery.net):', videoUrl);
      } else {
        console.error('❌ Could not extract video ID from Cloudflare Stream URL (modal):', videoUrl);
      }
    }
    
    const isHLS = videoUrl.includes('.m3u8') || isCloudflareStream;
    
    // Cleanup previous HLS instance
    if (modalHlsRef.current) {
      modalHlsRef.current.destroy();
      modalHlsRef.current = null;
    }

    if (isHLS) {
      const canPlayHLS = video.canPlayType('application/vnd.apple.mpegurl') !== '';
      
      if (canPlayHLS) {
        console.log('✅ Modal: Using native HLS support (Safari)');
        video.src = videoUrl;
        video.load();
        video.addEventListener('loadeddata', () => {
          console.log('✅ Modal video loaded successfully');
        }, { once: true });
      } else if (Hls.isSupported()) {
        console.log('✅ Modal: Using HLS.js for video playback');
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });
        
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
        modalHlsRef.current = hls;
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('✅ Modal HLS manifest parsed, video ready');
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error('❌ Modal HLS fatal error:', data);
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              console.log('🔄 Modal: Attempting to recover from network error...');
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              console.log('🔄 Modal: Attempting to recover from media error...');
              hls.recoverMediaError();
            }
          }
        });
      }
    } else {
      console.log('✅ Modal: Using direct video (MP4)');
      video.src = videoUrl;
      video.load();
      video.addEventListener('loadeddata', () => {
        console.log('✅ Modal direct video loaded successfully');
      }, { once: true });
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
                    ref={videoRef}
                    controls
                    className="w-full h-full object-contain bg-black"
                    playsInline
                    muted
                    loop={false}
                    poster={artwork.imageUrl || undefined}
                    preload="auto"
                    onLoadStart={() => console.log('Video load started')}
                    onCanPlay={() => console.log('Video can play')}
                    onError={(e) => console.error('Video error:', e)}
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
                      <CardTitle className="text-2xl">{artwork.title}</CardTitle>
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
                          artwork?.id && isLiked(artwork.id) ? 'fill-current' : 'fill-none'
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
                      <div className="flex items-center gap-2">
                        <Button
                          variant="gradient"
                          disabled={isProcessingPayment}
                          onClick={() => {
                            // ========================================
                            // CRITICAL: COMPREHENSIVE PRE-PAYMENT VALIDATION
                            // DO NOT PROCEED IF ANY CHECK FAILS
                            // ========================================
                            
                            // Check 1: Idempotency - prevent double clicks
                            if (isProcessingPayment) {
                              toast({
                                title: "Please Wait",
                                description: "Payment is already being processed.",
                              });
                              return;
                            }
                            
                            // Check 2: User authentication
                            if (!user) {
                              toast({
                                title: 'Login Required',
                                description: 'Please log in to purchase artwork.',
                                variant: 'destructive'
                              });
                              router.push('/login?redirect=' + encodeURIComponent(`/artwork/${artwork.id}`));
                              return;
                            }
                            
                            // Check 3: Artwork data validation
                            if (!artwork || !artwork.id) {
                              toast({
                                title: 'Error',
                                description: 'Artwork data not loaded. Please refresh the page.',
                                variant: 'destructive'
                              });
                              return;
                            }
                            
                            // Check 4: Artwork not already sold
                            if (artwork.sold) {
                              toast({
                                title: 'Already Sold',
                                description: 'This artwork has already been sold.',
                                variant: 'destructive'
                              });
                              return;
                            }
                            
                            // Check 5: Artist information validation
                            if (!artwork.artist?.id) {
                              toast({
                                title: 'Artist information missing',
                                description: 'Unable to process purchase. Artist information is not available.',
                                variant: 'destructive'
                              });
                              return;
                            }
                            
                            // Check 6: Price validation
                            if (!artwork.price || artwork.price <= 0) {
                              toast({
                                title: 'Invalid Price',
                                description: 'Artwork price is not set correctly.',
                                variant: 'destructive'
                              });
                              return;
                            }
                            
                            // Check 7: Cannot purchase own artwork
                            if (user.id === artwork.artist?.id) {
                              toast({
                                title: 'Cannot Purchase Own Artwork',
                                description: 'You cannot purchase your own artwork.',
                                variant: 'destructive'
                              });
                              return;
                            }
                            
                            // ========================================
                            // VALIDATION PASSED - REDIRECT TO STRIPE CHECKOUT
                            // Physical artwork requires shipping address collection
                            // ========================================
                            setIsProcessingPayment(true);
                            
                            // Create Stripe Checkout Session for shipping address collection
                            fetch('/api/stripe/create-checkout-session', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                itemId: artwork.id,
                                itemType: 'artwork',
                                buyerId: user.id,
                                buyerEmail: user.email, // BUYER's email for checkout
                              }),
                            })
                            .then(async (response) => {
                              if (!response.ok) {
                                const errorData = await response.json();
                                throw new Error(errorData.error || 'Failed to create checkout session');
                              }
                              return response.json();
                            })
                            .then((data) => {
                              // Redirect to Stripe Checkout
                              window.location.href = data.url;
                            })
                            .catch((error) => {
                              console.error('Error creating checkout session:', error);
                              setIsProcessingPayment(false);
                              toast({
                                title: 'Checkout Error',
                                description: error.message || 'Failed to start checkout process.',
                                variant: 'destructive'
                              });
                            });
                          }}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Buy Now - {artwork.currency || 'USD'} {(artwork.price / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

      {/* Checkout Dialog */}
      {artwork && artwork.isForSale && artwork.price && artwork.price > 0 && artwork.artist?.id && (
        <Dialog open={showCheckout} onOpenChange={(open) => {
          setShowCheckout(open);
          if (!open) setIsProcessingPayment(false); // Reset processing state if dialog closed
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Purchase Artwork</DialogTitle>
            </DialogHeader>
            {getStripePromise() ? (
              <CheckoutForm
                amount={artwork.price / 100} // Convert from cents to dollars
                currency={artwork.currency || 'USD'}
                artistId={artwork.artist.id}
                itemId={artwork.id}
                itemType={isPrint ? 'print' : 'original'}
                itemTitle={artwork.title}
                buyerId={user?.id || ''}
                onSuccess={handleCheckoutSuccess}
                onCancel={() => {
                  setShowCheckout(false);
                  setIsProcessingPayment(false);
                }}
              />
            ) : (
              <div className="p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  Payment processing is not configured. Please contact support.
                </p>
                <Button variant="outline" onClick={() => {
                  setShowCheckout(false);
                  setIsProcessingPayment(false);
                }}>
                  Close
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
      
      {/* CRITICAL: Verification Loading Overlay */}
      {isVerifying && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-full max-w-md p-6 mx-4">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <h3 className="font-semibold text-lg text-center">Verifying Purchase</h3>
              <p className="text-sm text-muted-foreground text-center">
                Your payment was successful. We're verifying your purchase with the database...
              </p>
              <p className="text-xs text-muted-foreground text-center">
                This usually takes just a few seconds.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
