'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Eye, Fingerprint, Globe, Brain } from 'lucide-react';

const navigation = [
  // { name: 'News', href: '/news', icon: Globe }, // Hidden from navigation
  { name: 'Discover', href: '/discover', icon: Eye },
  { name: 'Learn', href: '/courses', icon: Brain },
  { name: 'Profile', href: '/profile', icon: Fingerprint },
];

export function DesktopHeader() {
  const pathname = usePathname();
  
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

  return (
    <div 
      className="flex items-center justify-between bg-card border-b min-h-16 px-2 sm:px-4 pt-4 pb-4 relative z-[9999]"
      style={{
        position: 'relative',
        touchAction: 'manipulation',
        isolation: 'isolate',
        zIndex: 9999,
      }}
    >
      <Link 
        href="/" 
        className="flex items-center pl-2 sm:pl-3"
        style={{
          touchAction: 'manipulation',
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
          touchAction: 'manipulation',
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
                touchAction: 'manipulation',
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
