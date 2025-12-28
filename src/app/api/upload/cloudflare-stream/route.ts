import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side API route for uploading videos to Cloudflare Stream
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

    const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN;

    // Debug: Log environment variable status
    console.log('🔍 Cloudflare Stream API: Environment check...', {
      accountId: accountId ? `${accountId.substring(0, 8)}...` : 'MISSING',
      hasToken: !!apiToken,
      tokenLength: apiToken ? apiToken.length : 0,
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('CLOUDFLARE')),
    });

    if (!accountId || !apiToken) {
      console.error('❌ Cloudflare Stream: Missing credentials', {
        hasAccountId: !!accountId,
        hasApiToken: !!apiToken,
        envKeys: Object.keys(process.env).filter(k => k.includes('CLOUDFLARE')),
      });
      return NextResponse.json(
        { error: 'Cloudflare Stream credentials not configured' },
        { status: 500 }
      );
    }

    // Step 1: Upload video directly to Cloudflare Stream
    // Cloudflare Stream expects multipart/form-data, not raw buffer
    console.log('🔍 Cloudflare Stream API: Uploading video directly...', {
      accountId: accountId ? `${accountId.substring(0, 8)}...` : 'MISSING',
      hasToken: !!apiToken,
      fileSize: file.size,
      fileName: file.name,
    });

    // Upload video directly to Cloudflare Stream
    // Cloudflare Stream API expects the file as multipart/form-data
    // Convert File to Blob for proper FormData handling in Node.js
    const fileBuffer = await file.arrayBuffer();
    const fileBlob = new Blob([fileBuffer], { type: file.type });
    
    const cloudflareFormData = new FormData();
    cloudflareFormData.append('file', fileBlob, file.name);

    console.log('📤 Sending to Cloudflare Stream:', {
      fileSize: file.size,
      fileName: file.name,
      fileType: file.type,
      formDataSize: fileBuffer.byteLength,
      endpoint: `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`,
    });

    let uploadResponse: Response;
    try {
      uploadResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`,
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
      console.error('❌ Error calling Cloudflare Stream API (fetch failed):', {
        error: fetchError?.message,
        stack: fetchError?.stack,
        name: fetchError?.name,
        code: fetchError?.code,
      });
      return NextResponse.json(
        { 
          error: `Network error calling Cloudflare Stream: ${fetchError?.message || 'Unknown error'}`,
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
        // If it's not JSON, treat the text as the error message
        error = { errors: [{ message: errorText }] };
      }
      
      console.error('❌ Cloudflare Stream API Error:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: error.errors?.[0]?.message || errorText,
        fullError: error,
        errorText: errorText,
        hint: uploadResponse.status === 403 ? 'Check API token permissions for Cloudflare Stream' : undefined,
      });
      
      return NextResponse.json(
        { 
          error: `Failed to upload video: ${error.errors?.[0]?.message || errorText || 'Unknown error'}`,
          status: uploadResponse.status,
          ...(uploadResponse.status === 403 && {
            hint: 'API token may not have Stream permissions. Check token permissions in Cloudflare dashboard.'
          })
        },
        { status: uploadResponse.status >= 400 && uploadResponse.status < 600 ? uploadResponse.status : 500 }
      );
    }

    const { result } = await uploadResponse.json();
    const videoId = result.uid;

    // Step 2: Wait for processing and get video details
    const videoDetails = await waitForVideoProcessing(accountId, apiToken, videoId);

    return NextResponse.json({
      videoId: videoDetails.uid,
      playbackUrl: `https://customer-${accountId}.cloudflarestream.com/${videoDetails.uid}/manifest/video.m3u8`,
      thumbnailUrl: videoDetails.thumbnail || `https://customer-${accountId}.cloudflarestream.com/${videoDetails.uid}/thumbnails/thumbnail.jpg`,
      duration: videoDetails.duration || 0,
      provider: 'cloudflare',
    });
  } catch (error: any) {
    console.error('Error uploading video to Cloudflare Stream:', error);
    return NextResponse.json(
      { error: `Cloudflare Stream upload failed: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * Wait for video processing to complete
 */
async function waitForVideoProcessing(
  accountId: string,
  apiToken: string,
  videoId: string,
  maxWaitTime: number = 60000 // 60 seconds max
): Promise<any> {
  const startTime = Date.now();
  const pollInterval = 2000; // Check every 2 seconds

  while (Date.now() - startTime < maxWaitTime) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to check video status: ${response.statusText}`);
    }

    const { result } = await response.json();
    
    // Video is ready when status is 'ready'
    if (result.status?.state === 'ready') {
      return result;
    }

    // If failed, throw error
    if (result.status?.state === 'error') {
      throw new Error(`Video processing failed: ${result.status?.pctComplete || 'Unknown error'}`);
    }

    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Video processing timeout - video took too long to process');
}

