import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  const userId = 'gpHrttUCI9ZpfyBT8k1YIywh5j02'; // Hardcoded for this specific fix
  const correctName = 'Harry Rollerson'; // The correct name to use
  
  try {
    const adminDb = getAdminDb();
    const userRef = adminDb.collection('userProfiles').doc(userId);
    
    // Get current data first
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json({
        error: 'USER PROFILE DOES NOT EXIST',
        userId: userId,
        action: 'Need to create the document first',
      }, { status: 404 });
    }
    
    const oldData = userDoc.data()!;
    
    // Update displayName
    await userRef.update({
      displayName: correctName,
      name: correctName, // Also update 'name' field if it exists
    });
    
    // Verify the update
    const updatedDoc = await userRef.get();
    const newData = updatedDoc.data()!;
    
    return NextResponse.json({
      success: true,
      message: 'Display name updated successfully',
      userId: userId,
      before: {
        displayName: oldData.displayName || null,
        name: oldData.name || null,
      },
      after: {
        displayName: newData.displayName,
        name: newData.name,
      },
      nextSteps: 'Make a new purchase and emails will now show "Harry Rollerson"',
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

