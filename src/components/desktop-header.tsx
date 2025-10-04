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

// Custom sound bars play button icon
const RoundedPlayIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 28 24"
    fill="currentColor"
    stroke="none"
  >
    <polygon points="6,4 6,20 16,12" />
    <rect x="18" y="16" width="1.5" height="4" rx="0.75" />
    <rect x="19.5" y="14" width="1.5" height="8" rx="0.75" />
    <rect x="21" y="10" width="1.5" height="16" rx="0.75" />
    <rect x="22.5" y="14" width="1.5" height="8" rx="0.75" />
    <rect x="24" y="16" width="1.5" height="4" rx="0.75" />
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
