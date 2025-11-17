/**
 * Simple web scraper utility to extract text content from URLs
 * Used for artist research in article generation
 */

export interface ScrapedContent {
  url: string;
  title?: string;
  text: string;
  success: boolean;
  error?: string;
}

/**
 * Scrapes text content from a URL (server-side implementation)
 * Note: This is a simple implementation. For production, consider using:
 * - A dedicated scraping service (ScraperAPI, Bright Data)
 * - Puppeteer/Playwright for JavaScript-heavy sites
 */
export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  try {
    // Validate URL
    const urlObj = new URL(url);
    
    // Check if we're in a server environment (have access to process.env)
    const isServer = typeof window === 'undefined';
    
    if (!isServer) {
      // Client-side: use API route
      const response = await fetch('/api/scrape-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`Failed to scrape URL: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        url: data.url || url,
        title: data.title,
        text: data.text || '',
        success: data.success || false,
        error: data.error,
      };
    }

    // Server-side: direct scraping
    const scraperApiKey = process.env.SCRAPER_API_KEY;
    
    if (scraperApiKey) {
      try {
        const axios = (await import('axios')).default;
        const response = await axios.get(`http://api.scraperapi.com`, {
          params: {
            api_key: scraperApiKey,
            url: url,
            render: 'true',
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

        return {
          url,
          title,
          text,
          success: true,
        };
      } catch (scraperError) {
        console.error('ScraperAPI error, falling back to direct fetch:', scraperError);
        // Fall through to direct fetch
      }
    }

    // Basic fetch (fallback)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
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

    return {
      url,
      title,
      text,
      success: true,
    };
  } catch (error) {
    console.error('Error scraping URL:', error);
    return {
      url,
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Scrapes multiple URLs in parallel
 */
export async function scrapeUrls(urls: string[]): Promise<ScrapedContent[]> {
  const results = await Promise.all(urls.map(url => scrapeUrl(url)));
  return results;
}

