'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Users, BookOpen, Package, Heart, ShoppingBag, Brain, Palette, Grid3x3, Play, Calendar, MapPin, Pin, PinOff, Trash2 } from 'lucide-react';
import { ArtworkCard } from './artwork-card';
import { PortfolioManager } from './portfolio-manager';
import { ShopDisplay } from './shop-display';
import { useCourses } from '@/providers/course-provider';
import { ThemeLoading } from './theme-loading';
import { useLikes } from '@/providers/likes-provider';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Artwork, Course } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/providers/auth-provider';
import { CreditCard } from 'lucide-react';
import { useFollow } from '@/providers/follow-provider';

interface ProfileTabsProps {
  userId: string;
  isOwnProfile: boolean;
  isProfessional: boolean;
  hideShop?: boolean;
  hideLearn?: boolean;
  hideUpcomingEvents?: boolean;
  onTabChange?: (tab: string) => void;
}

export function ProfileTabs({ userId, isOwnProfile, isProfessional, hideShop = false, hideLearn = true, hideUpcomingEvents = false, onTabChange }: ProfileTabsProps) {
  const { courses, courseEnrollments, isLoading: coursesLoading } = useCourses();
  const { likedArtworkIds, loading: likesLoading } = useLikes();
  const [likedArtworks, setLikedArtworks] = useState<Artwork[]>([]);
  const [likedFetchLoading, setLikedFetchLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  
  // Generate avatar placeholder URL helper
  const generateAvatarPlaceholderUrl = (width: number = 150, height: number = 150) => {
    const isLightMode = typeof window !== 'undefined' && 
      (document.documentElement.classList.contains('light') || 
       !document.documentElement.classList.contains('dark'));
    const backgroundColor = isLightMode ? '#f8f9fa' : '#1f2937';
    const textColor = isLightMode ? '#6b7280' : '#ffffff';
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${backgroundColor}"/>
        <text x="50%" y="50%" text-anchor="middle" fill="${textColor}" font-family="Arial, sans-serif" font-size="24" font-weight="bold">Gouache</text>
      </svg>
    `)}`;
  };
  
  // Get courses by this instructor
  const instructorCourses = courses.filter(course => course.instructor.userId === userId);
  const likedIds = useMemo(() => Array.from(likedArtworkIds), [likedArtworkIds]);
  
  // Check if Stripe is integrated and ready
  const isStripeIntegrated = user?.stripeAccountId && 
    user?.stripeOnboardingStatus === 'complete' && 
    user?.stripeChargesEnabled && 
    user?.stripePayoutsEnabled;

  useEffect(() => {
    let isMounted = true;

    const loadLikedArtworks = async () => {
      if (likesLoading) return;

      if (likedIds.length === 0) {
        if (isMounted) {
          setLikedArtworks([]);
        }
        return;
      }

      setLikedFetchLoading(true);
      try {
        const results: Artwork[] = [];
        for (const artworkId of likedIds) {
          try {
            const artworkRef = doc(db, 'artworks', artworkId);
            const snapshot = await getDoc(artworkRef);
            if (!snapshot.exists()) continue;
            const data = snapshot.data() as any;
            const artwork: Artwork = {
              id: snapshot.id,
              artist: data.artist,
              title: data.title || 'Untitled',
              description: data.description,
              imageUrl: data.imageUrl,
              imageAiHint: data.imageAiHint || data.title || 'Artwork',
              tags: data.tags || [],
              price: data.price,
              currency: data.currency,
              isForSale: data.isForSale,
              isAuction: data.isAuction,
              auctionId: data.auctionId,
              category: data.category,
              medium: data.medium,
              dimensions: data.dimensions,
              createdAt: data.createdAt?.toDate?.() || new Date(),
              updatedAt: data.updatedAt?.toDate?.() || new Date(),
              views: data.views,
              likes: data.likes,
              commentsCount: data.commentsCount,
              isAI: data.isAI,
              aiAssistance: data.aiAssistance,
              processExplanation: data.processExplanation,
              materialsList: data.materialsList,
              supportingImages: data.supportingImages,
              supportingVideos: data.supportingVideos,
              statement: data.statement,
            };
            results.push(artwork);
          } catch (error) {
            console.error('Failed to load liked artwork', artworkId, error);
          }
        }

        if (isMounted) {
          setLikedArtworks(results);
        }
      } finally {
        if (isMounted) {
          setLikedFetchLoading(false);
        }
      }
    };

    loadLikedArtworks();

    return () => {
      isMounted = false;
    };
  }, [likesLoading, likedIds]);

  // Events state and loading
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Load events for this artist
  useEffect(() => {
    if (!isProfessional || hideUpcomingEvents) return;
    
    const loadEvents = async () => {
      try {
        setEventsLoading(true);
        const snap = await getDocs(
          query(collection(db, 'events'), where('artistId', '==', userId))
        );
        const now = new Date();
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((event: any) => {
            // Filter to only show upcoming/current events (not past events)
            if (event.endDate) {
              const endDate = new Date(event.endDate);
              return endDate >= now;
            } else if (event.date) {
              const startDate = new Date(event.date);
              return startDate >= now;
            }
            return true;
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
  }, [userId, isProfessional, hideUpcomingEvents]);

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

  // Component to display events
  function EventsDisplay({ userId, isOwnProfile }: { userId: string; isOwnProfile: boolean }) {
    if (eventsLoading) {
      return (
        <div className="flex justify-center py-8">
          <ThemeLoading text="" size="sm" />
        </div>
      );
    }

    if (events.length === 0) {
      return (
        <Card className="p-8 text-center">
          <CardContent>
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No upcoming events</CardTitle>
            <CardDescription className="mb-4">
              {isOwnProfile 
                ? "You haven't created any upcoming events yet."
                : "This artist doesn't have any upcoming events."}
            </CardDescription>
            {isOwnProfile && (
              <Button asChild variant="gradient">
                <a href="/upload">Create Event</a>
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <Card key={event.id} className="group hover:shadow-lg transition-shadow overflow-hidden">
            <div className="relative h-48 w-full bg-muted">
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
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
                      onClick={() => handlePinEvent(event.id, !event.pinned)}
                    >
                      {event.pinned ? (
                        <PinOff className="h-4 w-4" />
                      ) : (
                        <Pin className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background text-red-400 hover:text-red-500"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {event.pinned && <Pin className="h-3 w-3 text-muted-foreground" />}
                <CardTitle className="text-lg line-clamp-2">{event.title || 'Untitled event'}</CardTitle>
              </div>
              {event.date && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(event.date).toLocaleDateString()}
                  {event.endDate ? ` → ${new Date(event.endDate).toLocaleDateString()}` : ''}
                </p>
              )}
              {event.location && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </p>
              )}
              {event.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{event.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Component to display other user's portfolio
  function PortfolioDisplay({ userId }: { userId: string }) {
    const [portfolio, setPortfolio] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchPortfolio = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'userProfiles', userId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const portfolioItems = (data.portfolio || []).map((item: any) => ({
              ...item,
              imageUrl: item.imageUrl || item.supportingImages?.[0] || item.images?.[0] || '',
              createdAt: item.createdAt?.toDate?.() || (item.createdAt instanceof Date ? item.createdAt : new Date())
            })); // REMOVED FILTER - show ALL items
            setPortfolio(portfolioItems);
            console.log('📋 Portfolio loaded for user:', userId, portfolioItems.length, 'items', {
              totalInFirestore: (data.portfolio || []).length,
              withImages: portfolioItems.length,
              items: portfolioItems.map((i: any) => ({ id: i.id, title: i.title, imageUrl: i.imageUrl ? 'has image' : 'no image' }))
            });
          }
        } catch (error) {
          console.error('Error fetching portfolio:', error);
        } finally {
          setLoading(false);
        }
      };

      // Load immediately, no delay
      fetchPortfolio();
    }, [userId]);

    // Show loading only briefly, then show empty state or portfolio
    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <ThemeLoading text="" size="sm" />
        </div>
      );
    }

    if (portfolio.length === 0) {
      return (
        <Card className="p-8 text-center">
          <CardContent>
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No artwork yet</CardTitle>
            <CardDescription className="mb-4">
              This artist hasn't uploaded any artwork yet.
            </CardDescription>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {portfolio.map((item) => {
          const imageUrl = item.imageUrl || item.supportingImages?.[0] || '/assets/placeholder-light.png';
          return (
          <Card key={item.id || `portfolio-${item.imageUrl || Date.now()}`} className="group hover:shadow-lg transition-shadow overflow-hidden">
            <div className="relative aspect-square">
              <Image
                src={imageUrl}
                alt={item.title || 'Artwork'}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm mb-1 line-clamp-1">{item.title || 'Untitled Artwork'}</h4>
              {item.medium && (
                <p className="text-xs text-muted-foreground line-clamp-1">{item.medium}</p>
              )}
            </CardContent>
          </Card>
          );
        })}
      </div>
    );
  }

  console.log('🎯 ProfileTabs render:', { isProfessional, userId, isOwnProfile, hideShop });

  if (isProfessional) {
    // For professional artists, show tabs: Portfolio, Events (if not hidden), Shop (if not hidden), Learn (if not hidden)
    const visibleTabs = [
      { value: 'portfolio', label: 'Portfolio', icon: Palette },
      ...(hideUpcomingEvents ? [] : [{ value: 'events', label: 'Upcoming Events', icon: Calendar }]),
      ...(hideShop ? [] : [{ value: 'shop', label: 'Shop', icon: ShoppingBag }]),
    ];
    
    const defaultTab = visibleTabs[0]?.value || 'portfolio';
    const gridCols = visibleTabs.length === 1 ? 'grid-cols-1' : visibleTabs.length === 2 ? 'grid-cols-2' : visibleTabs.length === 3 ? 'grid-cols-3' : 'grid-cols-4';
    
    console.log('✅ ProfileTabs: Rendering professional artist tabs', { visibleTabs: visibleTabs.map(t => t.value), defaultTab });
    
    return (
      <Tabs defaultValue={defaultTab} className="w-full" onValueChange={onTabChange}>
        <TabsList className={`grid w-full ${gridCols}`}>
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-4">
          {(() => {
            if (isOwnProfile) {
              console.log('🎨 ProfileTabs: Rendering PortfolioManager for own profile');
              return <PortfolioManager />;
            } else {
              console.log('🎨 ProfileTabs: Rendering PortfolioDisplay for other user', userId);
              return <PortfolioDisplay userId={userId} />;
            }
          })()}
        </TabsContent>

        {/* Upcoming Events Tab */}
        {!hideUpcomingEvents && (
          <TabsContent value="events" className="space-y-4">
            <EventsDisplay userId={userId} isOwnProfile={isOwnProfile} />
          </TabsContent>
        )}

        {/* Shop Tab */}
        {!hideShop && (
          <TabsContent value="shop" className="space-y-4">
            <ShopDisplay userId={userId} isOwnProfile={isOwnProfile} />
          </TabsContent>
        )}

      </Tabs>
    );
  }

  // Regular user tabs - Simplified: Liked, Following, Learn (purchased courses)
  const { getFollowedArtists } = useFollow();
  const followedArtists = getFollowedArtists();
  const purchasedCourses = courseEnrollments.map(enrollment => {
    const course = courses.find(c => c.id === enrollment.courseId);
    return course;
  }).filter(Boolean) as Course[];

  const visibleTabs = [
    { value: 'liked', label: 'Liked', icon: Heart },
    { value: 'following', label: 'Following', icon: Users },
    ...(hideLearn ? [] : [{ value: 'learn', label: 'Learn', icon: BookOpen }]),
  ];
  
  const gridCols = visibleTabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
  
  return (
    <Tabs defaultValue="liked" className="w-full" onValueChange={onTabChange}>
      <TabsList className={`grid w-full ${gridCols}`}>
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* Liked Tab */}
      <TabsContent value="liked" className="space-y-4">
        {(likesLoading || likedFetchLoading) && (
          <div className="flex justify-center py-12">
            <ThemeLoading text="Loading liked artworks..." size="md" />
          </div>
        )}

        {!likesLoading && !likedFetchLoading && likedArtworks.length === 0 && (
          <Card className="p-8 text-center">
            <CardContent>
              <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No liked artworks yet</CardTitle>
              <CardDescription className="mb-4">
                Tap the heart icon on artworks you love. They'll show up here.
              </CardDescription>
              <Button asChild variant="gradient">
                <a href="/discover">Browse Artists</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {likedArtworks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {likedArtworks.map((artwork) => (
              <ArtworkCard
                key={artwork.id}
                artwork={artwork}
                onClick={() => router.push(`/artwork/${artwork.id}`)}
              />
            ))}
          </div>
        )}
      </TabsContent>

      {/* Following Tab */}
      <TabsContent value="following" className="space-y-4">
        {followedArtists.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent>
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No followed artists yet</CardTitle>
              <CardDescription className="mb-4">
                Follow artists you love to see their latest work in your feed.
              </CardDescription>
              <Button asChild variant="gradient">
                <a href="/discover">Discover Artists</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {followedArtists.map((artist) => (
              <Card key={artist.id} className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/profile/${artist.id}`)}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 rounded-full overflow-hidden flex-shrink-0">
                      <img
                        src={artist.avatarUrl || generateAvatarPlaceholderUrl(64, 64)}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">{artist.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">@{artist.handle}</p>
                      {artist.location && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{artist.location}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Learn Tab - Purchased Courses */}
      {!hideLearn && (
      <TabsContent value="learn" className="space-y-4">
        {coursesLoading ? (
          <div className="flex justify-center py-12">
            <ThemeLoading text="Loading courses..." size="md" />
          </div>
        ) : purchasedCourses.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent>
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No purchased courses yet</CardTitle>
              <CardDescription className="mb-4">
                Purchase courses from artists to start learning. They'll appear here.
              </CardDescription>
              <Button asChild variant="gradient">
                <a href="/discover">Browse Courses</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {purchasedCourses.map((course) => (
              <Card key={course.id} className="group hover:shadow-lg transition-shadow">
                <div className="relative aspect-video">
                  {course.thumbnail ? (
                    <Image
                      src={course.thumbnail}
                      alt={course.title}
                      fill
                      className="object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <CardTitle className="text-lg mb-2">{course.title}</CardTitle>
                  <CardDescription className="line-clamp-2 mb-4">
                    {course.description}
                  </CardDescription>
                  <Button
                    variant="gradient"
                    className="w-full"
                    onClick={() => router.push(`/learn/${course.id}`)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Continue Learning
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
      )}
    </Tabs>
  );
}
