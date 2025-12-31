import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * IMMEDIATE ENROLLMENT CREATION - SERVER-SIDE
 * Uses Firebase Admin SDK for reliable server-side writes
 */

// Initialize Firebase Admin only once
function getAdminDb() {
  if (getApps().length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!privateKey || !clientEmail || !projectId) {
      throw new Error('Missing Firebase Admin credentials');
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  }

  return getFirestore();
}

export async function POST(request: NextRequest) {
  console.log('[CREATE ENROLLMENT] API called');
  
  try {
    // Initialize Firebase Admin at runtime
    const adminDb = getAdminDb();
    
    const body = await request.json();
    const { courseId, userId, paymentIntentId } = body;

    console.log('[CREATE ENROLLMENT] Received:', { courseId, userId, paymentIntentId });

    // Validate required fields
    if (!courseId || !userId || !paymentIntentId) {
      console.error('[CREATE ENROLLMENT] Missing fields');
      return NextResponse.json(
        { error: 'Missing required fields: courseId, userId, paymentIntentId' },
        { status: 400 }
      );
    }

    console.log('[CREATE ENROLLMENT] Checking for existing enrollment...');

    // Check if enrollment already exists
    const existingEnrollments = await adminDb
      .collection('courseEnrollments')
      .where('courseId', '==', courseId)
      .where('userId', '==', userId)
      .where('paymentIntentId', '==', paymentIntentId)
      .get();

    if (!existingEnrollments.empty) {
      console.log('[CREATE ENROLLMENT] ✅ Enrollment already exists');
      return NextResponse.json({
        success: true,
        message: 'Enrollment already exists',
        enrollmentId: existingEnrollments.docs[0].id,
      });
    }

    console.log('[CREATE ENROLLMENT] Creating new enrollment...');

    // Create new enrollment
    const enrollmentData = {
      courseId,
      userId,
      paymentIntentId,
      enrolledAt: new Date(),
      progress: 0,
      currentWeek: 1,
      currentLesson: 1,
      completedLessons: [],
      lastAccessedAt: new Date(),
      certificateEarned: false,
      isActive: true,
      createdBy: 'immediate_payment',
    };

    const enrollmentRef = await adminDb
      .collection('courseEnrollments')
      .add(enrollmentData);

    console.log('[CREATE ENROLLMENT] ✅ Enrollment created:', enrollmentRef.id);

    return NextResponse.json({
      success: true,
      message: 'Enrollment created successfully',
      enrollmentId: enrollmentRef.id,
    });

  } catch (error: any) {
    console.error('[CREATE ENROLLMENT] FATAL ERROR:', error);
    console.error('[CREATE ENROLLMENT] Error stack:', error.stack);
    console.error('[CREATE ENROLLMENT] Error message:', error.message);
    
    return NextResponse.json(
      { 
        error: 'Failed to create enrollment', 
        details: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

