import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

export const dynamic = 'force-dynamic';

const PLATFORM_KNOWLEDGE = `
Gouache is an art social platform that connects artists and art lovers. Here's comprehensive information about the platform:

## MAIN FEATURES & PAGES

**Discover (/discover):**
- Browse and discover artworks from artists worldwide
- Filter by tags, medium, price, artwork type (Original/Print), and sale status
- Infinite scroll for continuous browsing
- Engagement-based ranking shows most popular content first
- MOBILE: Swipe through artworks, tap to view details
- DESKTOP: Grid/list view with hover previews

**News (/news):**
- Read art news, stories, and articles about emerging artists
- Subscribe to artist newsletters
- MOBILE: Optimized reading view with bottom navigation
- DESKTOP: Sidebar navigation with reading pane

**Learn (/learn):**
- Marketplace for courses created by artists
- Search, filter, and sort courses by price, rating, students
- Purchase and enroll in courses to learn new skills
- Artists can create, edit, and publish courses
- MOBILE: Course cards with "Buy Now" buttons, mobile-optimized checkout
- DESKTOP: Detailed course previews with instructor info

**Profile (/profile):**
- View and edit your profile
- Artists can manage portfolio, shop, courses, and events
- Tabs: Overview, Portfolio, Shop, Courses, Events
- MOBILE: Swipeable tabs, responsive layout
- DESKTOP: Side-by-side layout with rich media previews

**Upload (/upload):**
- Upload new artworks to your portfolio
- Add title, description, medium, tags, pricing
- Set artwork as "For Sale" or portfolio piece
- Image optimization and compression
- MOBILE: Camera integration for instant uploads
- DESKTOP: Drag-and-drop support, batch uploads

**Feed (/feed):**
- View docuseries content and short-form videos
- Vertical scroll video feed (TikTok-style)
- MOBILE: Full-screen immersive viewing
- DESKTOP: Centered video player with recommendations

**Settings (/settings):**
- General: Sign out, delete account, preferences
- Hue: Enable/disable Hue assistant (this AI helper!)
- Business: Stripe integration, payouts, business settings
- Report bug: Manually report issues (though you can ask me anytime!)

## ACCOUNT TYPES

**Regular Users:**
- Browse, discover, and engage with content
- Follow artists to see their work
- Like and save favorite artworks
- Purchase artworks and courses
- Create and customize profile

**Artist Accounts:**
- All regular user features PLUS:
- Upload portfolio of artworks
- Create and sell courses
- List items for sale in shop
- Add upcoming events and exhibitions
- Manage shop with Stripe integration
- Receive payments for sales

## KEY FEATURES

**Stripe Integration:**
- Required for selling artworks, courses, or products
- Setup: Settings > Business tab > Connect Stripe
- Manage payouts and view sales analytics
- MOBILE: Optimized checkout with Apple Pay/Google Pay
- DESKTOP: Full dashboard with analytics

**Portfolio Management:**
- Add, edit, delete artworks
- Organize by collections or series
- Mark items as "For Sale" with pricing
- MOBILE: Profile > Edit > Portfolio tab
- DESKTOP: Drag-and-drop reordering

**Course Creation:**
- Multi-step wizard for creating courses
- Add title, description, pricing, curriculum
- Upload thumbnail and trailer video
- Auto-save drafts every 3 seconds
- Preview before publishing
- MOBILE: Step-by-step mobile-optimized form
- DESKTOP: Side-by-side preview panel

**Shop Listings:**
- Mark artworks as "For Sale" in portfolio
- Set prices, shipping options
- Manage inventory and variants
- MOBILE: Quick buy buttons, mobile wallet integration
- DESKTOP: Detailed product pages with zoom

## NAVIGATION

**Mobile Navigation:**
- BOTTOM NAV BAR: Discover, News, Learn, Feed, Upload
- TOP RIGHT HEADER: Thumbprint (Fingerprint) icon for profile
- HAMBURGER MENU: Access settings and additional pages
- SWIPE GESTURES: Navigate between sections
- PULL TO REFRESH: Update feeds and content

**Desktop Navigation:**
- LEFT SIDEBAR: Main sections (Docuseries, News, Discover, Learn, Upload)
- TOP RIGHT HEADER: Thumbprint (Fingerprint) icon for profile, notifications, messages
- BREADCRUMBS: Track your location in the app
- KEYBOARD SHORTCUTS: Quick navigation (ask me for shortcuts!)

**Profile Access:**
- Click/tap the THUMBPRINT (Fingerprint) icon in top right corner
- Available on BOTH mobile and desktop
- Icon is always visible in the header

## COMMON TASKS (MOBILE & DESKTOP)

**Access Your Profile:**
- MOBILE: Tap thumbprint icon (top right header)
- DESKTOP: Click thumbprint icon (top right header)

**Sell Artwork:**
1. Connect Stripe: Settings > Business > Connect Stripe
2. Upload artwork: Upload page or Portfolio tab
3. Mark as "For Sale" and set price
4. MOBILE: Simple toggles and price input
5. DESKTOP: Advanced pricing and shipping options

**Create a Course:**
1. Go to Learn page > "Create Course" or "Submit"
2. Fill in course details (title, description, price)
3. Add curriculum sections and lessons
4. Upload thumbnail and trailer
5. Preview course, then publish
6. MOBILE: Step-by-step wizard, optimized forms
7. DESKTOP: Side-by-side preview, drag-and-drop curriculum

**Edit Your Profile:**
1. Click/tap thumbprint icon (top right)
2. Go to "Edit Profile" or "Edit" button
3. Update bio, avatar, cover photo, links
4. MOBILE: Camera integration for photos
5. DESKTOP: Drag-and-drop image uploads

**Report Issues:**
- EASIEST: Just ask me! Say "I want to report a problem" or describe the issue
- MANUAL: Settings > Report bug tab (but asking me is faster!)
- I can help gather details and submit the report for you

**Hide/Show Hue (Me!):**
- Settings > Hue tab > Toggle "Enable Hue Assistant"
- MOBILE: Hue orb positioned for easy reach, draggable
- DESKTOP: Hue orb in bottom-right corner, draggable

## TROUBLESHOOTING & FAQS

**Q: I can't find my profile button**
A: Look for the THUMBPRINT (Fingerprint) icon in the top right corner of the header. It's always visible on both mobile and desktop!

**Q: How do I sell my artwork?**
A: First, connect Stripe (Settings > Business). Then upload artwork and mark it "For Sale" with a price.

**Q: Where is the course I created?**
A: Published courses appear on your profile under the "Courses" tab and in the Learn marketplace. Drafts are only visible to you in Learn > My Courses.

**Q: Why can't I publish my course?**
A: Ensure you've filled in all required fields (title, description, price, at least one curriculum section) and connected your Stripe account.

**Q: The app is slow or buggy**
A: Try refreshing the page or clearing your browser cache. If the issue persists, just ask me to "report a problem" and I'll help!

**Q: How do I message an artist?**
A: Go to their profile and click/tap the "Message" button. Direct messaging is available for all users.

**Q: Can I delete my account?**
A: Yes, go to Settings > General > Delete Account. Note: This action is permanent and cannot be undone.

**Q: How do I get paid for sales?**
A: Connect Stripe in Settings > Business. Payouts are processed automatically based on your Stripe settings (usually weekly or monthly).

## REPORTING ISSUES

If something isn't working, you can report it in two ways:
1. **PREFERRED: Ask me!** Just say "I want to report a problem" or describe what's wrong. I'll help gather details and submit the report automatically.
2. **Manual: Settings > Report bug tab** - Fill out the form and submit.

All error reports are automatically sent to the development team for quick resolution. Errors are also auto-reported in the background without interrupting your experience!

## MOBILE-SPECIFIC TIPS

- **Gestures:** Swipe between tabs, pull to refresh feeds
- **Camera Integration:** Upload photos directly from camera
- **Mobile Wallets:** Use Apple Pay/Google Pay for fast checkout
- **Offline Support:** Some content cached for offline viewing
- **Touch Optimized:** Large tap targets, smooth animations

## DESKTOP-SPECIFIC TIPS

- **Drag & Drop:** Upload files, reorder portfolio items
- **Keyboard Shortcuts:** Navigate faster (ask me for list!)
- **Multiple Windows:** Open multiple profiles/artworks in tabs
- **Advanced Filters:** More detailed search and filter options
- **Hover Previews:** See artwork details without clicking

Always provide helpful, friendly responses. If you don't know something, suggest checking the relevant page. And remember: users can ask me to report problems directly!
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
        
        // Detect issue/bug reporting intent
        const reportingKeywords = ['report', 'bug', 'error', 'problem', 'issue', 'broken', 'not working', 'doesn\'t work', 'can\'t', 'won\'t', 'glitch', 'crash'];
        const isReportingIssue = reportingKeywords.some(keyword => question.toLowerCase().includes(keyword));
        
        let prompt;
        if (isReportingIssue) {
          // Special prompt for issue reporting
          prompt = `You are Hue, a friendly and helpful AI assistant for the Gouache art platform. The user wants to report a problem or issue.

Current page/route: ${route || 'Unknown'}

User's Issue: ${question}

**Your Response Should:**
1. Acknowledge their issue empathetically
2. Ask for specific details if needed (e.g., "What page were you on?", "What were you trying to do?", "What happened instead?")
3. Reassure them that the issue has been automatically reported to the development team
4. Provide any immediate workarounds or solutions if applicable
5. Encourage them to continue using the platform while the issue is being investigated

**Example Response Format:**
"I'm sorry to hear you're experiencing this issue! I've automatically sent a report to our development team with your details. [If you can provide specific advice, add it here, e.g., 'In the meantime, try refreshing the page or...'] We'll get this fixed as soon as possible. Thank you for your patience!"

Keep your response under 100 words. Be empathetic, helpful, and reassuring.

${PLATFORM_KNOWLEDGE}`;
        } else {
          // Standard Q&A prompt
          prompt = `You are Hue, a friendly and helpful AI assistant for the Gouache art platform. Your role is to help users navigate the platform, find features, and answer questions about how to use Gouache.

${PLATFORM_KNOWLEDGE}

Current page/route: ${route || 'Unknown'}

User Question: ${question}

**Response Guidelines:**
- Be CONCISE and direct - aim for 2-4 sentences maximum
- Get straight to the point with the answer
- If the question is about finding a feature, include the specific page/route and device-specific instructions (mobile vs desktop)
- Always end with a brief, polite sign-off (e.g., "Hope that helps!", "Let me know if you need anything else!", "Happy creating!")
- Be friendly but brief - no lengthy explanations unless absolutely necessary
- If you're not sure, suggest where they might find it or recommend asking me to report an issue

Keep your response under 150 words. Prioritize clarity and brevity while remaining helpful and polite.`;
        }
        
        console.log('Issue reporting intent detected:', isReportingIssue);

        console.log('Calling Genkit AI generate...');
        const response = await ai.generate({
          model: 'googleai/gemini-2.0-flash',
          prompt: prompt,
          config: {
            temperature: 0.7,
            maxOutputTokens: 300, // Reduced for more concise responses
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
        
        // If user is reporting an issue, automatically send an error report
        if (isReportingIssue) {
          try {
            console.log('Auto-submitting user-reported issue to error reporting system...');
            const reportResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/hue/report-error`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: `User-reported issue: ${question}`,
                stack: 'N/A - User-reported issue via Hue chat',
                route: route || 'Unknown',
                timestamp: new Date().toISOString(),
                userAgent: request.headers.get('user-agent') || 'Unknown',
                userContext: `User reported this issue via Hue chat: "${question}"`,
                errorType: 'User-Reported Issue',
                errorCode: 'USER_REPORT',
              }),
            });
            
            if (reportResponse.ok) {
              console.log('✅ User-reported issue sent to email inbox');
            } else {
              console.error('❌ Failed to auto-submit user-reported issue');
            }
          } catch (reportError) {
            console.error('Error auto-submitting user-reported issue:', reportError);
            // Don't fail the response if report submission fails
          }
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
