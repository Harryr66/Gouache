'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Eye, 
  Upload, 
  User,
  Brain
} from 'lucide-react';

// Custom rounded play button icon
const RoundedPlayIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M8 5c-1.5 0-3 1.5-3 3v8c0 1.5 1.5 3 3 3s3-1.5 3-3V8c0-1.5-1.5-3-3-3z" rx="4" ry="4" />
    <path d="M16.5 7c0.5 0 1.5 0.5 1.5 1v8c0 0.5-1 1.5-1.5 1.5s-1.5-1-1.5-1.5V8c0-0.5 1-1 1.5-1z" rx="3" ry="3" />
  </svg>
);

const navigation = [
  { name: 'Docuseries', href: '/feed', icon: RoundedPlayIcon },
  { name: 'Discover', href: '/discover', icon: Eye },
  { name: 'Learn', href: '/marketplace', icon: Brain },
  { name: 'Profile', href: '/profile', icon: User },
];

export function DesktopHeader() {
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-between bg-card border-b h-16 px-4 sm:px-6">
      <h1 className="text-xl sm:text-2xl font-bold text-foreground">
        SOMA
      </h1>
      
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
