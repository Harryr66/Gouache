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

// Custom sound waves play button icon
const RoundedPlayIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 32 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="8,5 8,19 18,12" />
    <path d="M18,8 C20,8 22,10 22,12 C22,14 20,16 18,16" />
    <path d="M18,6 C21,6 24,9 24,12 C24,15 21,18 18,18" />
    <path d="M18,4 C22,4 26,8 26,12 C26,16 22,20 18,20" />
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
          SOMA
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
