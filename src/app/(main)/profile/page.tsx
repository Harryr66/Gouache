
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { ProfileHeader } from '@/components/profile-header';
import { ProfileTabs } from '@/components/profile-tabs';
import { collection, onSnapshot, query, where, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Loader2, MapPin, Calendar as CalendarIcon, Pin, PinOff, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState('portfolio'); // Portfolio is default tab
  const [hasPendingArtistRequest, setHasPendingArtistRequest] = useState(false);
  const [hasApprovedArtistRequest, setHasApprovedArtistRequest] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

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

  // Check if user has an approved artist request (fallback for missing isProfessional flag)
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'artistRequests'),
      where('userId', '==', user.id),
      where('status', '==', 'approved')
    );
    const unsub = onSnapshot(q, (snap) => {
      setHasApprovedArtistRequest(!snap.empty);
    });
    return () => unsub();
  }, [user?.id]);

  // Load events for this artist (for carousel + pin/delete)
  useEffect(() => {
    const loadEvents = async () => {
      if (!user) return;
      try {
        setEventsLoading(true);
        const snap = await getDocs(
          query(collection(db, 'events'), where('artistId', '==', user.id))
        );
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Sort pinned first (pinnedAt desc), then by start date desc
        list.sort((a: any, b: any) => {
          const ap = a.pinnedAt?.toMillis?.() || a.pinnedAt?.seconds || 0;
          const bp = b.pinnedAt?.toMillis?.() || b.pinnedAt?.seconds || 0;
          if (ap !== bp) return bp - ap;
          return (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0);
        });
        setEvents(list);
      } finally {
        setEventsLoading(false);
      }
    };
    loadEvents();
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

  // If artist request is approved but flag missing, treat as professional
  const effectiveUser = hasApprovedArtistRequest && !user.isProfessional
    ? { ...user, isProfessional: true, isVerified: user.isVerified || true }
    : user;

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteDoc(doc(db, 'events', eventId));
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (error) {
      console.error('Failed to delete event', error);
    }
  };

  const handlePinEvent = async (eventId: string, pin: boolean) => {
    try {
      const ref = doc(db, 'events', eventId);
      await updateDoc(ref, {
        pinned: pin,
        pinnedAt: pin ? serverTimestamp() : null,
      });
      setEvents((prev) =>
        prev
          .map((e) => (e.id === eventId ? { ...e, pinned: pin, pinnedAt: pin ? new Date() : null } : e))
          .sort((a: any, b: any) => {
            const ap = a.pinnedAt?.toMillis?.() || a.pinnedAt?.seconds || (a.pinnedAt instanceof Date ? a.pinnedAt.getTime() : 0);
            const bp = b.pinnedAt?.toMillis?.() || b.pinnedAt?.seconds || (b.pinnedAt instanceof Date ? b.pinnedAt.getTime() : 0);
            if (ap !== bp) return bp - ap;
            return (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0);
          })
      );
    } catch (error) {
      console.error('Failed to pin/unpin event', error);
    }
  };

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
          user={effectiveUser}
          isOwnProfile={true}
          currentTab={currentTab}
        />

        <ProfileTabs
          userId={effectiveUser.id}
          isOwnProfile={true}
          isProfessional={effectiveUser.isProfessional || hasApprovedArtistRequest || false}
          hideShop={effectiveUser.hideShop ?? false}
          hideLearn={true}
          onTabChange={setCurrentTab}
        />

        {/* Events Carousel */}
        {eventsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading events…
          </div>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Events</CardTitle>
              <Badge variant="secondary">{events.length}</Badge>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events yet.</p>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="min-w-[280px] max-w-[320px] border rounded-lg overflow-hidden shadow-sm bg-card"
                    >
                      <div className="relative h-40 w-full bg-muted">
                        {event.imageUrl ? (
                          <Image
                            src={event.imageUrl}
                            alt={event.title || 'Event'}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{event.type || 'Event'}</Badge>
                          {event.pinned && <Badge variant="outline">Pinned</Badge>}
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold line-clamp-1">{event.title || 'Untitled event'}</p>
                          {event.date && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {new Date(event.date).toLocaleDateString()}
                              {event.endDate ? ` → ${new Date(event.endDate).toLocaleDateString()}` : ''}
                              {event.time ? ` at ${event.time}` : ''}
                            </p>
                          )}
                          {event.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </p>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                        )}
                        <div className="flex items-center justify-between pt-2">
                          <div className="text-xs font-medium">
                            {event.price ? event.price : 'Free'}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handlePinEvent(event.id, !event.pinned)}
                              title={event.pinned ? 'Unpin' : 'Pin'}
                            >
                              {event.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDeleteEvent(event.id)}
                              title="Delete event"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
