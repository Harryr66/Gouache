# Fix Password Reset Email - Step by Step Guide

## Problem
Password reset emails are not being received even though Firebase says they're sent successfully.

## Quick Diagnosis Steps

### Step 1: Check Browser Console
1. Open your browser's Developer Tools (F12 or right-click → Inspect)
2. Go to the "Console" tab
3. Try the password reset again
4. Look for this line: `✅ Email verification result:`
5. Check if it says `existsInAuth: true` or `existsInAuth: false`

**If `existsInAuth: false`**: The email exists in Firestore but NOT in Firebase Auth. Go to Step 2.
**If `existsInAuth: true`**: The email exists in Firebase Auth. Go to Step 3.

---

## Step 2: Fix Email Mismatch (If existsInAuth: false)

### Option A: Find the Correct Email in Firebase Auth
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **soma-social**
3. Go to **Authentication** → **Users**
4. Search for the user by username: `gouacheadmin`
5. Check what email is listed there (this is the correct email)
6. Use THAT email for password reset (not the one from Firestore)

### Option B: Update Firestore to Match Firebase Auth
1. In Firebase Console → **Authentication** → **Users**, find the correct email
2. Go to **Firestore Database**
3. Find the user document in `userProfiles` collection
4. Update the `email` field to match the email in Firebase Auth
5. Save the document

---

## Step 3: Check Firebase Email Configuration (If existsInAuth: true)

### 3.1: Verify Email Template is Enabled
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **soma-social**
3. Go to **Authentication** → **Email templates** (or **Templates** tab)
4. Find **"Password reset"** template
5. Click on it
6. Verify:
   - ✅ Template is **enabled**
   - ✅ **Action URL** is set to: `https://gouache.art/login` (or your domain)
   - ✅ App name and logo are set correctly
7. Click **Save** if you made any changes

### 3.2: Verify Authorized Domains
1. In Firebase Console, go to **Authentication** → **Settings**
2. Scroll down to **Authorized domains**
3. Verify these domains are listed:
   - ✅ `gouache.art`
   - ✅ `localhost` (for development)
   - ✅ Any other domains you use
4. If `gouache.art` is missing, click **Add domain** and add it
5. Wait 2-3 minutes for changes to take effect

### 3.3: Check Email Delivery
1. Check the **spam/junk folder** in your email inbox
2. Wait 5-10 minutes (email delivery can be delayed)
3. Check if your email provider is blocking Firebase emails
4. Try a different email address that you know works

---

## Step 4: Test Again

1. Clear your browser console
2. Try password reset again
3. Check console for:
   - `✅ Email verification result: { existsInAuth: true }`
   - `✅ sendPasswordResetEmail completed successfully`
4. Check your email inbox AND spam folder
5. If still not working, check Firebase Console → **Authentication** → **Users** to verify the email

---

## Common Issues & Quick Fixes

| Issue | Fix |
|-------|-----|
| Email in Firestore ≠ Email in Firebase Auth | Use the email from Firebase Auth, or update Firestore to match |
| Email template not enabled | Enable it in Firebase Console → Authentication → Email templates |
| Domain not authorized | Add domain in Firebase Console → Authentication → Settings → Authorized domains |
| Email in spam | Check spam/junk folder |
| Email delay | Wait 5-10 minutes |

---

## Still Not Working?

1. **Check Firebase Console → Authentication → Users**
   - Does the email `news@gouache.art` exist?
   - What is the exact email address listed?

2. **Check Browser Console**
   - What does `existsInAuth` show?
   - Are there any error messages?

3. **Try a different email**
   - Use an email you know exists in Firebase Auth
   - Test if password reset works for that email

4. **Check Firebase Status**
   - Go to [Firebase Status Page](https://status.firebase.google.com)
   - Check if there are any service disruptions

---

## Summary Checklist

- [ ] Checked browser console for `existsInAuth` value
- [ ] Verified email exists in Firebase Auth (Authentication → Users)
- [ ] Updated Firestore email to match Firebase Auth (if needed)
- [ ] Enabled password reset email template in Firebase Console
- [ ] Set action URL in email template to `https://gouache.art/login`
- [ ] Added `gouache.art` to authorized domains
- [ ] Checked spam/junk folder
- [ ] Waited 5-10 minutes for email delivery
- [ ] Tested with a different email address

