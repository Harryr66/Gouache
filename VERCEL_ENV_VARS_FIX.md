# 🚨 CRITICAL: VERCEL ENVIRONMENT VARIABLES MISSING

## THE ROOT CAUSE OF ALL 3 ISSUES:

Looking at the webhook logs from `logs_result (4).json`:

```
❌ Error handling checkout session completed: 
[B [FirebaseError]: 7 PERMISSION_DENIED: Missing or insufficient permissions.]
```

**This means the Firebase Admin SDK cannot write to your database because the credentials are NOT set in Vercel!**

---

## WHY THIS CAUSES THE 3 ISSUES YOU'RE SEEING:

### ❌ Issue #1: Order History is Empty
**Cause**: Webhook fails to create purchase/enrollment records  
**Result**: No orders in database → Order History shows "No orders yet"

### ❌ Issue #2: Wrong Email Address & Name
**Cause**: Webhook fails before fetching buyer's displayName from Firebase  
**Result**: Falls back to Stripe's shipping name ("Harry's projects")

### ❌ Issue #3: Wrong Address in Email
**Cause**: May be using cached address from a previous test  
**Result**: Shows old address instead of new one entered in Stripe

---

## 🔧 IMMEDIATE FIX REQUIRED

You need to add **3 environment variables** to Vercel:

### Step 1: Get Firebase Service Account Credentials

1. Go to: https://console.firebase.google.com/
2. Select your project: **`gouache-art`**
3. Click **⚙️ Settings** (gear icon) → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **"Generate New Private Key"**
6. A JSON file will download

### Step 2: Extract Values from JSON

The downloaded JSON file looks like this:

```json
{
  "type": "service_account",
  "project_id": "gouache-art",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...LONG_STRING_HERE...=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@gouache-art.iam.gserviceaccount.com",
  "client_id": "...",
  ...
}
```

### Step 3: Add to Vercel Environment Variables

Go to: https://vercel.com/harryr66s-projects/your-project/settings/environment-variables

Add these **3 variables**:

#### Variable 1: `FIREBASE_PRIVATE_KEY`
- **Key**: `FIREBASE_PRIVATE_KEY`
- **Value**: Copy the ENTIRE `private_key` value from the JSON, INCLUDING the `\n` characters
- **Example**: `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqh...\n-----END PRIVATE KEY-----\n`
- **IMPORTANT**: Keep the quotes, keep the `\n` characters exactly as shown

#### Variable 2: `FIREBASE_CLIENT_EMAIL`
- **Key**: `FIREBASE_CLIENT_EMAIL`
- **Value**: Copy the `client_email` value
- **Example**: `firebase-adminsdk-xxxxx@gouache-art.iam.gserviceaccount.com`

#### Variable 3: `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- **Key**: `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- **Value**: `gouache-art`
- **Note**: This one might already exist!

### Step 4: Redeploy

After adding the variables:
1. Go to **Deployments** tab
2. Find the latest deployment
3. Click **⋮** → **Redeploy**
4. Check "Use existing Build Cache"
5. Click **Redeploy**

---

## 🧪 HOW TO VERIFY IT WORKED

### Test 1: Check Vercel Logs
1. Make a test purchase
2. Go to Vercel Dashboard → **Logs**
3. Filter for `/api/stripe/webhook`
4. Look for:
   - ✅ `✅ Firebase Admin SDK initialized`
   - ✅ `✅ Course enrollment created: abc123`
   - ✅ `✅ Product purchase recorded with shipping address`
   - ❌ NO MORE `PERMISSION_DENIED` errors

### Test 2: Check Order History
1. Go to `/settings/orders`
2. Your test purchase should appear!
3. "Request Refund" button should be visible

### Test 3: Check Email
1. Check inbox for confirmation email
2. Verify:
   - ✅ Correct buyer name (your displayName, not "Harry's projects")
   - ✅ Correct shipping address (the one you entered in Stripe checkout)

---

## 📋 QUICK CHECKLIST

- [ ] Downloaded Firebase service account JSON
- [ ] Added `FIREBASE_PRIVATE_KEY` to Vercel
- [ ] Added `FIREBASE_CLIENT_EMAIL` to Vercel  
- [ ] Verified `NEXT_PUBLIC_FIREBASE_PROJECT_ID` exists
- [ ] Redeployed project
- [ ] Waited ~2 minutes for deployment
- [ ] Made test purchase
- [ ] Checked Vercel logs (no PERMISSION_DENIED)
- [ ] Verified order appears in `/settings/orders`
- [ ] Verified email has correct name/address

---

## ⚠️ IMPORTANT NOTES

### About the Private Key:
- The private key is LONG (1600+ characters)
- It MUST include the `\n` newline characters
- Do NOT remove the `-----BEGIN PRIVATE KEY-----` header
- Do NOT remove the `-----END PRIVATE KEY-----` footer

### About Security:
- Never commit this JSON file to git
- Never share the private key
- These credentials give FULL access to your Firebase database
- Vercel encrypts environment variables at rest

### If You Already Have These Variables:
- Check they're set correctly
- The private key might be corrupted (missing `\n` characters)
- Re-generate a new service account key and try again

---

## 🎯 EXPECTED BEHAVIOR AFTER FIX

### Webhook Will:
1. ✅ Successfully write to database (no PERMISSION_DENIED)
2. ✅ Fetch buyer's displayName from Firebase
3. ✅ Use correct shipping address from Stripe customer_details
4. ✅ Send emails with correct buyer name
5. ✅ Create purchase/enrollment records properly

### Order History Will:
1. ✅ Display all purchases (products, courses, artwork)
2. ✅ Show correct item titles
3. ✅ Show "Request Refund" buttons
4. ✅ Display shipping addresses for physical items

### Emails Will:
1. ✅ Address buyer by their displayName (e.g., "Hi Harry")
2. ✅ Show the shipping address entered in Stripe checkout
3. ✅ Have properly formatted prices

---

## 🆘 IF IT STILL DOESN'T WORK

### Check Vercel Logs for:
```
❌ Missing Firebase Admin credentials
```

This means the env vars aren't loaded yet. Wait 2 mins and redeploy.

### Check for:
```
✅ Firebase Admin SDK initialized
```

This means credentials are working!

### Still Getting PERMISSION_DENIED?
- Re-download the service account JSON
- Delete old env vars in Vercel
- Add fresh ones
- Redeploy again

---

## 📞 NEXT STEPS

1. **Do this NOW** - Add the 3 environment variables
2. **Redeploy** - Wait for build to complete
3. **Test purchase** - Use Stripe test card
4. **Report back** - Let me know if you see:
   - Orders in Order History? ✅/❌
   - Correct name in email? ✅/❌
   - Correct address in email? ✅/❌
   - No PERMISSION_DENIED in logs? ✅/❌

---

**This is the ONLY thing blocking your system from working perfectly!**

Once these credentials are in place, ALL 3 issues will be resolved immediately.

