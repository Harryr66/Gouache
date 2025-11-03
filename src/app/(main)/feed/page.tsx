'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingTransition } from '@/components/loading-transition';

export default function FeedPage() {
  const router = useRouter();
  
  // Redirect to discover page immediately
  useEffect(() => {
    router.replace('/discover');
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingTransition />
    </div>
  );
}
