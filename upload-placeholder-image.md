# Upload Placeholder Image to Firebase Storage

## Option 1: Using Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **Get Started** if you haven't set up Storage yet
5. Click **Upload File**
6. Upload your placeholder image
7. After upload, click on the file to view its details
8. Copy the **Download URL** (it will look like: `https://firebasestorage.googleapis.com/v0/b/...`)
9. Use this URL in the code

## Option 2: Using Admin Panel

You can add an upload feature to the admin panel to upload placeholder images. The image will be stored in Firebase Storage and you'll get a public URL.

## Option 3: Manual Upload Script

If you want to upload via code, here's a simple script you can run:

```javascript
// Run this in browser console on your admin page
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

async function uploadPlaceholderImage(file) {
  const storageRef = ref(storage, `news/placeholder-${Date.now()}.${file.name.split('.').pop()}`);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  console.log('Placeholder image URL:', downloadURL);
  return downloadURL;
}

// Usage: uploadPlaceholderImage(yourFile)
```

## After Upload

Once you have the URL, update `src/app/(main)/news/page.tsx`:

```typescript
const PLACEHOLDER_ARTICLE: NewsArticle = {
  // ...
  imageUrl: 'YOUR_FIREBASE_STORAGE_URL_HERE',
  // ...
};
```

