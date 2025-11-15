# Firebase Custom Domain Setup - Step by Step

## Quick Setup Guide

Follow these steps to configure Firebase to use your custom domain (`gouache.art`) for all authentication pages.

---

## Step 1: Add Authorized Domain

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **soma-social**
3. Click **Authentication** in the left sidebar
4. Click the **Settings** tab (gear icon at the top)
5. Scroll down to **Authorized domains**
6. Click **Add domain**
7. Enter: `gouache.art`
8. Click **Add**
9. ✅ Done! Your domain is now authorized

---

## Step 2: Update Email Templates (Optional but Recommended)

This ensures all email links use your custom domain.

### 2a. Email Address Verification Template

1. Still in **Authentication** → **Settings**
2. Click the **Email templates** tab
3. Click on **Email address verification**
4. Find the **Action URL** field
5. Replace the existing URL with:
   ```
   https://gouache.art/auth/verify-email?mode=verifyEmail&oobCode=%LINK%
   ```
6. Click **Save**

### 2b. Email Address Change Template

1. Still in **Email templates** tab
2. Click on **Email address change**
3. Find the **Action URL** field
4. Replace the existing URL with:
   ```
   https://gouache.art/auth/verify-email?mode=verifyAndChangeEmail&oobCode=%LINK%
   ```
5. Click **Save**

### 2c. Password Reset Template

1. Still in **Email templates** tab
2. Click on **Password reset**
3. Find the **Action URL** field
4. Replace the existing URL with:
   ```
   https://gouache.art/auth/reset-password?oobCode=%LINK%
   ```
5. Click **Save**

---

## Step 3: Verify It's Working

### Test Email Verification:
1. Go to your site: `https://gouache.art`
2. Log in
3. Go to **Profile** → **Edit**
4. Change your email address
5. Check your email inbox
6. Click the verification link
7. ✅ Should open on `gouache.art/auth/verify-email` (not Firebase)

### Test Password Reset:
1. Go to: `https://gouache.art/login`
2. Click **Forgot password?**
3. Enter your email
4. Check your email inbox
5. Click the reset link
6. ✅ Should open on `gouache.art/auth/reset-password` (not Firebase)

---

## Troubleshooting

### Links Still Go to Firebase?

**Check:**
- Did you add `gouache.art` to Authorized domains? (Step 1)
- Did you update the email templates? (Step 2)
- Did you save the changes?

**Fix:**
- Go back to Step 1 and verify `gouache.art` is in the list
- Go back to Step 2 and update all three templates
- Make sure you clicked **Save** after each change

### Verification/Reset Page Not Found?

**Check:**
- Is your site deployed with the new pages?
- Can you access `https://gouache.art/auth/verify-email` directly?

**Fix:**
- Rebuild and redeploy your application
- The pages should be at:
  - `/auth/verify-email`
  - `/auth/reset-password`

### Email Not Sending?

**Check:**
- Firebase Console → Authentication → Settings → Email templates
- Make sure email sending is enabled
- Check spam/junk folder

**Fix:**
- Verify your Firebase project has email sending enabled
- Check Firebase Console for any error messages
- Make sure your domain is verified in Firebase

---

## Summary Checklist

- [ ] Added `gouache.art` to Authorized domains
- [ ] Updated Email verification template
- [ ] Updated Email change template
- [ ] Updated Password reset template
- [ ] Tested email verification link
- [ ] Tested password reset link
- [ ] Verified links open on your domain (not Firebase)

---

## That's It!

Once you complete these steps, all authentication emails will redirect to your custom domain instead of Firebase's default pages.

**Time Required:** ~5 minutes

**Difficulty:** Easy

