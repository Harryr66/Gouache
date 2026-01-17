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

Analyze this error systematically:

1. **IDENTIFY THE EXACT ENDPOINT/API CALL** if this is a fetch error
   - Extract the full URL path from the error message or context
   - Specify the HTTP method (GET, POST, etc.)
   - Note any request body parameters

2. **LOCATE THE SOURCE** in the codebase
   - Identify the exact file and line number where the error occurs
   - Use the stack trace to pinpoint the calling function
   - Specify whether it's in a component, API route, or utility function

3. **DETERMINE ROOT CAUSE**
   - Is the endpoint URL incorrect or misspelled?
   - Does the API route exist in the codebase?
   - Is there a typo in the fetch call?
   - Is the server returning an error?
   - Is there a network connectivity issue?

4. **PROVIDE THE ACTUAL FIX** with real code
   - Use the actual endpoint names from your analysis
   - Include the correct file path (e.g., src/app/(main)/discover/page.tsx)
   - Show the exact line numbers if possible
   - Provide working code, not templates

Format your response as:
**ENDPOINT:** (if applicable) Full API URL and HTTP method
**FILE:** Exact file path (e.g., src/app/(main)/discover/page.tsx line 123)
**ROOT CAUSE:** One sentence explanation
**FIX:**
\`\`\`typescript
// Actual fix code with real endpoint names
\`\`\`

**EXPLANATION:** Brief explanation of why this fix works

Be specific, actionable, and use actual code paths from the error context. NO generic templates or placeholders.`;


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

    // TEMPORARILY DISABLED: Email quota reached
    // TODO: Re-enable when quota resets
    const EMAIL_ENABLED = false;
    
    if (EMAIL_ENABLED) {
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
      }
    } else {
      console.log('Hue error report received (email disabled):', { message, route });
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
