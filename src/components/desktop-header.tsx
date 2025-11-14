'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Eye, User } from 'lucide-react';

// Custom UFO icon
const UfoIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* UFO body (flying saucer) */}
    <ellipse cx="12" cy="10" rx="8" ry="3" fill="currentColor" />
    <ellipse cx="12" cy="10" rx="6" ry="2" fill="none" stroke="currentColor" />
    {/* UFO dome */}
    <ellipse cx="12" cy="10" rx="4" ry="2.5" fill="currentColor" opacity="0.3" />
    {/* Light beam (optional) */}
    <path d="M8 13 L12 16 L16 13" stroke="currentColor" fill="none" strokeWidth="1" opacity="0.5" />
  </svg>
);

const navigation = [
  { name: 'Mothership', href: '/news', icon: UfoIcon },
  { name: 'Discover', href: '/discover', icon: Eye },
  { name: 'Profile', href: '/profile', icon: User },
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
          const isActive = pathname === item.href;
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
