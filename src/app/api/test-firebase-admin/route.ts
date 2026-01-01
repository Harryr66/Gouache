import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint to test Firebase Admin SDK credentials
 * GET /api/test-firebase-admin
 */
export async function GET(request: NextRequest) {
  console.log('🧪 Testing Firebase Admin SDK...');
  
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environmentVariables: {
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'NOT_SET',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'NOT_SET',
      privateKeyPreview: process.env.FIREBASE_PRIVATE_KEY 
        ? `${process.env.FIREBASE_PRIVATE_KEY.substring(0, 50)}...` 
        : 'NOT_SET',
      privateKeyHasHeader: process.env.FIREBASE_PRIVATE_KEY?.includes('-----BEGIN PRIVATE KEY-----') || false,
      privateKeyHasFooter: process.env.FIREBASE_PRIVATE_KEY?.includes('-----END PRIVATE KEY-----') || false,
      privateKeyHasLiteralBackslashN: process.env.FIREBASE_PRIVATE_KEY?.includes('\\n') || false,
      privateKeyHasActualNewlines: process.env.FIREBASE_PRIVATE_KEY?.includes('\n') || false,
    },
    tests: {
      initializationSuccess: false,
      canGetFirestore: false,
      canReadCollection: false,
      canWriteCollection: false,
    },
    errors: [] as string[],
  };

  // Test 1: Can we initialize Firebase Admin?
  try {
    const adminDb = getAdminDb();
    diagnostics.tests.initializationSuccess = true;
    diagnostics.tests.canGetFirestore = !!adminDb;
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error: any) {
    diagnostics.tests.initializationSuccess = false;
    diagnostics.errors.push(`Initialization error: ${error.message}`);
    console.error('❌ Firebase Admin initialization failed:', error);
    return NextResponse.json(diagnostics, { status: 500 });
  }

  // Test 2: Can we read from Firestore?
  try {
    const adminDb = getAdminDb();
    const testRead = await adminDb.collection('userProfiles').limit(1).get();
    diagnostics.tests.canReadCollection = true;
    diagnostics.readTestResult = {
      success: true,
      documentCount: testRead.size,
    };
    console.log('✅ Can read from Firestore');
  } catch (error: any) {
    diagnostics.tests.canReadCollection = false;
    diagnostics.errors.push(`Read error: ${error.message}`);
    diagnostics.readTestResult = {
      success: false,
      error: error.message,
      code: error.code,
    };
    console.error('❌ Cannot read from Firestore:', error);
  }

  // Test 3: Can we write to Firestore?
  try {
    const adminDb = getAdminDb();
    const testDocRef = adminDb.collection('_diagnostics').doc('test');
    
    await testDocRef.set({
      test: true,
      timestamp: new Date(),
      message: 'Firebase Admin SDK write test',
    });
    
    diagnostics.tests.canWriteCollection = true;
    diagnostics.writeTestResult = {
      success: true,
      message: 'Successfully wrote to _diagnostics collection',
    };
    console.log('✅ Can write to Firestore');
    
    // Clean up test document
    await testDocRef.delete();
  } catch (error: any) {
    diagnostics.tests.canWriteCollection = false;
    diagnostics.errors.push(`Write error: ${error.message}`);
    diagnostics.writeTestResult = {
      success: false,
      error: error.message,
      code: error.code,
    };
    console.error('❌ Cannot write to Firestore:', error);
  }

  // Test 4: Check if private key format is correct
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    const hasLiteralBackslashN = privateKey.includes('\\n');
    const hasActualNewlines = privateKey.includes('\n');
    
    if (!hasLiteralBackslashN && !hasActualNewlines) {
      diagnostics.warnings = diagnostics.warnings || [];
      diagnostics.warnings.push('Private key appears to have no newline characters (neither \\n nor actual newlines). This will likely cause authentication to fail.');
    }
    
    if (hasActualNewlines && !hasLiteralBackslashN) {
      diagnostics.warnings = diagnostics.warnings || [];
      diagnostics.warnings.push('Private key has actual newlines instead of \\n characters. This might work but is not the recommended format.');
    }
  }

  // Summary
  const allTestsPassed = 
    diagnostics.tests.initializationSuccess &&
    diagnostics.tests.canGetFirestore &&
    diagnostics.tests.canReadCollection &&
    diagnostics.tests.canWriteCollection;

  diagnostics.summary = {
    allTestsPassed,
    status: allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED',
    recommendation: allTestsPassed 
      ? 'Firebase Admin SDK is working correctly. If webhook still fails, check webhook logs for other issues.'
      : 'Firebase Admin SDK is NOT working. Check the errors above and verify environment variables in Vercel.',
  };

  return NextResponse.json(diagnostics, { 
    status: allTestsPassed ? 200 : 500,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

