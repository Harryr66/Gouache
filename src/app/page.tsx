
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingTransition } from '@/components/loading-transition';

export default function RootPage() {
  const router = useRouter();
  
  // Redirect to news page immediately
  useEffect(() => {
    router.replace('/news');
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingTransition />
    </div>
  );
}
