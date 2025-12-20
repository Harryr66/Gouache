'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeLoading } from '@/components/theme-loading';

export default function MarketplacePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to discover page with market tab to maintain consistent layout
    router.replace('/discover?tab=market');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <ThemeLoading text="" size="lg" />
    </div>
  );
}
