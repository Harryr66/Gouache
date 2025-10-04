
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Eye, Upload, User, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

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

const mobileNavItems = [
  { href: '/feed', icon: RoundedPlayIcon, label: 'Docuseries' },
  { href: '/discover', icon: Eye, label: 'Discover' },
  { href: '/marketplace', icon: Brain, label: 'Learn' },
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
                'flex flex-col items-center justify-center gap-1 p-2 rounded-md transition-colors text-foreground w-16 border-2 border-transparent',
                isActive && 'gradient-border'
              )}
            >
              {item.href === '/profile' ? (
                <Avatar className="h-6 w-6">
                   <AvatarImage src={avatarUrl || undefined} alt={user?.displayName || 'User'} data-ai-hint="artist portrait" />
                   <AvatarFallback>
                      <svg
                          role="img"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-full w-full"
                      >
                          <path
                          d="M12 2C9.243 2 7 4.243 7 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5zm0 10c-3.309 0-6 2.691-6 6v2h12v-2c0-3.309-2.691-6-6-6z"
                          fill="currentColor"
                          />
                      </svg>
                   </AvatarFallback>
                </Avatar>
              ) : (
                <item.icon className="h-6 w-6" />
              )}
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
