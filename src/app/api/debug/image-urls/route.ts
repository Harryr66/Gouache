import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';

/**
 * Debug endpoint to check actual imageUrl values in database
 */
export async function GET(request: NextRequest) {
  try {
    const artworksSnapshot = await getDocs(
      query(
        collection(db, 'artworks'),
        orderBy('createdAt', 'desc'),
        limit(50)
      )
    );
    
    const results: any = {
      total: artworksSnapshot.size,
      samples: [],
      urlAnalysis: {
        cloudflare: 0,
        firebase: 0,
        invalid: 0,
        missing: 0,
        withVariant: 0,
        withoutVariant: 0,
      }
    };
    
    artworksSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const imageUrl = data.imageUrl || '';
      
      const sample: any = {
        id: doc.id,
        title: data.title || 'Untitled',
        imageUrl: imageUrl.substring(0, 150), // Truncate for display
        hasImageUrl: !!imageUrl,
        isCloudflare: imageUrl.includes('imagedelivery.net'),
        isFirebase: imageUrl.includes('firebasestorage'),
        hasVariant: /imagedelivery\.net\/[^/]+\/[^/]+\/[^/]+/.test(imageUrl),
        variant: imageUrl.match(/imagedelivery\.net\/[^/]+\/[^/]+\/([^/]+)/)?.[1] || 'none',
        accountHash: imageUrl.match(/imagedelivery\.net\/([^/]+)/)?.[1] || 'none',
        imageId: imageUrl.match(/imagedelivery\.net\/[^/]+\/([^/]+)/)?.[1] || 'none',
      };
      
      // Count analysis
      if (!imageUrl) {
        results.urlAnalysis.missing++;
      } else if (imageUrl.includes('imagedelivery.net')) {
        results.urlAnalysis.cloudflare++;
        if (sample.hasVariant) {
          results.urlAnalysis.withVariant++;
        } else {
          results.urlAnalysis.withoutVariant++;
        }
      } else if (imageUrl.includes('firebasestorage')) {
        results.urlAnalysis.firebase++;
      } else {
        results.urlAnalysis.invalid++;
      }
      
      if (results.samples.length < 20) {
        results.samples.push(sample);
      }
    });
    
    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error('Debug image URLs error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
