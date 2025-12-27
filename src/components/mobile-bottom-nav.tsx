
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Eye, Globe, Brain, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

const mobileNavItems = [
  { href: '/news', icon: Globe, label: 'News' },
  { href: '/discover', icon: Eye, label: 'Discover' },
  { href: '/courses', icon: Brain, label: 'Learn' },
  { href: '/profile', icon: Fingerprint, label: 'Profile' },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  
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

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-[60] border-t bg-background/95 backdrop-blur-sm md:hidden"
      style={{ 
        position: 'fixed', // Explicitly set to ensure it's in root stacking context
        pointerEvents: 'auto', // Ensure navigation is always clickable
        touchAction: 'manipulation', // Optimize touch handling on mobile
        isolation: 'isolate', // Create new stacking context to ensure it's always on top
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
              }}
              onClick={(e) => {
                // Ensure click is not prevented
                e.stopPropagation();
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
