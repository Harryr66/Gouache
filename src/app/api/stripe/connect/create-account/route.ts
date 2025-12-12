import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check for Stripe secret key
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Initialize Stripe with secret key from environment
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
    });
    const body = await request.json();
    const { userId, email, name } = body;

    if (!userId || !email) {
      console.error('Missing required fields:', { userId: !!userId, email: !!email });
      return NextResponse.json(
        { error: 'User ID and email are required' },
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

    // Create a Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US', // Default to US, can be made dynamic
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual', // Can be 'individual' or 'company'
      metadata: {
        userId: userId,
        platform: 'soma',
      },
    });

    // Create account link for onboarding
    // Ensure HTTPS for live mode, allow HTTP only for localhost
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
    const refreshUrl = isLocalhost ? baseUrl : baseUrl.replace(/^http:/, 'https:');
    const returnUrl = isLocalhost ? baseUrl : baseUrl.replace(/^http:/, 'https:');
    
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${refreshUrl}/settings?tab=business&refresh=true`,
      return_url: `${returnUrl}/settings?tab=business&success=true`,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      accountId: account.id,
      onboardingUrl: accountLink.url,
    });
  } catch (error: any) {
    console.error('Error creating Stripe account:', error);
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
    });
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create Stripe account',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

