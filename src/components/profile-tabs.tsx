'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Users, BookOpen, Package, Heart, ShoppingBag, Brain, Palette, Grid3x3 } from 'lucide-react';
import { ArtworkCard } from './artwork-card';
import { PortfolioManager } from './portfolio-manager';
import { useCourses } from '@/providers/course-provider';
import { ThemeLoading } from './theme-loading';
import { useLikes } from '@/providers/likes-provider';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Artwork, Course } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface ProfileTabsProps {
  userId: string;
  isOwnProfile: boolean;
  isProfessional: boolean;
  onTabChange?: (tab: string) => void;
}

export function ProfileTabs({ userId, isOwnProfile, isProfessional, onTabChange }: ProfileTabsProps) {
  const { courses, courseEnrollments, isLoading: coursesLoading } = useCourses();
  const { likedArtworkIds, loading: likesLoading } = useLikes();
  const [likedArtworks, setLikedArtworks] = useState<Artwork[]>([]);
  const [likedFetchLoading, setLikedFetchLoading] = useState(false);
  const router = useRouter();
  
  // Get courses by this instructor
  const instructorCourses = courses.filter(course => course.instructor.userId === userId);
  const likedIds = useMemo(() => Array.from(likedArtworkIds), [likedArtworkIds]);

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
    return (
      <Tabs defaultValue="portfolio" className="w-full" onValueChange={onTabChange}>
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="portfolio" className="flex items-center gap-2">
            <Grid3x3 className="h-4 w-4" />
            Portfolio
          </TabsTrigger>
        </TabsList>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-4">
          {isOwnProfile ? (
            <PortfolioManager />
          ) : (
            <PortfolioDisplay userId={userId} />
          )}
        </TabsContent>

        {/* Shop Tab - Hidden for MVP */}
        {false && (
        <TabsContent value="shop" className="space-y-4">
          <Tabs defaultValue="prints" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="prints" className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Prints
              </TabsTrigger>
              <TabsTrigger value="originals" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Originals
              </TabsTrigger>
              <TabsTrigger value="books" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Books
              </TabsTrigger>
            </TabsList>

            {/* Prints Sub-tab */}
            <TabsContent value="prints" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* TODO: Replace with actual prints data */}
              </div>

              <Card className="p-8 text-center">
                <CardContent>
                  <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <CardTitle className="mb-2">No prints yet</CardTitle>
                  <CardDescription className="mb-4">
                    {isOwnProfile 
                      ? "Start selling prints of your artwork by listing your first print."
                      : "This artist doesn't have any prints for sale yet."
                    }
                  </CardDescription>
                  {isOwnProfile && (
                    <Button 
                      variant="gradient"
                      onClick={() => window.location.href = '/marketplace/submit'}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      List a Print
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Originals Sub-tab */}
            <TabsContent value="originals" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* TODO: Replace with actual originals data */}
              </div>

              <Card className="p-8 text-center">
                <CardContent>
                  <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <CardTitle className="mb-2">No originals yet</CardTitle>
                  <CardDescription className="mb-4">
                    {isOwnProfile 
                      ? "Start selling original artwork by listing your first piece."
                      : "This artist doesn't have any original artwork for sale yet."
                    }
                  </CardDescription>
                  {isOwnProfile && (
                    <Button 
                      variant="gradient"
                      onClick={() => window.location.href = '/marketplace/submit'}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      List an Original
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Books Sub-tab */}
            <TabsContent value="books" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* TODO: Replace with actual books data */}
              </div>

              <Card className="p-8 text-center">
                <CardContent>
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <CardTitle className="mb-2">No books yet</CardTitle>
                  <CardDescription className="mb-4">
                    {isOwnProfile 
                      ? "Start selling books by listing your first book."
                      : "This artist doesn't have any books for sale yet."
                    }
                  </CardDescription>
                  {isOwnProfile && (
                    <Button 
                      variant="gradient"
                      onClick={() => window.location.href = '/marketplace/submit'}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      List a Book
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
        )}

        {/* Learn Tab - Hidden for MVP */}
        {false && (
        <TabsContent value="learn" className="space-y-4">
          {isOwnProfile && (
            <div className="flex justify-end">
              <Button variant="gradient" asChild>
                <a href="/learn/submit">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </a>
              </Button>
            </div>
          )}

          {coursesLoading ? (
            <div className="flex justify-center py-12">
              <ThemeLoading text="Loading courses..." size="md" />
            </div>
          ) : instructorCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {instructorCourses.map((course) => (
                <Card key={course.id} className="group hover:shadow-lg transition-shadow overflow-hidden">
                  <div className="relative">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs">
                        ${course.price}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2 line-clamp-2">{course.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {course.description}
                    </p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span>{course.lessons} lessons</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span>{course.rating.toFixed(1)}</span>
                        <span>({course.reviewCount})</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {course.difficulty}
                      </Badge>
                      <Button size="sm" variant="outline" asChild>
                        <a href={`/learn/${course.id}`}>
                          View Course
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <CardContent>
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <CardTitle className="mb-2">No courses yet</CardTitle>
                <CardDescription className="mb-4">
                  {isOwnProfile 
                    ? "Share your knowledge by creating your first course."
                    : "This instructor hasn't created any courses yet."
                  }
                </CardDescription>
                {isOwnProfile && (
                  <Button variant="gradient" asChild>
                    <a href="/learn/submit">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Course
                    </a>
                  </Button>
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
                Tap the heart icon on artworks you love. They’ll show up here.
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
        {coursesLoading ? (
          <div className="flex justify-center py-12">
            <ThemeLoading text="Loading courses..." size="md" />
          </div>
        ) : null}

        {!coursesLoading && courseEnrollments.length === 0 && (
          <Card className="p-8 text-center">
            <CardContent>
              <CardTitle className="mb-2">No courses yet</CardTitle>
              <CardDescription className="mb-4">When you enroll in courses, they will appear here.</CardDescription>
              <Button asChild variant="gradient">
                <a href="/learn">Explore Courses</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {courseEnrollments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courseEnrollments.map((enrollment) => {
              const course = courses.find((c) => c.id === enrollment.courseId) as Course | undefined;
              if (!course) return null;
              return (
                <Card key={enrollment.id} className="p-6 space-y-4">
                  <CardHeader className="p-0">
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <CardDescription>
                      Progress: {Math.round(enrollment.progress)}%
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-3">{course.description}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{course.category}</span>
                      {enrollment.completedAt ? (
                        <Badge variant="secondary">Completed</Badge>
                      ) : (
                        <Badge variant="outline">In progress</Badge>
                      )}
                    </div>
                    <Button variant="outline" onClick={() => router.push(`/learn/course/${course.id}`)}>
                      Continue Course
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>
      )}
    </Tabs>
  );
}
