import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const { email, companyName, contactName, partnerId } = await request.json();

    if (!email || !partnerId) {
      return NextResponse.json(
        { error: 'Email and partner ID are required' },
        { status: 400 }
      );
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email,
      name: companyName || contactName,
      metadata: {
        partnerId,
        companyName: companyName || '',
        contactName: contactName || '',
        type: 'advertising_partner',
      },
    });

    return NextResponse.json({
      customerId: customer.id,
      email: customer.email,
    });
  } catch (error: any) {
    console.error('Error creating Stripe customer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create customer' },
      { status: 500 }
    );
  }
}
