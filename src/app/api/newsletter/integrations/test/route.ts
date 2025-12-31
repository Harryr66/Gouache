import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey, formId } = body;

    if (!provider || !apiKey || !formId) {
      return NextResponse.json(
        { error: 'Provider, API key, and form ID are required' },
        { status: 400 }
      );
    }

    try {
      if (provider === 'convertkit') {
        // Test ConvertKit connection
        const testUrl = `https://api.convertkit.com/v3/forms/${formId}?api_secret=${apiKey}`;
        const testResponse = await fetch(testUrl);
        
        if (!testResponse.ok) {
          const errorData = await testResponse.json().catch(() => ({}));
          throw new Error(errorData.message || 'Invalid ConvertKit credentials');
        }
        
        const data = await testResponse.json();
        return NextResponse.json({
          success: true,
          message: `Successfully connected to ConvertKit form: ${data.form?.name || formId}`,
          formName: data.form?.name,
        });
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
        
        const data = await testResponse.json();
        return NextResponse.json({
          success: true,
          message: `Successfully connected to Mailchimp list: ${data.name || formId}`,
          listName: data.name,
        });
      } else if (provider === 'substack') {
        // Substack API is more complex, basic validation
        if (!formId || formId.length < 3) {
          throw new Error('Invalid Substack publication ID');
        }
        // Note: Substack API requires OAuth for full access
        // For now, we'll just validate the format
        return NextResponse.json({
          success: true,
          message: 'Substack publication ID format is valid',
          note: 'Full API access requires OAuth setup',
        });
      } else {
        return NextResponse.json(
          { error: 'Unsupported provider' },
          { status: 400 }
        );
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: `Connection test failed: ${error.message}` },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error testing newsletter connection:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to test connection' },
      { status: 500 }
    );
  }
}


