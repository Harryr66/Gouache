/**
 * API Client for Capacitor/iOS compatibility
 * 
 * In native apps, API routes don't work, so we need to point to the deployed server.
 * This utility detects the environment and uses the correct base URL.
 */

// Get the API base URL - defaults to production, can be overridden with env var
const getApiBaseUrl = (): string => {
  // In native app (Capacitor), use production URL
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    return process.env.NEXT_PUBLIC_API_URL || 'https://gouache.art';
  }
  
  // In browser, use relative URLs (works with Next.js API routes)
  // For production builds, this will be the deployed URL
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || '';
  }
  
  // Server-side, use relative URLs
  return '';
};

export const apiBaseUrl = getApiBaseUrl();

/**
 * Make an API request
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = apiBaseUrl;
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${baseUrl}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check if we're running in a native app (Capacitor)
 */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor;
}
