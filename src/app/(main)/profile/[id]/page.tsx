
'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState, startTransition } from 'react';
import { ProfileHeader } from '@/components/profile-header';
import { ProfileTabs } from '@/components/profile-tabs';
import { useAuth } from '@/providers/auth-provider';
import { useFollow } from '@/providers/follow-provider';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Loader2, MapPin, Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ThemeLoading } from '@/components/theme-loading';

export default function ArtistProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { isFollowing: checkIsFollowing, followArtist, unfollowArtist } = useFollow();
  const artistId = params.id as string;
  
  const [profileUser, setProfileUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [showEvents, setShowEvents] = useState(true); // Expanded by default for public view
  const [hasApprovedArtistRequest, setHasApprovedArtistRequest] = useState(false);

  useEffect(() => {
    // Only prevent guest (anonymous) users from viewing their own profile
    // Guest users can view other artists' profiles
    if (user && (!user.email || user.email === '') && user.id === artistId) {
      router.replace('/');
    }
  }, [user, router, artistId]);

  useEffect(() => {
    const fetchProfile = async () => {
      // Ensure we have an artistId before fetching
      if (!artistId) {
        console.error('❌ No artistId provided in URL params');
        setLoading(false);
        return;
      }
      
      try {
        console.log('🔍 Fetching profile for artistId:', artistId, 'Current logged-in user:', user?.id);
        
        let profileDocRef = doc(db, 'userProfiles', artistId);
        let userDoc = await getDoc(profileDocRef);

        // If no doc by id, try lookup by handle/username
        if (!userDoc.exists()) {
          console.log('⚠️ Profile not found by ID, trying handle lookup...');
          const { getDocs, collection, query, where, limit } = await import('firebase/firestore');
          const q = query(
            collection(db, 'userProfiles'),
            where('handle', '==', artistId),
            limit(1)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const docMatch = snap.docs[0];
            console.log('✅ Found profile by handle:', docMatch.id);
            profileDocRef = doc(db, 'userProfiles', docMatch.id);
            userDoc = await getDoc(profileDocRef);
          }
        }

        if (userDoc.exists()) {
          const data = userDoc.data();
          
          console.log('📋 Profile data from Firestore:', {
            docId: userDoc.id,
            name: data.name || data.displayName,
            handle: data.handle || data.username,
            isProfessional: data.isProfessional,
            hideShop: data.hideShop,
            hideLearn: data.hideLearn,
            portfolioCount: (data.portfolio || []).length
          });
          
          // Convert portfolio items from Firestore format (with Timestamps) to Date objects
          const portfolio = (data.portfolio || []).map((item: any) => ({
            ...item,
            createdAt: item.createdAt?.toDate?.() || (item.createdAt instanceof Date ? item.createdAt : new Date())
          }));
          
          // Check if user has an approved artist request (fallback for missing isProfessional flag)
          let hasApprovedRequest = false;
          try {
            const artistRequestQuery = query(
              collection(db, 'artistRequests'),
              where('userId', '==', userDoc.id),
              where('status', '==', 'approved')
            );
            const artistRequestSnap = await getDocs(artistRequestQuery);
            hasApprovedRequest = !artistRequestSnap.empty;
            setHasApprovedArtistRequest(hasApprovedRequest);
          } catch (error) {
            console.error('Error checking artist request:', error);
          }
          
          const isProfessionalFlag = data.isProfessional || (portfolio.length > 0) || hasApprovedRequest;
          
          // Map Firestore data to ProfileHeader expected format
          const profileData = {
            id: userDoc.id,
            displayName: data.name || data.displayName || 'User',
            isVerified: data.isVerified !== false && isProfessionalFlag === true, // All approved professional artists are verified
            username: data.handle || data.username || `user_${userDoc.id}`,
            avatarUrl: data.avatarUrl || undefined,
            bannerImageUrl: data.bannerImageUrl || undefined,
            bio: data.bio || '',
            location: data.location || '',
            countryOfOrigin: data.countryOfOrigin || '',
            countryOfResidence: data.countryOfResidence || '',
            followerCount: data.followerCount || 0,
            followingCount: data.followingCount || 0,
            isProfessional: isProfessionalFlag,
            profileRingColor: data.profileRingColor || undefined,
            tipJarEnabled: data.tipJarEnabled || false,
            suggestionsEnabled: data.suggestionsEnabled || false,
            hideLocation: data.hideLocation || false,
            hideFlags: data.hideFlags || false,
            hideCard: data.hideCard || false,
            hideUpcomingEvents: data.hideUpcomingEvents || false,
            hideShowcaseLocations: data.hideShowcaseLocations || false,
            // Default to hidden until explicitly enabled
            hideShop: data.hideShop ?? true,
            hideLearn: data.hideLearn ?? true,
            eventCity: data.eventCity || undefined,
            eventCountry: data.eventCountry || undefined,
            eventDate: data.eventDate || undefined,
            showcaseLocations: data.showcaseLocations || [],
            newsletterLink: data.newsletterLink || undefined,
            newsletterProvider: data.newsletterProvider || undefined,
            socialLinks: data.socialLinks || undefined,
            hideSocialIcons: data.hideSocialIcons || false,
            portfolio: portfolio, // Include portfolio for ProfileTabs
          };
          
          console.log('✅ Profile loaded successfully:', {
            profileId: profileData.id,
            profileName: profileData.displayName,
            profileUsername: profileData.username,
            loggedInUserId: user?.id,
            isOwnProfile: user?.id === profileData.id,
            portfolioCount: portfolio.length,
            isProfessional: profileData.isProfessional,
            hideShop: profileData.hideShop,
            hideLearn: profileData.hideLearn
          });
          
          setProfileUser(profileData);
        } else {
          console.error('❌ Profile not found for artistId:', artistId);
          notFound();
        }
      } catch (error) {
        console.error('❌ Error fetching profile:', error);
        notFound();
      } finally {
        setLoading(false);
      }
    };

    if (artistId) {
      fetchProfile();
    }
  }, [artistId, user?.id]);

  // Load events for this artist (visible to all users including guests)
  useEffect(() => {
    const loadEvents = async () => {
      if (!profileUser?.id) return;
      try {
        setEventsLoading(true);
        const snap = await getDocs(
          query(collection(db, 'events'), where('artistId', '==', profileUser.id))
        );
        const now = new Date();
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((event: any) => {
            // Filter to only show upcoming/current events (not past events)
            if (event.endDate) {
              const endDate = new Date(event.endDate);
              return endDate >= now; // Event hasn't ended yet
            } else if (event.date) {
              const startDate = new Date(event.date);
              return startDate >= now; // Event hasn't started yet or is today
            }
            return true; // If no date, show it (shouldn't happen but safe fallback)
          });
        // Sort pinned first (pinnedAt desc), then by start date desc
        list.sort((a: any, b: any) => {
          const ap = a.pinnedAt?.toMillis?.() || a.pinnedAt?.seconds || 0;
          const bp = b.pinnedAt?.toMillis?.() || b.pinnedAt?.seconds || 0;
          if (ap !== bp) return bp - ap;
          return (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0);
        });
        setEvents(list);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setEventsLoading(false);
      }
    };
    loadEvents();
  }, [profileUser?.id]);

  // Check if user is following this artist
  const isFollowing = user ? checkIsFollowing(profileUser?.id) : false;

  const handleFollowToggle = async () => {
    if (!user || !profileUser) return;
    
    if (isFollowing) {
      // Unfollow
      await unfollowArtist(profileUser.id);
    } else {
      // Follow
      await followArtist(profileUser.id);
    }
    
    // Refresh profile data to get updated follower count
    try {
      const profileDocRef = doc(db, 'userProfiles', profileUser.id);
      const userDoc = await getDoc(profileDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfileUser((prev: any) => ({
          ...prev,
          followerCount: data.followerCount || 0,
        }));
      }
    } catch (error) {
      console.error('Error refreshing profile after follow/unfollow:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-24"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    notFound();
  }

  // Compare against the actual profile user ID, not the URL parameter (which might be a handle)
  const isOwnProfile = user?.id === profileUser.id;
  
  // Safety check: ensure profileUser matches the requested artistId
  if (profileUser.id !== artistId && !profileUser.username?.toLowerCase().includes(artistId.toLowerCase())) {
    console.warn('⚠️ Profile ID/username mismatch! Requested:', artistId, 'Got profile ID:', profileUser.id, 'Got username:', profileUser.username);
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-6xl">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="space-y-8">
        <ProfileHeader
          user={profileUser}
          isOwnProfile={isOwnProfile}
          isFollowing={isFollowing}
          onFollowToggle={handleFollowToggle}
        />

        {/* Events Carousel - Only show for professional artists */}
        {profileUser.isProfessional && !profileUser.hideUpcomingEvents && (
          eventsLoading ? (
            <ThemeLoading text="" size="sm" />
          ) : events.length > 0 ? (
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
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ) : null
        )}

        <ProfileTabs
          userId={profileUser.id}
          isOwnProfile={isOwnProfile}
          isProfessional={profileUser.isProfessional || false}
          hideShop={profileUser.hideShop ?? true}
          hideLearn={profileUser.hideLearn ?? true}
        />
      </div>
    </div>
  );
}
