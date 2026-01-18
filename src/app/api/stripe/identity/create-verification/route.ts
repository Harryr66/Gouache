import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10' as any,
});

export async function POST(req: NextRequest) {
  try {
    const { email, userId, expectedName } = await req.json();
    
    if (!email || !userId || !expectedName) {
      return NextResponse.json(
        { error: 'Missing required parameters: email, userId, and expectedName are required.' },
        { status: 400 }
      );
    }

    // Create a verification session with Stripe Identity
    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      provided_details: {
        email: email,
      },
      options: {
        document: {
          require_matching_selfie: true,
          allowed_types: ['passport', 'driving_license', 'id_card'],
        },
      },
      metadata: {
        user_id: userId,
        expected_name: expectedName, // Store the expected name to verify later
        purpose: 'artist_account_verification',
      },
    });

    return NextResponse.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Failed to create identity verification session:', error);
    return NextResponse.json(
      {
        error: 'Failed to create verification session.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Check verification status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required.' },
        { status: 400 }
      );
    }

    const session = await stripe.identity.verificationSessions.retrieve(sessionId);
    
    // Check if the verification is complete and name matches
    let nameMatch = false;
    let verifiedName = null;
    
    if (session.status === 'verified' && session.verified_outputs) {
      const firstName = session.verified_outputs.first_name || '';
      const lastName = session.verified_outputs.last_name || '';
      verifiedName = `${firstName} ${lastName}`.trim();
      
      // Compare with expected name (case-insensitive)
      const expectedName = session.metadata?.expected_name || '';
      nameMatch = verifiedName.toLowerCase() === expectedName.toLowerCase();
    }

    return NextResponse.json({
      status: session.status,
      verified: session.status === 'verified',
      nameMatch,
      verifiedName,
      expectedName: session.metadata?.expected_name,
      lastError: session.last_error,
    });
  } catch (error) {
    console.error('Failed to retrieve verification session:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve verification session.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
