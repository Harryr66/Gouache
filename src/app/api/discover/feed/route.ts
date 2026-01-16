import { NextRequest, NextResponse } from 'next/server';
import { PortfolioService } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Revalidate every 5 minutes (ISR)

/**
 * Cached Discover Feed API
 * 
 * This endpoint serves a pre-generated discover feed with caching.
 * Reduces Firestore query time from 5-10s to <100ms for cached requests.
 * 
 * Strategy:
 * - Cache top 50 items for 5 minutes
 * - Serve instantly from cache
 * - Refresh in background
 * - Fallback to direct Firestore if cache miss
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hideAI = searchParams.get('hideAI') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const startAfter = searchParams.get('startAfter'); // For pagination
    
    // Fetch BOTH portfolio items AND discover-only content (videos)
    // Query portfolio items (showInPortfolio: true)
    console.log('📡 API: Fetching portfolio items...', {
      showInPortfolio: true,
      deleted: false,
      hideAI,
      limit: Math.floor(limit / 2)
    });
    
    const portfolioResult = await PortfolioService.getDiscoverPortfolioItems({
      showInPortfolio: true,
      deleted: false,
      hideAI: hideAI,
      limit: Math.floor(limit / 2), // Half for portfolio items
      startAfter: startAfter ? JSON.parse(startAfter) : undefined,
    });
    
    console.log('✅ API: Portfolio items returned:', portfolioResult.items.length);
    
    // CRITICAL FIX: Also query artworks collection (where discover uploads are stored!)
    console.log('📡 API: Fetching artworks collection...');
    
    // Dynamic import to avoid build issues
    const { collection, query, getDocs, orderBy, limit: firestoreLimit } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    
    const artworksQuery = query(
      collection(db, 'artworks'),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit) // Get full limit from artworks
    );
    
    const artworksSnapshot = await getDocs(artworksQuery);
    const artworksItems = artworksSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as any[];
    
    console.log('✅ API: Artworks returned (before filtering):', artworksItems.length);
    
    // CLOUDFLARE-ONLY FILTER: Helper functions
    const isCloudflareImage = (url: string | null | undefined): boolean => {
      if (!url || typeof url !== 'string') return false;
      
      // Explicitly REJECT non-Cloudflare sources
      if (url.includes('firebasestorage.googleapis.com')) return false;
      if (url.includes('firebase.com')) return false;
      if (url.startsWith('data:')) return false;
      if (url.includes('pexels.com')) return false;
      if (url.includes('unsplash.com')) return false;
      
      // MUST be Cloudflare Images
      return url.includes('imagedelivery.net');
    };
    
    const isValidCloudflareImageUrl = (url: string | null | undefined): boolean => {
      if (!url || typeof url !== 'string') return false;
      if (!isCloudflareImage(url)) return false;
      if (!url.includes('imagedelivery.net')) return false;
      const match = url.match(/imagedelivery\.net\/([^/]+)\/([^/]+)(?:\/([^/]+))?/);
      if (!match) return false;
      const [, accountHash, imageId] = match;
      if (!accountHash || !imageId || accountHash.length === 0 || imageId.length === 0) return false;
      if (!/^[a-zA-Z0-9_-]+$/.test(accountHash)) return false;
      if (!/^[a-zA-Z0-9_-]+$/.test(imageId)) return false;
      return true;
    };
    
    const isCloudflareVideo = (videoUrl: string | null | undefined): boolean => {
      if (!videoUrl || typeof videoUrl !== 'string') return false;
      return videoUrl.includes('cloudflarestream.com') ||
             videoUrl.includes('videodelivery.net') ||
             videoUrl.includes('.m3u8');
    };
    
    // COMPREHENSIVE FILTERING: ONLY Cloudflare media + ONLY artworks (no products/courses/merch)
    const filteredArtworksItems = artworksItems.filter((item: any) => {
      // Skip events
      if (item.type === 'event' || item.type === 'Event' || item.eventType) return false;
      
      // COMPREHENSIVE PRODUCT/COURSE FILTERING (case-insensitive)
      const itemType = (item.type || '').toLowerCase();
      const itemArtworkType = (item.artworkType || '').toLowerCase();
      const itemCategory = (item.category || '').toLowerCase();
      const itemTitle = (item.title || '').toLowerCase();
      
      // EMERGENCY DEBUG: Log Test Mug data to see why it's not being filtered
      if (itemTitle.includes('mug') || item.id === 'artwork-1767255654110') {
        console.log('🔍 DEBUG Test Mug data:', {
          id: item.id,
          title: item.title,
          type: item.type,
          artworkType: item.artworkType,
          category: item.category,
          showInShop: item.showInShop,
          isForSale: item.isForSale,
          showInPortfolio: item.showInPortfolio,
          variants: !!item.variants,
          basePrice: !!item.basePrice,
          variantOptions: !!item.variantOptions,
          shippingProfile: !!item.shippingProfile,
          allFields: Object.keys(item)
        });
      }
      
      // Layer 1: Type checks
      if (itemType.includes('product') || itemType.includes('merchandise') || 
          itemType.includes('marketplace') || itemType.includes('course') ||
          itemType === 'merch' || itemType === 'shop') {
        console.log('🚫 API FILTERED (type):', item.id, item.type);
        return false;
      }
      
      // Layer 2: ArtworkType checks
      if (itemArtworkType.includes('merchandise') || itemArtworkType.includes('product') || 
          itemArtworkType.includes('course') || itemArtworkType === 'merch') {
        console.log('🚫 API FILTERED (artworkType):', item.id, item.artworkType);
        return false;
      }
      
      // Layer 3: Category checks
      if (itemCategory.includes('product') || itemCategory.includes('merchandise') || 
          itemCategory.includes('merch') || itemCategory.includes('course')) {
        console.log('🚫 API FILTERED (category):', item.id, item.category);
        return false;
      }
      
      // Layer 4: Shop flags + keyword detection
      if (item.showInShop === true || item.isForSale === true) {
        if (item.showInPortfolio !== true) {
          console.log('🚫 API FILTERED (shop-only):', item.id);
          return false;
        }
        const productKeywords = ['mug', 'cup', 'shirt', 't-shirt', 'tshirt', 'hoodie', 'sweatshirt', 
                                'print', 'poster', 'canvas', 'sticker', 'pin', 'bag', 'tote',
                                'phone case', 'pillow', 'blanket', 'hat', 'cap'];
        if (productKeywords.some(keyword => itemTitle.includes(keyword))) {
          console.log('🚫 API FILTERED (product keyword):', item.id, itemTitle);
          return false;
        }
      }
      
      // Layer 5: Product-specific fields
      if (item.variants || item.basePrice || item.variantOptions || item.shippingProfile) {
        console.log('🚫 API FILTERED (product fields):', item.id);
        return false;
      }
      
      const imageUrl = item.imageUrl || item.supportingImages?.[0] || item.images?.[0] || 
                      (item.mediaUrls?.[0] && item.mediaTypes?.[0] !== 'video' ? item.mediaUrls[0] : '') || '';
      let videoUrl = item.videoUrl || null;
      if (!videoUrl && item.mediaUrls?.[0] && item.mediaTypes?.[0] === 'video') {
        videoUrl = item.mediaUrls[0];
      }
      
      // STRICT: Videos must be Cloudflare Stream
      if (videoUrl && !isCloudflareVideo(videoUrl)) return false;
      
      // STRICT: Images must be Cloudflare Images with valid format
      if (!videoUrl && imageUrl) {
        if (!isCloudflareImage(imageUrl)) return false;
        if (!isValidCloudflareImageUrl(imageUrl)) return false;
      }
      
      // Must have at least one media source
      if (!imageUrl && !videoUrl) return false;
      
      return true;
    });
    
    console.log('✅ API: Artworks returned (after Cloudflare filter):', filteredArtworksItems.length);
    
    // Combine ALL sources (portfolioItems are already filtered by PortfolioService)
    const combinedItems = [
      ...portfolioResult.items, 
      ...filteredArtworksItems
    ];
    console.log('📦 API: Combined items total:', combinedItems.length);
    combinedItems.sort((a, b) => {
      // Handle both Date and Firestore Timestamp types
      const aTime = a.createdAt instanceof Date 
        ? a.createdAt.getTime() 
        : (a.createdAt?.toDate?.() || new Date(0)).getTime();
      const bTime = b.createdAt instanceof Date 
        ? b.createdAt.getTime() 
        : (b.createdAt?.toDate?.() || new Date(0)).getTime();
      return bTime - aTime;
    });
    
    // Limit to requested amount
    const items = combinedItems.slice(0, limit);
    console.log('✅ API: Final items after limit:', items.length, '(requested:', limit, ')');
    
    // Use last doc from portfolio result for pagination cursor
    const lastDoc = portfolioResult.lastDoc;
    
    const response = NextResponse.json({
      success: true,
      items,
      lastDoc: lastDoc ? {
        id: lastDoc.id,
        // Store minimal data for cursor pagination
        createdAt: lastDoc.data()?.createdAt,
      } : null,
      timestamp: Date.now(),
      // DEBUG: Add breakdown visible in browser console
      debug: {
        portfolioItemsCount: portfolioResult.items.length,
        artworksCount: artworksItems.length,
        artworksAfterFilter: filteredArtworksItems.length,
        combinedTotal: combinedItems.length,
        finalCount: items.length,
        requested: limit,
      },
    });

    // Set cache headers for optimal browser caching
    // Public cache for 5 minutes (matches revalidate time)
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    return response;
  } catch (error: any) {
    console.error('Error fetching discover feed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Failed to fetch discover feed',
        items: [],
        lastDoc: null,
      },
      { status: 500 }
    );
  }
}

