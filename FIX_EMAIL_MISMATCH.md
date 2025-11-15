# Fix Email Mismatch - Quick Steps

## Problem
Email `news@gouache.art` exists in Firestore but NOT in Firebase Auth.
Firebase cannot send emails to addresses that don't exist in Firebase Auth.

## Solution: Find the Correct Email

### Step 1: Find the Real Email in Firebase Auth
1. Go to: https://console.firebase.google.com
2. Select project: **soma-social**
3. Click **Authentication** (left sidebar)
4. Click **Users** tab
5. Find user with username/handle: `gouacheadmin`
   - You can search or scroll through the list
6. **Look at the email address listed** - this is the correct email
7. **Write it down** - you'll need it

### Step 2: Choose One Option

#### Option A: Use the Correct Email for Password Reset
- Use the email you found in Step 1
- Enter that email (not the username) in the password reset field
- Try password reset again

#### Option B: Update Firestore to Match Firebase Auth
1. Still in Firebase Console
2. Click **Firestore Database** (left sidebar)
3. Click **userProfiles** collection
4. Find the document for user `gouacheadmin`
5. Click on the document to open it
6. Find the `email` field
7. Click the edit icon (pencil)
8. Change it to match the email from Firebase Auth (Step 1)
9. Click **Update**
10. Now try password reset with username again

---

## Quick Fix (Recommended)

**Just use the email from Firebase Auth directly:**
1. Find the email in Firebase Console → Authentication → Users
2. Use that email (not username) in the password reset field
3. Click "Send Reset Link"

This will work immediately without changing any data.

---

## Why This Happened

The email in Firestore (`news@gouache.art`) doesn't match the email used to create the account in Firebase Auth. This can happen if:
- Account was created manually
- Email was changed in Firestore but not in Firebase Auth
- Account was created through a different process

## After Fixing

Once you've either:
- Updated Firestore email to match Firebase Auth, OR
- Used the correct email from Firebase Auth

The password reset will work because Firebase can now find the email in Firebase Auth.

