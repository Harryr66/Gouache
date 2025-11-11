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
  { name: 'Docuseries', href: '/feed', icon: RoundedPlayIcon },
  { name: 'Discover', href: '/discover', icon: Eye },
  { name: 'Learn', href: '/marketplace', icon: Brain },
  { name: 'Upload Profile', href: '/upload', icon: Upload },
  { name: 'Profile', href: '/profile', icon: User },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-card border-r h-full">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground">
          Gouache
        </h1>
      </div>
      
      <nav className="flex-1 px-4 pb-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'gradient-border text-foreground'
                      : 'text-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
            <span className="text-white text-sm font-medium">U</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">User Name</p>
            <p className="text-xs text-muted-foreground truncate">@username</p>
          </div>
        </div>
      </div>
    </div>
  );
}
