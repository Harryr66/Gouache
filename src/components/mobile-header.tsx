
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bell, Settings, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function MobileHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="container flex h-14 items-center">
        {/* Gouache Logo */}
        <div className="flex-shrink-0">
          <Link href="/discover" className="flex items-center">
            <span className="sr-only">Gouache</span>
            <img
              src="/assets/gouache-logo-light.png?v=1"
              alt="Gouache"
              width={1750}
              height={375}
              className="block h-9 w-auto dark:hidden"
            />
            <img
              src="/assets/gouache-logo-dark.png?v=1"
              alt="Gouache"
              width={1750}
              height={375}
              className="hidden h-9 w-auto dark:block"
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
              <Link href="/search">
                  <Search className="h-5 w-5" />
                  <span className="sr-only">Search</span>
              </Link>
            </Button>
            <Button 
              variant="ghost"
              size="icon" 
              className="h-9 w-9 rounded-lg"
              asChild
            >
              <Link href="/notifications">
                  <Bell className="h-5 w-5" />
                  <span className="sr-only">Notifications</span>
              </Link>
            </Button>
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
        </div>
      </div>
    </header>
  );
}
