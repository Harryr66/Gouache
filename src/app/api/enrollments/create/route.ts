import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

/**
 * IMMEDIATE ENROLLMENT CREATION
 * 
 * This API creates enrollment records IMMEDIATELY after payment succeeds,
 * without waiting for Stripe webhooks. This ensures users ALWAYS get access
 * after payment, regardless of webhook delays or failures.
 * 
 * Flow:
 * 1. Payment succeeds in frontend
 * 2. Frontend calls this API immediately
 * 3. Enrollment created with status "confirmed"
 * 4. Webhook later verifies and updates if needed
 * 
 * This is the industry-standard approach used by Udemy, Coursera, etc.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, userId, paymentIntentId } = body;

    // Validate required fields
    if (!courseId || !userId || !paymentIntentId) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, userId, paymentIntentId' },
        { status: 400 }
      );
    }

    console.log(`[CREATE ENROLLMENT] Creating immediate enrollment for user ${userId}, course ${courseId}, payment ${paymentIntentId}`);

    // Check if enrollment already exists (prevent duplicates)
    const enrollmentQuery = query(
      collection(db, 'courseEnrollments'),
      where('courseId', '==', courseId),
      where('userId', '==', userId),
      where('paymentIntentId', '==', paymentIntentId)
    );

    const existingEnrollments = await getDocs(enrollmentQuery);

    if (!existingEnrollments.empty) {
      console.log(`[CREATE ENROLLMENT] ✅ Enrollment already exists for payment ${paymentIntentId}`);
      return NextResponse.json({
        success: true,
        message: 'Enrollment already exists',
        enrollmentId: existingEnrollments.docs[0].id,
      });
    }

    // Create new enrollment with all required fields
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
      createdBy: 'immediate_payment', // Mark as created immediately, not by webhook
    };

    const enrollmentRef = await addDoc(
      collection(db, 'courseEnrollments'),
      enrollmentData
    );

    console.log(`[CREATE ENROLLMENT] ✅ Enrollment created successfully: ${enrollmentRef.id}`);

    return NextResponse.json({
      success: true,
      message: 'Enrollment created successfully',
      enrollmentId: enrollmentRef.id,
    });

  } catch (error: any) {
    console.error('[CREATE ENROLLMENT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create enrollment', details: error.message },
      { status: 500 }
    );
  }
}

// Disable body size limit
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

