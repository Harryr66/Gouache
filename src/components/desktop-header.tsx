'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Eye, Fingerprint, Globe, ShoppingCart } from 'lucide-react';

const navigation = [
  { name: 'News', href: '/news', icon: Globe },
  { name: 'Discover', href: '/discover', icon: Eye },
  { name: 'Marketplace', href: '/learn', icon: ShoppingCart },
  { name: 'Profile', href: '/profile', icon: Fingerprint },
];

export function DesktopHeader() {
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-between bg-card border-b h-16 px-4 sm:px-6">
      <Link href="/news" className="flex items-center">
        <span className="sr-only">Gouache</span>
        <img
          src="/assets/gouache-logo-light-20241111.png"
          alt="Gouache"
          width={1750}
          height={375}
          className="block h-10 w-auto dark:hidden sm:h-14"
        />
        <img
          src="/assets/gouache-logo-dark-20241111.png"
          alt="Gouache"
          width={1750}
          height={375}
          className="hidden h-10 w-auto dark:block sm:h-14"
        />
      </Link>
      
      <nav className="hidden md:flex items-center space-x-6">
        {navigation.map((item) => {
          const isActive = item.href === '/learn' ? pathname === '/learn' || pathname.startsWith('/learn/') : pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'gradient-border text-foreground'
                  : 'text-foreground hover:text-foreground hover:bg-muted/50'
              )}
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
