# AI Article Generation Enhancements Guide

This guide shows you how to add the optional enhancements to the AI artist research and docuseries generation feature.

## Table of Contents
1. [Enhanced Web Scraping](#1-enhanced-web-scraping)
2. [Image Analysis with Gemini Vision](#2-image-analysis-with-gemini-vision)
3. [Multi-Step Generation Pipeline](#3-multi-step-generation-pipeline)
4. [Edit Drafts Functionality](#4-edit-drafts-functionality)

---

## 1. Enhanced Web Scraping

### Option A: Using ScraperAPI (Recommended for Production)

**Step 1: Install ScraperAPI package**
```bash
npm install axios
```

**Step 2: Get ScraperAPI Key**
- Sign up at https://www.scraperapi.com/
- Get your API key from the dashboard
- Add to `.env.local`: `SCRAPER_API_KEY=your_key_here`

**Step 3: Update the scraper route**

Replace `src/app/api/scrape-url/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const scraperApiKey = process.env.SCRAPER_API_KEY;
    
    // Use ScraperAPI if available, otherwise fallback to direct fetch
    if (scraperApiKey) {
      try {
        const response = await axios.get(`http://api.scraperapi.com`, {
          params: {
            api_key: scraperApiKey,
            url: url,
            render: 'true', // Render JavaScript
          },
          timeout: 30000,
        });

        const html = response.data;
        
        // Extract text using better parsing
        const text = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 50000);

        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : undefined;

        return NextResponse.json({
          url,
          title,
          text,
          success: true,
        });
      } catch (scraperError) {
        console.error('ScraperAPI error, falling back to direct fetch:', scraperError);
        // Fall through to direct fetch
      }
    }

    // Fallback to direct fetch
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50000);

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : undefined;

    return NextResponse.json({
      url,
      title,
      text,
      success: true,
    });
  } catch (error) {
    console.error('Error scraping URL:', error);
    return NextResponse.json(
      {
        url: url || '',
        text: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

### Option B: Using Cheerio for Better HTML Parsing

**Step 1: Install Cheerio**
```bash
npm install cheerio
npm install --save-dev @types/cheerio
```

**Step 2: Update scraper with Cheerio**

Add to `src/app/api/scrape-url/route.ts`:

```typescript
import * as cheerio from 'cheerio';

// In the POST handler, after fetching HTML:
const $ = cheerio.load(html);

// Remove scripts, styles, and unwanted elements
$('script, style, nav, footer, header, aside').remove();

// Extract main content
const text = $('body').text()
  .replace(/\s+/g, ' ')
  .trim()
  .substring(0, 50000);

const title = $('title').text().trim() || undefined;
```

---

## 2. Image Analysis with Gemini Vision

**Step 1: Update the AI flow to support image analysis**

Update `src/ai/flows/generate-docuseries.ts`:

```typescript
// Add to GenerateDocuseriesInputSchema:
imageAnalysis: z.array(
  z.object({
    imageUrl: z.string(),
    description: z.string(),
    detectedObjects: z.array(z.string()).optional(),
    artisticStyle: z.string().optional(),
  })
).optional().describe('AI analysis of uploaded images'),

// Update the prompt to include image analysis:
prompt: `... (existing prompt) ...

Image Analysis:
{{{imageAnalysis}}}

Use the image analysis to better understand the artist's work, style, and context. Match images to relevant sections of the article based on the analysis.`,
```

**Step 2: Create image analysis API route**

Create `src/app/api/ai/analyze-images/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const dynamic = 'force-dynamic';

const AnalyzeImageInputSchema = z.object({
  imageUrl: z.string(),
  context: z.string().optional(),
});

const AnalyzeImageOutputSchema = z.object({
  description: z.string(),
  detectedObjects: z.array(z.string()),
  artisticStyle: z.string(),
  relevance: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const { imageUrls, context } = await request.json();

    if (!imageUrls || !Array.isArray(imageUrls)) {
      return NextResponse.json(
        { error: 'imageUrls array is required' },
        { status: 400 }
      );
    }

    const analyses = await Promise.all(
      imageUrls.map(async (imageUrl: string) => {
        const prompt = ai.definePrompt({
          name: 'analyzeImagePrompt',
          input: { schema: AnalyzeImageInputSchema },
          output: { schema: AnalyzeImageOutputSchema },
          prompt: `Analyze this image of an artist's work or context.

Context: {{{context}}}

Describe what you see in the image, identify any objects or artistic elements, determine the artistic style, and explain how this image is relevant to understanding the artist.

Return a detailed analysis.`,
        });

        const { output } = await prompt({ imageUrl, context });
        return {
          imageUrl,
          ...output,
        };
      })
    );

    return NextResponse.json({ analyses });
  } catch (error) {
    console.error('Error analyzing images:', error);
    return NextResponse.json(
      { error: 'Failed to analyze images' },
      { status: 500 }
    );
  }
}
```

**Step 3: Update admin page to analyze images**

In `src/app/(main)/admin/page.tsx`, update the `structureArticleWithAI` function:

```typescript
// After uploading images, before calling generate-docuseries:
if (imageUrls.length > 0) {
  const analysisResponse = await fetch('/api/ai/analyze-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageUrls,
      context: `Artist: ${artistResearchName}. ${artistResearchNotes || ''}`,
    }),
  });

  if (analysisResponse.ok) {
    const { analyses } = await analysisResponse.json();
    // Pass analyses to generate-docuseries
  }
}
```

---

## 3. Multi-Step Generation Pipeline

**Step 1: Create multi-step flow**

Create `src/ai/flows/multi-step-docuseries.ts`:

```typescript
import { generateDocuseries } from './generate-docuseries';
import { z } from 'genkit';
import { ai } from '../genkit';

const ProofreadInputSchema = z.object({
  article: z.object({
    title: z.string(),
    summary: z.string(),
    sections: z.array(z.any()),
  }),
});

const ProofreadOutputSchema = z.object({
  title: z.string(),
  summary: z.string(),
  sections: z.array(z.any()),
  improvements: z.array(z.string()),
  proofread: z.boolean(),
});

const proofreadPrompt = ai.definePrompt({
  name: 'proofreadPrompt',
  input: { schema: ProofreadInputSchema },
  output: { schema: ProofreadOutputSchema },
  prompt: `You are an expert editor. Review this docuseries article for:
- Grammar and spelling
- Factual accuracy
- Flow and readability
- Professional tone
- Consistency

Article:
{{{article}}}

Provide an improved version with a list of improvements made.`,
});

export async function multiStepDocuseries(input: any) {
  // Step 1: Research & Generate
  const draft = await generateDocuseries(input);

  // Step 2: Proofread
  const { output: proofread } = await proofreadPrompt({ article: draft });

  // Step 3: Final polish
  const final = {
    ...proofread,
    status: 'ready_for_review',
  };

  return final;
}
```

**Step 2: Update API route**

Update `src/app/api/ai/generate-docuseries/route.ts`:

```typescript
import { multiStepDocuseries } from '@/ai/flows/multi-step-docuseries';

// In POST handler, replace generateDocuseries call with:
const result = await multiStepDocuseries({
  artistName,
  website,
  socialLinks: socialLinks || [],
  scrapedContent,
  contextImages: imageUrls || [],
  additionalNotes,
});
```

---

## 4. Edit Drafts Functionality

**Step 1: Add load draft function to admin page**

In `src/app/(main)/admin/page.tsx`, add:

```typescript
const loadDraftForEditing = async (articleId: string) => {
  try {
    const articleDoc = await getDoc(doc(db, 'newsArticles', articleId));
    if (!articleDoc.exists()) {
      toast({
        title: 'Article not found',
        variant: 'destructive',
      });
      return;
    }

    const data = articleDoc.data();
    
    // Load into editor
    setNewArticle({
      title: data.title || '',
      summary: data.summary || '',
      category: data.category || 'Stories',
      author: data.author || '',
      imageUrl: data.imageUrl || '',
      externalUrl: data.externalUrl || '',
      publishedAt: '',
      tags: (data.tags || []).join(', '),
      location: data.location || 'evergreen',
    });

    setArticleSections(data.sections || []);
    setNewArticleContent(data.content || '');

    // Scroll to editor
    document.getElementById('article-editor')?.scrollIntoView({ behavior: 'smooth' });

    toast({
      title: 'Draft loaded',
      description: 'Article loaded into editor. Make your changes and publish.',
    });
  } catch (error) {
    console.error('Error loading draft:', error);
    toast({
      title: 'Load failed',
      description: 'Failed to load draft. Please try again.',
      variant: 'destructive',
    });
  }
};
```

**Step 2: Add "Edit" button to draft cards**

In the article card rendering section:

```typescript
{article.status === 'draft' && !article.archived && (
  <>
    <Button
      variant="outline"
      size="sm"
      onClick={() => loadDraftForEditing(article.id)}
    >
      <Edit className="h-4 w-4 mr-2" />
      Edit
    </Button>
    <Button
      variant="default"
      size="sm"
      onClick={async () => {
        // Publish logic
      }}
    >
      Publish
    </Button>
  </>
)}
```

**Step 3: Add update draft function**

```typescript
const updateDraft = async (articleId: string) => {
  try {
    // Get current form data
    const sortedSections = [...articleSections].sort((a, b) => a.order - b.order);
    
    await updateDoc(doc(db, 'newsArticles', articleId), {
      title: newArticle.title.trim(),
      summary: newArticle.summary.trim(),
      category: newArticle.category || 'Stories',
      author: newArticle.author?.trim() || '',
      tags: newArticle.tags.split(',').map(t => t.trim()).filter(Boolean),
      sections: sortedSections,
      content: newArticleContent,
      updatedAt: serverTimestamp(),
    });

    toast({
      title: 'Draft updated',
      description: 'Your changes have been saved.',
    });
  } catch (error) {
    console.error('Error updating draft:', error);
    toast({
      title: 'Update failed',
      description: 'Failed to update draft. Please try again.',
      variant: 'destructive',
    });
  }
};
```

---

## Quick Start: Choose Your Enhancements

### Minimal Setup (Just Better Scraping)
1. Install axios: `npm install axios`
2. Get ScraperAPI key (optional but recommended)
3. Update `src/app/api/scrape-url/route.ts` with Option A code above

### Full Setup (All Enhancements)
1. Install dependencies:
   ```bash
   npm install axios cheerio
   npm install --save-dev @types/cheerio
   ```
2. Add ScraperAPI key to `.env.local`
3. Implement all 4 enhancements following the steps above

### Recommended Order
1. **Start with Enhanced Scraping** - Biggest impact on research quality
2. **Add Edit Drafts** - Most useful for workflow
3. **Add Image Analysis** - Enhances article quality
4. **Add Multi-Step Pipeline** - Polish and refinement

---

## Environment Variables Needed

Add to `.env.local`:
```
SCRAPER_API_KEY=your_scraperapi_key_here  # Optional but recommended
GOOGLE_AI_API_KEY=your_google_ai_key      # Already set up
```

---

## Testing

After implementing enhancements:

1. **Test Scraping**: Try scraping an artist's website
2. **Test Image Analysis**: Upload images and check analysis quality
3. **Test Multi-Step**: Generate an article and verify proofreading
4. **Test Edit Drafts**: Create a draft, edit it, and publish

---

## Need Help?

If you encounter issues:
- Check browser console for errors
- Check server logs for API errors
- Verify environment variables are set
- Ensure all npm packages are installed

