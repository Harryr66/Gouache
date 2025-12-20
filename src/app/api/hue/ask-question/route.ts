import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

export const dynamic = 'force-dynamic';

const PLATFORM_KNOWLEDGE = `
Gouache is an art social platform that connects artists and art lovers. Here's key information about the platform:

**Main Features & Pages:**
- Discover (/discover): Browse and discover artworks from artists. Filter by tags, medium, price, artwork type (Original/Print), and sale status.
- News (/news): Read art news, stories, and articles about emerging artists.
- Learn (/learn): Browse and access courses created by artists. Artists can create courses and users can purchase/enroll.
- Profile (/profile): View and edit your profile. Artists can manage portfolio, shop, courses, and events.
- Upload (/upload): Upload new artworks to your portfolio.
- Feed (/feed): View docuseries content and short-form videos.
- Settings (/settings): Manage account settings, business settings, Hue assistant, and report bugs.
- Shop: Artists can list artworks and products for sale. Requires Stripe Connect integration.
- Portfolio: Artists can upload and manage their artwork portfolio.
- Events: Artists can add upcoming events and exhibitions.
- Courses: Artists can create and sell courses.

**Account Types:**
- Regular Users: Can browse, discover, follow artists, like artworks, and create profiles.
- Artist Accounts: All user features plus can upload portfolio, create courses, list items for sale, add events, and manage shop.

**Key Features:**
- Stripe Integration: Artists need to connect Stripe to sell items. Go to Settings > Business tab.
- Portfolio Management: Edit profile > Portfolio tab to add/edit artworks.
- Course Creation: Go to Learn > Submit to create courses.
- Shop Listings: Mark artworks as "For Sale" in portfolio, or add products separately.
- Following System: Follow artists to see their work in your feed.
- Likes & Engagement: Like artworks to save favorites.
- Messaging: Direct messaging between users.
- Notifications: Get notified about likes, follows, messages, etc.

**Navigation:**
- Desktop: Sidebar navigation with icons for Docuseries, News, Discover, Learn, Upload, Profile.
- Mobile: Bottom navigation bar with main sections.

**Common Tasks:**
- To sell artwork: Mark as "For Sale" in portfolio, connect Stripe in Settings > Business.
- To create a course: Go to Learn > Submit (or click "Create Course").
- To edit profile: Go to Profile > Edit.
- To report issues: Use Hue assistant or Settings > Report bug tab.
- To hide/show Hue: Settings > Hue tab.

**Settings Sections:**
- General: Sign out, delete account
- Hue: Enable/disable Hue assistant
- Business: Stripe integration, payouts (for artists)
- Report bug: Submit bug reports

Always provide helpful, friendly responses. If you don't know something, suggest checking the relevant page or contacting support.
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, route } = body;

    if (!question || !question.trim()) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Generate answer using Genkit AI
    let answer = '';
    try {
      if (!process.env.GOOGLE_GENAI_API_KEY) {
        console.warn('GOOGLE_GENAI_API_KEY not set, skipping AI answer generation');
        console.warn('Available env vars:', Object.keys(process.env).filter(k => k.includes('GENAI') || k.includes('GOOGLE')));
        answer = 'I apologize, but I\'m currently unable to answer questions. The GOOGLE_GENAI_API_KEY environment variable is not set. Please add it to your Vercel project settings under Environment Variables, then redeploy.';
      } else {
        console.log('GOOGLE_GENAI_API_KEY is set, attempting to generate answer...');
        const prompt = `You are Hue, a friendly and helpful AI assistant for the Gouache art platform. Your role is to help users navigate the platform, find features, and answer questions about how to use Gouache.

${PLATFORM_KNOWLEDGE}

Current page/route: ${route || 'Unknown'}

User Question: ${question}

Provide a helpful, concise answer. If the question is about finding a feature, include the specific page/route. Be friendly and conversational. If you're not sure about something, suggest where they might find it or recommend contacting support.

Keep your response under 300 words and be specific about where to find things.`;

        console.log('Calling Genkit AI generate...');
        const response = await ai.generate({
          model: 'googleai/gemini-2.0-flash',
          prompt: prompt,
          config: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        });
        
        console.log('Genkit AI response received:', {
          hasText: !!response.text,
          textLength: response.text?.length || 0,
          responseKeys: Object.keys(response)
        });
        
        answer = response.text || 'I apologize, but I couldn\'t generate an answer. Please try rephrasing your question or check the Settings page for more information.';
        
        if (answer && answer.length > 0) {
          answer = answer.trim();
        }
      }
    } catch (aiError: any) {
      console.error('Failed to generate AI answer:', aiError);
      console.error('Error details:', {
        message: aiError?.message,
        code: aiError?.code,
        status: aiError?.status,
        statusCode: aiError?.statusCode,
        response: aiError?.response,
        stack: aiError?.stack,
        fullError: JSON.stringify(aiError, Object.getOwnPropertyNames(aiError))
      });
      
      const errorMessage = aiError?.message || String(aiError);
      const errorCode = aiError?.code || aiError?.statusCode || 'unknown';
      const errorStatus = aiError?.status || aiError?.statusCode;
      
      // Provide more specific error messages
      if (errorCode === 'API_KEY_NOT_FOUND' || errorMessage.includes('API key') || errorMessage.includes('API_KEY')) {
        answer = 'I apologize, but the AI service is not configured. Please ensure GOOGLE_GENAI_API_KEY is set in your Vercel environment variables and redeploy the application.';
      } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('429') || errorStatus === 429) {
        answer = 'I apologize, but the AI service has reached its rate limit. Please try again in a few moments. If this persists, check your Google AI Studio quota.';
      } else if (errorMessage.includes('403') || errorStatus === 403) {
        answer = 'I apologize, but the AI service access was denied. Please check that your API key is valid and has the correct permissions in Google AI Studio.';
      } else if (errorMessage.includes('401') || errorStatus === 401) {
        answer = 'I apologize, but the API key is invalid or expired. Please verify your GOOGLE_GENAI_API_KEY in Vercel environment variables.';
      } else {
        answer = `I apologize, but I encountered an error while processing your question: ${errorMessage} (Code: ${errorCode}). Please try again or check the Settings page for help.`;
      }
    }

    return NextResponse.json({
      success: true,
      answer: answer,
    });
  } catch (error: any) {
    console.error('Error processing question:', error);
    const errorMessage = error?.message || String(error);
    return NextResponse.json(
      { 
        error: 'Failed to process question', 
        details: errorMessage,
        hint: 'Check server logs and ensure GOOGLE_GENAI_API_KEY is set in environment variables'
      },
      { status: 500 }
    );
  }
}
