'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Eye, Fingerprint, Globe, Brain } from 'lucide-react';

const navigation = [
  { name: 'News', href: '/news', icon: Globe },
  { name: 'Discover', href: '/discover', icon: Eye },
  { name: 'Learn', href: '/courses', icon: Brain },
  { name: 'Profile', href: '/profile', icon: Fingerprint },
];

export function DesktopHeader() {
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-between bg-card border-b h-16 px-4 sm:px-6">
      <Link href="/" className="flex items-center">
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
      
      <nav className="hidden md:flex items-center space-x-6">
        {navigation.map((item) => {
          // Check if pathname matches the href or starts with it (for nested routes)
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'gradient-border text-foreground'
                  : 'text-foreground border-2 border-transparent hover:gradient-border'
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
