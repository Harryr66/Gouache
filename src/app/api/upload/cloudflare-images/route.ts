import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side API route for uploading images to Cloudflare Images
 * This keeps API tokens secure and avoids CORS issues
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Cloudflare Images uses account ID (same as Stream), not account hash
    // The account hash is only for the delivery URL (imagedelivery.net)
    // Try multiple ways to access env vars (Next.js can be inconsistent)
    const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID || 
                      process.env.CLOUDFLARE_ACCOUNT_ID;
    const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH || 
                        process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH;
    const apiToken = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN || 
                     process.env.CLOUDFLARE_IMAGES_API_TOKEN;

    // Debug: Log environment variable status
    const allEnvKeys = Object.keys(process.env).filter(k => k.includes('CLOUDFLARE'));
    console.log('🔍 Cloudflare Images API: Environment check...', {
      accountId: accountId ? `${accountId.substring(0, 8)}...` : 'MISSING',
      accountHash: accountHash ? `${accountHash.substring(0, 8)}...` : 'MISSING',
      hasToken: !!apiToken,
      tokenLength: apiToken ? apiToken.length : 0,
      allEnvKeys: allEnvKeys,
      allEnvKeysCount: allEnvKeys.length,
      nodeEnv: process.env.NODE_ENV,
    });

    if (!accountId || !apiToken) {
      const envKeys = Object.keys(process.env).filter(k => k.includes('CLOUDFLARE'));
      console.error('❌ Cloudflare Images: Missing credentials', {
        hasAccountId: !!accountId,
        hasApiToken: !!apiToken,
        envKeys: envKeys,
        envKeysCount: envKeys.length,
        nodeEnv: process.env.NODE_ENV,
        // Log first few chars of actual values if they exist (for debugging)
        accountIdPreview: accountId ? `${accountId.substring(0, 4)}...` : 'undefined',
        tokenPreview: apiToken ? `${apiToken.substring(0, 4)}...` : 'undefined',
      });
      
      // Provide helpful error message
      return NextResponse.json(
        { 
          error: 'Cloudflare Images credentials not configured',
          details: {
            hasAccountId: !!accountId,
            hasApiToken: !!apiToken,
            hint: 'Make sure NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID and NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN are set in .env.local and the server has been restarted',
          }
        },
        { status: 500 }
      );
    }

    // Upload image to Cloudflare Images
    // Cloudflare Images API expects multipart/form-data, not raw buffer
    console.log('🔍 Cloudflare Images API: Uploading image directly...', {
      accountId: accountId ? `${accountId.substring(0, 8)}...` : 'MISSING',
      accountHash: accountHash ? `${accountHash.substring(0, 8)}...` : 'MISSING',
      hasToken: !!apiToken,
      fileSize: file.size,
      fileName: file.name,
      fileType: file.type,
    });

    // Upload image directly to Cloudflare Images
    // Cloudflare Images API expects the file as multipart/form-data
    // Convert File to Blob for proper FormData handling in Node.js
    let fileBuffer: ArrayBuffer;
    let fileBlob: Blob;
    let cloudflareFormData: FormData;
    
    try {
      fileBuffer = await file.arrayBuffer();
      fileBlob = new Blob([fileBuffer], { type: file.type });
      cloudflareFormData = new FormData();
      cloudflareFormData.append('file', fileBlob, file.name);
    } catch (prepError: any) {
      console.error('❌ Error preparing file for upload:', {
        error: prepError?.message,
        stack: prepError?.stack,
        name: prepError?.name,
      });
      return NextResponse.json(
        { 
          error: `Failed to prepare file: ${prepError?.message || 'Unknown error'}`,
          ...(process.env.NODE_ENV === 'development' && { details: prepError?.stack })
        },
        { status: 500 }
      );
    }

    console.log('📤 Sending to Cloudflare Images:', {
      fileSize: file.size,
      fileName: file.name,
      fileType: file.type,
      formDataSize: fileBuffer.byteLength,
    });

    let uploadResponse: Response;
    try {
      uploadResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            // Don't set Content-Type - fetch will set it with boundary for FormData
          },
          body: cloudflareFormData,
        }
      );
    } catch (fetchError: any) {
      console.error('❌ Error calling Cloudflare Images API (fetch failed):', {
        error: fetchError?.message,
        stack: fetchError?.stack,
        name: fetchError?.name,
        code: fetchError?.code,
      });
      return NextResponse.json(
        { 
          error: `Network error calling Cloudflare: ${fetchError?.message || 'Unknown error'}`,
          ...(process.env.NODE_ENV === 'development' && { details: fetchError?.stack })
        },
        { status: 500 }
      );
    }

    if (!uploadResponse.ok) {
      let errorText: string;
      try {
        errorText = await uploadResponse.text();
      } catch (textError) {
        errorText = `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`;
      }
      
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { errors: [{ message: errorText }] };
      }
      
      console.error('❌ Cloudflare Images API Error:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: error.errors?.[0]?.message || errorText,
        fullError: error,
      });
      
      return NextResponse.json(
        { error: `Failed to upload image: ${error.errors?.[0]?.message || errorText || 'Unknown error'}` },
        { status: uploadResponse.status >= 400 && uploadResponse.status < 600 ? uploadResponse.status : 500 }
      );
    }

    let responseData: any;
    try {
      responseData = await uploadResponse.json();
    } catch (jsonError: any) {
      console.error('❌ Error parsing Cloudflare Images response:', jsonError);
      return NextResponse.json(
        { error: `Failed to parse Cloudflare Images response: ${jsonError.message || 'Invalid JSON'}` },
        { status: 500 }
      );
    }

    if (!responseData || !responseData.result) {
      console.error('❌ Invalid Cloudflare Images response structure:', responseData);
      return NextResponse.json(
        { error: 'Invalid response from Cloudflare Images API' },
        { status: 500 }
      );
    }

    const { result } = responseData;
    const imageId = result.id;

    if (!imageId) {
      console.error('❌ Missing image ID in Cloudflare Images response:', result);
      return NextResponse.json(
        { error: 'Cloudflare Images did not return an image ID' },
        { status: 500 }
      );
    }

    // Cloudflare Images returns the image ID
    // We need to construct the delivery URL using the account hash
    // If account hash is not available, use the default public variant
    const baseUrl = accountHash 
      ? `https://imagedelivery.net/${accountHash}/${imageId}/public`
      : result.variants?.[0] || `https://imagedelivery.net/${imageId}/public`;

    // Generate variant URLs using your custom variant names (1080px, 720px, Thumbnail, public)
    const variants = {
      thumbnail: accountHash ? `https://imagedelivery.net/${accountHash}/${imageId}/Thumbnail` : baseUrl,
      '720px': accountHash ? `https://imagedelivery.net/${accountHash}/${imageId}/720px` : baseUrl,
      '1080px': accountHash ? `https://imagedelivery.net/${accountHash}/${imageId}/1080px` : baseUrl,
      public: baseUrl,
      full: baseUrl,
    };

    console.log('✅ Cloudflare Images upload successful:', {
      imageId,
      baseUrl,
      hasVariants: !!accountHash,
    });

    const response = NextResponse.json({
      imageId,
      url: variants['1080px'], // Default to 1080px (Instagram quality)
      variants,
      provider: 'cloudflare',
      width: result.metadata?.width || result.dimensions?.width,
      height: result.metadata?.height || result.dimensions?.height,
    });

    // Set cache headers for optimal browser caching
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    
    return response;
  } catch (error: any) {
    const errorDetails = {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      cause: error?.cause,
      error: String(error),
    };
    
    console.error('❌ Unexpected error in Cloudflare Images upload:', errorDetails);
    
    // Return detailed error in development, generic in production
    return NextResponse.json(
      { 
        error: `Cloudflare Images upload failed: ${error?.message || 'Unknown error'}`,
        ...(process.env.NODE_ENV === 'development' && {
          details: errorDetails,
          hint: 'Check server console for full error details'
        })
      },
      { status: 500 }
    );
  }
}

