# Custom Email Verification Domain Setup

## Overview
Email verification links now redirect to your custom domain (`gouache.art`) instead of Firebase's default page. This provides a better user experience and maintains your brand identity.

## What Was Changed

### 1. Created Custom Verification Page
- **Location**: `src/app/auth/verify-email/page.tsx`
- **Purpose**: Handles email verification on your domain
- **Features**:
  - Verifies email addresses
  - Handles email changes
  - Shows success/error states
  - Redirects to profile after verification

### 2. Updated Email Update Flow
- **Location**: `src/app/(main)/profile/edit/page.tsx`
- **Change**: Added `actionCodeSettings` to redirect to your domain
- **URL**: `https://gouache.art/auth/verify-email?mode=verifyAndChangeEmail`

## Firebase Console Configuration

### Step 1: Add Authorized Domain
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **soma-social**
3. Click **Authentication** (left sidebar)
4. Click **Settings** tab
5. Scroll to **Authorized domains**
6. Click **Add domain**
7. Enter: `gouache.art`
8. Click **Add**

### Step 2: Update Email Templates (Optional)
1. Still in **Authentication** → **Settings**
2. Click **Email templates** tab
3. Click on **Email address verification** template
4. Update the **Action URL** to:
   ```
   https://gouache.art/auth/verify-email?mode=verifyEmail&oobCode=%LINK%
   ```
5. Click **Save**

### Step 3: Update Email Change Template (Optional)
1. Still in **Email templates**
2. Click on **Email address change** template
3. Update the **Action URL** to:
   ```
   https://gouache.art/auth/verify-email?mode=verifyAndChangeEmail&oobCode=%LINK%
   ```
4. Click **Save**

## How It Works

1. **User Updates Email**:
   - User changes email in profile edit
   - System sends verification email with link to `gouache.art/auth/verify-email`

2. **User Clicks Link**:
   - Link opens on your domain (not Firebase)
   - Verification page extracts action code from URL

3. **Verification Process**:
   - Page verifies the action code with Firebase
   - Applies the email change
   - Shows success message
   - Redirects to profile edit page

4. **Auto-Sync**:
   - Auth provider detects email change
   - Automatically syncs Firestore email to match Firebase Auth

## Testing

1. **Test Email Update**:
   - Go to Profile → Edit
   - Change email address
   - Check email inbox
   - Click verification link
   - Should redirect to `gouache.art/auth/verify-email`
   - Should show success and redirect to profile

2. **Test Expired Link**:
   - Use an old verification link (if you have one)
   - Should show "expired" message
   - Should offer to request new verification email

## Troubleshooting

### Link Still Goes to Firebase
- **Check**: Firebase Console → Authentication → Settings → Authorized domains
- **Fix**: Make sure `gouache.art` is in the list

### Verification Fails
- **Check**: Browser console for errors
- **Check**: Firebase Console → Authentication → Settings → Email templates
- **Fix**: Make sure Action URL includes `%LINK%` placeholder

### Page Not Found
- **Check**: Deployment includes `/auth/verify-email` route
- **Fix**: Rebuild and redeploy the application

## Security Notes

- Action codes are single-use and expire after a set time
- Verification happens server-side through Firebase Auth
- No sensitive data is exposed in the URL (action codes are secure tokens)
- All verification is handled by Firebase's secure authentication system

