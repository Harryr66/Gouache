import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resendAudienceId = process.env.RESEND_AUDIENCE_ID; // Optional: Resend audience ID for newsletter
const newsletterFromEmail = process.env.NEWSLETTER_FROM_EMAIL || process.env.ARTIST_INVITE_FROM_EMAIL || 'Gouache <newsletter@gouache.art>';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body as { email?: string };

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if email is already subscribed
    const existingQuery = query(
      collection(db, 'newsletterSubscribers'),
      where('email', '==', trimmedEmail)
    );
    const existingDocs = await getDocs(existingQuery);

    if (!existingDocs.empty) {
      // Email already exists - check if unsubscribed
      const existingDoc = existingDocs.docs[0];
      const existingData = existingDoc.data();
      
      if (existingData.unsubscribed) {
        // Re-subscribe
        await addDoc(collection(db, 'newsletterSubscribers'), {
          email: trimmedEmail,
          subscribedAt: serverTimestamp(),
          unsubscribed: false,
          resubscribed: true,
          previousUnsubscribeAt: existingData.unsubscribedAt
        });
      } else {
        // Already subscribed
        return NextResponse.json(
          { error: 'This email is already subscribed to the newsletter.' },
          { status: 409 }
        );
      }
    } else {
      // New subscription
      await addDoc(collection(db, 'newsletterSubscribers'), {
        email: trimmedEmail,
        subscribedAt: serverTimestamp(),
        unsubscribed: false,
        source: 'news-page'
      });
    }

    // Optionally add to Resend audience if API key and audience ID are configured
    if (resendApiKey && resendAudienceId) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.contacts.create({
          audience_id: resendAudienceId,
          email: trimmedEmail,
          unsubscribed: false
        });
        console.log(`✅ Added ${trimmedEmail} to Resend audience`);
      } catch (resendError: any) {
        // Log but don't fail - subscription is saved to Firestore
        console.warn('Failed to add to Resend audience (subscription still saved):', resendError?.message);
      }
    } else if (resendApiKey && !resendAudienceId) {
      console.log('Resend API key configured but no audience ID - skipping Resend integration');
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully subscribed to newsletter.' 
    });
  } catch (error) {
    console.error('Failed to subscribe to newsletter:', error);
    return NextResponse.json(
      {
        error: 'Failed to subscribe to newsletter.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

