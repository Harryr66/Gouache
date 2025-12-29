'use client';

import { useEffect } from 'react';

/**
 * Client component to add preconnect links for Cloudflare CDN
 * This runs on the client side to add resource hints
 */
export function CloudflarePreconnect() {
  useEffect(() => {
    // Add preconnect links for Cloudflare CDN
    const addLink = (rel: string, href: string, crossOrigin?: string) => {
      // Check if link already exists
      const existing = document.querySelector(`link[rel="${rel}"][href="${href}"]`);
      if (existing) return;
      
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      if (crossOrigin) {
        link.setAttribute('crossorigin', crossOrigin);
      }
      document.head.appendChild(link);
    };

    // Preconnect to Cloudflare Images CDN
    addLink('preconnect', 'https://imagedelivery.net', 'anonymous');
    addLink('preconnect', 'https://cloudflarestream.com', 'anonymous');
    
    // DNS prefetch as fallback
    addLink('dns-prefetch', 'https://imagedelivery.net');
    addLink('dns-prefetch', 'https://cloudflarestream.com');
  }, []);

  return null; // This component doesn't render anything
}

