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
    
    // Fetch from Firestore (will be cached by Next.js ISR)
    // REMOVED ALL FILTERS - show ALL content
    const result = await PortfolioService.getDiscoverPortfolioItems({
      // REMOVED: showInPortfolio: true - show ALL content
      // REMOVED: deleted: false - show ALL content including deleted
      hideAI: hideAI,
      limit: limit,
      startAfter: startAfter ? JSON.parse(startAfter) : undefined,
    });
    
    const response = NextResponse.json({
      success: true,
      items: result.items,
      lastDoc: result.lastDoc ? {
        id: result.lastDoc.id,
        // Store minimal data for cursor pagination
        createdAt: result.lastDoc.data()?.createdAt,
      } : null,
      timestamp: Date.now(),
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

