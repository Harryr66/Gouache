# Hue AI Chatbot Setup Guide

Hue is an AI-powered error detection and reporting system that helps users report bugs and automatically generates fixes.

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

1. **Error Detection**: Hue automatically catches all uncaught JavaScript errors and unhandled promise rejections
2. **User Notification**: When an error occurs, the Hue orb glows and expands to alert the user
3. **Context Collection**: Hue asks the user what they were trying to do (100 word limit)
4. **AI Fix Generation**: The error report is sent to the backend, which uses Genkit AI to generate a suggested fix
5. **Email Report**: An email is sent to `DEV_EMAIL` with:
   - Full error details (message, stack trace, route, timestamp)
   - User context
   - AI-generated fix suggestion

## Features

- **Draggable Orb**: Users can drag Hue to any position on the screen
- **Chrome Gradient**: Beautiful gradient orb that pulses when idle
- **Error Detection**: Catches all uncaught errors automatically
- **Smart Filtering**: Word limit enforcement (100 words max)
- **AI-Powered Fixes**: Automatically generates code fixes using Genkit AI
- **Email Reports**: Sends formatted email reports with all details

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

### AI fix not generating
- Verify `GOOGLE_GENAI_API_KEY` is set
- Check API key has proper permissions
- Review server logs for AI generation errors

### Hue not appearing
- Check browser console for errors
- Verify component is imported in `src/app/layout.tsx`
- Check that no CSS is hiding the component (z-index: 9999)
