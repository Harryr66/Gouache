
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { cn } from '@/lib/utils';

export default function RootPage() {
  const { resolvedTheme, theme } = useTheme();
  const [lightLoaded, setLightLoaded] = useState(false);
  const [darkLoaded, setDarkLoaded] = useState(false);

  const mode = useMemo(() => (resolvedTheme ?? theme ?? 'light') === 'dark' ? 'dark' : 'light', [resolvedTheme, theme]);
  const showSkeleton = mode === 'dark' ? !darkLoaded : !lightLoaded;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <section className="container flex flex-col items-center text-center gap-5 pt-10 md:pt-14 pb-4 md:pb-16 px-6">
          <div className="relative w-full max-w-[320px] md:max-w-2xl mx-auto rounded-3xl">
            {mode === 'dark' && (
              <div
                className={cn(
                  'absolute inset-0 rounded-3xl transition-opacity duration-500 pointer-events-none',
                  showSkeleton ? 'bg-muted/15 animate-pulse opacity-100' : 'opacity-0'
                )}
              />
            )}
            <Image
              src="/assets/welcome-hero-light-20241111.png"
              alt="Welcome to Gouache"
              width={1280}
              height={720}
              priority
              className={cn(
                'block w-full h-auto rounded-3xl transition-all duration-500 dark:hidden',
                lightLoaded
                  ? 'opacity-100 scale-100 shadow-xl'
                  : 'opacity-0 scale-[1.02] shadow-none'
              )}
              onLoadingComplete={() => setLightLoaded(true)}
            />
            <Image
              src="/assets/welcome-hero-dark-20241111.png"
              alt="Welcome to Gouache"
              width={1280}
              height={720}
              priority
              className={cn(
                'hidden w-full h-auto rounded-3xl transition-all duration-500 dark:block',
                darkLoaded
                  ? 'opacity-100 scale-100 shadow-xl'
                  : 'opacity-0 scale-[1.02] shadow-none'
              )}
              onLoadingComplete={() => setDarkLoaded(true)}
            />
            <span className="sr-only">
              Welcome to Gouache. Connect with emerging artists worldwide on Gouache, discover unique artworks, and be part of the creative journey from studio to
              collection.
            </span>
          </div>
          <div className="w-full max-w-[320px] md:max-w-xl flex flex-col md:flex-row justify-center items-center gap-4">
            <Button asChild variant="gradient" size="lg">
              <Link href="/login?tab=signup">Create a Free Account</Link>
            </Button>
            <Button asChild variant="gradient" size="lg">
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
