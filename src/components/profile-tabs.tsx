'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Users, BookOpen, Package, Heart, ShoppingBag, Brain, Palette, Grid3x3, Play, Edit, Eye, Trash2, X } from 'lucide-react';
import { ArtworkCard } from './artwork-card';
import { PortfolioManager } from './portfolio-manager';
import { ShopDisplay } from './shop-display';
import { useCourses } from '@/providers/course-provider';
import { ThemeLoading } from './theme-loading';
import { useLikes } from '@/providers/likes-provider';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, writeBatch } from 'firebase/firestore';
import { Artwork, Course } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/providers/auth-provider';
import { CreditCard } from 'lucide-react';
import { useFollow } from '@/providers/follow-provider';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { storage } from '@/lib/firebase';
import { ref, deleteObject } from 'firebase/storage';

interface ProfileTabsProps {
  userId: string;
  isOwnProfile: boolean;
  isProfessional: boolean;
  hideShop?: boolean;
  hideLearn?: boolean;
  onTabChange?: (tab: string) => void;
}

export function ProfileTabs({ userId, isOwnProfile, isProfessional, hideShop = true, hideLearn = true, onTabChange }: ProfileTabsProps) {
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
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

  // Component to display courses (Learn tab)
  function LearnDisplay({ userId, isOwnProfile }: { userId: string; isOwnProfile: boolean }) {
    const enrolledCourseIds = courseEnrollments
      .filter(e => e.userId === user?.id)
      .map(e => e.courseId);
    
    const availableCourses = instructorCourses.filter(course => course.isPublished !== false);

    if (coursesLoading) {
      return (
        <div className="flex justify-center py-8">
          <ThemeLoading text="" size="sm" />
        </div>
      );
    }

    if (availableCourses.length === 0) {
      return (
        <Card className="p-8 text-center">
          <CardContent>
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No courses available</CardTitle>
            <CardDescription className="mb-4">
              {isOwnProfile 
                ? "You haven't published any courses yet. Create a course to start teaching!"
                : "This artist doesn't have any courses available."}
            </CardDescription>
            {isOwnProfile && (
              <div className="space-y-3">
                <Button asChild variant="gradient">
                  <a href="/learn/submit">Create Course</a>
                </Button>
                <p className="text-xs text-muted-foreground">
                  💡 Don't forget to enable the "Learn" tab in Profile Settings → Profile Visibility so customers can see your courses!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableCourses.map((course) => {
          const isEnrolled = enrolledCourseIds.includes(course.id);
          const isCourseOwner = isOwnProfile && course.instructor.userId === user?.id;
          return (
            <Card 
              key={course.id} 
              className="group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
              onClick={() => router.push(`/learn/${course.id}`)}
            >
              <div className="relative aspect-video overflow-hidden">
                {course.thumbnail ? (
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                {isCourseOwner && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/learn/submit?edit=${course.id}`);
                      }}
                      title="Edit course"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <CardTitle className="text-lg mb-2 line-clamp-2">{course.title}</CardTitle>
                <CardDescription className="line-clamp-2 mb-4 text-sm">
                  {course.description}
                </CardDescription>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-lg font-semibold">
                    {course.price > 0 ? (
                      <>
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: course.currency || 'USD'
                        }).format(course.price)}
                        {course.originalPrice && course.originalPrice > course.price && (
                          <span className="text-sm text-muted-foreground line-through ml-2">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: course.currency || 'USD'
                            }).format(course.originalPrice)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Free</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isCourseOwner && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/learn/submit?edit=${course.id}`);
                        }}
                        title="Edit course"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {isEnrolled ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/learn/${course.id}`);
                        }}
                      >
                        Access
                      </Button>
                    ) : (
                      <Button
                        variant="gradient"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/learn/${course.id}`);
                        }}
                      >
                        Preview
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }
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

  // Component for individual Discover content tile with video autoplay
  function DiscoverContentTile({ item, imageUrl, isVideo, router, isOwnProfile, onDelete }: { item: any; imageUrl: string; isVideo: boolean; router: any; isOwnProfile: boolean; onDelete: (itemId: string, itemType: string) => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const tileRef = useRef<HTMLDivElement>(null);

    // Intersection Observer for video autoplay
    useEffect(() => {
      if (!isVideo || !videoRef.current || !tileRef.current) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Video is in view - play it
              if (videoRef.current) {
                videoRef.current.play().catch((error) => {
                  // Autoplay failed (browser policy) - this is expected on some browsers
                  console.log('Video autoplay prevented by browser:', error);
                });
              }
            } else {
              // Video is out of view - pause it
              if (videoRef.current) {
                videoRef.current.pause();
              }
            }
          });
        },
        { threshold: 0.5 } // Trigger when 50% of video is visible
      );

      observer.observe(tileRef.current);

      return () => {
        observer.disconnect();
      };
    }, [isVideo]);

    const handleClick = () => {
      // Navigate to artwork page using the item's ID
      // Items from artworks collection: use document ID (doc.id) - this is the Firestore document ID
      // Items from posts collection: use artworkId (links to artwork document)
      // The document ID is the most reliable since it's what Firestore uses
      const targetId = item.type === 'artwork' ? item.id : (item.artworkId || item.id);
      if (targetId) {
        console.log('🔗 Navigating to artwork from Discover tab:', {
          targetId,
          itemId: item.id,
          artworkId: item.artworkId,
          type: item.type,
          title: item.title || item.caption,
          hasImageUrl: !!item.imageUrl,
          hasVideoUrl: !!item.videoUrl
        });
        // Encode the ID to handle special characters
        const encodedId = encodeURIComponent(targetId);
        router.push(`/artwork/${encodedId}`);
      } else {
        console.error('❌ No ID found for Discover content item:', item);
      }
    };

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent navigation when clicking delete
      onDelete(item.id, item.type);
    };

    return (
      <Card 
        ref={tileRef}
        className="group hover:shadow-lg transition-shadow overflow-hidden cursor-pointer relative"
        onClick={handleClick}
      >
        {/* Delete button - only show for own profile */}
        {isOwnProfile && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <div className="relative aspect-square">
          {isVideo && (item.videoUrl || item.mediaUrls?.[0]) ? (
            <video
              ref={videoRef}
              src={item.videoUrl || item.mediaUrls?.[0]}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              muted
              loop
              playsInline
              preload="auto"
              webkit-playsinline="true"
              x5-playsinline="true"
            />
          ) : (
            <Image
              src={imageUrl}
              alt={item.title || item.caption || 'Content'}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}
        </div>
        <CardContent className="p-4">
          <h4 className="font-semibold text-sm mb-1 line-clamp-1">{item.title || item.caption || 'Untitled'}</h4>
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Component to display Discover content (generic content NOT marked as artwork)
  // This shows content uploaded via Discover upload portal that was NOT added to portfolio
  function DiscoverContentDisplay({ userId, isOwnProfile }: { userId: string; isOwnProfile: boolean }) {
    const [discoverContent, setDiscoverContent] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [itemToDelete, setItemToDelete] = useState<{ id: string; type: string } | null>(null);
    const router = useRouter();

    useEffect(() => {
      const fetchDiscoverContent = async () => {
        setLoading(true);
        try {
          const contentItems: any[] = [];

          // Fetch artworks that belong to this user but are NOT in portfolio
          // Only content uploaded via Discover portal where showInPortfolio is false
          try {
            const artworksQuery = query(
              collection(db, 'artworks'),
              orderBy('createdAt', 'desc')
            );
            const artworksSnapshot = await getDocs(artworksQuery);
            
            artworksSnapshot.forEach((doc) => {
              const data = doc.data();
              
              // Check if this artwork belongs to the user
              const belongsToUser = 
                data.artist?.id === userId || 
                data.artist?.userId === userId ||
                data.artistId === userId;
              
              // Filter out events (events should not be in artworks collection, but double-check)
              const isEvent = data.type === 'event' || data.type === 'Event' || data.eventType;
              if (isEvent) return;
              
              // Filter out deleted items
              if (data.deleted === true) return;
              
              // Only include items that are NOT in portfolio (showInPortfolio must be explicitly false)
              // These are generic content like process videos, art tips, etc. uploaded via Discover portal
              const notInPortfolio = data.showInPortfolio === false;
              
              // Must have media (image or video) to be valid Discover content
              const hasMedia = data.imageUrl || data.videoUrl || data.mediaUrls?.length > 0;
              
              if (belongsToUser && notInPortfolio && hasMedia) {
                // Use document ID as the primary ID (this is what Firestore uses)
                // Spread data first, then override with document ID to ensure it's correct
                // The document ID is what Firestore uses for lookups, so it must match
                const documentId = doc.id;
                contentItems.push({
                  ...data,
                  id: documentId, // Override with document ID (most reliable for navigation)
                  artworkId: data.artworkId || data.id || documentId, // Use data.id or documentId as fallback
                  type: 'artwork',
                  createdAt: data.createdAt?.toDate?.() || (data.createdAt instanceof Date ? data.createdAt : new Date()),
                });
              }
            });
          } catch (error) {
            console.error('Error fetching discover content:', error);
          }

          // Fetch posts that are discover content (associated with artworks where showInPortfolio is false)
          try {
            const postsQuery = query(
              collection(db, 'posts'),
              orderBy('createdAt', 'desc')
            );
            const postsSnapshot = await getDocs(postsQuery);
            
            postsSnapshot.forEach((doc) => {
              const data = doc.data();
              
              // Check if this post belongs to the user
              const belongsToUser = 
                data.artist?.id === userId || 
                data.artist?.userId === userId ||
                data.artistId === userId;
              
              // Filter out events
              const isEvent = data.type === 'event' || data.type === 'Event' || data.eventType;
              if (isEvent) return;
              
              // Filter out deleted items
              if (data.deleted === true) return;
              
              // Only include posts where showInPortfolio is explicitly false (Discover content, not portfolio)
              const notInPortfolio = data.showInPortfolio === false;
              
              // Must have media
              const hasMedia = data.imageUrl || data.mediaUrls?.length > 0;
              
              if (belongsToUser && notInPortfolio && hasMedia) {
                // Spread data first, then override with document ID to ensure it's correct
                const documentId = doc.id;
                contentItems.push({
                  ...data,
                  id: documentId, // Override with document ID (most reliable for navigation)
                  artworkId: data.artworkId || documentId, // Ensure artworkId is set for navigation
                  type: 'post',
                  createdAt: data.createdAt ? (typeof data.createdAt === 'number' ? new Date(data.createdAt) : data.createdAt?.toDate?.() || new Date()) : new Date(),
                });
              }
            });
          } catch (error) {
            console.error('Error fetching discover posts:', error);
          }

          // Sort by creation date (newest first)
          contentItems.sort((a, b) => {
            const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
            const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
            return dateB - dateA;
          });

          setDiscoverContent(contentItems);
        } catch (error) {
          console.error('Error fetching discover content:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchDiscoverContent();
    }, [userId]);

    const handleDelete = async (itemId: string, itemType: string) => {
      setItemToDelete({ id: itemId, type: itemType });
    };

    const confirmDelete = async () => {
      if (!itemToDelete) return;

      try {
        // First, get the item data to extract storage URLs
        let itemData: any = null;
        if (itemToDelete.type === 'artwork') {
          const artworkDoc = await getDoc(doc(db, 'artworks', itemToDelete.id));
          if (artworkDoc.exists()) {
            itemData = artworkDoc.data();
          }
        } else if (itemToDelete.type === 'post') {
          const postDoc = await getDoc(doc(db, 'posts', itemToDelete.id));
          if (postDoc.exists()) {
            itemData = postDoc.data();
          }
        }

        // Delete media files from Firebase Storage
        if (itemData) {
          const urlsToDelete: string[] = [];

          // Add main image/video URLs
          if (itemData.imageUrl) urlsToDelete.push(itemData.imageUrl);
          if (itemData.videoUrl) urlsToDelete.push(itemData.videoUrl);
          if (itemData.videoVariants?.thumbnail) urlsToDelete.push(itemData.videoVariants.thumbnail);
          if (itemData.videoVariants?.full) urlsToDelete.push(itemData.videoVariants.full);

          // Add supporting images/media
          if (itemData.supportingImages && Array.isArray(itemData.supportingImages)) {
            urlsToDelete.push(...itemData.supportingImages);
          }
          if (itemData.supportingMedia && Array.isArray(itemData.supportingMedia)) {
            urlsToDelete.push(...itemData.supportingMedia);
          }
          if (itemData.mediaUrls && Array.isArray(itemData.mediaUrls)) {
            urlsToDelete.push(...itemData.mediaUrls);
          }

          // Delete each file from storage
          for (const url of urlsToDelete) {
            if (!url || typeof url !== 'string') continue;
            
            try {
              // Extract the storage path from the download URL
              // Firebase Storage URLs format: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH?alt=media&token=TOKEN
              const urlObj = new URL(url);
              const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/);
              if (pathMatch && pathMatch[1]) {
                const storagePath = decodeURIComponent(pathMatch[1]);
                const fileRef = ref(storage, storagePath);
                await deleteObject(fileRef);
                console.log('✅ Deleted file from storage:', storagePath);
              }
            } catch (storageError) {
              console.error('Error deleting file from storage:', url, storageError);
              // Continue with other files even if one fails
            }
          }
        }

        // Now mark as deleted in Firestore
        const batch = writeBatch(db);
        
        // Mark as deleted in the artworks collection
        const artworkRef = doc(db, 'artworks', itemToDelete.id);
        batch.update(artworkRef, { deleted: true, updatedAt: new Date() });

        // If there's a related post, mark it as deleted too
        if (itemToDelete.type === 'artwork') {
          // Try to find and delete related post
          try {
            const postsQuery = query(
              collection(db, 'posts'),
              where('artworkId', '==', itemToDelete.id)
            );
            const postsSnapshot = await getDocs(postsQuery);
            postsSnapshot.forEach((postDoc) => {
              batch.update(postDoc.ref, { deleted: true, updatedAt: new Date() });
            });
          } catch (error) {
            console.error('Error finding related post:', error);
            // Continue with deletion even if post lookup fails
          }
        } else if (itemToDelete.type === 'post') {
          // For posts, also check if there's a related artwork
          try {
            const postDoc = await getDoc(doc(db, 'posts', itemToDelete.id));
            if (postDoc.exists()) {
              const postData = postDoc.data();
              if (postData.artworkId) {
                const artworkRef = doc(db, 'artworks', postData.artworkId);
                batch.update(artworkRef, { deleted: true, updatedAt: new Date() });
              }
            }
          } catch (error) {
            console.error('Error finding related artwork:', error);
            // Continue with deletion even if artwork lookup fails
          }
        }

        await batch.commit();

        // Remove from local state
        setDiscoverContent(prev => prev.filter(item => item.id !== itemToDelete.id));

        toast({
          title: "Content deleted",
          description: "The content has been removed from your discover tab.",
        });

        setItemToDelete(null);
      } catch (error) {
        console.error('Error deleting discover content:', error);
        toast({
          title: "Delete failed",
          description: "Failed to delete content. Please try again.",
          variant: "destructive",
        });
        setItemToDelete(null);
      }
    };

    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <ThemeLoading text="" size="sm" />
        </div>
      );
    }

    if (discoverContent.length === 0) {
      return (
        <Card className="p-8 text-center">
          <CardContent>
            <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No discover content yet</CardTitle>
            <CardDescription>
              {isOwnProfile 
                ? "Share process videos, art tips, and other interesting content."
                : "This artist hasn't uploaded any discover content yet."}
            </CardDescription>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {discoverContent.map((item) => {
          const imageUrl = item.imageUrl || item.supportingImages?.[0] || item.mediaUrls?.[0] || '/assets/placeholder-light.png';
          const isVideo = item.mediaType === 'video' || item.videoUrl;
          
          return (
            <DiscoverContentTile
              key={item.id}
              item={item}
              imageUrl={imageUrl}
              isVideo={isVideo}
              router={router}
              isOwnProfile={isOwnProfile}
              onDelete={handleDelete}
            />
          );
        })}
        
        {/* Delete confirmation dialog */}
        <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Content</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this content? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setItemToDelete(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  console.log('🎯 ProfileTabs render:', { isProfessional, userId, isOwnProfile, hideShop, hideLearn });

  if (isProfessional) {
    // For professional artists, show tabs: Portfolio, Discover, Shop (if enabled), Learn (if enabled)
    const visibleTabs = [
      { value: 'portfolio', label: 'Portfolio', icon: Palette },
      { value: 'discover', label: 'Discover', icon: Eye },
      ...(hideShop ? [] : [{ value: 'shop', label: 'Shop', icon: ShoppingBag }]),
      ...(hideLearn ? [] : [{ value: 'learn', label: 'Learn', icon: Brain }]),
    ];
    
    const defaultTab = visibleTabs[0]?.value || 'portfolio';
    const gridCols = visibleTabs.length === 1 ? 'grid-cols-1' : visibleTabs.length === 2 ? 'grid-cols-2' : visibleTabs.length === 3 ? 'grid-cols-3' : 'grid-cols-4';
    
    console.log('✅ ProfileTabs: Rendering professional artist tabs', { 
      visibleTabs: visibleTabs.map(t => t.value), 
      defaultTab, 
      hideShop, 
      hideLearn,
      hideShopType: typeof hideShop,
      hideLearnType: typeof hideLearn,
      hideShopValue: hideShop,
      hideLearnValue: hideLearn
    });
    
    return (
      <Tabs defaultValue={defaultTab} className="w-full" onValueChange={onTabChange}>
        <TabsList className={`grid w-full ${gridCols}`}>
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center justify-center gap-2 md:gap-2">
                <Icon className="h-5 w-5 md:h-4 md:w-4" />
                <span className="hidden md:inline">{tab.label}</span>
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

        {/* Shop Tab */}
        {!hideShop && (
          <TabsContent value="shop" className="space-y-4">
            <ShopDisplay userId={userId} isOwnProfile={isOwnProfile} />
          </TabsContent>
        )}

        {/* Discover Tab - Shows generic content (not marked as artwork) */}
        <TabsContent value="discover" className="space-y-4">
          <DiscoverContentDisplay userId={userId} isOwnProfile={isOwnProfile} />
        </TabsContent>

        {/* Learn Tab */}
        {!hideLearn && (
          <TabsContent value="learn" className="space-y-4">
            <LearnDisplay userId={userId} isOwnProfile={isOwnProfile} />
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
    ...(hideLearn ? [] : [{ value: 'learn', label: 'Learn', icon: Brain }]),
  ];
  
  const gridCols = visibleTabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
  
  return (
    <Tabs defaultValue="liked" className="w-full" onValueChange={onTabChange}>
      <TabsList className={`grid w-full ${gridCols}`}>
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center justify-center gap-2 md:gap-2">
              <Icon className="h-5 w-5 md:h-4 md:w-4" />
              <span className="hidden md:inline">{tab.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* Liked Tab */}
      <TabsContent value="liked" className="space-y-4">
        {(likesLoading || likedFetchLoading) && (
          <div className="flex justify-center py-12">
            <ThemeLoading text="" size="md" />
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
            <ThemeLoading text="" size="md" />
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
          isMobile ? (
            // Mobile: List view (like discover events)
            <div className="space-y-4">
              {purchasedCourses.map((course) => (
                <Card 
                  key={course.id} 
                  className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onClick={() => router.push(`/learn/${course.id}`)}
                >
                  <div className="flex flex-col md:flex-row gap-4 p-4">
                    <div className="relative w-full md:w-48 h-48 flex-shrink-0 rounded-lg overflow-hidden">
                      {course.thumbnail ? (
                        <Image
                          src={course.thumbnail}
                          alt={course.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">Course</Badge>
                          </div>
                          <h3 className="font-semibold text-lg mb-1">{course.title}</h3>
                          {course.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{course.description}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="gradient"
                        className="w-full md:w-auto mt-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/learn/${course.id}`);
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Continue Learning
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            // Desktop: Grid view
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {purchasedCourses.map((course) => (
                <Card 
                  key={course.id} 
                  className="group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
                  onClick={() => router.push(`/learn/${course.id}`)}
                >
                  <div className="relative aspect-video overflow-hidden">
                    {course.thumbnail ? (
                      <Image
                        src={course.thumbnail}
                        alt={course.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  </div>
                  <CardContent className="p-4">
                    <CardTitle className="text-lg mb-2">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mb-4">
                      {course.description}
                    </CardDescription>
                    <Button
                      variant="gradient"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/learn/${course.id}`);
                      }}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Continue Learning
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}
      </TabsContent>
      )}
    </Tabs>
  );
}
