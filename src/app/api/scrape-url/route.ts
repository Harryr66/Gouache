import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Server-side URL scraper
 * Fetches content from URLs and extracts text
 * 
 * ENHANCEMENT OPTIONS:
 * 1. Add ScraperAPI: Install axios, add SCRAPER_API_KEY to .env.local
 * 2. Add Cheerio: Install cheerio for better HTML parsing
 * 3. Add Puppeteer: For JavaScript-rendered sites (requires more setup)
 */
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

    // ENHANCEMENT: Use ScraperAPI if available
    // Uncomment after installing axios and adding SCRAPER_API_KEY to .env.local
    /*
    const scraperApiKey = process.env.SCRAPER_API_KEY;
    if (scraperApiKey) {
      try {
        const axios = (await import('axios')).default;
        const response = await axios.get(`http://api.scraperapi.com`, {
          params: {
            api_key: scraperApiKey,
            url: url,
            render: 'true', // Render JavaScript
          },
          timeout: 30000,
        });

        const html = response.data;
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
    */

    // Basic fetch (current implementation)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Simple text extraction (remove HTML tags)
    // ENHANCEMENT: Use Cheerio for better parsing
    // Uncomment after installing cheerio:
    /*
    const cheerio = (await import('cheerio')).default;
    const $ = cheerio.load(html);
    $('script, style, nav, footer, header, aside').remove();
    const text = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50000);
    const title = $('title').text().trim() || undefined;
    */
    
    // Current simple extraction
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 50000); // Limit to 50k characters

    // Extract title
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
