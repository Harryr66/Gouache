# Stripe Connect Setup Guide

This guide will walk you through setting up Stripe Connect for your platform to enable artists to sell originals, prints, books, and courses with automatic commission handling.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Stripe Account Setup](#stripe-account-setup)
3. [Environment Variables](#environment-variables)
4. [Commission Structure](#commission-structure)
5. [Payment Flow](#payment-flow)
6. [Testing](#testing)
7. [Production Deployment](#production-deployment)

---

## Prerequisites

- Stripe account (sign up at https://stripe.com)
- Node.js application with Next.js
- Firebase Firestore for user data storage
- Understanding of Stripe Connect Express accounts

---

## Stripe Account Setup

### Step 1: Create a Stripe Account

1. Go to https://stripe.com and sign up for an account
2. Complete your business information
3. Verify your email address
4. Add your bank account for receiving platform payouts

### Step 2: Get Your API Keys

1. Navigate to **Developers** → **API keys** in your Stripe Dashboard
2. Copy your **Publishable key** (starts with `pk_`)
3. Copy your **Secret key** (starts with `sk_`)
   - ⚠️ **Never expose your secret key in client-side code**

### Step 3: Enable Stripe Connect

1. Go to **Settings** → **Connect** in your Stripe Dashboard
2. Click **Get started** with Express accounts
3. Complete the Connect onboarding
4. Set your platform branding (optional but recommended)

### Step 4: Configure Connect Settings

1. In **Settings** → **Connect** → **Settings**:
   - Set your **Platform name** (e.g., "Gouache")
   - Configure **Branding** (logo, colors)
   - Set **Business profile** information
   - Configure **Capabilities** (Card payments, Transfers)

2. Set up **Webhooks** (we'll configure this later):
   - Go to **Developers** → **Webhooks**
   - We'll add the endpoint URL after deployment

---

## Environment Variables

Add these environment variables to your `.env.local` file (for development) and your hosting platform (Vercel, etc.):

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Your Stripe publishable key

# App URL (for redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Development
# NEXT_PUBLIC_APP_URL=https://yourdomain.com  # Production

# Commission Rate (as decimal, e.g., 0.075 = 7.5%)
STRIPE_PLATFORM_COMMISSION_RATE=0.075  # 7.5% platform commission
STRIPE_APPLICATION_FEE_RATE=0.029  # 2.9% + $0.30 per transaction (Stripe's fee)
```

### For Vercel Deployment:

1. Go to your project settings in Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - `STRIPE_SECRET_KEY` (Production, Preview, Development)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Production, Preview, Development)
   - `NEXT_PUBLIC_APP_URL` (Production, Preview, Development)
   - `STRIPE_PLATFORM_COMMISSION_RATE` (Production, Preview, Development)
   - `STRIPE_APPLICATION_FEE_RATE` (Production, Preview, Development)

---

## Commission Structure

### Recommended Commission Model

**Platform Commission**: 7.5% of sale price
**Stripe Processing Fee**: 2.9% + $0.30 per transaction (paid by platform)
**Artist Receives**: ~89.6% of sale price (after platform commission)

### Example Calculation

For a $100 course sale:
- **Sale Price**: $100.00
- **Platform Commission (7.5%)**: $7.50
- **Stripe Fee (2.9% + $0.30)**: $3.20
- **Platform Net Revenue**: $7.50 - $3.20 = $4.30
- **Artist Payout**: $100.00 - $7.50 = $92.50

### Implementation

The commission is handled automatically using Stripe's **application fees**:

```typescript
// When creating a payment intent
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(price * 100), // Convert to cents
  currency: 'usd',
  application_fee_amount: Math.round(price * 100 * commissionRate), // Platform commission
  transfer_data: {
    destination: artistStripeAccountId, // Artist's Stripe Connect account
  },
  metadata: {
    userId: buyerId,
    artistId: artistId,
    itemType: 'course', // or 'original', 'print', 'book'
    itemId: itemId,
  },
});
```

---

## Payment Flow

### 1. Artist Onboarding (Already Implemented)

Artists connect their Stripe account via the profile edit page:
- Navigate to `/profile/edit#stripe-integration`
- Click "Connect Stripe Account"
- Complete Stripe onboarding
- Account status is stored in Firestore

### 2. Creating a Payment Intent

When a customer purchases an item, create a payment intent:

**API Route**: `/api/stripe/create-payment-intent`

```typescript
// src/app/api/stripe/create-payment-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

export async function POST(request: NextRequest) {
  try {
    const { 
      amount, 
      currency, 
      artistStripeAccountId, 
      itemId, 
      itemType,
      buyerId 
    } = await request.json();

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const commissionRate = parseFloat(
      process.env.STRIPE_PLATFORM_COMMISSION_RATE || '0.075'
    );
    const applicationFeeAmount = Math.round(amount * commissionRate);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Already in cents
      currency: currency || 'usd',
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: artistStripeAccountId,
      },
      metadata: {
        userId: buyerId,
        artistId: artistStripeAccountId,
        itemType: itemType, // 'original', 'print', 'book', 'course'
        itemId: itemId,
      },
    }, {
      stripeAccount: artistStripeAccountId, // Create on connected account
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
```

### 3. Processing the Payment (Client-Side)

Use Stripe Elements or Checkout to collect payment:

```typescript
// Install: npm install @stripe/stripe-js @stripe/react-stripe-js
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// In your checkout component
const { stripe } = useStripe();
const { elements } = useElements();

const handlePayment = async () => {
  // Create payment intent first
  const response = await fetch('/api/stripe/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: price * 100, // Convert to cents
      currency: 'usd',
      artistStripeAccountId: artist.stripeAccountId,
      itemId: item.id,
      itemType: 'course',
      buyerId: currentUser.id,
    }),
  });

  const { clientSecret } = await response.json();

  // Confirm payment
  const { error, paymentIntent } = await stripe!.confirmPayment({
    elements,
    clientSecret,
    confirmParams: {
      return_url: `${window.location.origin}/purchase-success`,
    },
  });

  if (error) {
    // Handle error
  } else if (paymentIntent?.status === 'succeeded') {
    // Payment successful
    // Update item status, send confirmation email, etc.
  }
};
```

### 4. Handling Webhooks

Set up webhooks to handle payment events:

**API Route**: `/api/stripe/webhook`

```typescript
// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentSuccess(paymentIntent);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      await handlePaymentFailure(failedPayment);
      break;

    case 'transfer.created':
      // Track when money is transferred to artist
      const transfer = event.data.object as Stripe.Transfer;
      await handleTransferCreated(transfer);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { itemId, itemType, userId, artistId } = paymentIntent.metadata;

  // Record the sale in Firestore
  await addDoc(collection(db, 'sales'), {
    paymentIntentId: paymentIntent.id,
    itemId,
    itemType,
    buyerId: userId,
    artistId,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    applicationFeeAmount: paymentIntent.application_fee_amount,
    status: 'completed',
    createdAt: new Date(),
  });

  // Update item status (mark as sold, reduce stock, etc.)
  if (itemType === 'course') {
    await updateDoc(doc(db, 'courses', itemId), {
      enrollments: admin.firestore.FieldValue.increment(1),
    });
  } else if (itemType === 'original' || itemType === 'print') {
    await updateDoc(doc(db, 'artworks', itemId), {
      sold: true,
      soldAt: new Date(),
      buyerId: userId,
    });
  }

  // Send confirmation emails (implement email service)
  // await sendPurchaseConfirmationEmail(userId, itemId, itemType);
  // await sendSaleNotificationEmail(artistId, itemId, itemType, paymentIntent.amount);
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  // Log failed payment
  await addDoc(collection(db, 'failedPayments'), {
    paymentIntentId: paymentIntent.id,
    error: paymentIntent.last_payment_error,
    createdAt: new Date(),
  });
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  // Track transfers to artists
  await addDoc(collection(db, 'transfers'), {
    transferId: transfer.id,
    destination: transfer.destination,
    amount: transfer.amount,
    currency: transfer.currency,
    createdAt: new Date(),
  });
}
```

### 5. Webhook Configuration

1. Install Stripe CLI for local testing:
   ```bash
   brew install stripe/stripe-cli/stripe
   stripe login
   ```

2. For local development, forward webhooks:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copy the webhook signing secret and add to `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. For production:
   - Go to **Developers** → **Webhooks** in Stripe Dashboard
   - Click **Add endpoint**
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Select events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `transfer.created`
     - `transfer.paid`
   - Copy the **Signing secret** and add to production environment variables

---

## Testing

### Test Mode

1. Use test API keys (start with `sk_test_` and `pk_test_`)
2. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3D Secure: `4000 0025 0000 3155`
   - Any future expiry date, any CVC

### Test Artist Account

1. Create a test Express account via your API
2. Complete onboarding in test mode
3. Test the full payment flow
4. Verify commission is calculated correctly
5. Check that transfers are created

### Test Scenarios

- ✅ Successful payment
- ✅ Failed payment (insufficient funds)
- ✅ 3D Secure authentication
- ✅ Refund processing
- ✅ Multiple items in one purchase
- ✅ Commission calculation accuracy

---

## Production Deployment

### Pre-Launch Checklist

- [ ] Switch to live API keys (`sk_live_` and `pk_live_`)
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Configure production webhook endpoint
- [ ] Test with real bank account (small test transaction)
- [ ] Set up monitoring and alerts
- [ ] Configure email notifications
- [ ] Review commission rates
- [ ] Set up accounting/reporting system
- [ ] Legal: Terms of service, refund policy
- [ ] Tax compliance (1099-K forms for artists)

### Security Best Practices

1. **Never expose secret keys** in client-side code
2. **Validate webhook signatures** (already implemented)
3. **Use HTTPS** for all API calls
4. **Store sensitive data** in environment variables
5. **Implement rate limiting** on payment endpoints
6. **Log all payment events** for auditing
7. **Regular security audits** of payment flows

### Monitoring

Set up alerts for:
- Failed payments above threshold
- Unusual payment patterns
- Webhook delivery failures
- High refund rates
- Disputes/chargebacks

---

## Commission Payout to Platform

The platform receives commission automatically via `application_fee_amount`. This amount is transferred to your platform's Stripe account balance, which you can then transfer to your bank account.

### Viewing Platform Revenue

1. Go to **Payments** → **Overview** in Stripe Dashboard
2. Filter by **Application fees**
3. View total platform revenue

### Transferring to Bank

1. Go to **Balance** in Stripe Dashboard
2. Click **Payout** to transfer to your bank account
3. Payouts are typically available 2-7 business days after payment

---

## Additional Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Express Accounts Guide](https://stripe.com/docs/connect/express-accounts)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Security Best Practices](https://stripe.com/docs/security/guide)

---

## Support

For issues or questions:
- Check Stripe Dashboard → **Developers** → **Logs**
- Review webhook delivery logs
- Contact Stripe Support: https://support.stripe.com

---

## Next Steps

1. Implement the payment intent creation API route
2. Set up Stripe Elements/Checkout on frontend
3. Configure webhooks
4. Test thoroughly in test mode
5. Deploy to production
6. Monitor and optimize

