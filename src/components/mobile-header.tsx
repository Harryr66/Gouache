
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Settings, Fingerprint } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function MobileHeader() {
  const pathname = usePathname();

  return (
    <header 
      className="sticky top-0 z-[60] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden"
      style={{ 
        pointerEvents: 'auto', // Ensure header is always clickable
        touchAction: 'manipulation', // Optimize touch handling on mobile
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
        
        {/* Action Buttons */}
        <div className="flex flex-1 items-center justify-end space-x-2">
            <Button 
              variant="ghost"
              size="icon" 
              className="h-9 w-9 rounded-lg"
              asChild
              style={{
                pointerEvents: 'auto',
                touchAction: 'manipulation',
              }}
            >
              <Link 
                href="/settings"
                style={{
                  pointerEvents: 'auto',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Link>
            </Button>
            <Button 
              variant="ghost"
              size="icon" 
              className="h-9 w-9 rounded-lg"
              asChild
              style={{
                pointerEvents: 'auto',
                touchAction: 'manipulation',
              }}
            >
              <Link 
                href="/profile"
                style={{
                  pointerEvents: 'auto',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <Fingerprint className="h-5 w-5" />
                <span className="sr-only">Profile</span>
              </Link>
            </Button>
        </div>
      </div>
    </header>
  );
}
