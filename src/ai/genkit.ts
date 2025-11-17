import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Initialize Genkit with Google AI plugin
// The plugin automatically reads GOOGLE_GENAI_API_KEY from environment variables
// If apiKey is provided, it will use that; otherwise it falls back to env var
const apiKey = process.env.GOOGLE_GENAI_API_KEY;

export const ai = genkit({
  plugins: [
    apiKey 
      ? googleAI({ apiKey })
      : googleAI(), // Falls back to reading from GOOGLE_GENAI_API_KEY env var
  ],
  model: 'googleai/gemini-2.0-flash',
});
