'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Star, Users, Clock } from 'lucide-react';
import { useCourses } from '@/providers/course-provider';
import { ThemeLoading } from '@/components/theme-loading';
import { TypewriterJoke } from '@/components/typewriter-joke';
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
  
  // Loading screen state - identical to Discover page
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [coursesLoaded, setCoursesLoaded] = useState(false);
  const jokeCompleteTimeRef = useRef<number | null>(null);
  const MIN_JOKE_DISPLAY_TIME = 2000; // 2 seconds minimum after joke completes
  const loadingStartTimeRef = useRef<number>(Date.now());

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

  // Handle joke completion - called AFTER joke finishes typing + 2s pause
  const handleJokeComplete = useCallback(() => {
    console.log('🎭 Joke animation FULLY completed (typing + 2s pause) at:', new Date().toISOString());
    jokeCompleteTimeRef.current = Date.now();
  }, []);

  // Courses are already filtered by CourseProvider to only include published and approved courses
  const publishedCourses = courses;

  // Mix ads into courses - MUST be called before early return to maintain hook order
  const coursesWithAds = useMemo(() => {
    return mixAdsIntoContent(publishedCourses, ads, 2);
  }, [publishedCourses, ads]);

  // Mark courses as loaded when they're available
  useEffect(() => {
    if (!isLoading && publishedCourses.length >= 0) {
      setCoursesLoaded(true);
    }
  }, [isLoading, publishedCourses.length]);

  // Dismiss loading screen when both joke is complete + 2s AND courses are loaded
  useEffect(() => {
    if (!showLoadingScreen) return;

    const checkIfReadyToDismiss = () => {
      const jokeComplete = !!jokeCompleteTimeRef.current;
      const timeSinceJoke = jokeComplete && jokeCompleteTimeRef.current 
        ? Date.now() - jokeCompleteTimeRef.current 
        : Infinity;
      const jokeTimeMet = jokeComplete && timeSinceJoke >= MIN_JOKE_DISPLAY_TIME;
      
      // Dismiss when joke is complete + 2s AND courses are loaded
      if (jokeTimeMet && coursesLoaded && !isLoading) {
        console.log('✅ Ready to dismiss: Joke complete + 2s, courses loaded.');
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
    };

    const interval = setInterval(() => {
      if (showLoadingScreen) {
        checkIfReadyToDismiss();
      } else {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
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
            <TypewriterJoke key="loading-joke" onComplete={handleJokeComplete} typingSpeed={40} pauseAfterComplete={2000} />
          </div>
        </div>
      ) : null}
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Gouache Learn</h1>
          </div>
          <p className="text-muted-foreground">
            Learn directly from your favourite artists
          </p>
        </div>

        {publishedCourses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Brain className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">No courses available yet</p>
              <p className="text-sm text-muted-foreground mt-2">Check back soon for new courses!</p>
            </CardContent>
          </Card>
        ) : (
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
        )}
        </div>
      </div>
    </>
  );
}
