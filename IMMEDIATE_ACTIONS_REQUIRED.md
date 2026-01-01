# 🚨 CRITICAL: Check These Items NOW

You confirmed Firebase Admin credentials ARE set in Vercel. But the webhook is still failing.

Here's what to check **IMMEDIATELY**:

---

## ✅ **STEP 1: Test Firebase Admin Credentials**

I just deployed a diagnostic endpoint. **Visit this URL after ~2 minutes**:

```
https://www.gouache.art/api/test-firebase-admin
```

This will show you:
- ✅ Are all 3 environment variables detected?
- ✅ Can Firebase Admin initialize?
- ✅ Can it read from Firestore?
- ✅ Can it write to Firestore?
- ⚠️ Is the private key format correct?

**Expected Result if Working:**
```json
{
  "summary": {
    "status": "✅ ALL TESTS PASSED",
    "allTestsPassed": true
  },
  "tests": {
    "initializationSuccess": true,
    "canReadCollection": true,
    "canWriteCollection": true
  }
}
```

**If You See This:**
```json
{
  "errors": ["Write error: 7 PERMISSION_DENIED"],
  "tests": {
    "canWriteCollection": false
  }
}
```
→ **The credentials are malformed or the service account lacks permissions**

---

## ✅ **STEP 2: Check if RESEND_API_KEY is Set**

The second issue is emails. Check Vercel:

1. Go to Vercel → Settings → Environment Variables
2. Look for: **`RESEND_API_KEY`**

### ❌ **If It's Missing:**

You need to add it:

1. Login to https://resend.com/api-keys
2. Create a new API key
3. Copy it (starts with `re_`)
4. Add to Vercel:
   - Variable: `RESEND_API_KEY`
   - Value: `re_your_key_here`
5. Redeploy

### ✅ **If It Exists:**

Good! But we need to verify it's working too. Check Vercel logs for:
```
⚠️ Email not configured: RESEND_API_KEY required
```

If you see that warning, the key is either:
- Not set correctly
- Using the wrong environment (only set for Production, not Preview)

---

## 🔍 **STEP 3: Check Latest Vercel Logs**

Go to: Vercel → Your Project → Logs

Filter for: `/api/stripe/webhook`

**Look for these specific messages:**

### ✅ **Good Signs:**
```
✅ Firebase Admin SDK initialized
✅ Product purchase recorded with shipping address
✅ Payment captured successfully
📧 Sending buyer confirmation email to: ...
✅ Buyer confirmation email sent
✅ Seller notification email sent
```

### ❌ **Bad Signs:**
```
❌ Missing Firebase Admin credentials
❌ 7 PERMISSION_DENIED: Missing or insufficient permissions
⚠️ Email not configured: RESEND_API_KEY required
```

**What messages do you see?**

---

## 🎯 **MOST LIKELY ISSUES**

Based on "credentials are set but still failing":

### **Issue #1: Private Key Format is Wrong**

The `FIREBASE_PRIVATE_KEY` needs `\n` characters but might have:
- Actual newlines (wrong)
- Double-escaped `\\n` (wrong)
- Missing `\n` entirely (wrong)

**Correct format:**
```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADA...\n-----END PRIVATE KEY-----\n
```

**The `/api/test-firebase-admin` endpoint will detect this!**

---

### **Issue #2: Service Account Lacks Permissions**

The service account exists but doesn't have write permissions.

**Fix:**
1. Firebase Console → Settings → Service Accounts
2. Click "Manage service account permissions"
3. Find: `firebase-adminsdk-xxxxx@gouache-art.iam.gserviceaccount.com`
4. Verify it has: **"Firebase Admin SDK Administrator Service Agent"** role

---

### **Issue #3: Wrong Project ID**

`NEXT_PUBLIC_FIREBASE_PROJECT_ID` might be wrong.

**Verify:**
1. Go to Firebase Console
2. Look at URL: `console.firebase.google.com/project/YOUR-PROJECT-ID`
3. Copy the project ID from URL
4. Verify it matches Vercel environment variable

Should be: `gouache-art`

---

### **Issue #4: RESEND_API_KEY Missing**

Even if Firebase works, emails won't send without this.

**Check:** Vercel → Environment Variables → `RESEND_API_KEY`

---

## 📋 **ACTION CHECKLIST**

Do these in order:

- [ ] **Wait 2 minutes** for deployment to complete
- [ ] **Visit** `https://www.gouache.art/api/test-firebase-admin`
- [ ] **Screenshot** the results and share them with me
- [ ] **Check** if `RESEND_API_KEY` exists in Vercel
- [ ] **Check** latest webhook logs in Vercel

---

## 🚀 **NEXT STEPS**

Once you:
1. Visit the diagnostic endpoint
2. Check for RESEND_API_KEY
3. Share the results with me

I can tell you EXACTLY what's wrong and how to fix it!

**The diagnostic endpoint will reveal the truth about why it's failing.** 🔍

