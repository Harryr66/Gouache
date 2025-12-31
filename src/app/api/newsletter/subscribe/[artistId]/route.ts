import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { artistId: string } }
) {
  try {
    const artistId = params.artistId;
    const body = await request.json();
    const { email, name } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Get artist's newsletter integration
    const artistDoc = await getDoc(doc(db, 'userProfiles', artistId));
    if (!artistDoc.exists()) {
      return NextResponse.json(
        { error: 'Artist not found' },
        { status: 404 }
      );
    }

    const artistData = artistDoc.data();
    const provider = artistData.newsletterProvider;
    const formId = artistData.newsletterFormId;
    const apiKey = artistData.newsletterApiKey; // This should be decrypted in production
    const newsletterLink = artistData.newsletterLink;

    if (!provider && !newsletterLink) {
      return NextResponse.json(
        { error: 'Artist has no newsletter integration' },
        { status: 400 }
      );
    }

    // Handle custom provider (redirect URL)
    if (provider === 'custom' || (!provider && newsletterLink)) {
      return NextResponse.json({
        success: true,
        redirectUrl: newsletterLink,
        message: 'Redirect to newsletter signup page',
      });
    }

    // Handle API-based providers
    if (!apiKey || !formId) {
      return NextResponse.json(
        { error: 'Newsletter integration not properly configured' },
        { status: 400 }
      );
    }

    let subscriptionResult;

    try {
      if (provider === 'convertkit') {
        const convertKitUrl = `https://api.convertkit.com/v3/forms/${formId}/subscribe`;
        const convertKitBody: any = {
          email: trimmedEmail,
          api_secret: apiKey, // Use API secret for server-side
        };

        if (name) {
          convertKitBody.first_name = name;
        }

        const convertKitResponse = await fetch(convertKitUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(convertKitBody),
        });

        if (!convertKitResponse.ok) {
          const errorData = await convertKitResponse.json().catch(() => ({}));
          // If email already exists, that's okay
          if (convertKitResponse.status === 400 && errorData.message?.includes('already')) {
            subscriptionResult = { success: true, alreadySubscribed: true };
          } else {
            throw new Error(errorData.message || 'ConvertKit subscription failed');
          }
        } else {
          const convertKitData = await convertKitResponse.json();
          subscriptionResult = {
            success: true,
            subscriberId: convertKitData.subscription?.subscriber?.id,
          };
        }
      } else if (provider === 'mailchimp') {
        // Extract datacenter from API key
        const datacenter = apiKey.split('-')[1];
        if (!datacenter) {
          throw new Error('Invalid Mailchimp API key format');
        }

        const mailchimpUrl = `https://${datacenter}.api.mailchimp.com/3.0/lists/${formId}/members`;
        const mailchimpBody: any = {
          email_address: trimmedEmail,
          status: 'subscribed',
        };

        if (name) {
          const nameParts = name.split(' ');
          mailchimpBody.merge_fields = {
            FNAME: nameParts[0] || '',
            LNAME: nameParts.slice(1).join(' ') || '',
          };
        }

        const mailchimpResponse = await fetch(mailchimpUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mailchimpBody),
        });

        if (!mailchimpResponse.ok) {
          const errorData = await mailchimpResponse.json().catch(() => ({}));
          // If email already exists, that's okay
          if (mailchimpResponse.status === 400 && errorData.title?.includes('already')) {
            subscriptionResult = { success: true, alreadySubscribed: true };
          } else {
            throw new Error(errorData.title || 'Mailchimp subscription failed');
          }
        } else {
          const mailchimpData = await mailchimpResponse.json();
          subscriptionResult = {
            success: true,
            subscriberId: mailchimpData.id,
          };
        }
      } else if (provider === 'substack') {
        // Substack requires OAuth for API access
        // For now, return a redirect URL
        return NextResponse.json({
          success: true,
          redirectUrl: `https://${formId}.substack.com/subscribe`,
          message: 'Redirect to Substack subscription',
        });
      } else {
        return NextResponse.json(
          { error: 'Unsupported newsletter provider' },
          { status: 400 }
        );
      }
    } catch (error: any) {
      console.error('Error subscribing to newsletter:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to subscribe to newsletter' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: subscriptionResult.alreadySubscribed
        ? 'You are already subscribed to this newsletter'
        : 'Successfully subscribed to newsletter',
      alreadySubscribed: subscriptionResult.alreadySubscribed || false,
    });
  } catch (error: any) {
    console.error('Error in newsletter subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process subscription' },
      { status: 500 }
    );
  }
}


