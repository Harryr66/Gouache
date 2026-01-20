'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Star, Users, Clock, Video, Calendar, Radio, Plus } from 'lucide-react';
import { useCourses } from '@/providers/course-provider';
import { useLiveStream } from '@/providers/live-stream-provider';
import { ThemeLoading } from '@/components/theme-loading';
import Image from 'next/image';
import Link from 'next/link';
import { fetchActiveAds, mixAdsIntoContent, fetchBannerAd } from '@/lib/ad-fetcher';
import { AdTile } from '@/components/ad-tile';
import { AdBanner } from '@/components/ad-banner';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { GoLiveButton } from '@/components/live-stream/go-live-button';
import { StreamCard } from '@/components/live-stream/stream-card';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

export default function CoursesPage() {
  const router = useRouter();
  const { courses, isLoading } = useCourses();
  const { user } = useAuth();
  const { 
    liveStreams, 
    scheduledStreams, 
    myStreams,
    isLoading: streamsLoading,
    goLive,
    cancelStream,
    endStream,
  } = useLiveStream();
  const [ads, setAds] = useState<any[]>([]);
  const [bannerAd, setBannerAd] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if user is an artist (can go live) - check user properties
  const isArtist = (user as any)?.accountType === 'artist' || 
                   (user as any)?.accountType === 'gallery' ||
                   (user as any)?.isProfessional === true;
  
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
    const loadAds = async () => {
      try {
        const [tileAds, banner] = await Promise.all([
          fetchActiveAds('learn', 'learn-tiles', user?.id),
          fetchBannerAd('learn-banner', user?.id)
        ]);
        setAds(tileAds);
        setBannerAd(banner);
      } catch (error) {
        console.error('Error loading ads:', error);
      }
    };
    loadAds();
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

  // Handle early access signup
  const handleEarlyAccessSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // TODO: Add email to waitlist/database
      console.log('Early access signup:', email);
      
      toast({
        title: "✅ You're on the list!",
        description: "We'll notify you when Gouache Learn launches.",
      });
      
      setEmail('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign up. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <GraduationCap className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Gouache Learn</h1>
          </div>
          <p className="text-muted-foreground">
            Learn directly from your favourite artists
          </p>
        </div>

        {/* Banner Ad - Only show if active banner ad exists */}
        {bannerAd && (
          <AdBanner campaign={bannerAd} placement="learn" userId={user?.id} />
        )}

        {/* Coming Soon Sign-up Wall */}
        <Card className="max-w-2xl mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                <GraduationCap className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-3xl font-bold mb-2">Coming Soon</h2>
              <p className="text-xl text-muted-foreground mb-6">
                Gouache Learn is launching soon
              </p>
              <p className="text-lg text-foreground mb-4">
                Apply to list your course
              </p>
              <p className="text-muted-foreground">
                Request early access today and be among the first to share your knowledge with our community
              </p>
            </div>

            <form onSubmit={handleEarlyAccessSignup} className="w-full max-w-md space-y-4">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                  required
                />
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-6"
                >
                  {isSubmitting ? 'Joining...' : 'Join Waitlist'}
                </Button>
              </div>
            </form>

            <div className="mt-8 p-4 bg-muted/50 rounded-lg max-w-md">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">100% Commission-Free</strong>
                <br />
                Gouache Learn does not take any fees for courses advertised on our platform. 
                Keep 100% of your earnings.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Live Lessons feature hidden for now - will be re-enabled in future */}
        </div>
      </div>
    </>
  );
}
