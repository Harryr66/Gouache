# Stripe Webhook Testing Guide

Quick steps to test your webhook and verify everything is working correctly.

## Prerequisites

✅ Webhook endpoint created in Stripe Dashboard  
✅ Webhook secret added to Vercel environment variables  
✅ Vercel deployment completed  
✅ Your app is accessible at your Vercel URL

---

## Test 1: Send Test Webhook from Stripe Dashboard

**Time: 2 minutes**

1. **Go to Stripe Dashboard**
   - Navigate to: **Developers** → **Webhooks**
   - Click on your webhook endpoint

2. **Send Test Event**
   - Click **"Send test webhook"** button (top right)
   - Select event: `payment_intent.succeeded`
   - Click **"Send test webhook"**

3. **Check Results**
   - Look at **"Recent deliveries"** section
   - ✅ **Green checkmark** = Success
   - ❌ **Red X** = Failed (click to see error details)

4. **Verify Response**
   - Click on the delivery to see details
   - **Status code**: Should be `200`
   - **Response**: Should show `{"received": true}`

**Expected Result:** ✅ Green checkmark with 200 status

---

## Test 2: Check Vercel Logs

**Time: 1 minute**

1. **Open Vercel Dashboard**
   - Go to your project → **Deployments**
   - Click on the latest deployment

2. **View Function Logs**
   - Click **"Functions"** tab
   - Look for `/api/stripe/webhook` function
   - Check for log entries showing:
     - `✅ Payment succeeded: pi_...` (for successful events)
     - Any error messages

3. **Check Real-time Logs** (Optional)
   - In Vercel Dashboard → **Logs** tab
   - Filter by function: `webhook`
   - Watch for new entries when testing

**Expected Result:** ✅ Logs show successful webhook processing

---

## Test 3: Test with Real Payment (Small Amount)

**Time: 5 minutes**

### Step 1: Make a Test Purchase

1. **Go to your app** (your Vercel URL)
2. **Navigate to a shop item** (if you have test products)
3. **Make a small purchase** ($1-5)
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any ZIP code

### Step 2: Verify Webhook Received Event

1. **Go to Stripe Dashboard** → **Webhooks** → Your endpoint
2. **Check "Recent deliveries"**
   - Should see new entry for `payment_intent.succeeded`
   - ✅ Should show green checkmark
   - Click to see full event details

### Step 3: Verify Database Updates

1. **Check Firestore Database**
   - Go to Firebase Console → Firestore Database
   - Navigate to `sales` collection
   - Should see a new document with:
     - `paymentIntentId`: The payment intent ID
     - `itemId`: The purchased item ID
     - `itemType`: Type of item (course, original, print, book)
     - `amount`: Payment amount
     - `platformCommission`: 10% of amount
     - `artistPayout`: 90% of amount
     - `status`: "completed"

2. **Check Item Status** (if applicable)
   - For courses: Check `courseEnrollments` collection
   - For artworks: Check `artworks` collection (should show `sold: true`)
   - For books: Check `books` collection (should show `sold: true`)

**Expected Result:** ✅ Database updated correctly with sale record

---

## Test 4: Test All Event Types

**Time: 10 minutes**

Test each event type to ensure they're handled correctly:

### 4.1 Payment Success
- ✅ Already tested above
- Verify: Sale recorded in database

### 4.2 Payment Failure
1. **Stripe Dashboard** → **Webhooks** → Your endpoint
2. **Send test webhook**: `payment_intent.payment_failed`
3. **Check**: Should log failure (no error thrown)

### 4.3 Transfer Created
1. **Send test webhook**: `transfer.created`
2. **Check Firestore**: `transfers` collection should have new document

### 4.4 Payout Paid
1. **Send test webhook**: `payout.paid`
2. **Check logs**: Should see success message

### 4.5 Payout Failed
1. **Send test webhook**: `payout.failed`
2. **Check logs**: Should log failure

### 4.6 Dispute Created
1. **Send test webhook**: `charge.dispute.created`
2. **Check Firestore**: `disputes` collection should have new document

**Expected Result:** ✅ All events processed without errors

---

## Test 5: Verify Commission Calculation

**Time: 2 minutes**

1. **Check a completed sale** in Firestore `sales` collection
2. **Verify calculations**:
   - `amount`: Total payment amount (e.g., $100.00 = 10000 cents)
   - `platformCommission`: Should be 10% (e.g., $10.00 = 1000 cents)
   - `artistPayout`: Should be 90% (e.g., $90.00 = 9000 cents)
   - Formula: `artistPayout = amount - platformCommission`

**Expected Result:** ✅ Commission calculated correctly (10%)

---

## Test 6: Test Webhook Signature Verification

**Time: 2 minutes**

This ensures your webhook is secure and only accepts events from Stripe.

1. **Stripe Dashboard** → **Webhooks** → Your endpoint
2. **Click on a successful delivery**
3. **Check "Request"** section
4. **Verify**: 
   - `stripe-signature` header is present
   - Response shows `{"received": true}`

**To test security** (optional):
- Try sending a request to your webhook without the signature
- Should return 400 error

**Expected Result:** ✅ Webhook verifies signatures correctly

---

## Troubleshooting

### ❌ Webhook Returns 400 Error

**Problem:** Signature verification failed

**Solutions:**
- ✅ Verify `STRIPE_WEBHOOK_SECRET` is set correctly in Vercel
- ✅ Make sure you copied the entire secret (starts with `whsec_`)
- ✅ Ensure the secret matches the endpoint (test vs live mode)
- ✅ Redeploy Vercel after adding environment variable

### ❌ Webhook Returns 500 Error

**Problem:** Server error processing webhook

**Solutions:**
- ✅ Check Vercel logs for error details
- ✅ Verify Firebase connection is working
- ✅ Ensure all required environment variables are set
- ✅ Check that database collections exist (`sales`, `transfers`, etc.)

### ❌ Webhook Not Receiving Events

**Problem:** Events not reaching your endpoint

**Solutions:**
- ✅ Verify endpoint URL is correct and accessible
- ✅ Check that events are selected in webhook settings
- ✅ Ensure you're testing in the correct mode (test vs live)
- ✅ Check Vercel deployment is active and not paused

### ❌ Database Not Updating

**Problem:** Webhook succeeds but database doesn't update

**Solutions:**
- ✅ Check Firestore security rules allow writes
- ✅ Verify Firebase credentials are correct
- ✅ Check Vercel logs for database errors
- ✅ Ensure collections exist in Firestore

---

## Quick Test Checklist

Use this checklist to verify everything is working:

- [ ] Test webhook sent successfully from Stripe Dashboard
- [ ] Webhook returns 200 status code
- [ ] Vercel logs show successful processing
- [ ] Real payment test completed
- [ ] Sale recorded in Firestore `sales` collection
- [ ] Commission calculated correctly (10%)
- [ ] Item status updated (if applicable)
- [ ] All event types tested
- [ ] No errors in logs

---

## Production Readiness

Before going live, ensure:

- [ ] ✅ Test mode webhook working perfectly
- [ ] ✅ Live mode webhook created and tested
- [ ] ✅ All environment variables set in production
- [ ] ✅ Real payment tested (small amount)
- [ ] ✅ Commission calculations verified
- [ ] ✅ Database updates confirmed
- [ ] ✅ Error handling tested
- [ ] ✅ Monitoring/alerts set up

---

## Next Steps After Testing

1. **Set up monitoring:**
   - Enable email alerts in Stripe Dashboard for failed webhooks
   - Set up Vercel alerts for function errors

2. **Test edge cases:**
   - Payment timeouts
   - Network interruptions
   - Duplicate events

3. **Go live:**
   - Switch to live mode in Stripe
   - Create live webhook endpoint
   - Test with real payment
   - Monitor closely for first 24-48 hours

---

**Need help?** Check the Stripe webhook logs or Vercel function logs for detailed error messages.

