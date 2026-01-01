# 🔥 CRITICAL: Vercel Environment Variables for Firebase Admin SDK

## THE PROBLEM FIXED
The webhook was failing with `PERMISSION_DENIED` errors because it was using the **client-side Firebase SDK**, which:
- Requires user authentication
- Subject to Firestore security rules
- Cannot write to database from server

## THE SOLUTION
Converted webhook to use **Firebase Admin SDK**, which:
- Bypasses all security rules
- Full database access
- Designed for server-side operations

---

## ⚠️ REQUIRED ENVIRONMENT VARIABLES IN VERCEL

You **MUST** add these 3 environment variables to Vercel for the webhook to work:

### 1. `FIREBASE_PRIVATE_KEY`
### 2. `FIREBASE_CLIENT_EMAIL`
### 3. `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (should already exist)

---

## 📝 HOW TO GET THESE VALUES

### Step 1: Go to Firebase Console
1. Open https://console.firebase.google.com/
2. Select your project (`soma-social`)
3. Click the ⚙️ gear icon > **Project settings**
4. Go to **Service accounts** tab

### Step 2: Generate Service Account Key
1. Click **Generate new private key**
2. Confirm by clicking **Generate key**
3. A JSON file will download (e.g., `soma-social-firebase-adminsdk-xxxxx.json`)

### Step 3: Extract the Values
Open the downloaded JSON file. It looks like this:

```json
{
  "type": "service_account",
  "project_id": "soma-social",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIB...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@soma-social.iam.gserviceaccount.com",
  ...
}
```

---

## 🔐 ADD TO VERCEL ENVIRONMENT VARIABLES

### Go to Vercel Dashboard:
1. https://vercel.com/[your-team]/[your-project]/settings/environment-variables
2. Add these **THREE** variables:

### Variable 1: `FIREBASE_PRIVATE_KEY`
- **Key**: `FIREBASE_PRIVATE_KEY`
- **Value**: Copy the ENTIRE `private_key` value from the JSON
  - **IMPORTANT**: Include the quotes, `\n` characters, and everything
  - Example: `"-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----\n"`
- **Environment**: Select **Production**, **Preview**, **Development** (all three)

### Variable 2: `FIREBASE_CLIENT_EMAIL`
- **Key**: `FIREBASE_CLIENT_EMAIL`
- **Value**: Copy the `client_email` value from the JSON
  - Example: `firebase-adminsdk-abc12@soma-social.iam.gserviceaccount.com`
- **Environment**: Select **Production**, **Preview**, **Development** (all three)

### Variable 3: `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- **Key**: `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- **Value**: `soma-social`
- **Environment**: Select **Production**, **Preview**, **Development** (all three)
- *(This should already exist, but verify it's set)*

---

## ✅ VERIFICATION

After adding these variables:

1. **Redeploy** your application in Vercel (or it will auto-deploy from the commit)
2. Test a purchase of the $0.50 Test Mug
3. Check Vercel logs - you should see:
   ```
   🔧 Initializing Firebase Admin SDK...
   ✅ Firebase Admin SDK initialized
   ✅ Payment verified
   ✅ Product purchase recorded with shipping address
   ✅ Payment captured successfully
   ✅ Funds transferred to connected account
   ```

---

## 🚨 SECURITY NOTES

1. **NEVER commit the service account JSON file to git**
2. **NEVER share these credentials publicly**
3. The private key in Vercel is encrypted and secure
4. You can regenerate the service account key anytime in Firebase Console if compromised

---

## 🐛 TROUBLESHOOTING

### If you still see permission errors:
1. Verify all 3 variables are set in Vercel
2. Check for typos in variable names (case-sensitive!)
3. Ensure `FIREBASE_PRIVATE_KEY` includes the full key with newlines
4. Check Vercel deployment logs for initialization messages
5. Try deleting and re-adding the variables if they seem corrupted

### Test the variables are loaded:
Check Vercel deployment logs for:
```
✅ Firebase Admin SDK initialized
```

If you see:
```
❌ Missing Firebase Admin credentials
```
Then one or more variables are not set correctly.

---

## WHAT THIS FIXES

Once these variables are set, the webhook will be able to:
- ✅ Create database records for purchases/enrollments
- ✅ Update product stock
- ✅ Send confirmation emails
- ✅ Capture payments
- ✅ Transfer funds to artists
- ✅ Handle refunds

**This is the ONLY way for the webhook to write to Firestore from the server.**

