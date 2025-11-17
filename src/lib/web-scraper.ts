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
 * Scrapes text content from a URL
 * Note: This is a simple implementation. For production, consider using:
 * - A dedicated scraping service (ScraperAPI, Bright Data)
 * - Puppeteer/Playwright for JavaScript-heavy sites
 * - A backend service to handle CORS issues
 */
export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  try {
    // Validate URL
    const urlObj = new URL(url);
    
    // For client-side, we'll use a proxy approach or fetch with CORS
    // For now, we'll create an API route to handle scraping server-side
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
    return data;
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

