# 🔍 FIREBASE ADMIN CREDENTIALS DIAGNOSTIC

## THE ISSUE

You confirmed these are set in Vercel:
- ✅ `FIREBASE_PRIVATE_KEY`
- ✅ `FIREBASE_CLIENT_EMAIL`
- ✅ `NEXT_PUBLIC_FIREBASE_PROJECT_ID`

**But the webhook logs show:**
```
❌ 7 PERMISSION_DENIED: Missing or insufficient permissions.
```

This means the credentials are **SET but INVALID or MALFORMED**.

---

## 🔍 DIAGNOSTIC STEPS

### **Step 1: Check Vercel Logs for Initialization**

Go to Vercel → Logs → Filter for `/api/stripe/webhook`

**Look for one of these messages:**

#### ✅ **Good Sign** (credentials loading):
```
🔧 Initializing Firebase Admin SDK...
✅ Firebase Admin SDK initialized
```

#### ❌ **Bad Sign** (credentials missing):
```
❌ Missing Firebase Admin credentials
Missing: hasPrivateKey, hasClientEmail, hasProjectId
```

#### ❌ **Bad Sign** (credentials malformed):
```
Firebase Admin SDK initialization error: [Error details]
```

**What do you see?**

---

### **Step 2: Verify the Private Key Format**

The most common issue is the **FIREBASE_PRIVATE_KEY is malformed**.

#### Go to Vercel:
1. Settings → Environment Variables
2. Find `FIREBASE_PRIVATE_KEY`
3. Click to view (will be partially hidden)

#### ✅ **Correct Format:**
```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqh...[LONG STRING]...=\n-----END PRIVATE KEY-----\n
```

#### ❌ **Wrong Format #1** (missing `\n`):
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqh...
-----END PRIVATE KEY-----
```

#### ❌ **Wrong Format #2** (escaped):
```
-----BEGIN PRIVATE KEY-----\\nMIIEvQI...\\n-----END PRIVATE KEY-----\\n
```

#### ❌ **Wrong Format #3** (double-escaped):
```
"-----BEGIN PRIVATE KEY-----\\nMIIEvQI...\\n-----END PRIVATE KEY-----\\n"
```

**The `\n` characters MUST be literal backslash-n, NOT actual newlines.**

---

### **Step 3: Verify Project ID**

#### Check Vercel:
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` should be: `gouache-art`

#### Check Firebase Console:
1. Go to https://console.firebase.google.com/
2. Look at the URL: `console.firebase.google.com/project/YOUR-PROJECT-ID`
3. The project ID in the URL should match your Vercel variable

---

### **Step 4: Verify Service Account Permissions**

The service account might not have permission to write to Firestore.

#### Check Firebase Console:
1. Go to Firebase Console → Settings ⚙️ → Service Accounts
2. Click "Manage service account permissions" (opens Google Cloud Console)
3. Find your service account: `firebase-adminsdk-xxxxx@gouache-art.iam.gserviceaccount.com`
4. Check it has these roles:
   - ✅ **Firebase Admin SDK Administrator Service Agent**
   - ✅ **Cloud Datastore User** (or Owner)

---

## 🔧 RECOMMENDED FIX

Since you're getting PERMISSION_DENIED even with credentials set, I recommend:

### **Option 1: Regenerate Fresh Credentials**

1. **Delete old service account**:
   - Firebase Console → Settings → Service Accounts
   - Click "Manage service account permissions"
   - Find the old service account
   - Delete it

2. **Create new service account**:
   - Back to Firebase Console → Service Accounts
   - Click "Generate New Private Key"
   - Download fresh JSON

3. **Re-add to Vercel** (carefully):
   - Delete old `FIREBASE_PRIVATE_KEY` variable
   - Delete old `FIREBASE_CLIENT_EMAIL` variable
   - Add new ones from the fresh JSON
   - **CRITICAL**: Copy the `private_key` value EXACTLY as shown in JSON

4. **Redeploy**

---

### **Option 2: Test Locally First**

Add the credentials to your `.env.local` and test the webhook locally:

1. **Add to `.env.local`**:
```bash
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQI...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@gouache-art.iam.gserviceaccount.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="gouache-art"
```

2. **Test webhook locally**:
```bash
npm run dev
```

3. **Trigger a test webhook** (use Stripe CLI):
```bash
stripe trigger checkout.session.completed
```

4. **Check terminal for**:
```
✅ Firebase Admin SDK initialized
✅ Product purchase recorded
```

If it works locally but not on Vercel, the Vercel credentials are wrong.

---

## 🎯 QUICK VERIFICATION SCRIPT

Let me create a diagnostic endpoint to test the credentials:


