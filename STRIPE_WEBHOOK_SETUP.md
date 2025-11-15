# Stripe Webhook Setup Guide

This guide will help you set up a Stripe webhook endpoint to receive real-time payment events and obtain your webhook signing secret.

## Step 1: Deploy Your Application

First, make sure your application is deployed to Vercel (or your hosting platform) so you have a public URL.

**Your webhook endpoint URL will be:**
```
https://yourdomain.com/api/stripe/webhook
```

Replace `yourdomain.com` with your actual domain (your Vercel deployment URL or custom domain).

## Step 2: Access Stripe Dashboard

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Log in to your Stripe account
3. Make sure you're in the correct mode:
   - **Test mode** for development/testing (toggle in top right)
   - **Live mode** for production

## Step 3: Create Webhook Endpoint

1. In the Stripe Dashboard, navigate to:
   - **Developers** → **Webhooks** (in the left sidebar)

2. Click the **"+ Add endpoint"** button (top right)

3. Fill in the webhook details:
   - **Endpoint URL**: `https://yourdomain.com/api/stripe/webhook`
     - Replace `yourdomain.com` with your actual domain
     - Example: `https://your-app-name.vercel.app/api/stripe/webhook`
   
   - **Description** (optional): "SOMA Platform Payment Webhooks"

4. Click **"Add endpoint"**

## Step 4: Select Events to Listen For

After creating the endpoint, you'll see a list of events. Select these events:

### Required Events:
- ✅ `payment_intent.succeeded` - When a payment completes successfully
- ✅ `payment_intent.payment_failed` - When a payment fails
- ✅ `transfer.created` - When a transfer to an artist is created
- ✅ `transfer.updated` - When a transfer status changes
- ✅ `payout.paid` - When an artist payout is completed
- ✅ `payout.failed` - When an artist payout fails
- ✅ `charge.dispute.created` - When a customer disputes a charge

### How to Select:
1. Click **"Select events"** or **"Add events"**
2. Search for each event name
3. Check the box next to each event
4. Click **"Add events"** when done

## Step 5: Get Your Webhook Signing Secret

1. After creating the endpoint, you'll see the endpoint details page
2. Look for **"Signing secret"** section
3. Click **"Reveal"** or **"Click to reveal"** to show the secret
4. Copy the secret (it starts with `whsec_...`)
   - Example: `whsec_1234567890abcdef...`

⚠️ **Important**: This secret is only shown once! Copy it immediately.

## Step 6: Add Webhook Secret to Environment Variables

### For Vercel:

1. Go to your Vercel project dashboard
2. Navigate to: **Settings** → **Environment Variables**
3. Click **"Add New"**
4. Add the following:

   **Variable Name:** `STRIPE_WEBHOOK_SECRET`
   
   **Value:** `whsec_...` (paste the secret you copied)
   
   **Environment:** Select all (Production, Preview, Development)

5. Click **"Save"**

6. **Redeploy** your application for the changes to take effect:
   - Go to **Deployments** tab
   - Click the **"..."** menu on the latest deployment
   - Select **"Redeploy"**

### For Local Development:

1. Create or edit `.env.local` file in your project root
2. Add:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
3. Restart your development server

## Step 7: Test Your Webhook

### Option A: Use Stripe Dashboard Test Feature

1. In Stripe Dashboard → **Webhooks** → Click on your endpoint
2. Click **"Send test webhook"** button
3. Select event type: `payment_intent.succeeded`
4. Click **"Send test webhook"**
5. Check the **"Recent deliveries"** section to see if it was successful

### Option B: Use Stripe CLI (Advanced)

If you have Stripe CLI installed:

```bash
# Install Stripe CLI (if not installed)
# macOS: brew install stripe/stripe-cli/stripe
# Windows: Download from https://github.com/stripe/stripe-cli/releases

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger a test event
stripe trigger payment_intent.succeeded
```

## Step 8: Verify Webhook is Working

1. **Check Recent Deliveries:**
   - In Stripe Dashboard → **Webhooks** → Your endpoint
   - Look at **"Recent deliveries"** section
   - Green checkmark = Success ✅
   - Red X = Failed ❌

2. **Check Your Server Logs:**
   - In Vercel: Go to **Deployments** → Click on deployment → **Functions** tab
   - Look for webhook processing logs
   - Should see: `✅ Payment succeeded: pi_...`

3. **Test with a Real Payment:**
   - Make a small test purchase ($1-5)
   - Check that webhook receives the event
   - Verify database is updated (check Firestore)

## Troubleshooting

### Webhook Returns 400 Error

**Problem:** Signature verification failed

**Solutions:**
- ✅ Make sure `STRIPE_WEBHOOK_SECRET` is set correctly
- ✅ Verify you copied the entire secret (starts with `whsec_`)
- ✅ Ensure the secret matches the endpoint (test vs live mode)
- ✅ Redeploy after adding the environment variable

### Webhook Returns 500 Error

**Problem:** Server error processing webhook

**Solutions:**
- ✅ Check server logs for error details
- ✅ Verify Firebase connection is working
- ✅ Ensure all required environment variables are set
- ✅ Check that database collections exist (`sales`, `transfers`, etc.)

### Webhook Not Receiving Events

**Problem:** Events not reaching your endpoint

**Solutions:**
- ✅ Verify endpoint URL is correct and accessible
- ✅ Check that events are selected in webhook settings
- ✅ Ensure you're testing in the correct mode (test vs live)
- ✅ Check Vercel deployment is active and not paused

### Test Mode vs Live Mode

**Important:** You need separate webhooks for test and live modes!

- **Test Mode Webhook:** Use for development/testing
  - Secret: `whsec_test_...`
  - Use with `STRIPE_SECRET_KEY=sk_test_...`

- **Live Mode Webhook:** Use for production
  - Secret: `whsec_live_...`
  - Use with `STRIPE_SECRET_KEY=sk_live_...`

Make sure to:
1. Create webhooks in both modes
2. Use the correct secret for each environment
3. Test thoroughly in test mode before going live

## Security Best Practices

1. ✅ **Never commit webhook secrets to Git**
   - Always use environment variables
   - Add `.env.local` to `.gitignore`

2. ✅ **Use HTTPS only**
   - Stripe requires HTTPS for webhooks
   - Vercel provides HTTPS automatically

3. ✅ **Verify webhook signatures**
   - Already implemented in your code
   - Never skip signature verification

4. ✅ **Monitor webhook deliveries**
   - Set up alerts for failed deliveries
   - Review logs regularly

## Next Steps

After setting up the webhook:

1. ✅ Test with a small real payment
2. ✅ Verify commission is calculated correctly (10%)
3. ✅ Check that artist receives payout
4. ✅ Monitor webhook deliveries for 24-48 hours
5. ✅ Set up email alerts in Stripe Dashboard

## Quick Reference

**Webhook Endpoint URL:**
```
https://yourdomain.com/api/stripe/webhook
```

**Required Environment Variable:**
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Required Events:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `transfer.created`
- `transfer.updated`
- `payout.paid`
- `payout.failed`
- `charge.dispute.created`

---

Need help? Check the Stripe documentation: https://stripe.com/docs/webhooks

