'use client';

import React, { useMemo, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Eye, Fingerprint, Globe, Brain } from 'lucide-react';
import { createPortal } from 'react-dom';

const navigation = [
  { name: 'News', href: '/news', icon: Globe },
  { name: 'Discover', href: '/discover', icon: Eye },
  { name: 'Learn', href: '/courses', icon: Brain },
  { name: 'Profile', href: '/profile', icon: Fingerprint },
];

export function DesktopHeader() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  
  // Memoize active states to prevent re-computation during scroll
  // Normalize pathname to handle query params and ensure stable comparison
  const activeStates = useMemo(() => {
    // Remove query params and hash from pathname for comparison
    const normalizedPathname = pathname.split('?')[0].split('#')[0];
    
    return navigation.map(item => ({
      ...item,
      isActive: normalizedPathname === item.href || normalizedPathname.startsWith(item.href + '/')
    }));
  }, [pathname]);

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
  }, [mounted, activeStates]);

  const headerContent = (
    <div 
      ref={headerRef}
      className="flex items-center justify-between bg-card border-b h-16 px-4 sm:px-6 relative z-[9999]"
      style={{
        position: 'relative', // Keep relative for z-index to work
        pointerEvents: 'auto',
        touchAction: 'manipulation',
        isolation: 'isolate', // Create new stacking context to ensure it's always on top
        zIndex: 9999, // Maximum z-index
      }}
    >
      <Link 
        href="/" 
        className="flex items-center"
        style={{
          pointerEvents: 'auto',
          touchAction: 'manipulation',
          zIndex: 1,
        }}
      >
        <span className="sr-only">Gouache</span>
        <img
          src="/assets/gouache-logo-light-20241111.png"
          alt="Gouache"
          width={1750}
          height={375}
          className="block h-8 w-auto dark:hidden sm:h-10"
        />
        <img
          src="/assets/gouache-logo-dark-20241111.png"
          alt="Gouache"
          width={1750}
          height={375}
          className="hidden h-8 w-auto dark:block sm:h-10"
        />
      </Link>
      
      <nav 
        className="hidden md:flex items-center space-x-6"
        style={{
          pointerEvents: 'auto',
          touchAction: 'manipulation',
          zIndex: 1,
        }}
      >
        {activeStates.map((item) => {
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                {
                  'gradient-border text-foreground': item.isActive,
                  'text-foreground border-[3px] border-transparent hover:gradient-border': !item.isActive
                }
              )}
              style={{
                pointerEvents: 'auto',
                touchAction: 'manipulation',
                zIndex: 1,
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      {/* Username section removed - profile section already available */}
    </div>
  );
}
