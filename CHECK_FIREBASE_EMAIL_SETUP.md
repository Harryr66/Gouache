# Check Firebase Email Setup - Quick Checklist

Since Firebase says the email was sent successfully, the email EXISTS in Firebase Auth. The issue is with email delivery.

## Immediate Checks

### 1. Verify Email Template is Configured
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: **soma-social**
3. Go to **Authentication** → **Email templates**
4. Click on **"Password reset"** template
5. **CRITICAL CHECKS:**
   - ✅ Template is **enabled** (toggle should be ON)
   - ✅ **Action URL** is set to: `https://gouache.art/login`
   - ✅ **Email subject** is set (should not be empty)
   - ✅ **Email body** contains the reset link placeholder
6. Click **Save** if you made any changes

### 2. Verify Domain is Authorized
1. In Firebase Console, go to **Authentication** → **Settings**
2. Scroll to **"Authorized domains"** section
3. Verify `gouache.art` is in the list
4. If missing, click **"Add domain"** and add: `gouache.art`
5. Wait 2-3 minutes for changes to propagate

### 3. Check Email Delivery Status
1. Check your **spam/junk folder** in the email inbox for `news@gouache.art`
2. Wait 5-10 minutes (email delivery can be delayed)
3. Check if your email provider (Outlook) is blocking Firebase emails
4. Try whitelisting Firebase emails: `noreply@firebaseapp.com` and `noreply@*.firebaseapp.com`

### 4. Verify Email in Firebase Auth
1. Go to **Authentication** → **Users**
2. Search for user with email: `news@gouache.art`
3. Verify:
   - ✅ Email is listed
   - ✅ Email is **verified** (checkmark icon)
   - ✅ Provider is **"password"** (email/password)
4. If email is not verified, that might affect delivery

## Common Issues

### Issue 1: Email Template Not Enabled
**Symptom**: Firebase says email sent, but no email received
**Fix**: Enable the password reset template in Firebase Console

### Issue 2: Wrong Action URL
**Symptom**: Email sent but link doesn't work
**Fix**: Set Action URL to `https://gouache.art/login` in email template

### Issue 3: Domain Not Authorized
**Symptom**: Email sent but blocked by Firebase
**Fix**: Add `gouache.art` to authorized domains

### Issue 4: Email in Spam
**Symptom**: Email sent but not in inbox
**Fix**: Check spam folder, whitelist Firebase emails

### Issue 5: Email Provider Blocking
**Symptom**: Email never arrives
**Fix**: Check Outlook spam settings, whitelist Firebase domain

## Quick Test

1. Try password reset with username: `gouacheadmin`
2. Check browser console - should show `existsInAuth: true`
3. Check email inbox AND spam folder for `news@gouache.art`
4. Wait 5-10 minutes
5. If still no email, check Firebase Console → Authentication → Email templates

## Next Steps if Still Not Working

1. **Check Firebase Console** → **Authentication** → **Users** → Find the user → What email is listed?
2. **Check Firebase Console** → **Authentication** → **Email templates** → Is password reset template enabled?
3. **Check Firebase Console** → **Authentication** → **Settings** → Is `gouache.art` in authorized domains?
4. **Try a different email** address that you know works with Firebase Auth
5. **Contact Firebase Support** if all above checks pass

