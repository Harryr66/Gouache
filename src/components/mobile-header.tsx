'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="container flex min-h-14 items-center pt-4 pb-4 pl-2">
        {/* Gouache Logo */}
        <div className="flex-shrink-0">
          <Link href="/" className="flex items-center pl-2">
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
        
        {/* Settings Button */}
        <div className="flex flex-1 items-center justify-end">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" asChild>
            <Link href="/settings">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
