import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, limit } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic: Check what content exists and what would show in discover feed
 */
export async function GET() {
  try {
    const artworksSnapshot = await getDocs(collection(db, 'artworks'));
    
    let totalItems = 0;
    let cloudflareImages = 0;
    let cloudflareVideos = 0;
    let firebaseImages = 0;
    let firebaseVideos = 0;
    let noMedia = 0;
    let deleted = 0;
    
    const cloudflareImageSamples: any[] = [];
    const cloudflareVideoSamples: any[] = [];
    const firebaseSamples: any[] = [];
    
    artworksSnapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      totalItems++;
      
      if (data.deleted === true) {
        deleted++;
        return;
      }
      
      const hasVideo = !!(data.videoUrl || data.mediaType === 'video');
      const imageUrl = data.imageUrl || data.supportingImages?.[0] || '';
      const videoUrl = data.videoUrl || '';
      
      // Check if Cloudflare
      const isCloudflareImage = imageUrl && (
        imageUrl.includes('imagedelivery.net') ||
        imageUrl.includes('cloudflare.com')
      );
      const isCloudflareVideo = videoUrl && (
        videoUrl.includes('cloudflarestream.com') ||
        videoUrl.includes('videodelivery.net') ||
        videoUrl.includes('.m3u8')
      );
      
      // Check if Firebase
      const isFirebaseImage = imageUrl && imageUrl.includes('firebasestorage.googleapis.com');
      const isFirebaseVideo = videoUrl && videoUrl.includes('firebasestorage.googleapis.com');
      
      if (hasVideo) {
        if (isCloudflareVideo && !isFirebaseVideo) {
          cloudflareVideos++;
          if (cloudflareVideoSamples.length < 5) {
            cloudflareVideoSamples.push({
              id: doc.id,
              title: data.title || 'Untitled',
              videoUrl: videoUrl.substring(0, 80) + '...',
              showInPortfolio: data.showInPortfolio,
            });
          }
        } else if (isFirebaseVideo) {
          firebaseVideos++;
          if (firebaseSamples.length < 3) {
            firebaseSamples.push({
              id: doc.id,
              type: 'video',
              title: data.title || 'Untitled',
              url: videoUrl.substring(0, 80) + '...',
            });
          }
        }
      } else {
        if (isCloudflareImage && !isFirebaseImage) {
          cloudflareImages++;
          if (cloudflareImageSamples.length < 5) {
            cloudflareImageSamples.push({
              id: doc.id,
              title: data.title || 'Untitled',
              imageUrl: imageUrl.substring(0, 80) + '...',
              showInPortfolio: data.showInPortfolio,
            });
          }
        } else if (isFirebaseImage) {
          firebaseImages++;
          if (firebaseSamples.length < 3) {
            firebaseSamples.push({
              id: doc.id,
              type: 'image',
              title: data.title || 'Untitled',
              url: imageUrl.substring(0, 80) + '...',
            });
          }
        } else if (!imageUrl && !videoUrl) {
          noMedia++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalItems,
        deleted,
        cloudflareImages,
        cloudflareVideos,
        firebaseImages,
        firebaseVideos,
        noMedia,
        wouldShowInImageMosaic: cloudflareImages,
        wouldShowInVideoFeed: cloudflareVideos,
      },
      explanation: {
        cloudflareImages: 'Images from Cloudflare Images - WILL show in image mosaic',
        cloudflareVideos: 'Videos from Cloudflare Stream - WILL show in video feed',
        firebaseImages: 'Images from Firebase Storage - FILTERED OUT (won\'t show)',
        firebaseVideos: 'Videos from Firebase Storage - FILTERED OUT (won\'t show)',
        wouldShowInImageMosaic: 'Total Cloudflare images that will appear in grid view',
        wouldShowInVideoFeed: 'Total Cloudflare videos that will appear in video feed',
      },
      cloudflareImageSamples: cloudflareImageSamples.slice(0, 5),
      cloudflareVideoSamples: cloudflareVideoSamples.slice(0, 5),
      firebaseSamples: firebaseSamples.slice(0, 3),
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to check content status',
      },
      { status: 500 }
    );
  }
}
