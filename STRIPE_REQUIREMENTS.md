# Stripe Requirements Summary

## What We Currently Have ✅

### Stripe API Integration (Required)
- ✅ **Account Creation**: `/api/stripe/connect/create-account`
  - Creates Stripe Connect Express accounts for artists
  - Generates onboarding links
  
- ✅ **Account Status**: `/api/stripe/connect/account-status`
  - Checks if account is ready to accept payments
  - Verifies charges and payouts are enabled

- ✅ **Balance Retrieval**: `/api/stripe/connect/balance`
  - Shows available and pending balance
  - Used in Business Manager dashboard

- ✅ **Payouts Retrieval**: `/api/stripe/connect/payouts`
  - Lists payout history
  - Shows pending and completed payouts

## What We Need for Payments (Not Yet Implemented)

### 1. Payment Intent Creation (Required)
**Status**: ❌ Not implemented yet

**What it does**: Creates a payment intent when customer wants to buy
- Calculates commission (5%)
- Creates payment with application fee
- Transfers to artist's Stripe account

**API Route needed**: `/api/stripe/create-payment-intent`

**Dependencies**: 
- ✅ Stripe API (already have)
- ❌ Frontend payment form (not built yet)

### 2. Webhooks (Highly Recommended, Not Required Initially)

**Status**: ❌ Not implemented yet

**What they do**: Real-time notifications from Stripe about payment events

**Why they're useful**:
- ✅ **Reliability**: Handle payments even if user closes browser
- ✅ **Real-time updates**: Instant database updates when payment succeeds
- ✅ **Edge cases**: Handle network failures, timeouts
- ✅ **Better UX**: No need to poll for status

**What we'd handle**:
- `payment_intent.succeeded` → Mark item as sold, send confirmation
- `payment_intent.payment_failed` → Log failure, notify user
- `transfer.created` → Track when money moves to artist
- `payout.paid` → Update payout status in database

**Alternative without webhooks**:
- Poll payment status from frontend (less reliable)
- Check status on page refresh (delayed updates)
- Manual verification (not scalable)

## Current Architecture

```
User Flow (Current):
1. Artist connects Stripe → API creates account ✅
2. Artist views balance → API retrieves balance ✅
3. Artist views payouts → API retrieves payouts ✅

User Flow (Future - Payments):
1. Customer clicks "Buy" → Create payment intent (needed)
2. Customer pays → Stripe processes payment (needed)
3. Payment succeeds → Webhook updates database (recommended)
4. Money transfers to artist → Automatic via Stripe Connect ✅
```

## Recommendations

### Phase 1: MVP (Minimum Viable Product)
**Required**:
- ✅ Stripe API (already have)
- ❌ Payment intent creation (need to build)
- ❌ Frontend payment form (need to build)

**Optional**:
- ⚠️ Webhooks (can add later, but recommended)

### Phase 2: Production Ready
**Required**:
- ✅ Stripe API
- ✅ Payment intent creation
- ✅ Frontend payment form
- ✅ Webhooks (for reliability)

## Implementation Priority

1. **High Priority** (Required for payments):
   - [ ] Create payment intent API route
   - [ ] Build checkout/payment form
   - [ ] Handle payment confirmation

2. **Medium Priority** (Recommended):
   - [ ] Implement webhook handler
   - [ ] Set up webhook endpoint in Stripe Dashboard
   - [ ] Test webhook events

3. **Low Priority** (Nice to have):
   - [ ] Email notifications on payment success
   - [ ] Refund handling
   - [ ] Dispute management

## Cost Considerations

- **Stripe API**: Free (included with Stripe account)
- **Webhooks**: Free (Stripe sends events for free)
- **Processing Fees**: 2.9% + $0.30 per transaction (paid by buyer)

## Summary

**Do we need Stripe API?** 
✅ **YES** - Already using it, absolutely required

**Do we need webhooks?**
⚠️ **RECOMMENDED** - Not strictly required for MVP, but highly recommended for production reliability

**Current Status**:
- ✅ Stripe API integration: Complete
- ❌ Payment processing: Not implemented
- ❌ Webhooks: Not implemented

**Next Steps**:
1. Build payment intent creation API
2. Build frontend checkout flow
3. Implement webhooks for reliability

