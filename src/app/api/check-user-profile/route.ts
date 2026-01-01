import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  const userId = 'gpHrttUCI9ZpfyBT8k1YIywh5j02'; // Hardcoded for this specific check
  
  try {
    const adminDb = getAdminDb();
    const userDoc = await adminDb.collection('userProfiles').doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({
        error: 'USER PROFILE DOES NOT EXIST',
        userId: userId,
        solution: 'Need to create userProfiles document for this user',
      });
    }
    
    const userData = userDoc.data()!;
    
    return NextResponse.json({
      success: true,
      userId: userId,
      exists: true,
      data: {
        displayName: userData.displayName || null,
        name: userData.name || null,
        username: userData.username || null,
        handle: userData.handle || null,
        email: userData.email || null,
        allFields: Object.keys(userData),
      },
      diagnosis: {
        hasDisplayName: !!userData.displayName,
        displayNameValue: userData.displayName,
        displayNameType: typeof userData.displayName,
        willFallbackToStripe: !userData.displayName,
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

