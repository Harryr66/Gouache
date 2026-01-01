/**
 * Firebase Admin SDK Initialization
 * Used for server-side operations that bypass Firestore security rules
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

let adminDb: FirebaseFirestore.Firestore | null = null;

export function getAdminDb() {
  if (adminDb) {
    return adminDb;
  }

  if (getApps().length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!privateKey || !clientEmail || !projectId) {
      console.error('❌ Missing Firebase Admin credentials:', {
        hasPrivateKey: !!privateKey,
        hasClientEmail: !!clientEmail,
        hasProjectId: !!projectId,
      });
      throw new Error('Missing Firebase Admin credentials. Set FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and NEXT_PUBLIC_FIREBASE_PROJECT_ID in Vercel environment variables.');
    }

    console.log('🔧 Initializing Firebase Admin SDK...');
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✅ Firebase Admin SDK initialized');
  }

  adminDb = getFirestore();
  return adminDb;
}

// Export FieldValue for increment operations
export { FieldValue };

