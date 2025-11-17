import { NextRequest, NextResponse } from 'next/server';
import { generateDocuseries } from '@/ai/flows/generate-docuseries';
import { scrapeUrls } from '@/lib/web-scraper';
import { ArticleSection } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: any = null;
  try {
    body = await request.json();
    const { artistName, website, socialLinks, contextImages, additionalNotes } = body;

    if (!artistName || typeof artistName !== 'string') {
      return NextResponse.json(
        { error: 'artistName is required and must be a string' },
        { status: 400 }
      );
    }

    // Collect all URLs to scrape
    const urlsToScrape: string[] = [];
    if (website) urlsToScrape.push(website);
    if (socialLinks && Array.isArray(socialLinks)) {
      urlsToScrape.push(...socialLinks.filter(url => typeof url === 'string'));
    }

    // Scrape URLs in parallel
    let scrapedContent: Array<{ url: string; title?: string; text: string }> = [];
    if (urlsToScrape.length > 0) {
      const scraped = await scrapeUrls(urlsToScrape);
      scrapedContent = scraped
        .filter(result => result.success && result.text.length > 0)
        .map(result => ({
          url: result.url,
          title: result.title,
          text: result.text.substring(0, 10000), // Limit text length per source
        }));
    }

    // Call the AI flow to generate the docuseries article
    const result = await generateDocuseries({
      artistName,
      website,
      socialLinks: socialLinks || [],
      scrapedContent,
      contextImages: contextImages || [],
      additionalNotes,
    });

    // Convert AI output to ArticleSection format
    const sections: ArticleSection[] = result.sections.map((section, index) => ({
      id: `docuseries-section-${Date.now()}-${index}`,
      type: section.type as 'text' | 'image' | 'text-image',
      content: section.content,
      imageUrl: section.imageUrl,
      imagePosition: section.imagePosition as 'above' | 'below' | 'left' | 'right' | undefined,
      caption: section.caption,
      order: section.order,
    }));

    return NextResponse.json({
      title: result.title,
      summary: result.summary,
      sections,
      tags: result.tags,
      researchNotes: result.researchNotes,
    });
  } catch (error) {
    console.error('Error generating docuseries:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      body: body,
    });
    return NextResponse.json(
      { 
        error: 'Failed to generate docuseries article', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
      },
      { status: 500 }
    );
  }
}

