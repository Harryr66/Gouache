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

    // Determine upload method based on file size
    // Large files (>20MB) should use direct creator upload to avoid timeouts
    const LARGE_FILE_THRESHOLD = 20 * 1024 * 1024; // 20MB
    let useDirectCreatorUpload = file.size > LARGE_FILE_THRESHOLD;

    console.log('🔍 Cloudflare Stream API: Uploading video...', {
      accountId: accountId ? `${accountId.substring(0, 8)}...` : 'MISSING',
      hasToken: !!apiToken,
      fileSize: file.size,
      fileName: file.name,
      useDirectCreatorUpload,
      method: useDirectCreatorUpload ? 'Direct Creator Upload' : 'Direct Upload',
    });

    let uploadResponse: Response | null = null;
    let videoId: string | null = null;

    // Use direct creator upload for large files
    if (useDirectCreatorUpload) {
      // For large files: Use direct creator upload method
      // Step 1: Create upload URL
      console.log('📤 Creating direct creator upload URL for large file...');
      
      // First, verify the API token works with a simple request
      try {
        const verifyUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`;
        const verifyResponse = await fetch(verifyUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
          },
        });
        
        const verifyHeaders: Record<string, string> = {};
        verifyResponse.headers.forEach((value, key) => {
          verifyHeaders[key] = value;
        });
        
        if (!verifyResponse.ok) {
          const verifyErrorText = await verifyResponse.text();
          console.error('❌ API token verification failed:', {
            status: verifyResponse.status,
            statusText: verifyResponse.statusText,
            errorText: verifyErrorText,
            responseHeaders: verifyHeaders,
            requestUrl: verifyUrl,
          });
        } else {
          const verifyData = await verifyResponse.json();
          console.log('✅ API token verified - can access Stream API:', {
            status: verifyResponse.status,
            resultCount: verifyData.result?.length || 0,
            responseHeaders: verifyHeaders,
          });
        }
      } catch (verifyError: any) {
        console.error('❌ API token verification error:', {
          error: verifyError?.message,
          stack: verifyError?.stack,
          name: verifyError?.name,
        });
      }
      
      try {
        // Direct creator upload: Create upload URL
        // Cloudflare Stream API: POST to /stream with direct_user=true query parameter
        // Request body contains metadata for the upload
        const requestUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`;
        const requestBody = {
          maxDurationSeconds: 3600,
          allowedOrigins: ['*'],
          requireSignedURLs: false,
        };
        
        console.log('📤 Direct creator upload request:', {
          url: requestUrl,
          method: 'POST',
          body: requestBody,
          hasToken: !!apiToken,
          tokenPrefix: apiToken ? apiToken.substring(0, 10) + '...' : 'MISSING',
        });
        
        // Make the request and capture timing
        const requestStartTime = Date.now();
        const createUploadResponse = await fetch(
          requestUrl,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          }
        );
        const requestDuration = Date.now() - requestStartTime;
        
        console.log('📥 Direct creator upload response received:', {
          status: createUploadResponse.status,
          statusText: createUploadResponse.statusText,
          duration: `${requestDuration}ms`,
          ok: createUploadResponse.ok,
        });

        // Capture ALL response details before parsing
        const responseStatus = createUploadResponse.status;
        const responseStatusText = createUploadResponse.statusText;
        const responseHeaders: Record<string, string> = {};
        createUploadResponse.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        
        // Read response body as text first (before JSON parsing)
        const responseBodyText = await createUploadResponse.text();
        
        if (!createUploadResponse.ok) {
          let error;
          try {
            error = JSON.parse(responseBodyText);
          } catch {
            error = { errors: [{ message: responseBodyText }] };
          }
          
          // Log COMPLETE error information
          const completeErrorLog = {
            // Response details
            status: responseStatus,
            statusText: responseStatusText,
            responseHeaders: responseHeaders,
            responseBodyText: responseBodyText,
            responseBodyParsed: error,
            
            // Request details
            requestUrl: requestUrl,
            requestMethod: 'POST',
            requestBody: requestBody,
            requestHeaders: {
              'Authorization': `Bearer ${apiToken ? apiToken.substring(0, 10) + '...' : 'MISSING'}`,
              'Content-Type': 'application/json',
            },
            
            // Token details
            hasToken: !!apiToken,
            tokenLength: apiToken?.length || 0,
            tokenPrefix: apiToken ? apiToken.substring(0, 15) + '...' : 'MISSING',
            
            // Account details
            accountId: accountId ? `${accountId.substring(0, 8)}...` : 'MISSING',
            accountIdFull: accountId || 'MISSING',
            
            // Error message
            errorMessage: error.errors?.[0]?.message || responseBodyText,
            errorCode: error.errors?.[0]?.code,
            allErrors: error.errors || [],
            
            // File details
            fileSize: file.size,
            fileName: file.name,
            fileType: file.type,
          };
          
          console.error('❌ COMPLETE ERROR - Failed to create direct creator upload URL:', JSON.stringify(completeErrorLog, null, 2));
          
          // Return detailed error with ALL information
          let errorMessage = `Failed to create direct creator upload URL: ${error.errors?.[0]?.message || responseBodyText}`;
          let hint = '';
          
          if (responseStatus === 403) {
            hint = '403 Forbidden - Your API token may not have permission for direct creator uploads. ' +
                   'Ensure your API token has "Stream:Edit" permission and that direct creator uploads are enabled in your Cloudflare account. ' +
                   'Check: My Profile → API Tokens → Verify token has "Account.Cloudflare Stream.Edit" permission.';
          } else if (responseStatus === 401) {
            hint = '401 Unauthorized - Invalid API token. Verify your NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN is correct.';
          }
          
          return NextResponse.json(
            { 
              error: errorMessage,
              status: responseStatus,
              statusText: responseStatusText,
              hint: hint,
              debug: {
                // Full response
                responseBodyText: responseBodyText,
                responseBodyParsed: error,
                responseHeaders: responseHeaders,
                
                // Full request
                requestUrl: requestUrl,
                requestMethod: 'POST',
                requestBody: requestBody,
                requestHeaders: {
                  'Authorization': `Bearer ${apiToken ? '[REDACTED]' : 'MISSING'}`,
                  'Content-Type': 'application/json',
                },
                
                // Token info (partial for security)
                hasToken: !!apiToken,
                tokenLength: apiToken?.length || 0,
                tokenPrefix: apiToken ? apiToken.substring(0, 15) + '...' : 'MISSING',
                
                // Account info
                accountId: accountId ? `${accountId.substring(0, 8)}...` : 'MISSING',
                
                // Error details
                errorCode: error.errors?.[0]?.code,
                allErrors: error.errors || [],
                
                // File info
                fileSize: file.size,
                fileName: file.name,
                fileType: file.type,
              },
            },
            { status: responseStatus }
          );
        } else {
          // Success - get the upload URL and video ID
          const { result } = await createUploadResponse.json();
          const uploadUrl = result.uploadURL;
          videoId = result.uid;

          // Step 2: Upload file to the signed URL
          console.log('📤 Uploading file to signed URL...');
          const fileBuffer = await file.arrayBuffer();
          const putResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: fileBuffer,
            headers: {
              'Content-Type': file.type,
            },
          });

          if (!putResponse.ok) {
            const errorText = await putResponse.text();
            console.error('❌ Failed to upload to signed URL:', {
              status: putResponse.status,
              statusText: putResponse.statusText,
              errorText,
            });
            return NextResponse.json(
              { error: `Failed to upload video to signed URL: ${errorText || putResponse.statusText}` },
              { status: putResponse.status }
            );
          }

          // Success - we're done with direct creator upload
          console.log('✅ File uploaded to signed URL, videoId:', videoId);
        }
      } catch (fetchError: any) {
        console.error('❌ Error in direct creator upload:', {
          error: fetchError?.message,
          stack: fetchError?.stack,
          name: fetchError?.name,
        });
        return NextResponse.json(
          { 
            error: `Direct creator upload failed: ${fetchError?.message || 'Unknown error'}`,
            details: process.env.NODE_ENV === 'development' ? fetchError?.stack : undefined
          },
          { status: 500 }
        );
      }
    } else {
      // For smaller files: Use direct multipart/form-data upload
      const fileBuffer = await file.arrayBuffer();
      const fileBlob = new Blob([fileBuffer], { type: file.type });
      
      const cloudflareFormData = new FormData();
      cloudflareFormData.append('file', fileBlob, file.name);

      console.log('📤 Sending to Cloudflare Stream (direct upload):', {
        fileSize: file.size,
        fileName: file.name,
        fileType: file.type,
        formDataSize: fileBuffer.byteLength,
        endpoint: `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`,
      });

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
    }

    // Only check for errors if we used direct upload (not direct creator upload)
    if (uploadResponse && !uploadResponse.ok) {
      let errorText: string;
      try {
        errorText = await uploadResponse.text();
      } catch (textError) {
        errorText = `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`;
      }
      
      // Log response headers for debugging
      const responseHeaders: Record<string, string> = {};
      uploadResponse.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
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
        responseHeaders: responseHeaders,
        fileSize: file.size,
        fileName: file.name,
        fileType: file.type,
        hint: uploadResponse.status === 403 ? 'Check API token permissions, account limits, or file size restrictions' : undefined,
      });
      
      // Return full error details for debugging
      return NextResponse.json(
        { 
          error: `Failed to upload video: ${error.errors?.[0]?.message || errorText || 'Unknown error'}`,
          status: uploadResponse.status,
          // Include full error details for debugging
          debug: {
            rawErrorText: errorText,
            parsedError: error,
            responseHeaders: responseHeaders,
            fileInfo: {
              size: file.size,
              name: file.name,
              type: file.type,
            },
            requestInfo: {
              endpoint: `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`,
              method: 'POST',
              hasToken: !!apiToken,
              tokenLength: apiToken?.length || 0,
            }
          },
          ...(uploadResponse.status === 403 && {
            hint: '403 Forbidden - Full error details in debug object above'
          })
        },
        { status: uploadResponse.status >= 400 && uploadResponse.status < 600 ? uploadResponse.status : 500 }
      );
    }

    // Get video ID from response (if not already set from direct creator upload)
    if (!videoId && uploadResponse && uploadResponse.ok) {
      const { result } = await uploadResponse.json();
      videoId = result.uid;
    }

    // Ensure we have a videoId before proceeding
    if (!videoId) {
      console.error('❌ No video ID obtained from upload');
      return NextResponse.json(
        { error: 'Failed to obtain video ID from upload' },
        { status: 500 }
      );
    }

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

