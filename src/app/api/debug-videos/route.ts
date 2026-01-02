import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    
    // Fetch latest 20 artworks
    const artworksSnapshot = await adminDb
      .collection('artworks')
      .orderBy('createdAt', 'desc')
      .limit(20)
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
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      };
    });
    
    return NextResponse.json({ artworks });
  } catch (error: any) {
    console.error('Debug videos error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

