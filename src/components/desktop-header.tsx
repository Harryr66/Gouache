'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Eye, 
  Upload, 
  User,
  Brain
} from 'lucide-react';

// Custom rounded triangle play icon
const RoundedPlayIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
  >
    <polygon points="7,5 7,19 17,12" />
  </svg>
);

const navigation = [
  { name: 'Discover', href: '/discover', icon: Eye },
  { name: 'Profile', href: '/profile', icon: User },
];

export function DesktopHeader() {
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-between bg-card border-b h-16 px-4 sm:px-6">
      <Link href="/discover" className="flex items-center">
        <span className="sr-only">Gouache</span>
        <Image
          src="/assets/gouache-logo-light.png?v=2"
          alt="Gouache"
          width={1750}
          height={375}
          priority
          className="block h-10 w-auto dark:hidden sm:h-14"
          sizes="(max-width: 768px) 220px, 320px"
          quality={100}
        />
        <Image
          src="/assets/gouache-logo-dark.png?v=2"
          alt="Gouache"
          width={1750}
          height={375}
          priority
          className="hidden h-10 w-auto dark:block sm:h-14"
          sizes="(max-width: 768px) 220px, 320px"
          quality={100}
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
