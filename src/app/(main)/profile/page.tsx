
'use client';

import { useEffect, useMemo, useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { ProfileHeader } from '@/components/profile-header';
import { ProfileTabs } from '@/components/profile-tabs';
import { collection, onSnapshot, query, where, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Loader2, MapPin, Calendar as CalendarIcon, Pin, PinOff, Trash2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState('portfolio'); // Portfolio is default tab
  const [hasPendingArtistRequest, setHasPendingArtistRequest] = useState(false);
  const [hasApprovedArtistRequest, setHasApprovedArtistRequest] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [showEvents, setShowEvents] = useState(false); // Collapsed by default

  // Watch for pending artist request for this user
  useEffect(() => {
    // Prevent guest (anonymous) users from accessing profile
    if (!authLoading && user && (!user.email || user.email === '')) {
      router.replace('/');
      return;
    }

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
  const isOwnProfile = true;

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

        {/* Events Carousel */}
        {eventsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading events…
          </div>
        ) : (
          <Collapsible 
            open={showEvents} 
            onOpenChange={(open) => {
              startTransition(() => {
                setShowEvents(open);
              });
            }}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <CardTitle>Upcoming Events</CardTitle>
                    <Badge variant="secondary">{events.length}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {showEvents ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No Upcoming Events</p>
                  ) : (
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {events.map((event) => (
                        <div
                          key={event.id}
                          className="min-w-[360px] max-w-[400px] border rounded-lg overflow-hidden shadow-sm bg-card relative"
                        >
                          <div className="relative h-28 w-full bg-muted">
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
                            {isOwnProfile && (
                              <div className="absolute top-2 right-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="secondary" size="icon" className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background">
                                      ⋯
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handlePinEvent(event.id, !event.pinned)}>
                                      {event.pinned ? (
                                        <>
                                          <PinOff className="h-4 w-4 mr-2" /> Unpin
                                        </>
                                      ) : (
                                        <>
                                          <Pin className="h-4 w-4 mr-2" /> Pin
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-400 hover:text-red-500 focus:text-red-500"
                                      onClick={() => handleDeleteEvent(event.id)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </div>
                          <div className="p-2 space-y-1">
                            <p className="font-semibold text-sm line-clamp-1">{event.title || 'Untitled event'}</p>
                            {event.date && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {new Date(event.date).toLocaleDateString()}
                                {event.endDate ? ` → ${new Date(event.endDate).toLocaleDateString()}` : ''}
                              </p>
                            )}
                            {event.location && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {(() => {
          const isProf = effectiveUser.isProfessional || hasApprovedArtistRequest || false;
          console.log('👤 Profile page: isProfessional check', {
            effectiveUserIsProfessional: effectiveUser.isProfessional,
            hasApprovedArtistRequest,
            finalIsProfessional: isProf,
            userId: effectiveUser.id
          });
          return (
        <ProfileTabs
              userId={effectiveUser.id}
          isOwnProfile={true}
              isProfessional={isProf}
              hideShop={true}
              hideLearn={true}
              hideUpcomingEvents={effectiveUser.hideUpcomingEvents || false}
          onTabChange={setCurrentTab}
        />
          );
        })()}
      </div>
    </div>
  );
}
