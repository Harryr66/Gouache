# Password Reset Email Fix - Step by Step

## Step 1: Check Browser Console
1. Open browser (Chrome/Firefox)
2. Press **F12** (or right-click → Inspect)
3. Click **Console** tab
4. Try password reset with username: `gouacheadmin`
5. Look for: `✅ Email verification result:`
6. Check: Does it say `existsInAuth: true` or `false`?

**If `false`**: Go to Step 2A
**If `true`**: Go to Step 2B

---

## Step 2A: Fix Email Mismatch (if existsInAuth: false)

1. Go to: https://console.firebase.google.com
2. Select project: **soma-social**
3. Click **Authentication** (left menu)
4. Click **Users** tab
5. Find user: `gouacheadmin` (search or scroll)
6. **Check the email listed** - this is the correct email
7. Use THAT email for password reset (not `news@gouache.art`)

**OR** update Firestore to match:
- Click **Firestore Database** (left menu)
- Find collection: `userProfiles`
- Find document for user `gouacheadmin`
- Edit `email` field to match Firebase Auth email
- Save

---

## Step 2B: Fix Email Delivery (if existsInAuth: true)

### A. Check Email Template
1. Go to: https://console.firebase.google.com
2. Select project: **soma-social**
3. Click **Authentication** (left menu)
4. Click **Email templates** tab (or **Templates**)
5. Click **"Password reset"** template
6. Check these settings:
   - ✅ **Enabled** toggle is ON
   - ✅ **Action URL** = `https://gouache.art/login`
   - ✅ **Email subject** is not empty
7. Click **Save** (if you changed anything)

### B. Check Authorized Domains
1. Still in Firebase Console → **Authentication**
2. Click **Settings** tab
3. Scroll down to **"Authorized domains"**
4. Check if `gouache.art` is in the list
5. If missing:
   - Click **"Add domain"**
   - Type: `gouache.art`
   - Click **Add**
   - Wait 2-3 minutes

### C. Check Email Delivery
1. Open email inbox for: `news@gouache.art`
2. Check **Spam/Junk folder**
3. Wait 5-10 minutes (email can be delayed)
4. Check if Outlook is blocking emails:
   - Look for any blocked email notifications
   - Check Outlook spam filter settings

---

## Step 3: Test Again
1. Clear browser console (click 🚫 icon)
2. Try password reset with username: `gouacheadmin`
3. Check console - should show `existsInAuth: true`
4. Check email inbox AND spam folder
5. Wait 5-10 minutes

---

## Step 4: If Still Not Working

1. **Check Firebase Console → Authentication → Users**
   - What email is listed for user `gouacheadmin`?
   - Is it `news@gouache.art` or something else?

2. **Check Browser Console**
   - What does `existsInAuth` show?
   - Any error messages?

3. **Try Different Email**
   - Use an email you know exists in Firebase Auth
   - Test if password reset works for that email

---

## Quick Checklist

- [ ] Checked browser console for `existsInAuth` value
- [ ] Verified email in Firebase Auth (Authentication → Users)
- [ ] Enabled password reset email template
- [ ] Set Action URL to `https://gouache.art/login`
- [ ] Added `gouache.art` to authorized domains
- [ ] Checked spam/junk folder
- [ ] Waited 5-10 minutes
- [ ] Tested again

---

## Most Common Fix

**90% of cases**: Email template Action URL is missing or wrong.

**Fix**: 
1. Firebase Console → Authentication → Email templates
2. Click "Password reset"
3. Set Action URL to: `https://gouache.art/login`
4. Click Save

