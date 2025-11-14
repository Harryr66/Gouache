import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

const convertKitFormId = process.env.CONVERTKIT_FORM_ID;
const convertKitApiKey = process.env.CONVERTKIT_API_KEY; // Form API key (public key) or Account API key
const convertKitApiSecret = process.env.CONVERTKIT_API_SECRET; // Optional: Account API secret for server-side subscriptions

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

    let convertKitSubscribed = false;
    let convertKitSubscriberId = null;

    // Subscribe to ConvertKit if configured
    if (convertKitFormId && convertKitApiKey) {
      try {
        const convertKitUrl = `https://api.convertkit.com/v3/forms/${convertKitFormId}/subscribe`;
        const convertKitBody: any = {
          email: trimmedEmail,
          api_key: convertKitApiKey
        };

        // Add API secret if provided (for server-side subscriptions)
        if (convertKitApiSecret) {
          convertKitBody.api_secret = convertKitApiSecret;
        }

        const convertKitResponse = await fetch(convertKitUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(convertKitBody)
        });

        if (!convertKitResponse.ok) {
          const errorData = await convertKitResponse.json().catch(() => ({}));
          // If email already exists in ConvertKit, that's okay - they're subscribed
          if (convertKitResponse.status === 400 && errorData.message?.includes('already')) {
            convertKitSubscribed = true;
            console.log(`✅ Email ${trimmedEmail} already subscribed to ConvertKit`);
          } else {
            throw new Error(errorData.error || errorData.message || `ConvertKit API error: ${convertKitResponse.statusText}`);
          }
        } else {
          const convertKitData = await convertKitResponse.json();
          convertKitSubscribed = true;
          convertKitSubscriberId = convertKitData.subscription?.subscriber?.id || null;
          console.log(`✅ Subscribed ${trimmedEmail} to ConvertKit form ${convertKitFormId}`, convertKitData);
        }
      } catch (convertKitError: any) {
        // Log but don't fail - subscription is saved to Firestore
        console.warn('Failed to subscribe to ConvertKit (subscription still saved to Firestore):', convertKitError?.message);
      }
    }

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
          previousUnsubscribeAt: existingData.unsubscribedAt,
          convertKitSubscribed,
          convertKitSubscriberId,
          convertKitFormId: convertKitFormId || null
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
        source: 'news-page',
        convertKitSubscribed,
        convertKitSubscriberId,
        convertKitFormId: convertKitFormId || null
      });
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

