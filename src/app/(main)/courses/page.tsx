'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Star, Users, Clock, Video, Calendar } from 'lucide-react';
import { useCourses } from '@/providers/course-provider';
import { ThemeLoading } from '@/components/theme-loading';
import Image from 'next/image';
import Link from 'next/link';
import { fetchActiveAds, mixAdsIntoContent } from '@/lib/ad-fetcher';
import { AdTile } from '@/components/ad-tile';
import { useAuth } from '@/providers/auth-provider';

export default function CoursesPage() {
  const router = useRouter();
  const { courses, isLoading } = useCourses();
  const { user } = useAuth();
  const [ads, setAds] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  
  // OPTIONAL LOADING SCREEN - Only show if there's actually a delay (500ms+)
  const [showLoadingScreen, setShowLoadingScreen] = useState(false); // Start hidden
  const [coursesLoaded, setCoursesLoaded] = useState(false);
  const loadingStartTimeRef = useRef<number>(Date.now());
  const loadingScreenTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const LOADING_SCREEN_DELAY = 500; // Only show loading screen if load takes 500ms+

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch ads for learn section
  useEffect(() => {
    fetchActiveAds('learn', user?.id).then(setAds).catch(console.error);
  }, [user]);

  // Joke handler removed - jokes list preserved in typewriter-joke.tsx for future use

  // Courses are already filtered by CourseProvider to only include published and approved courses
  // Rank courses: Higher rating + more students + more reviews = higher rank
  const rankedCourses = useMemo(() => {
    if (!courses || courses.length === 0) return [];
    
    // SIMPLE: Only filter courses missing critical data. Everything else goes through.
    // Placeholder detection happens in sorting, not filtering.
    const validCourses = courses.filter((course: any) => {
      const hasTitle = course.title && (course.title.trim().length > 0);
      const hasPrice = course.price !== undefined && course.price !== null;
      const isNotDeleted = course.deleted !== true;
      return hasTitle && hasPrice && isNotDeleted;
    });
    
    // Helper to detect placeholders - sample courses from setup script have IDs like "course-1", "course-2", etc.
    // Real courses created by users have Firebase auto-generated IDs (long alphanumeric strings)
    const isPlaceholder = (course: any): boolean => {
      const id = course.id || '';
      
      // Sample courses from setup-course-database.js have IDs matching pattern "course-[number]"
      // Examples: "course-1", "course-2", "course-5"
      if (/^course-\d+$/.test(id)) {
        return true;
      }
      
      // Also check for explicit placeholder keywords as backup
      const idLower = id.toLowerCase();
      const title = ((course.title || '').trim()).toLowerCase();
      
      if (idLower.includes('placeholder') || 
          idLower.includes('dummy') || 
          idLower.includes('sample') ||
          title.includes('placeholder') ||
          title.includes('dummy course') ||
          title.includes('sample course')) {
        return true;
      }
      
      return false;
    };
    
    // Create a copy to avoid mutating original array
    const sortedCourses = [...validCourses].sort((a, b) => {
      // ABSOLUTE PRIORITY 1: Real courses ALWAYS rank above placeholders
      const aIsPlaceholder = isPlaceholder(a);
      const bIsPlaceholder = isPlaceholder(b);
      if (!aIsPlaceholder && bIsPlaceholder) return -1; // Real course wins
      if (aIsPlaceholder && !bIsPlaceholder) return 1;  // Real course wins
      
      // PRIORITY 2: Courses with engagement ALWAYS rank above courses without engagement
      const aStudents = a.students || 0;
      const bStudents = b.students || 0;
      const aReviews = a.reviewCount || 0;
      const bReviews = b.reviewCount || 0;
      const aHasEngagement = aStudents > 0 || aReviews > 0;
      const bHasEngagement = bStudents > 0 || bReviews > 0;
      
      // If one has engagement and the other doesn't, engagement wins immediately
      if (aHasEngagement && !bHasEngagement) return -1; // a ranks higher
      if (!aHasEngagement && bHasEngagement) return 1;  // b ranks higher
      
      // Both have engagement or both don't - calculate detailed scores
      // 1. Rating score (0-5 stars, weighted heavily) - ONLY if has reviews
      const aRating = aHasEngagement && aReviews > 0 ? (a.rating || 0) : 0;
      const bRating = bHasEngagement && bReviews > 0 ? (b.rating || 0) : 0;
      const aRatingScore = aRating * 40; // Max 200 points
      const bRatingScore = bRating * 40;
      
      // 2. Review count score (more reviews = more credibility)
      // Log scale: 1 review = 10, 10 reviews = 20, 100 reviews = 30, 1000 reviews = 40
      const aReviewScore = aReviews > 0 ? Math.log10(aReviews + 1) * 20 : -50; // Heavy penalty for no reviews
      const bReviewScore = bReviews > 0 ? Math.log10(bReviews + 1) * 20 : -50;
      
      // 3. Student count score (popularity indicator) - heavily weighted
      // Log scale: 1 student = 10, 10 students = 20, 100 students = 30, 1000 students = 40
      const aStudentScore = aStudents > 0 ? Math.log10(aStudents + 1) * 20 : -50; // Heavy penalty for no students
      const bStudentScore = bStudents > 0 ? Math.log10(bStudents + 1) * 20 : -50;
      
      // 4. Engagement multiplier: Courses with BOTH students AND reviews get bonus
      const aHasBothEngagement = aStudents > 0 && aReviews > 0;
      const bHasBothEngagement = bStudents > 0 && bReviews > 0;
      const aEngagementBonus = aHasBothEngagement ? 30 : 0; // Bonus for having both
      const bEngagementBonus = bHasBothEngagement ? 30 : 0;
      
      // 5. Recency boost (newer courses get small boost, but ONLY if they have engagement)
      const aCreatedAt = a.createdAt?.getTime?.() || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
      const bCreatedAt = b.createdAt?.getTime?.() || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
      const daysSinceA = (Date.now() - aCreatedAt) / (1000 * 60 * 60 * 24);
      const daysSinceB = (Date.now() - bCreatedAt) / (1000 * 60 * 60 * 24);
      const aRecencyScore = aHasEngagement ? Math.max(0, 5 * (1 - daysSinceA / 7)) : 0;
      const bRecencyScore = bHasEngagement ? Math.max(0, 5 * (1 - daysSinceB / 7)) : 0;
      
      // 6. Featured boost (featured courses get 25 points)
      const aFeaturedScore = a.isFeatured ? 25 : 0;
      const bFeaturedScore = b.isFeatured ? 25 : 0;
      
      // Calculate total scores
      const aTotalScore = aRatingScore + aReviewScore + aStudentScore + aEngagementBonus + aRecencyScore + aFeaturedScore;
      const bTotalScore = bRatingScore + bReviewScore + bStudentScore + bEngagementBonus + bRecencyScore + bFeaturedScore;
      
      // Sort by total score (descending - highest score first)
      if (Math.abs(bTotalScore - aTotalScore) > 0.01) {
        return bTotalScore - aTotalScore;
      }
      
      // Final tiebreaker: Use most recent if scores are equal
      return bCreatedAt - aCreatedAt;
    });
    
    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development') {
      const top5Details = sortedCourses.slice(0, 5).map((c: any) => {
        const rating = c.rating || 0;
        const students = c.students || 0;
        const reviews = c.reviewCount || 0;
        const hasReviews = reviews > 0;
        const ratingScore = hasReviews ? rating * 30 : 0;
        const reviewScore = reviews > 0 ? Math.log10(reviews + 1) * 15 : -20;
        const studentScore = students > 0 ? Math.log10(students + 1) * 15 : -30;
        const featuredScore = c.isFeatured ? 20 : 0;
        const totalScore = ratingScore + reviewScore + studentScore + featuredScore;
        
        return {
          id: c.id,
          title: c.title || 'NO TITLE',
          rating,
          students,
          reviews,
          featured: c.isFeatured || false,
          score: Math.round(totalScore * 100) / 100
        };
      });
      
      console.group('📊 Course Ranking Analysis');
      console.log('Total courses from provider:', courses.length);
      console.log('Valid courses (after basic filtering):', validCourses.length);
      const placeholderCount = sortedCourses.filter(isPlaceholder).length;
      const realCount = sortedCourses.length - placeholderCount;
      console.log('Real courses in sorted:', realCount);
      console.log('Placeholder courses in sorted:', placeholderCount);
      console.log('Sorted courses count:', sortedCourses.length);
      console.log('Top 5 courses:', top5Details);
      
      // Show placeholder vs real breakdown
      const placeholderCourses = sortedCourses.filter(isPlaceholder);
      const realCoursesInSorted = sortedCourses.filter(c => !isPlaceholder(c));
      console.log('Real courses (non-placeholder):', realCoursesInSorted.length);
      console.log('Placeholder courses:', placeholderCourses.length);
      
      if (placeholderCourses.length > 0) {
        console.warn('⚠️ Placeholder courses found:', placeholderCourses.map((c: any) => ({
          id: c.id,
          title: c.title || 'NO TITLE'
        })));
      }
      
      // Also log the bottom courses to see what's ranking low
      if (sortedCourses.length > 5) {
        const bottom5Details = sortedCourses.slice(-5).map((c: any) => ({
          id: c.id,
          title: c.title || 'NO TITLE',
          rating: c.rating || 0,
          students: c.students || 0,
          reviews: c.reviewCount || 0,
          missing: {
            title: !c.title,
            description: !c.description,
            thumbnail: !c.thumbnail,
            price: c.price === undefined || c.price === null
          }
        }));
        console.log('📉 Bottom 5 courses:', bottom5Details);
      }
      console.groupEnd();
    }
    
    // Final debug: Log what we're actually returning
    if (process.env.NODE_ENV === 'development' && sortedCourses.length === 0 && courses.length > 0) {
      console.warn('⚠️ WARNING: All courses were filtered out!');
      console.log('Original courses:', courses.map((c: any) => ({
        id: c.id,
        title: c.title || 'NO TITLE',
        price: c.price,
        deleted: c.deleted,
        isPublished: c.isPublished
      })));
    }
    
    // Remove placeholder flag before returning (don't expose internal flag)
    const cleanedCourses = sortedCourses.map((course: any) => {
      const { _isPlaceholder, ...cleanCourse } = course;
      return cleanCourse;
    });
    
    return cleanedCourses;
  }, [courses]);

  // Mix ads into ranked courses
  const coursesWithAds = useMemo(() => {
    const mixed = mixAdsIntoContent(rankedCourses, ads, 2);
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 Final rendering:');
      console.log('  - rankedCoursesCount:', rankedCourses.length);
      console.log('  - adsCount:', ads.length);
      console.log('  - coursesWithAdsCount:', mixed.length);
      console.log('  - willShowEmptyState:', rankedCourses.length === 0);
      if (rankedCourses.length > 0) {
        console.log('  - firstCourse:', { id: rankedCourses[0].id, title: rankedCourses[0].title });
      }
      if (rankedCourses.length > 0 && mixed.length === 0) {
        console.error('❌ ERROR: rankedCourses exist but mixed array is empty!');
      }
    }
    return mixed;
  }, [rankedCourses, ads]);

  // Mark courses as loaded when they're available
  useEffect(() => {
    if (!isLoading && rankedCourses.length >= 0) {
      setCoursesLoaded(true);
    }
  }, [isLoading, rankedCourses.length]);

  // OPTIONAL LOADING SCREEN LOGIC - Only show if there's actually a delay
  useEffect(() => {
    // If courses are already loaded, don't show loading screen
    if (coursesLoaded && !isLoading && rankedCourses.length >= 0) {
      if (showLoadingScreen) {
        setShowLoadingScreen(false);
      }
      if (loadingScreenTimeoutRef.current) {
        clearTimeout(loadingScreenTimeoutRef.current);
        loadingScreenTimeoutRef.current = null;
      }
      return;
    }

    // Only show loading screen if there's a delay (500ms+)
    if (!showLoadingScreen && !coursesLoaded && isLoading) {
      loadingScreenTimeoutRef.current = setTimeout(() => {
        // Only show if still loading after delay
        if (!coursesLoaded && isLoading) {
          setShowLoadingScreen(true);
        }
      }, LOADING_SCREEN_DELAY);
    }

    return () => {
      if (loadingScreenTimeoutRef.current) {
        clearTimeout(loadingScreenTimeoutRef.current);
        loadingScreenTimeoutRef.current = null;
      }
    };
  }, [coursesLoaded, isLoading, rankedCourses.length, showLoadingScreen, LOADING_SCREEN_DELAY]);

  // Dismiss loading screen when courses are loaded
  useEffect(() => {
    if (!showLoadingScreen) return;

    // Dismiss immediately when courses are loaded (no joke wait)
    if (coursesLoaded && !isLoading) {
      console.log('✅ Ready to dismiss: Courses loaded.');
      setShowLoadingScreen(false);
      return;
    }
    
    // Fallback timeout: Maximum 15 seconds total
    const totalTime = Date.now() - loadingStartTimeRef.current;
    if (totalTime > 15000) {
      console.warn('⚠️ Timeout after 15s, dismissing anyway');
      setShowLoadingScreen(false);
      return;
    }
  }, [showLoadingScreen, coursesLoaded, isLoading]);

  return (
    <>
      {/* Fixed Loading Screen Overlay - Identical to Discover page */}
      {showLoadingScreen && typeof window !== 'undefined' ? (
        <div 
          className="fixed inset-0 bg-background flex items-center justify-center"
          style={{
            zIndex: 50, // Below navigation (z-[60]) but above content
            pointerEvents: 'none', // Never block navigation or content clicks
            isolation: 'isolate', // Create own stacking context
          }}
          aria-hidden="true"
        >
          <div 
            className="flex flex-col items-center justify-center gap-6"
            style={{
              pointerEvents: 'auto', // Allow interaction with loading animation itself
            }}
          >
            <ThemeLoading size="lg" />
            {/* Joke animation removed to speed up loading - jokes list preserved in typewriter-joke.tsx for future use */}
          </div>
        </div>
      ) : null}
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Gouache Learn</h1>
          </div>
          <p className="text-muted-foreground">
            Learn directly from your favourite artists
          </p>
        </div>

        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="live" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Live Class
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
        {rankedCourses.length === 0 || rankedCourses.every((c: any) => {
          const id = c.id || '';
          const title = (c.title || '').trim().toLowerCase();
          return id.includes('placeholder') || id.includes('dummy') || id.includes('sample') || 
                 title.includes('placeholder') || title.includes('dummy');
        }) ? (
          <>
            {process.env.NODE_ENV === 'development' && console.log('🚫 Rendering empty state - rankedCourses.length:', rankedCourses.length)}
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Brain className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">No courses available yet</p>
              <p className="text-sm text-muted-foreground mt-2">Check back soon for new courses!</p>
            </CardContent>
          </Card>
          </>
        ) : (
          <>
            {process.env.NODE_ENV === 'development' && console.log('✅ Rendering courses grid - coursesWithAds.length:', coursesWithAds.length, 'rankedCourses.length:', rankedCourses.length)}
          <div className={isMobile ? "grid grid-cols-1 gap-3" : "grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3"}>
            {coursesWithAds.map((item) => {
              // Check if this is an ad
              const isAd = 'type' in item && item.type === 'ad';
              if (isAd) {
                return (
                  <AdTile
                    key={item.campaign.id}
                    campaign={item.campaign}
                    placement="learn"
                    userId={user?.id}
                  />
                );
              }
              
              const course = item as any;
              return (
              <Link key={course.id} href={`/learn/${course.id}`}>
                <Card className={`group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer h-full ${isMobile ? 'flex flex-row min-h-[140px]' : 'flex flex-col'}`}>
                  <div className={`${isMobile ? 'relative w-36 sm:w-40 h-full aspect-[3/2] flex-shrink-0' : 'relative aspect-[4/3]'} overflow-hidden`}>
                    {course.thumbnail ? (
                      <Image
                        src={course.thumbnail}
                        alt={course.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Brain className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <Badge variant="secondary" className="mb-2 text-xs w-fit">{course.difficulty}</Badge>
                    <h3 className="font-medium text-sm mb-1 line-clamp-2">{course.title}</h3>
                    <div className="space-y-1 text-xs text-muted-foreground flex-grow">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{course.rating.toFixed(1)} ({course.reviewCount})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{course.students} students</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <span className="font-semibold text-foreground text-sm">
                        {course.isOnSale && course.originalPrice && (
                          <span className="text-muted-foreground line-through mr-2">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: course.currency || 'USD',
                            }).format(course.originalPrice)}
                          </span>
                        )}
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: course.currency || 'USD',
                        }).format(course.price)}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
              );
            })}
          </div>
          </>
        )}
          </TabsContent>

          <TabsContent value="live">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Video className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Live Classes Coming Soon</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Join live interactive sessions with artists. Get real-time feedback, 
                  ask questions, and learn alongside other students.
                </p>
                <div className="flex items-center gap-2 mt-6 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Check back soon for scheduled live classes</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </>
  );
}
