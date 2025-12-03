
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Eye, Globe, Palette, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

const mobileNavItems = [
  { href: '/news', icon: Globe, label: 'News' },
  { href: '/discover', icon: Eye, label: 'Discover' },
  { href: '/marketplace', icon: Palette, label: 'Market' },
  { href: '/upload', icon: Upload, label: 'Upload' },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm md:hidden">
      <div className="flex h-16 items-center justify-around">
        {mobileNavItems.map((item) => {
          const isActive = item.href === '/learn' ? pathname === '/learn' || pathname.startsWith('/learn/') : pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-md transition-colors text-foreground w-16 border-2 border-transparent',
                isActive && 'gradient-border'
              )}
            >
              <item.icon className="h-7 w-7" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
