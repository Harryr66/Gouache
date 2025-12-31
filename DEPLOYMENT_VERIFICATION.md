# DEPLOYMENT VERIFICATION - Course Enrollment Flow

## CRITICAL: Vercel Environment Variables Required

**BEFORE TESTING, verify these are set in Vercel Dashboard → Settings → Environment Variables:**

```
FIREBASE_PRIVATE_KEY           (from Firebase service account JSON)
FIREBASE_CLIENT_EMAIL          (from Firebase service account JSON)
NEXT_PUBLIC_FIREBASE_PROJECT_ID
STRIPE_SECRET_KEY
```

**If any are missing, the enrollment API will fail with HTTP 500.**

---

## Complete Payment Flow (Step-by-Step)

### **USER CLICKS "ENROLL"**
1. ✅ Pre-payment validation (8 checks)
2. ✅ Opens checkout dialog
3. ✅ `CheckoutForm` mounts

### **CHECKOUT FORM LOADS**
4. ✅ Calls `/api/stripe/create-payment-intent`
5. ✅ Payment intent created with `capture_method: 'manual'`
6. ✅ Stripe Elements renders with `clientSecret`

### **USER SUBMITS PAYMENT**
7. ✅ `stripe.confirmPayment()` called
8. ✅ Stripe authorizes card (status: `requires_capture`)
9. ✅ **CheckoutForm line 194**: Checks for `'succeeded'` OR `'requires_capture'`
10. ✅ Calls `onSuccess(paymentIntent.id)` → triggers `handleCheckoutSuccess`

### **ENROLLMENT CREATION (CRITICAL SECTION)**
11. ✅ **Course page line 443**: Calls `/api/enrollments/create`
    ```typescript
    POST /api/enrollments/create
    Body: { courseId, userId, paymentIntentId }
    ```

12. ✅ **Enrollment API line 38**: Initializes Firebase Admin SDK
    - **REQUIRES**: `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
    - **FAILS IF MISSING**: Returns HTTP 500

13. ✅ **Enrollment API line 57**: Checks for existing enrollment (idempotency)

14. ✅ **Enrollment API line 76-93**: Creates enrollment record
    ```typescript
    {
      courseId,
      userId,
      paymentIntentId,
      enrolledAt: new Date(),
      progress: 0,
      currentWeek: 1,
      currentLesson: 1,
      completedLessons: [],
      lastAccessedAt: new Date(),
      certificateEarned: false,
      isActive: true,
      createdBy: 'immediate_payment'
    }
    ```

15. ✅ Returns `{ success: true, enrollmentId }`

### **PAYMENT CAPTURE (ONLY IF ENROLLMENT SUCCEEDS)**
16. ✅ **Course page line 463**: Calls `/api/stripe/capture-payment`
    ```typescript
    POST /api/stripe/capture-payment
    Body: { paymentIntentId }
    ```

17. ✅ **Capture API line 40**: `stripe.paymentIntents.capture(paymentIntentId)`

18. ✅ **Card is NOW charged** (only after enrollment confirmed)

19. ✅ **Course page line 485**: Navigate to `/learn/{courseId}/player`

### **ERROR HANDLING**
- **If enrollment API fails (step 11-15)**: 
  - Authorization remains (NOT captured)
  - Card NOT charged
  - Error shown to user
  - Authorization expires in 7 days

- **If capture API fails (step 16-18)**:
  - Enrollment exists
  - Card NOT charged yet
  - User sees error
  - **Manual intervention required** (contact support)

---

## Testing Checklist

Before declaring "ready for testing":

- [ ] Verify all 4 env vars in Vercel
- [ ] Deployment completed successfully
- [ ] No build errors
- [ ] Check Vercel function logs for enrollment API initialization
- [ ] Test with $0.50 charge (minimum)
- [ ] Verify enrollment created in Firestore
- [ ] Verify payment captured in Stripe Dashboard
- [ ] Verify navigation to course player

---

## Known Working State

**Commit**: `4e2d1e6` - "fix: handle requires_capture status in checkout form"

**Files Modified**:
1. `src/app/api/stripe/create-payment-intent/route.ts` - Added `capture_method: 'manual'`
2. `src/app/(main)/learn/[id]/page.tsx` - Two-step flow (enroll then capture)
3. `src/components/checkout-form.tsx` - Handle `requires_capture` status
4. `src/app/api/enrollments/create/route.ts` - Already exists (server-side)
5. `src/app/api/stripe/capture-payment/route.ts` - Already exists

**Logic Flow**: AUTHORIZE → CREATE ENROLLMENT → CAPTURE → NAVIGATE

**Safety**: Customer NEVER charged unless enrollment succeeds.

---

## Debugging Commands

If enrollment fails, check logs:

```bash
# Vercel function logs (via CLI or dashboard)
vercel logs [deployment-url]

# Check Firestore for enrollment
# Collection: courseEnrollments
# Query: userId == [user] AND courseId == [course] AND paymentIntentId == [pi_xxx]

# Check Stripe Dashboard
# Search payment intent: pi_xxxxx
# Status should be: requires_capture → succeeded
```

