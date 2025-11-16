
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Users, Gavel, Search, User as UserIcon, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';


export function SiteHeader() {
  // Mock user data for demo
  const user = { id: "demo-user", displayName: "Demo User", email: "demo@example.com" };
  const avatarUrl = null;
  const isProfessional = false;
  const signOut = () => {};

  const userAvatar = (className: string) => (
    <Avatar className={className}>
      <AvatarImage src={avatarUrl || undefined} alt={user?.displayName || 'User'} data-ai-hint="artist portrait" />
      <AvatarFallback>
        <svg
            role="img"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-full text-muted-foreground"
        >
            <path
            d="M12 2C9.243 2 7 4.243 7 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5zm0 10c-3.309 0-6 2.691-6 6v2h12v-2c0-3.309-2.691-6-6-6z"
            fill="currentColor"
            />
        </svg>
      </AvatarFallback>
    </Avatar>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/news" className="mr-6 flex items-center space-x-2">
            <span className="sr-only">Gouache</span>
            <img
              src="/assets/gouache-logo-light.png"
              alt="Gouache"
              width={1750}
              height={375}
              className="block h-10 w-auto dark:hidden sm:h-14"
            />
            <img
              src="/assets/gouache-logo-dark.png"
              alt="Gouache"
              width={1750}
              height={375}
              className="hidden h-10 w-auto dark:block sm:h-14"
            />
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="hidden md:flex items-center gap-2">
            {user ? (
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    {userAvatar("h-10 w-10")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName || "User"}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile"><UserIcon className="mr-2" />Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link href="/login">Log In</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/login?tab=signup">Sign Up</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
