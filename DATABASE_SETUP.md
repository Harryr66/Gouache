# Gouache Database Setup Guide

## Quick Setup Steps

### 1. Deploy Firestore Rules
The Firestore rules are already configured in `firestore-rules/firestore.rules`. Deploy them to your Firebase project:

```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not already done)
firebase init firestore

# Deploy the rules
firebase deploy --only firestore:rules
```

### 2. Enable Required Firebase Services

In your Firebase Console (https://console.firebase.google.com):

1. **Authentication**:
   - Go to Authentication > Sign-in method
   - Enable "Email/Password" provider
   - Enable "Google" provider (optional)

2. **Firestore Database**:
   - Go to Firestore Database
   - Create database in production mode
   - The rules from `firestore-rules/firestore.rules` will be applied

3. **Storage**:
   - Go to Storage
   - Get started with default rules
   - This will be used for image uploads

### 3. Required Collections

The app expects these Firestore collections:

- `userProfiles` - Main user profile data
- `handles` - Username uniqueness mapping
- `artworks` - Artwork/portfolio items
- `posts` - Social media posts
- `communities` - Community groups
- `conversations` - Direct messages
- `notifications` - User notifications

### 4. Test the Connection

After setting up the database, test the connection by:

1. Going to the profile edit page
2. Making a small change (like updating your bio)
3. Clicking save

If successful, you should see "Profile updated" instead of "Connection Error".

### 5. Troubleshooting

**If you still get connection errors:**

1. Check that your Firebase project ID matches the one in `src/lib/firebase.ts`
2. Verify that Firestore rules are deployed
3. Check that Authentication is enabled
4. Ensure Storage is set up for image uploads

**Common Issues:**

- **Permission denied**: Firestore rules not deployed or incorrect
- **Network error**: Check Firebase project configuration
- **Storage error**: Storage bucket not configured

### 6. Environment Variables (Optional)

Create a `.env.local` file with your Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Next Steps

Once the database is set up:

1. Test profile editing functionality
2. Test image uploads
3. Test community creation
4. Test artwork posting

The app should now work without connection errors!
