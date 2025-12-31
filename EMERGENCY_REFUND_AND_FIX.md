# EMERGENCY: WEBHOOK NOT FIRING - REFUND & FIX GUIDE

## 🚨 IMMEDIATE ACTION REQUIRED

### Payment Intent to Refund:
- **Payment Intent ID:** `pi_3SkTL0EVdIMoZzwZ1RZ7fof2`
- **Amount:** $0.99
- **Status:** Succeeded (but no enrollment created)

---

## 1. REFUND NOW (2 minutes)

### Option A: Stripe Dashboard (RECOMMENDED)
1. Go to: https://dashboard.stripe.com/payments
2. Search: `pi_3SkTL0EVdIMoZzwZ1RZ7fof2`
3. Click the payment
4. Click "Refund payment" button (top right)
5. Select "Full refund"
6. Reason: "Technical issue - enrollment not created"
7. Click "Refund"

### Option B: Stripe CLI
```bash
stripe refunds create --payment-intent=pi_3SkTL0EVdIMoZzwZ1RZ7fof2
```

---

## 2. ROOT CAUSE: WEBHOOK NOT FIRING

### What Happened:
1. ✅ Payment succeeded (card charged)
2. ❌ Stripe webhook **never called** `/api/stripe/webhook`
3. ❌ Enrollment never created in Firestore
4. ❌ Frontend verification timed out after 30 seconds

### Why This Happens:
- **Webhook not registered** in Stripe Dashboard
- **Webhook URL incorrect** (wrong domain or path)
- **Webhook secret mismatch** in Vercel environment variables
- **Vercel function timeout** (webhook receives call but times out)

---

## 3. CHECK STRIPE WEBHOOK STATUS

### Step 1: Check if Webhook Exists
1. Go to: https://dashboard.stripe.com/webhooks
2. Look for webhook with URL: `https://www.gouache.art/api/stripe/webhook`
3. Check "Events to send":
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`

### Step 2: Check Recent Webhook Attempts
1. On the webhook page, click on your webhook
2. Scroll to "Recent events"
3. Look for `payment_intent.succeeded` with timestamp matching your test
4. Check status:
   - ❌ **"Not sent"** = Webhook not triggered
   - ❌ **"Failed"** = Webhook called but returned error
   - ✅ **"Succeeded"** = Webhook worked (but check logs)

### Step 3: Check Webhook Logs (if webhook exists)
- If webhook shows "Failed", click on the event
- See the error response
- Common errors:
  - `401 Unauthorized` = Webhook secret mismatch
  - `500 Internal Server Error` = Code error in webhook handler
  - `Timeout` = Function took too long

---

## 4. FIX: ENSURE WEBHOOK IS PROPERLY CONFIGURED

### Option A: Webhook Already Exists (Just Broken)
**Check Vercel Environment Variables:**
1. Go to: https://vercel.com/[your-team]/gouache/settings/environment-variables
2. Find: `STRIPE_WEBHOOK_SECRET`
3. Verify it matches the "Signing secret" from Stripe webhook settings
4. If not, update it and redeploy

### Option B: Webhook Doesn't Exist (Need to Create)
1. Go to: https://dashboard.stripe.com/webhooks
2. Click "+ Add endpoint"
3. **Endpoint URL:** `https://www.gouache.art/api/stripe/webhook`
4. **Events to send:**
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `checkout.session.completed`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)
7. Add to Vercel:
   - Variable: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_...` (the signing secret you just copied)
   - Environments: Production, Preview, Development
8. Redeploy on Vercel

---

## 5. ALTERNATIVE FIX: CREATE ENROLLMENT MANUALLY (TEMPORARY)

Since the payment succeeded but enrollment wasn't created, you can manually create it:

### Go to Firebase Console:
1. Navigate to Firestore Database
2. Click "Start collection"
3. Collection ID: `courseEnrollments`
4. Add document with these fields:

```javascript
{
  courseId: "bSeBnXm04MA6EO6PTezv",
  userId: "[YOUR_USER_ID]",  // Get from userProfiles or check console
  paymentIntentId: "pi_3SkTL0EVdIMoZzwZ1RZ7fof2",
  enrolledAt: [Timestamp] (use "timestamp" and set to now),
  progress: 0,
  currentWeek: 1,
  currentLesson: 1,
  completedLessons: [],
  lastAccessedAt: [Timestamp] (use "timestamp" and set to now),
  certificateEarned: false,
  isActive: true
}
```

**This is a BAND-AID. The real fix is ensuring webhooks work.**

---

## 6. BETTER SOLUTION: FALLBACK ENROLLMENT CREATION

Instead of relying 100% on webhooks, create enrollment IMMEDIATELY after payment with status "pending", then webhook confirms it:

### Benefits:
- User gets instant access
- Webhook later confirms and updates status
- No waiting 30 seconds
- No failed payments without enrollment

### Implementation:
**Modify `/api/stripe/create-payment-intent/route.ts`:**
- After creating payment intent, create "pending" enrollment
- When webhook fires, update to "confirmed"
- If webhook never fires, enrollment still exists (user has access)

**This is what major platforms do (Udemy, Teachable, etc.)**

---

## 7. TESTING CHECKLIST (After Fix)

1. ✅ Check Stripe webhook shows "Succeeded" status
2. ✅ Check Vercel function logs show webhook received
3. ✅ Check Firestore shows enrollment created with all fields
4. ✅ Check frontend navigates to course player
5. ✅ Check no duplicate charges

---

## 8. LONG-TERM FIX: IMPLEMENT BOTH APPROACHES

### Immediate Enrollment (Frontend)
- Create "provisional" enrollment after payment succeeds
- User gets instant access
- No waiting for webhook

### Webhook Confirmation (Backend)
- Webhook confirms payment
- Updates enrollment from "provisional" to "confirmed"
- Records payment details
- Triggers emails

### Reconciliation (Safety Net)
- Cron job runs every 5 minutes
- Checks for payments without enrollments
- Creates missing enrollments
- Alerts admin of any issues

**This is a production-grade, bulletproof system.**

---

## 9. IMMEDIATE NEXT STEPS

**RIGHT NOW:**
1. ✅ Refund the payment (see section 1)
2. ✅ Check if webhook exists in Stripe Dashboard (see section 3)
3. ✅ Verify `STRIPE_WEBHOOK_SECRET` in Vercel matches Stripe

**AFTER VERIFICATION:**
- If webhook exists: Check logs to see why it failed
- If webhook doesn't exist: Create it (see section 4)
- Then redeploy and test again

---

## 10. WHY DIDN'T WE CATCH THIS EARLIER?

**The verification system worked perfectly:**
- ✅ It prevented the UI from crashing
- ✅ It showed clear console logs
- ✅ It waited 30 seconds for webhook
- ✅ It showed appropriate timeout message

**The problem is the webhook infrastructure, not the frontend code.**

The frontend code is solid. We need to ensure:
1. Webhook is registered in Stripe
2. Webhook secret is correct in Vercel
3. Vercel function doesn't timeout

---

**NEXT ACTION: Check Stripe Dashboard webhooks NOW.**

