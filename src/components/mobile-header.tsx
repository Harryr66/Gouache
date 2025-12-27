
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Settings, Fingerprint } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function MobileHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-[60] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="container flex h-14 items-center">
        {/* Gouache Logo */}
        <div className="flex-shrink-0">
          <Link href="/" className="flex items-center">
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
            >
              <Link href="/settings">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Link>
            </Button>
            <Button 
              variant="ghost"
              size="icon" 
              className="h-9 w-9 rounded-lg"
              asChild
            >
              <Link href="/profile">
                <Fingerprint className="h-5 w-5" />
                <span className="sr-only">Profile</span>
              </Link>
            </Button>
        </div>
      </div>
    </header>
  );
}
