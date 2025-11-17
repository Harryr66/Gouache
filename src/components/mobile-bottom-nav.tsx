
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Eye, User, Globe, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const mobileNavItems = [
  { href: '/news', icon: Globe, label: 'News' },
  { href: '/discover', icon: Eye, label: 'Discover' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  // Mock user data for demo
  const user = { id: "demo-user", displayName: "Demo User", email: "demo@example.com" };
  const avatarUrl = null;
  const isProfessional = false;
  const signOut = () => {};

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm md:hidden">
      <div className="flex h-16 items-center justify-around">
        {mobileNavItems.map((item) => {
          const isActive = item.href === '/profile' ? pathname.startsWith(item.href) : pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-md transition-colors text-foreground w-16 border-2 border-transparent',
                isActive && 'gradient-border'
              )}
            >
              {item.href === '/profile' ? (
                avatarUrl ? (
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={avatarUrl} alt={user?.displayName || 'User'} data-ai-hint="artist portrait" />
                    <AvatarFallback className="bg-transparent">
                      <Fingerprint className="h-7 w-7 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Fingerprint className="h-7 w-7" />
                )
              ) : (
                <item.icon className="h-7 w-7" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
