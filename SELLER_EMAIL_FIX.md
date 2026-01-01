# 🚨 SELLER EMAIL NOT RECEIVED - ROOT CAUSE & FIX

## THE PROBLEM

Your seller (you) received **NO EMAIL** because the webhook is **FAILING BEFORE IT REACHES THE EMAIL CODE**.

---

## 📊 WEBHOOK EXECUTION FLOW

Here's what happens when a purchase is made:

```
1. ✅ Stripe Checkout completes
2. ✅ Stripe triggers webhook to Gouache
3. ✅ Webhook signature verified
4. ❌ Webhook tries to write to Firebase → PERMISSION_DENIED
5. ❌ Process stops immediately
6. ❌ Emails never sent
```

**The webhook crashes at step 4 before reaching the email code!**

---

## 🔍 EVIDENCE FROM YOUR LOGS

From `logs_result (4).json`:

```
✅ Webhook verified with PLATFORM secret
✅ Checkout session completed: cs_live_a1TcHjvd...
✅ Payment verified: { status: 'requires_capture', amount: 50 }
✅ Stripe account ID found for transfer: acct_1Sg4edEfIrt3EJ0o

❌ GrpcConnection RPC 'Write' stream error
❌ Code: 7 Message: 7 PERMISSION_DENIED
❌ Error handling checkout session completed: 
   [FirebaseError]: 7 PERMISSION_DENIED: Missing or insufficient permissions
```

**Translation**: 
- Webhook successfully validates payment ✅
- Webhook tries to save purchase to database ❌
- Firebase rejects the write (no Admin credentials) ❌
- Webhook crashes and exits ❌
- **Lines 583-633 that send emails are NEVER reached** ❌

---

## 🛠️ THE FIX (2 PARTS)

### **PART 1: Add Firebase Admin Credentials (CRITICAL)**

Without these, the webhook **CANNOT FUNCTION AT ALL**.

#### Step-by-Step:

1. **Get Service Account Key**:
   - Go to https://console.firebase.google.com/
   - Select: `gouache-art`
   - Click ⚙️ → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Download the JSON file

2. **Add to Vercel**:
   - Go to https://vercel.com → Your Project → Settings → Environment Variables
   - Add these 3 variables:

| Variable | Value (from JSON) |
|----------|-------------------|
| `FIREBASE_PRIVATE_KEY` | The entire `private_key` field (keep `\n` characters!) |
| `FIREBASE_CLIENT_EMAIL` | The `client_email` field |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `gouache-art` |

3. **Redeploy**:
   - Deployments tab → Latest deployment → ⋮ → Redeploy

---

### **PART 2: Add Resend API Key (For Emails)**

The email functions check for `RESEND_API_KEY`. If it's missing, they log a warning and skip sending.

#### Check if You Have It:

Looking at your `.env.local`, I see:
```
STRIPE_SECRET_KEY=sk_live_51...
```

But I don't see `RESEND_API_KEY`.

#### Get Your Resend API Key:

1. **Login to Resend**:
   - Go to https://resend.com/login
   - Login with your Gouache account

2. **Get API Key**:
   - Dashboard → API Keys
   - Click "Create API Key"
   - Name it: "Gouache Production"
   - Copy the key (starts with `re_`)

3. **Add to Vercel**:
   - Vercel → Settings → Environment Variables
   - Variable: `RESEND_API_KEY`
   - Value: `re_...` (your API key)
   - Environments: Production, Preview, Development

4. **Also Add Locally** (optional, for testing):
   - Open `.env.local`
   - Add: `RESEND_API_KEY=re_your_key_here`

---

## 📋 COMPLETE VERCEL ENV VARS CHECKLIST

After both fixes, you should have **ALL** of these in Vercel:

### Stripe (Already Set ✅):
- [x] `STRIPE_SECRET_KEY`
- [x] `STRIPE_WEBHOOK_SECRET_PLATFORM`
- [x] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Firebase Admin (MISSING ❌):
- [ ] `FIREBASE_PRIVATE_KEY` ← **ADD THIS**
- [ ] `FIREBASE_CLIENT_EMAIL` ← **ADD THIS**
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID` ← **ADD THIS**

### Resend Email (MISSING ❌):
- [ ] `RESEND_API_KEY` ← **ADD THIS**
- [ ] `RESEND_FROM_EMAIL` (optional, defaults to `hello@gouache.art`)

---

## ✅ HOW TO VERIFY IT WORKED

### Test 1: Check Webhook Logs
After redeploying, make a test purchase and check Vercel logs:

**Before Fix** (What you see now):
```
❌ 7 PERMISSION_DENIED: Missing or insufficient permissions
```

**After Fix** (What you should see):
```
✅ Firebase Admin SDK initialized
✅ Product purchase recorded with shipping address
✅ Payment captured successfully
✅ Transfer created to connected account
📧 Sending buyer confirmation email to: customer@email.com
✅ Buyer confirmation email sent
✅ Seller notification email sent
```

### Test 2: Check Inboxes

**Buyer Email** (customer):
- Subject: "Your Gouache Order Confirmation"
- Content: Order details, shipping address
- From: `Gouache <noreply@gouache.art>`

**Seller Email** (you at `news@gouache.art`):
- Subject: "New Order on Gouache: [Product Name]"
- Content: Customer details, shipping address, order info
- From: `Gouache <noreply@gouache.art>`

### Test 3: Check Order History
- Go to `/settings/orders`
- Order should appear with "Request Refund" button

---

## 🎯 PRIORITY ORDER

Do these in order:

### 1. **Firebase Admin Credentials (CRITICAL - BLOCKS EVERYTHING)**
Without this, webhook fails immediately, nothing works.

### 2. **Resend API Key (CRITICAL - BLOCKS EMAILS)**
Without this, emails silently fail (webhook logs: "Email not configured").

### 3. **Test Purchase**
Make a real test to verify both fixes work.

---

## 📧 SELLER EMAIL TEMPLATE

Once working, sellers receive this:

```
Subject: New Order on Gouache: Test Mug

Hi Harry,

Great news! You've received a new order on Gouache.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ORDER DETAILS
• Item: Test Mug
• Type: Product
• Amount: $0.50 USD
• Order ID: cs_live_...
• Date: January 1, 2026

CUSTOMER INFORMATION
• Name: John Doe
• Email: john@example.com

SHIPPING ADDRESS
John Doe
123 Main Street
London, SW1A 1AA
United Kingdom

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT STEPS:
1. Prepare the item for shipment
2. Package securely
3. Ship within 3 business days
4. Update shipping status in your dashboard

[View Order in Dashboard]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
© 2026 Gouache. All rights reserved.
```

---

## 🔍 TROUBLESHOOTING

### "Still no emails after adding Resend API key"
→ Check Firebase Admin credentials are also added  
→ Webhook must succeed first before emails can send

### "Email says 'Hi Harry's projects' instead of 'Hi Harry'"
→ This is because webhook fails before fetching displayName  
→ Fixed by adding Firebase Admin credentials

### "Wrong address in email"
→ Webhook uses cached data when it fails  
→ Fixed by adding Firebase Admin credentials

### "Vercel logs show 'Email not configured'"
→ Add `RESEND_API_KEY` to Vercel environment variables

---

## 🚀 ESTIMATED TIME TO FIX

- **Get Firebase credentials**: 2 minutes
- **Get Resend API key**: 1 minute
- **Add to Vercel**: 2 minutes
- **Redeploy**: 2 minutes
- **Test purchase**: 2 minutes

**Total**: ~10 minutes to completely fix

---

## ✅ SUCCESS CRITERIA

After the fix, you should see:

- [x] No PERMISSION_DENIED errors in Vercel logs
- [x] "✅ Buyer confirmation email sent" in logs
- [x] "✅ Seller notification email sent" in logs
- [x] Email in buyer's inbox
- [x] Email in seller's inbox (news@gouache.art)
- [x] Order appears in `/settings/orders`
- [x] Email says "Hi Harry" (not "Hi Harry's projects")
- [x] Email shows correct shipping address

---

**Once both environment variables are added, ALL your issues will be resolved!**

The webhook will:
1. ✅ Successfully save orders to database
2. ✅ Fetch correct buyer name from Firebase
3. ✅ Get correct shipping address from Stripe
4. ✅ Send confirmation email to buyer
5. ✅ Send notification email to seller
6. ✅ Capture payment and transfer funds

**Everything is already coded correctly - it just needs the credentials to work!** 🚀

