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
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Verify account exists
    const account = await stripe.accounts.retrieve(accountId);
    
    if (!account) {
      return NextResponse.json(
        { error: 'Stripe account not found' },
        { status: 404 }
      );
    }

    // Create a new account link for onboarding
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
    const refreshUrl = isLocalhost ? baseUrl : baseUrl.replace(/^http:/, 'https:');
    const returnUrl = isLocalhost ? baseUrl : baseUrl.replace(/^http:/, 'https:');
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${refreshUrl}/settings?tab=business&refresh=true`,
      return_url: `${returnUrl}/settings?tab=business&success=true`,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      onboardingUrl: accountLink.url,
    });
  } catch (error: any) {
    console.error('Error refreshing Stripe onboarding URL:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to refresh onboarding URL',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
