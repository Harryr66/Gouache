import { NextRequest, NextResponse } from 'next/server';

/**
 * Create a direct creator upload URL for large files
 * This endpoint only creates the URL (small request), the file upload happens client-to-Cloudflare
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body - handle both JSON and form data
    let body: any = {};
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      // If no body, use defaults
      body = {};
    }
    
    const { maxDurationSeconds = 3600, allowedOrigins = ['*'] } = body;

    const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json(
        { error: 'Cloudflare Stream credentials not configured' },
        { status: 500 }
      );
    }

    // Create direct creator upload URL
    // Cloudflare Stream direct_user endpoint - try with NO body first
    // Some APIs require empty body or no body at all
    console.log('📤 Creating direct creator upload URL:', {
      accountId: accountId ? `${accountId.substring(0, 8)}...` : 'MISSING',
      hasToken: !!apiToken,
      endpoint: `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
    });
    
    // Try with empty body first (no Content-Type header)
    let response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          // Don't set Content-Type - let Cloudflare determine it
        },
        // No body at all
      }
    );
    
    // If that fails, try with JSON body
    if (!response.ok && response.status === 400) {
      console.log('⚠️ Empty body failed, trying with JSON body...');
      const jsonBody = {
        maxDurationSeconds,
        allowedOrigins,
      };
      response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(jsonBody),
        }
      );
    }
    
    // If that also fails, try without direct_user parameter (regular upload endpoint)
    if (!response.ok && response.status === 400) {
      console.log('⚠️ direct_user failed, this endpoint may not be available');
      // Don't try regular upload here - that's handled in the main route
    }

    if (!response.ok) {
      const errorText = await response.text();
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { errors: [{ message: errorText }] };
      }
      
      // Log ALL response headers for debugging
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      console.error('❌ Failed to create direct creator upload URL:', {
        status: response.status,
        statusText: response.statusText,
        error: error.errors?.[0]?.message || errorText,
        fullError: error,
        responseHeaders: responseHeaders,
        rawErrorText: errorText.substring(0, 1000), // First 1000 chars
      });

      return NextResponse.json(
        { 
          error: error.errors?.[0]?.message || errorText,
          debug: {
            status: response.status,
            statusText: response.statusText,
            errorText: errorText,
            fullError: error,
            responseHeaders: responseHeaders,
          }
        },
        { status: response.status }
      );
    }

    const { result } = await response.json();

    return NextResponse.json({
      uploadURL: result.uploadURL,
      videoId: result.uid,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to create upload URL: ${error.message}` },
      { status: 500 }
    );
  }
}
