
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Eye, Globe, GraduationCap, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo, useEffect, useRef } from 'react';

const mobileNavItems = [
  { href: '/news', icon: Globe, label: 'News' },
  { href: '/discover', icon: Eye, label: 'Discover' },
  { href: '/courses', icon: GraduationCap, label: 'Learn' },
  { href: '/profile', icon: Fingerprint, label: 'Profile' },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  
  // Memoize active states to prevent re-computation during scroll
  // Normalize pathname to handle query params and ensure stable comparison
  const activeStates = useMemo(() => {
    // Remove query params and hash from pathname for comparison
    const normalizedPathname = pathname.split('?')[0].split('#')[0];
    
    return mobileNavItems.map(item => ({
      ...item,
      isActive: normalizedPathname === item.href || normalizedPathname.startsWith(item.href + '/')
    }));
  }, [pathname]);

  // Add native event listeners as absolute fallback - these CANNOT be blocked
  useEffect(() => {
    if (!navRef.current) return;
    
    const nav = navRef.current;
    const links = nav.querySelectorAll('a');
    
    // Add native click handlers that bypass React event system
    const nativeHandlers = Array.from(links).map((link) => {
      const handleNativeClick = (e: Event) => {
        // Force navigation - this CANNOT be prevented
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
  }, [activeStates]);

  return (
    <nav 
      ref={navRef}
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t bg-background/95 backdrop-blur-sm md:hidden"
      style={{ 
        position: 'fixed', // Explicitly set to ensure it's in root stacking context
        pointerEvents: 'auto', // Ensure navigation is always clickable
        touchAction: 'manipulation', // Optimize touch handling on mobile
        isolation: 'isolate', // Create new stacking context to ensure it's always on top
        zIndex: 9999, // Maximum z-index to ensure it's always on top
      }}
    >
      <div className="flex h-16 items-center justify-around">
        {activeStates.map((item) => {
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-lg transition-all text-foreground flex-1 max-w-[25%]',
                {
                  'gradient-border': item.isActive,
                  'border-2 border-transparent hover:gradient-border': !item.isActive
                }
              )}
              style={{
                pointerEvents: 'auto', // Ensure links are clickable
                touchAction: 'manipulation', // Optimize touch handling
                WebkitTapHighlightColor: 'transparent', // Remove tap highlight on iOS
                zIndex: 1, // Ensure links are above other elements
                position: 'relative', // Ensure z-index works
              }}
              onClick={(e) => {
                // Ensure click is not prevented
                e.stopPropagation();
                // Force navigation as backup
                if (!e.defaultPrevented) {
                  window.location.href = item.href;
                }
              }}
            >
              <item.icon className="h-7 w-7" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
