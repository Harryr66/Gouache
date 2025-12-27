
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Settings, Fingerprint } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function MobileHeader() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Add native event listeners as absolute fallback
  useEffect(() => {
    if (!mounted || !headerRef.current) return;
    
    const header = headerRef.current;
    const links = header.querySelectorAll('a');
    
    const nativeHandlers = Array.from(links).map((link) => {
      const handleNativeClick = (e: Event) => {
        const href = (link as HTMLAnchorElement).href;
        if (href && href !== window.location.href) {
          window.location.href = href;
        }
      };
      
      link.addEventListener('click', handleNativeClick, { capture: true, passive: false });
      return { link, handler: handleNativeClick };
    });
    
    return () => {
      nativeHandlers.forEach(({ link, handler }) => {
        link.removeEventListener('click', handler, { capture: true });
      });
    };
  }, [mounted]);

  const headerContent = (
    <header 
      ref={headerRef}
      className="sticky top-0 z-[9999] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden"
      style={{ 
        position: 'sticky', // Explicitly set to ensure it's in root stacking context
        pointerEvents: 'auto', // Ensure header is always clickable
        touchAction: 'manipulation', // Optimize touch handling on mobile
        isolation: 'isolate', // Create new stacking context to ensure it's always on top
        zIndex: 9999, // Maximum z-index
      }}
    >
      <div className="container flex h-14 items-center">
        {/* Gouache Logo */}
        <div className="flex-shrink-0">
          <Link 
            href="/" 
            className="flex items-center"
            style={{
              pointerEvents: 'auto', // Ensure logo link is clickable
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span className="sr-only">Gouache</span>
            <img
              src="/assets/gouache-logo-light-20241111.png"
              alt="Gouache"
              width={1750}
              height={375}
              className="block h-7 w-auto dark:hidden"
            />
            <img
              src="/assets/gouache-logo-dark-20241111.png"
              alt="Gouache"
              width={1750}
              height={375}
              className="hidden h-7 w-auto dark:block"
            />
          </Link>
        </div>
        
        {/* Action Buttons - Settings only (Profile moved to bottom nav) */}
        <div className="flex flex-1 items-center justify-end">
            <Button 
              variant="ghost"
              size="icon" 
              className="h-9 w-9 rounded-lg"
              asChild
              style={{
                pointerEvents: 'auto',
                touchAction: 'manipulation',
                zIndex: 1,
              }}
            >
              <Link 
                href="/settings"
                style={{
                  pointerEvents: 'auto',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  zIndex: 1,
                }}
                onClick={(e) => {
                  // Ensure click is not prevented
                  e.stopPropagation();
                  // Force navigation as backup
                  if (!e.defaultPrevented) {
                    window.location.href = '/settings';
                  }
                }}
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Link>
            </Button>
        </div>
      </div>
    </header>
  );

  // Render via portal to document.body to ensure it's always accessible
  if (!mounted) return null;
  return createPortal(headerContent, document.body);
}
