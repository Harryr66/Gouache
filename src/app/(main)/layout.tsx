'use client';

import React, { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteFooter } from '@/components/site-footer';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { MobileHeader } from '@/components/mobile-header';
import { ContentProvider } from '@/providers/content-provider';
import { WatchlistProvider } from '@/providers/watchlist-provider';
import { FollowProvider } from '@/providers/follow-provider';
import { DesktopHeader } from '@/components/desktop-header';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
        <ContentProvider>
          <WatchlistProvider>
            <FollowProvider>
              <div className={`flex min-h-screen w-full max-w-full ${isMobile ? 'overflow-x-visible' : 'overflow-x-hidden'} bg-background flex-col`}>
        {/* Desktop Header */}
        <div className="hidden md:block">
          <DesktopHeader />
        </div>
        
        {/* Mobile Header */}
        <div className="md:hidden">
          <MobileHeader />
        </div>
        
        {/* Main content - NO position relative to avoid creating stacking context that blocks navigation */}
        <main className={`flex-1 overflow-y-auto ${isMobile ? 'overflow-x-visible' : 'overflow-x-hidden'} pb-16 md:pb-0 w-full max-w-full`}>
          {children}
        </main>
        <SiteFooter />
        <MobileBottomNav />
              </div>
            </FollowProvider>
          </WatchlistProvider>
        </ContentProvider>
  );
}