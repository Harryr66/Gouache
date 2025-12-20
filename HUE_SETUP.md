# Hue AI Chatbot Setup Guide

Hue is an AI-powered assistant that helps users with:
1. **Error Detection & Reporting**: Automatically detects errors and generates fixes
2. **Customer Service Q&A**: Answers questions about the platform, features, and navigation

## Environment Variables

Add these to your `.env.local` file (or Vercel environment variables):

```bash
# Required for email functionality
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM_EMAIL=Hue <hue@gouache.art>

# Required - Email address where error reports will be sent
DEV_EMAIL=dev@gouache.art

# Required for AI fix generation
GOOGLE_GENAI_API_KEY=your_google_genai_api_key_here
```

## Setup Steps

### 1. Get Resend API Key
1. Sign up at [resend.com](https://resend.com)
2. Create an API key in your Resend dashboard
3. Add it to `RESEND_API_KEY` in your environment variables
4. Verify your domain or use Resend's default domain for `RESEND_FROM_EMAIL`

### 2. Get Google GenAI API Key
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create an API key
3. Add it to `GOOGLE_GENAI_API_KEY` in your environment variables

### 3. Set Dev Email
- Set `DEV_EMAIL` to the email address where you want to receive error reports
- Default: `dev@gouache.art`

## How It Works

### Error Detection & Reporting
1. **Error Detection**: Hue automatically catches all uncaught JavaScript errors and unhandled promise rejections
2. **User Notification**: When an error occurs, the Hue orb glows and expands to alert the user
3. **Context Collection**: Hue asks the user what they were trying to do (100 word limit)
4. **AI Fix Generation**: The error report is sent to the backend, which uses Genkit AI to generate a suggested fix
5. **Email Report**: An email is sent to `DEV_EMAIL` with:
   - Full error details (message, stack trace, route, timestamp)
   - User context
   - AI-generated fix suggestion

### Customer Service Q&A
1. **Platform Knowledge**: Hue is pre-trained with comprehensive knowledge about Gouache platform features, pages, navigation, and functionality
2. **Question Input**: Users can ask questions via text input when Hue is expanded
3. **AI Response**: Hue uses Genkit AI to provide helpful, context-aware answers
4. **Typewriter Effect**: Answers are displayed with a smooth typewriter animation

## Features

- **Draggable Orb**: Users can drag Hue to any position on the screen (desktop & mobile)
- **Gradient Border**: Theme-aware gradient border ring matching platform design
- **Error Detection**: Catches all uncaught errors automatically (always active, even when hidden)
- **Customer Service Q&A**: Answers questions about platform features, navigation, and functionality
- **Platform Knowledge**: Pre-trained with knowledge about all Gouache features, pages, and account types
- **Typewriter Effects**: Smooth typewriter animations for placeholder text and answers
- **Smart Filtering**: Word limit enforcement (100 words max for error reports)
- **AI-Powered Fixes**: Automatically generates code fixes using Genkit AI
- **Email Reports**: Sends formatted email reports with all details
- **Hide/Show**: Users can hide Hue and reactivate it in Settings > Hue tab

## Testing

To test Hue:
1. Open browser console
2. Type: `throw new Error("Test error")`
3. Hue should detect the error and expand
4. Enter test context and send
5. Check your email for the error report

## Troubleshooting

### Email not sending
- Check that `RESEND_API_KEY` is set correctly
- Verify `RESEND_FROM_EMAIL` format: `Name <email@domain.com>`
- Check Resend dashboard for delivery status

### AI fix not generating / Q&A not working
- **Most Common Issue**: `GOOGLE_GENAI_API_KEY` is not set in environment variables
- Verify `GOOGLE_GENAI_API_KEY` is set in Vercel environment variables (for production) or `.env.local` (for local development)
- Check API key has proper permissions in Google AI Studio
- Review server logs for AI generation errors
- **Note**: Hue's platform knowledge is already embedded in the code - you just need the API key to activate it

### Hue not appearing
- Check browser console for errors
- Verify component is imported in `src/app/layout.tsx`
- Check that no CSS is hiding the component (z-index: 9999)
