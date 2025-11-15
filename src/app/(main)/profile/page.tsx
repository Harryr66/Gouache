
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { ProfileHeader } from '@/components/profile-header';
import { ProfileTabs } from '@/components/profile-tabs';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState('portfolio'); // Portfolio is default tab
  const [hasPendingArtistRequest, setHasPendingArtistRequest] = useState(false);

  // Watch for pending artist request for this user
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'artistRequests'),
      where('userId', '==', user.id),
      where('status', '==', 'pending')
    );
    const unsub = onSnapshot(q, (snap) => {
      setHasPendingArtistRequest(!snap.empty);
    });
    return () => unsub();
  }, [user?.id]);

  // Show loading only if auth is still loading and no user
  if (authLoading && !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in to view your profile</h1>
          <p className="text-muted-foreground mb-6">You need to be logged in to access this page.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild variant="gradient" size="lg">
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login?tab=signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-8">
        {hasPendingArtistRequest && (
          <div className="flex items-center gap-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="text-sm">Your artist account request is <Badge variant="secondary">Pending</Badge>. You will be notified when it is reviewed.</span>
          </div>
        )}
        <ProfileHeader
          user={user}
          isOwnProfile={true}
          currentTab={currentTab}
        />

        <ProfileTabs
          userId={user.id}
          isOwnProfile={true}
          isProfessional={user.isProfessional || false}
          onTabChange={setCurrentTab}
        />
      </div>
    </div>
  );
}
