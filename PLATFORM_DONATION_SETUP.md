# Platform Donation Setup Guide

This guide explains how to connect your Gouache company Stripe account to receive platform donations from artists.

## How Platform Donations Work

When artists opt-in to donate a percentage of their sales:
1. The donation amount is calculated as a percentage of each sale
2. The donation is sent to **your platform Stripe account** automatically via `application_fee_amount`
3. Artists receive: Sale Amount - Donation Amount
4. You receive: Donation Amount (automatically deposited to your Stripe account)

## Step 1: Set Up Your Stripe Account

### Create/Login to Stripe Account

1. Go to https://stripe.com
2. Sign up for a new account OR log in to your existing account
3. Complete your business information:
   - Business name: "Gouache" (or your company name)
   - Business type: Company/Corporation
   - Tax ID (EIN) if applicable
   - Business address
   - Bank account for receiving payouts

### Verify Your Account

1. Complete identity verification
2. Add your bank account details
3. Verify your email address
4. Complete any required business verification

## Step 2: Get Your API Keys

1. Go to **Developers** → **API keys** in your Stripe Dashboard
2. You'll see two sets of keys:
   - **Test mode keys** (for development/testing)
   - **Live mode keys** (for production) - Toggle to "Live mode" to see these

3. Copy your keys:
   - **Publishable key** (starts with `pk_test_` for test, `pk_live_` for production)
   - **Secret key** (starts with `sk_test_` for test, `sk_live_` for production)
   - ⚠️ **NEVER share your secret key publicly or commit it to git**

## Step 3: Enable Stripe Connect

Platform donations use Stripe Connect, which allows you to receive fees from connected accounts.

1. Go to **Settings** → **Connect** in your Stripe Dashboard
2. Click **Get started** with Express accounts
3. Complete the Connect onboarding
4. Configure your platform:
   - **Platform name**: "Gouache"
   - **Branding**: Upload your logo and set brand colors
   - **Business profile**: Complete all required information

## Step 4: Set Environment Variables

Add your Stripe keys to your environment variables:

### For Local Development (.env.local):

```bash
# Stripe Keys (use test keys for development)
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Your Stripe publishable key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### For Production (Vercel):

1. Go to your Vercel project settings
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - `STRIPE_SECRET_KEY` = `sk_live_...` (⚠️ Use LIVE key for production!)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_...` (⚠️ Use LIVE key!)
   - `NEXT_PUBLIC_APP_URL` = `https://gouache.art` (your production URL)

4. Select environments: **Production**, **Preview**, **Development**
5. Click **Save**

## Step 5: Verify Donations Are Being Received

### In Stripe Dashboard:

1. Go to **Payments** → **All payments**
2. Look for payments with "Application fee" column
3. The application fee amount is your platform donation

### View Your Balance:

1. Go to **Balance** in your Stripe Dashboard
2. You'll see:
   - **Available balance**: Donations ready to transfer
   - **Pending balance**: Donations processing
   - **Total balance**: All donations received

### View Connect Fees:

1. Go to **Connect** → **Overview**
2. You'll see:
   - Total application fees received
   - Fees by connected account
   - Transaction history

## Step 6: Transfer Funds to Your Bank

1. Go to **Balance** → **Payouts** in your Stripe Dashboard
2. Click **Pay out funds**
3. Enter the amount you want to transfer
4. Select your bank account
5. Click **Pay out**

**Note**: Stripe typically processes payouts on a rolling schedule (daily, weekly, or monthly depending on your account).

## How to Track Donations

### Option 1: Stripe Dashboard

1. Go to **Connect** → **Application fees**
2. Filter by date range
3. View all donations received

### Option 2: Firestore Database

All sales are recorded in the `sales` collection with:
- `platformCommission`: The donation amount (in cents)
- `platformDonationPercentage`: The percentage donated
- `productAmount`: The original sale amount

### Option 3: Create Admin Dashboard View

You can create a view in your admin panel to track:
- Total donations received
- Donations by artist
- Donations by date range
- Average donation percentage

## Important Notes

1. **Application fees are automatic**: When you use `application_fee_amount` in Stripe Connect, the fee automatically goes to your platform account (the account associated with your `STRIPE_SECRET_KEY`)

2. **No additional setup needed**: The donations are already configured in the code - you just need to set your Stripe keys

3. **Test vs Live**: 
   - Use **test keys** (`sk_test_`, `pk_test_`) for development
   - Use **live keys** (`sk_live_`, `pk_live_`) for production
   - ⚠️ Never mix test and live keys!

4. **Stripe fees**: Stripe charges a small fee on application fees (typically 0.25% of the application fee amount)

5. **Tax considerations**: Platform donations are income and may be subject to taxes. Consult with a tax professional.

## Troubleshooting

### Donations not appearing?

1. Check that `STRIPE_SECRET_KEY` is set correctly
2. Verify you're using the correct account (test vs live)
3. Check Stripe Dashboard → **Connect** → **Application fees**
4. Verify the artist has opted in to donate (check their profile)

### Can't see Connect features?

1. Make sure Stripe Connect is enabled in your account
2. Complete the Connect onboarding
3. Verify your account is fully activated

### Need help?

- Stripe Support: https://support.stripe.com
- Stripe Connect Docs: https://stripe.com/docs/connect
- Stripe Dashboard: https://dashboard.stripe.com

