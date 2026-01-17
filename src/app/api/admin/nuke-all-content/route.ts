import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * NUCLEAR OPTION: Delete ALL content from the database
 * This deletes from: artworks, portfolioItems, posts, courses
 * 
 * For the logged-in user only (or all if admin)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, deleteAll } = body;
    
    if (!userId && !deleteAll) {
      return NextResponse.json({ error: 'userId or deleteAll required' }, { status: 400 });
    }
    
    const results = {
      artworks: 0,
      portfolioItems: 0,
      posts: 0,
      courses: 0,
    };
    
    // Delete from artworks collection
    if (deleteAll) {
      // Delete ALL artworks
      const artworksSnapshot = await adminDb.collection('artworks').get();
      const batch1 = adminDb.batch();
      let count = 0;
      for (const doc of artworksSnapshot.docs) {
        batch1.delete(doc.ref);
        count++;
        if (count % 500 === 0) {
          await batch1.commit();
        }
      }
      if (count % 500 !== 0) await batch1.commit().catch(() => {});
      results.artworks = artworksSnapshot.size;
    } else {
      const artworksSnapshot = await adminDb.collection('artworks').where('userId', '==', userId).get();
      const batch1 = adminDb.batch();
      artworksSnapshot.forEach(doc => batch1.delete(doc.ref));
      await batch1.commit().catch(() => {});
      results.artworks = artworksSnapshot.size;
    }
    
    // Delete from portfolioItems collection
    if (deleteAll) {
      const portfolioSnapshot = await adminDb.collection('portfolioItems').get();
      const batch2 = adminDb.batch();
      let count = 0;
      for (const doc of portfolioSnapshot.docs) {
        batch2.delete(doc.ref);
        count++;
        if (count % 500 === 0) {
          await batch2.commit();
        }
      }
      if (count % 500 !== 0) await batch2.commit().catch(() => {});
      results.portfolioItems = portfolioSnapshot.size;
    } else {
      const portfolioSnapshot = await adminDb.collection('portfolioItems').where('userId', '==', userId).get();
      const batch2 = adminDb.batch();
      portfolioSnapshot.forEach(doc => batch2.delete(doc.ref));
      await batch2.commit().catch(() => {});
      results.portfolioItems = portfolioSnapshot.size;
    }
    
    // Delete from posts collection
    if (deleteAll) {
      const postsSnapshot = await adminDb.collection('posts').get();
      const batch3 = adminDb.batch();
      let count = 0;
      for (const doc of postsSnapshot.docs) {
        batch3.delete(doc.ref);
        count++;
        if (count % 500 === 0) {
          await batch3.commit();
        }
      }
      if (count % 500 !== 0) await batch3.commit().catch(() => {});
      results.posts = postsSnapshot.size;
    } else {
      const postsSnapshot = await adminDb.collection('posts').where('userId', '==', userId).get();
      const batch3 = adminDb.batch();
      postsSnapshot.forEach(doc => batch3.delete(doc.ref));
      await batch3.commit().catch(() => {});
      results.posts = postsSnapshot.size;
    }
    
    // Delete from courses collection
    if (deleteAll) {
      const coursesSnapshot = await adminDb.collection('courses').get();
      const batch4 = adminDb.batch();
      let count = 0;
      for (const doc of coursesSnapshot.docs) {
        batch4.delete(doc.ref);
        count++;
        if (count % 500 === 0) {
          await batch4.commit();
        }
      }
      if (count % 500 !== 0) await batch4.commit().catch(() => {});
      results.courses = coursesSnapshot.size;
    } else {
      const coursesSnapshot = await adminDb.collection('courses').where('instructorId', '==', userId).get();
      const batch4 = adminDb.batch();
      coursesSnapshot.forEach(doc => batch4.delete(doc.ref));
      await batch4.commit().catch(() => {});
      results.courses = coursesSnapshot.size;
    }
    
    const response = NextResponse.json({
      success: true,
      message: 'All content deleted from database',
      deleted: results,
      total: Object.values(results).reduce((a, b) => a + b, 0),
    });
    
    // Bust all caches
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    
    return response;
  } catch (error: any) {
    console.error('Error in nuke-all-content:', error);
    return NextResponse.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
}
