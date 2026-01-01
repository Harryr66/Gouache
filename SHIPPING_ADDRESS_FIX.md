# Shipping Address Collection Fix

## CRITICAL ISSUE
**Physical marketplace products do NOT collect shipping addresses!**
- Current implementation uses Stripe Elements (embedded payment form)
- Stripe Elements does NOT collect shipping addresses by default
- Customers cannot receive their products without shipping info

## ROOT CAUSE
We're using Stripe Payment Intents + Elements for ALL product types, including physical merchandise that requires shipping.

## SOLUTION OPTIONS

### Option 1: Stripe Checkout Session (RECOMMENDED)
**Use Stripe's hosted checkout page for physical products**

✅ **PROS:**
- Automatically collects shipping address
- PCI compliant (no liability)
- Mobile optimized
- Supports payment methods, tax calculation, coupons
- Handles most edge cases automatically
- Still supports authorize-then-capture flow

❌ **CONS:**
- Redirects to Stripe's hosted page (leaves site briefly)
- Less customizable UI
- Requires separate webhook handling

**Implementation:**
1. Create `/api/stripe/create-checkout-session` route
2. For `itemType === 'merchandise'` or `itemType === 'product'`, redirect to Stripe Checkout
3. Configure `shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', ...] }`
4. Use `success_url` and `cancel_url` to redirect back
5. Webhook receives `checkout.session.completed` with shipping address

### Option 2: Stripe Elements + Address Element (EMBEDDED)
**Add Stripe's Address Element to our existing checkout form**

✅ **PROS:**
- Stays on our site
- Consistent UI with current flow
- Still uses authorize-then-capture

❌ **CONS:**
- More complex implementation
- Need to manually validate addresses
- Need to store shipping address in our database
- More code to maintain

**Implementation:**
1. Add `<AddressElement>` from `@stripe/react-stripe-js` to `checkout-form.tsx`
2. Add conditional rendering: only show for physical products
3. Capture address data from `stripe.confirmPayment()` result
4. Store shipping address in Firestore purchase record
5. Pass shipping data to webhook

### Option 3: Custom Form Fields (NOT RECOMMENDED)
Build our own address form

❌ **CONS:**
- Reinventing the wheel
- No validation
- No address autocomplete
- More bugs
- More maintenance

## RECOMMENDED APPROACH

**Hybrid Solution:**
- **Physical Products (merchandise):** Use **Stripe Checkout Session** (Option 1)
- **Digital Products (courses, artwork, books):** Keep **Stripe Elements** (current)

### Why This Works Best:
1. **Physical products NEED shipping** - Checkout Session is purpose-built for this
2. **Digital products DON'T need shipping** - Elements is simpler and stays on-site
3. **Minimal code changes** - just route physical products differently
4. **Best UX for each type** - right tool for right job
5. **Less maintenance** - Stripe handles address validation, mobile UX, etc.

## IMPLEMENTATION PLAN

### Phase 1: Create Checkout Session API
**File:** `src/app/api/stripe/create-checkout-session/route.ts`

```typescript
// Create Stripe Checkout Session for physical products
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  mode: 'payment',
  payment_intent_data: {
    capture_method: 'manual', // Still authorize-then-capture
    transfer_data: {
      destination: stripeAccountId,
    },
  },
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: {
        name: product.title,
        images: [product.images[0]],
      },
      unit_amount: product.price * 100,
    },
    quantity: 1,
  }],
  shipping_address_collection: {
    allowed_countries: ['US', 'CA', 'GB', 'AU', ...], // Expandable list
  },
  success_url: `${baseUrl}/marketplace/${productId}?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/marketplace/${productId}`,
  metadata: {
    userId: buyerId,
    artistId: artistId,
    itemType: 'merchandise',
    itemId: productId,
  },
});
```

### Phase 2: Update Marketplace Page
**File:** `src/app/(main)/marketplace/[id]/page.tsx`

```typescript
const handlePurchase = async () => {
  // ... validation ...
  
  // Physical products: redirect to Stripe Checkout
  if (product.requiresShipping || product.category !== 'Digital') {
    setIsProcessingPayment(true);
    
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        buyerId: user.id,
      }),
    });
    
    const { url } = await response.json();
    window.location.href = url; // Redirect to Stripe Checkout
    return;
  }
  
  // Digital products: use existing Elements flow
  setShowCheckout(true);
};
```

### Phase 3: Update Webhook
**File:** `src/app/api/stripe/webhook/route.ts`

Add handler for `checkout.session.completed`:

```typescript
case 'checkout.session.completed': {
  const session = event.data.object;
  const shippingAddress = session.shipping_details?.address;
  const customerName = session.shipping_details?.name;
  
  // Store purchase with shipping address
  await db.collection('purchases').add({
    ...purchaseData,
    shippingAddress: {
      name: customerName,
      line1: shippingAddress.line1,
      line2: shippingAddress.line2,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postal_code: shippingAddress.postal_code,
      country: shippingAddress.country,
    },
  });
  
  // Send emails with shipping info to buyer and seller
  break;
}
```

### Phase 4: Success Page Handling
**File:** `src/app/(main)/marketplace/[id]/page.tsx`

Handle return from Stripe Checkout:

```typescript
useEffect(() => {
  const sessionId = searchParams.get('session_id');
  if (sessionId) {
    // Verify purchase via session ID
    verifyCheckoutSession(sessionId);
  }
}, [searchParams]);
```

## TESTING CHECKLIST
- [ ] Create physical product in marketplace
- [ ] Click "Buy Now"
- [ ] Verify redirects to Stripe Checkout
- [ ] Verify shipping address form appears
- [ ] Complete test purchase with test card
- [ ] Verify redirected back to success page
- [ ] Verify webhook receives shipping address
- [ ] Verify purchase record in Firestore has shipping address
- [ ] Verify seller receives email with shipping address
- [ ] Verify buyer receives confirmation email with shipping address

## TIMELINE
- **Phase 1 (API):** 30 minutes
- **Phase 2 (Frontend):** 20 minutes
- **Phase 3 (Webhook):** 20 minutes
- **Phase 4 (Success):** 15 minutes
- **Testing:** 20 minutes
- **Total:** ~2 hours

## ALTERNATIVE: Quick Fix (If Needed NOW)
Add `requiresShipping` boolean to products and show a "Contact seller for shipping" message until full implementation is complete. NOT RECOMMENDED - confusing UX.

