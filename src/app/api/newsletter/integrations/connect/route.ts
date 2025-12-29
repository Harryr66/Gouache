import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey, formId, userId } = body;

    if (!provider || !userId) {
      return NextResponse.json(
        { error: 'Provider and user ID are required' },
        { status: 400 }
      );
    }

    // For custom provider, only need URL (handled client-side)
    if (provider === 'custom') {
      return NextResponse.json({
        success: true,
        message: 'Custom provider connection handled client-side'
      });
    }

    // For API-based providers, validate credentials
    if (!apiKey || !formId) {
      return NextResponse.json(
        { error: 'API key and form ID are required' },
        { status: 400 }
      );
    }

    // Test the connection with the provider
    let testResult;
    try {
      if (provider === 'convertkit') {
        // Test ConvertKit connection
        const testUrl = `https://api.convertkit.com/v3/forms/${formId}?api_secret=${apiKey}`;
        const testResponse = await fetch(testUrl);
        
        if (!testResponse.ok) {
          const errorData = await testResponse.json().catch(() => ({}));
          throw new Error(errorData.message || 'Invalid ConvertKit credentials');
        }
        
        testResult = await testResponse.json();
      } else if (provider === 'mailchimp') {
        // Extract datacenter from API key (format: key-datacenter)
        const datacenter = apiKey.split('-')[1];
        if (!datacenter) {
          throw new Error('Invalid Mailchimp API key format');
        }
        
        const testUrl = `https://${datacenter}.api.mailchimp.com/3.0/lists/${formId}`;
        const testResponse = await fetch(testUrl, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        
        if (!testResponse.ok) {
          const errorData = await testResponse.json().catch(() => ({}));
          throw new Error(errorData.title || 'Invalid Mailchimp credentials');
        }
        
        testResult = await testResponse.json();
      } else if (provider === 'substack') {
        // Substack API is more complex, basic validation
        if (!formId || formId.length < 3) {
          throw new Error('Invalid Substack publication ID');
        }
        // Note: Substack API requires OAuth for full access
        // For now, we'll just validate the format
        testResult = { valid: true };
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: `Connection test failed: ${error.message}` },
        { status: 400 }
      );
    }

    // Store credentials securely
    // Note: In production, you should encrypt the API key before storing
    // For now, we'll store it (but it should be encrypted in a real implementation)
    const userDocRef = doc(db, 'userProfiles', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user profile with newsletter integration
    await updateDoc(userDocRef, {
      newsletterProvider: provider,
      newsletterFormId: formId,
      newsletterConnectedAt: new Date(),
      // Note: In production, encrypt apiKey before storing
      // For MVP, we'll store it (but this should be encrypted)
      newsletterApiKey: apiKey, // TODO: Encrypt this
    });

    return NextResponse.json({
      success: true,
      message: 'Newsletter integration connected successfully',
      provider,
      formId,
    });
  } catch (error: any) {
    console.error('Error connecting newsletter:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect newsletter' },
      { status: 500 }
    );
  }
}

