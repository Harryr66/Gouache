# Custom Firebase Action Pages Setup

## Overview
All Firebase authentication action links (email verification, password reset, etc.) now redirect to your custom domain (`gouache.art`) instead of Firebase's default pages. This provides a better user experience and maintains your brand identity.

## What Was Changed

### 1. Created Custom Email Verification Page
- **Location**: `src/app/auth/verify-email/page.tsx`
- **Purpose**: Handles email verification on your domain
- **Features**:
  - Verifies email addresses
  - Handles email changes
  - Shows success/error states
  - Redirects to profile after verification
- **URL**: `https://gouache.art/auth/verify-email`

### 2. Created Custom Password Reset Page
- **Location**: `src/app/auth/reset-password/page.tsx`
- **Purpose**: Handles password reset on your domain
- **Features**:
  - Verifies reset link
  - Allows user to set new password
  - Shows success/error states
  - Redirects to login after reset
- **URL**: `https://gouache.art/auth/reset-password`

### 3. Updated Email Update Flow
- **Location**: `src/app/(main)/profile/edit/page.tsx`
- **Change**: Added `actionCodeSettings` to redirect to your domain
- **URL**: `https://gouache.art/auth/verify-email?mode=verifyAndChangeEmail`

### 4. Updated Password Reset Flow
- **Location**: `src/components/auth/login-form.tsx`
- **Change**: Updated `actionCodeSettings` to redirect to your domain
- **URL**: `https://gouache.art/auth/reset-password`

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

### Step 2: Update Email Templates (Optional but Recommended)
1. Still in **Authentication** → **Settings**
2. Click **Email templates** tab

3. **Email address verification** template:
   - Click on **Email address verification**
   - Update the **Action URL** to:
     ```
     https://gouache.art/auth/verify-email?mode=verifyEmail&oobCode=%LINK%
     ```
   - Click **Save**

4. **Email address change** template:
   - Click on **Email address change**
   - Update the **Action URL** to:
     ```
     https://gouache.art/auth/verify-email?mode=verifyAndChangeEmail&oobCode=%LINK%
     ```
   - Click **Save**

5. **Password reset** template:
   - Click on **Password reset**
   - Update the **Action URL** to:
     ```
     https://gouache.art/auth/reset-password?oobCode=%LINK%
     ```
   - Click **Save**

## How It Works

### Email Verification Flow
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

### Password Reset Flow
1. **User Requests Reset**:
   - User clicks "Forgot password?" on login page
   - System sends password reset email with link to `gouache.art/auth/reset-password`

2. **User Clicks Link**:
   - Link opens on your domain (not Firebase)
   - Reset page verifies the action code

3. **Password Reset Process**:
   - User enters new password
   - Page confirms password reset with Firebase
   - Shows success message
   - Redirects to login page

## Testing

1. **Test Email Update**:
   - Go to Profile → Edit
   - Change email address
   - Check email inbox
   - Click verification link
   - Should redirect to `gouache.art/auth/verify-email`
   - Should show success and redirect to profile

2. **Test Password Reset**:
   - Go to Login page
   - Click "Forgot password?"
   - Enter email address
   - Check email inbox
   - Click reset link
   - Should redirect to `gouache.art/auth/reset-password`
   - Enter new password
   - Should show success and redirect to login

3. **Test Expired Links**:
   - Use an old verification/reset link (if you have one)
   - Should show "expired" message
   - Should offer to request new link

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

