import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Check if email already exists in waitlist
    const waitlistRef = collection(db, 'learnWaitlist');
    const existingQuery = query(waitlistRef, where('email', '==', email.toLowerCase()));
    const existingDocs = await getDocs(existingQuery);

    if (!existingDocs.empty) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Add to waitlist
    await addDoc(waitlistRef, {
      email: email.toLowerCase(),
      createdAt: serverTimestamp(),
      notified: false,
    });

    // TODO: Send notification email to news@gouache.art
    // This will require setting up an email service (SendGrid, AWS SES, Resend, etc.)
    console.log(`[Learn Waitlist] New signup: ${email} - Notification should be sent to news@gouache.art`);

    return NextResponse.json({ 
      success: true,
      message: 'Successfully added to waitlist'
    });
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    return NextResponse.json(
      { error: 'Failed to add to waitlist' },
      { status: 500 }
    );
  }
}
