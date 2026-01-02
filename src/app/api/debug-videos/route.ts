import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    
    // Fetch latest 50 artworks to find videos
    const artworksSnapshot = await adminDb
      .collection('artworks')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    const artworks = artworksSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        showInPortfolio: data.showInPortfolio,
        mediaType: data.mediaType,
        videoUrl: data.videoUrl?.substring(0, 100),
        imageUrl: data.imageUrl?.substring(0, 100),
        hasVideoUrl: !!data.videoUrl,
        hasImageUrl: !!data.imageUrl,
        artistId: data.artist?.id || data.artistId,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      };
    });
    
    // Filter to show only videos
    const videos = artworks.filter(a => a.hasVideoUrl);
    
    return NextResponse.json({ 
      totalArtworks: artworks.length,
      totalVideos: videos.length,
      allArtworks: artworks,
      videosOnly: videos 
    });
  } catch (error: any) {
    console.error('Debug videos error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

