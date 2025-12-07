# Production Deployment Checklist for Stripe Integration

This guide ensures your Stripe integration is production-ready before going live.

## Pre-Deployment Checklist

### 1. Environment Variables ✅

Ensure all environment variables are set in your production environment (Vercel, etc.):

```bash
# Required
STRIPE_SECRET_KEY=sk_live_...  # LIVE key, not test!
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # LIVE key
NEXT_PUBLIC_APP_URL=https://yourdomain.com  # Production URL
STRIPE_WEBHOOK_SECRET=whsec_...  # From Stripe Dashboard

# Optional but recommended
STRIPE_APPLICATION_FEE_RATE=0.029  # Stripe's processing fee
```

**⚠️ CRITICAL**: Use **LIVE** keys (`sk_live_` and `pk_live_`), not test keys!

### 2. Stripe Dashboard Configuration

#### A. Connect Settings
1. Go to **Settings** → **Connect** → **Settings**
2. Verify:
   - ✅ Platform name is correct
   - ✅ Branding is set (logo, colors)
   - ✅ Business profile is complete
   - ✅ Capabilities enabled: Card payments, Transfers

#### B. Webhook Configuration
1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `transfer.created`
   - ✅ `transfer.paid`
   - ✅ `payout.paid`
   - ✅ `payout.failed`
   - ✅ `charge.dispute.created`
5. Copy the **Signing secret** (`whsec_...`)
6. Add to environment variables as `STRIPE_WEBHOOK_SECRET`

#### C. Test Webhook Delivery
1. In webhook settings, click **Send test webhook**
2. Select `payment_intent.succeeded`
3. Verify it reaches your endpoint
4. Check server logs for successful processing

### 3. Security Measures ✅

#### A. API Route Security
- ✅ Webhook signature verification (implemented)
- ✅ Environment variable validation (implemented)
- ✅ Input validation (implemented)
- ✅ Error handling (implemented)

#### B. Frontend Security
- ✅ Stripe Elements (PCI compliant)
- ✅ No sensitive data in client-side code
- ✅ HTTPS required (enforced by Stripe)

#### C. Database Security
- ✅ Firestore security rules (verify these are set)
- ✅ No sensitive data in client-accessible collections

### 4. Testing in Production Mode

#### A. Test with Real Cards (Small Amounts)
1. Use real credit card (your own)
2. Test a small purchase ($1-5)
3. Verify:
   - ✅ Payment processes correctly
   - ✅ Webhook receives event
   - ✅ Database updates correctly
   - ✅ Artist receives payout (check Stripe Dashboard)
   - ✅ Commission is calculated correctly

#### B. Test Edge Cases
- ✅ Payment failure (insufficient funds)
- ✅ 3D Secure authentication
- ✅ Payment timeout
- ✅ Network interruption
- ✅ Duplicate payment attempts

### 5. Monitoring & Alerts

#### A. Stripe Dashboard
- Set up email alerts for:
  - Failed payments
  - Disputes/chargebacks
  - Payout failures
  - High refund rates

#### B. Application Monitoring
- Monitor webhook delivery success rate
- Track payment success/failure rates
- Monitor API response times
- Set up error alerts

### 6. Legal & Compliance

#### A. Terms of Service
- ✅ Payment terms clearly stated
- ✅ Refund policy defined
- ✅ Commission structure disclosed
- ✅ Platform fees explained

#### B. Tax Compliance
- ✅ 1099-K forms for artists (Stripe handles this)
- ✅ Sales tax collection (if required in your jurisdiction)
- ✅ Platform tax obligations

### 7. Documentation

- ✅ API documentation for payment flow
- ✅ Error handling guide
- ✅ Support contact information
- ✅ Refund process documented

## Deployment Steps

### Step 1: Switch to Live Keys

1. Get live API keys from Stripe Dashboard
2. Update environment variables in Vercel/production
3. **DO NOT** commit live keys to Git

### Step 2: Deploy Application

```bash
# Build and test locally first
npm run build

# Deploy to production
git push origin main  # If using Vercel auto-deploy
# OR
vercel --prod
```

### Step 3: Configure Webhook

1. Deploy application first
2. Get production URL
3. Add webhook endpoint in Stripe Dashboard
4. Test webhook delivery
5. Verify signature secret is in environment variables

### Step 4: Test End-to-End

1. Create test Stripe Connect account (real account, test purchase)
2. Make a small real purchase
3. Verify entire flow:
   - Payment intent created ✅
   - Payment processed ✅
   - Webhook received ✅
   - Database updated ✅
   - Payout initiated ✅

### Step 5: Monitor First Transactions

- Watch first 10-20 transactions closely
- Verify all webhooks are received
- Check for any errors in logs
- Confirm payouts are processing

## Post-Deployment

### Daily Checks (First Week)
- ✅ Webhook delivery success rate > 99%
- ✅ No payment processing errors
- ✅ Payouts processing correctly
- ✅ No unexpected disputes

### Weekly Checks
- ✅ Review failed payments
- ✅ Check dispute rate
- ✅ Verify commission calculations
- ✅ Review payout timing

### Monthly Checks
- ✅ Revenue reconciliation
- ✅ Tax reporting (if applicable)
- ✅ Platform performance metrics
- ✅ Security audit

## Troubleshooting

### Webhook Not Receiving Events

1. **Check endpoint URL**: Must be HTTPS and publicly accessible
2. **Verify signature secret**: Must match Stripe Dashboard
3. **Check server logs**: Look for webhook delivery attempts
4. **Test manually**: Use Stripe CLI or Dashboard test webhook

### Payments Failing

1. **Check Stripe Dashboard**: Look for error codes
2. **Verify account status**: Artist account must be fully onboarded
3. **Check logs**: Look for API errors
4. **Test with different card**: Rule out card-specific issues

### Payouts Not Processing

1. **Check account status**: Artist must have completed onboarding
2. **Verify bank account**: Must be verified in Stripe
3. **Check payout schedule**: Default is 2-7 business days
4. **Review Stripe Dashboard**: Look for payout status

## Support Resources

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Stripe Docs**: https://stripe.com/docs
- **Stripe Support**: https://support.stripe.com
- **Webhook Testing**: Use Stripe CLI for local testing

## Rollback Plan

If issues occur:

1. **Disable new payments**: Remove payment buttons/forms
2. **Keep webhooks active**: Continue processing existing payments
3. **Investigate issues**: Check logs and Stripe Dashboard
4. **Fix and redeploy**: Once issues resolved
5. **Re-enable payments**: After verification

## Success Criteria

Your Stripe integration is production-ready when:

- ✅ All environment variables set correctly
- ✅ Webhooks configured and tested
- ✅ Test transactions successful
- ✅ Monitoring in place
- ✅ Documentation complete
- ✅ Support process defined
- ✅ Rollback plan ready

---

**Ready to go live?** Follow this checklist step-by-step and you'll be production-ready! 🚀

