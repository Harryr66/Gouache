'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Users, BookOpen, Package, Heart, ShoppingBag, Brain, Palette, Grid3x3 } from 'lucide-react';
import { ArtworkCard } from './artwork-card';
import { PortfolioManager } from './portfolio-manager';
import { ShopDisplay } from './shop-display';
import { useCourses } from '@/providers/course-provider';
import { ThemeLoading } from './theme-loading';
import { useLikes } from '@/providers/likes-provider';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Artwork, Course } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/providers/auth-provider';
import { CreditCard } from 'lucide-react';

interface ProfileTabsProps {
  userId: string;
  isOwnProfile: boolean;
  isProfessional: boolean;
  hideShop?: boolean;
  hideLearn?: boolean;
  onTabChange?: (tab: string) => void;
}

export function ProfileTabs({ userId, isOwnProfile, isProfessional, hideShop = false, hideLearn = false, onTabChange }: ProfileTabsProps) {
  const { courses, courseEnrollments, isLoading: coursesLoading } = useCourses();
  const { likedArtworkIds, loading: likesLoading } = useLikes();
  const [likedArtworks, setLikedArtworks] = useState<Artwork[]>([]);
  const [likedFetchLoading, setLikedFetchLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  
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
              createdAt: item.createdAt?.toDate?.() || (item.createdAt instanceof Date ? item.createdAt : new Date())
            })).filter((item: any) => item.imageUrl); // Only show items with images
            setPortfolio(portfolioItems);
            console.log('📋 Portfolio loaded for user:', userId, portfolioItems.length, 'items');
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
        {portfolio.map((item) => (
          <Card key={item.id || `portfolio-${item.imageUrl}`} className="group hover:shadow-lg transition-shadow overflow-hidden">
            <div className="relative aspect-square">
              <Image
                src={item.imageUrl}
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
        ))}
      </div>
    );
  }

  if (isProfessional) {
    // For professional artists, show tabs: Portfolio, Shop (if not hidden), Learn (if not hidden)
    const visibleTabs = [
      { value: 'portfolio', label: 'Portfolio', icon: Palette },
      ...(hideShop ? [] : [{ value: 'shop', label: 'Shop', icon: ShoppingBag }]),
      ...(hideLearn ? [] : [{ value: 'learn', label: 'Learn', icon: Brain }]),
    ];
    
    const defaultTab = visibleTabs[0]?.value || 'portfolio';
    const gridCols = visibleTabs.length === 1 ? 'grid-cols-1' : visibleTabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
    
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
          {isOwnProfile ? (
            <PortfolioManager />
          ) : (
            <PortfolioDisplay userId={userId} />
          )}
        </TabsContent>

        {/* Shop Tab */}
        {!hideShop && (
          <TabsContent value="shop" className="space-y-4">
            <ShopDisplay userId={userId} isOwnProfile={isOwnProfile} />
          </TabsContent>
        )}

        {/* Learn Tab */}
        {!hideLearn && (
          <TabsContent value="learn" className="space-y-4">
          {instructorCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {instructorCourses.map((course) => (
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
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-lg">
                        ${course.price.toFixed(2)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/courses/${course.id}`)}
                      >
                        View Course
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <CardContent>
                {isOwnProfile && !isStripeIntegrated ? (
                  <>
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <CardTitle className="mb-2">Connect Stripe to Start Teaching</CardTitle>
                    <CardDescription className="mb-4">
                      Connect your Stripe account to enable course sales. You'll receive payouts directly to your bank account.
                    </CardDescription>
                    <Button 
                      variant="gradient"
                      onClick={() => router.push('/settings?tab=payments')}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Connect Stripe Account
                    </Button>
                  </>
                ) : (
                  <>
                    <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <CardTitle className="mb-2">No courses yet</CardTitle>
                    <CardDescription className="mb-4">
                      {isOwnProfile
                        ? "Create your first course to start teaching."
                        : "This artist hasn't created any courses yet."}
                    </CardDescription>
                    {isOwnProfile && isStripeIntegrated && (
                      <Button asChild variant="gradient">
                        <a href="/learn/submit">
                          <Brain className="h-4 w-4 mr-2" />
                          Create Course
                        </a>
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        )}
      </Tabs>
    );
  }

  // Regular user tabs - Hide Learn for MVP
  return (
    <Tabs defaultValue="liked" className="w-full" onValueChange={onTabChange}>
      <TabsList className="grid w-full grid-cols-1">
        <TabsTrigger value="liked" className="flex items-center gap-2">
          <Heart className="h-4 w-4" />
          Liked
        </TabsTrigger>
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

      {/* Learn Tab - Purchased Courses & Subscribed Communities - Hidden for MVP */}
      {false && (
      <TabsContent value="learn" className="space-y-6">
        {/* Hidden for MVP */}
      </TabsContent>
      )}
    </Tabs>
  );
}
