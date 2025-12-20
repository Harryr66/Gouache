import { NextRequest, NextResponse } from 'next/server';
import { sendErrorReportEmail } from '@/lib/email';
import { ai } from '@/ai/genkit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, stack, route, timestamp, userAgent, userContext } = body;

    if (!message || !route) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate fix using Genkit AI
    let fix = '';
    try {
      if (!process.env.GOOGLE_GENAI_API_KEY) {
        console.warn('GOOGLE_GENAI_API_KEY not set, skipping AI fix generation');
        fix = 'AI fix generation not configured. Manual review required.';
      } else {
        const prompt = `You are a senior software engineer fixing bugs in a Next.js/React/TypeScript application using Firebase.

Error Details:
- Error Message: ${message}
- Route: ${route}
- Stack Trace: ${stack || 'No stack trace available'}
- User Context: ${userContext || 'No user context provided'}

Analyze this error and provide a concise code fix. Focus on:
1. Identifying the root cause
2. Providing the exact code changes needed
3. Including file paths and line numbers if possible
4. Explaining the fix briefly

Format your response as:
FILE: path/to/file.ts
ISSUE: Brief description
FIX:
\`\`\`typescript
// Your fix code here
\`\`\`

Keep it concise and actionable.`;

        // Use Genkit's generate method
        const response = await ai.generate({
          model: 'googleai/gemini-2.0-flash',
          prompt: prompt,
          config: {
            temperature: 0.3,
            maxOutputTokens: 2000,
          },
        });
        
        fix = response.text || 'Unable to generate fix automatically.';
        
        // Clean up the fix text if needed
        if (fix && fix.length > 0) {
          fix = fix.trim();
        }
      }
    } catch (aiError) {
      console.error('Failed to generate AI fix:', aiError);
      fix = 'AI fix generation failed. Manual review required.';
    }

    // Send email with error report and fix
    const emailResult = await sendErrorReportEmail({
      errorMessage: message,
      stack,
      route,
      timestamp,
      userAgent,
      userContext: userContext || 'No context provided',
      fix,
    });

    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      // Still return success to user, but log the error
    }

    return NextResponse.json({
      success: true,
      message: 'Error report submitted successfully',
      fixGenerated: !!fix,
    });
  } catch (error: any) {
    console.error('Error processing error report:', error);
    return NextResponse.json(
      { error: 'Failed to process error report', details: error.message },
      { status: 500 }
    );
  }
}
