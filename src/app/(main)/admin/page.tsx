'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, addDoc, deleteDoc, getDocs, getDoc, setDoc, where } from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '@/lib/firebase';
import { ArtistRequest, Episode, AdvertisingApplication, MarketplaceProduct, AffiliateProductRequest, Advertisement, AdvertisementAnalytics, Course, CourseSubmission, NewsArticle, UserReport, ArticleSection } from '@/lib/types';
import { Check, X, Eye, Clock, User, Users, Calendar, ExternalLink, Upload, Video, Plus, Megaphone, Trash2, Edit, Package, ShoppingCart, Link, Image, Play, Pause, BarChart3, AlertCircle, BadgeCheck, ChevronUp, ChevronDown, Sparkles, Loader2, GripVertical, Type, ImageIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { ArtistInviteConsole } from '@/components/admin/artist-invite-console';
import { useAuth } from '@/providers/auth-provider';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

const ART_MEDIUM_CATEGORIES = [
  'Oil Painting',
  'Acrylic',
  'Watercolor',
  'Charcoal',
  'Pencil',
  'Ink',
  'Pastel',
  'Gouache',
  'Collage',
  'Photography',
  'Printmaking',
  'Ceramics',
  'Textiles',
  'Wood',
  'Metal',
  'Stone',
  'Glass',
  'Digital',
  '3D Modeling',
  'Animation',
  'Mixed Media',
  'Sculpture',
  'Installation',
  'Performance Art'
];

const DEFAULT_ARTICLE_IMAGE =
  'https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1200&q=80';
export default function AdminPanel() {
  const [artistRequests, setArtistRequests] = useState<ArtistRequest[]>([]);
  const [advertisingApplications, setAdvertisingApplications] = useState<AdvertisingApplication[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [marketplaceProducts, setMarketplaceProducts] = useState<MarketplaceProduct[]>([]);
  const [affiliateRequests, setAffiliateRequests] = useState<AffiliateProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ArtistRequest | null>(null);
  const [selectedAdApplication, setSelectedAdApplication] = useState<AdvertisingApplication | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [selectedAffiliateRequest, setSelectedAffiliateRequest] = useState<AffiliateProductRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Video upload states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoTags, setVideoTags] = useState<string[]>([]);
  const [videoCategories, setVideoCategories] = useState<string[]>([]);
  // Episodes are always added to "New Releases" when published
  const videoDisplayLocation = 'new-releases';
  const [isMainEvent, setIsMainEvent] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Product upload states
  const [productTitle, setProductTitle] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productOriginalPrice, setProductOriginalPrice] = useState('');
  const [productCategory, setProductCategory] = useState('art-prints');
  const [productSubcategory, setProductSubcategory] = useState('fine-art-prints');
  const [productImages, setProductImages] = useState<File[]>([]);
  const [productTags, setProductTags] = useState<string[]>([]);
  const [newProductTag, setNewProductTag] = useState('');
  const [isProductUploading, setIsProductUploading] = useState(false);
  const [productStock, setProductStock] = useState('1');
  const [isProductOnSale, setIsProductOnSale] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedView, setSelectedView] = useState<string>('artist-pending');
  const [professionalArtists, setProfessionalArtists] = useState<Array<{ id: string; name: string; email: string; username?: string; avatarUrl?: string; isVerified: boolean; isProfessional: boolean }>>([]);
  const [loadingArtists, setLoadingArtists] = useState(false);
  
  const formatDate = (value: unknown) => {
    if (!value) return 'N/A';
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    if (typeof value === 'object' && value !== null && 'toDate' in (value as Record<string, unknown>)) {
      try {
        const dateValue = (value as { toDate: () => Date }).toDate();
        return dateValue.toLocaleDateString();
      } catch {
        return 'N/A';
      }
    }
    return 'N/A';
  };
  
  
  // Advertising states
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [advertisementAnalytics, setAdvertisementAnalytics] = useState<AdvertisementAnalytics[]>([]);
  const [selectedAdvertisement, setSelectedAdvertisement] = useState<Advertisement | null>(null);
  const [showAdUploadModal, setShowAdUploadModal] = useState(false);
  
  // Ad upload states
  const [adTitle, setAdTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [advertiserName, setAdvertiserName] = useState('');
  const [advertiserWebsite, setAdvertiserWebsite] = useState('');
  const [adMediaFile, setAdMediaFile] = useState<File | null>(null);
  const [adThumbnailFile, setAdThumbnailFile] = useState<File | null>(null);
  const [adDuration, setAdDuration] = useState('');
  const [adBudget, setAdBudget] = useState('');
  const [adStartDate, setAdStartDate] = useState('');
  const [adEndDate, setAdEndDate] = useState('');
  const [isAdUploading, setIsAdUploading] = useState(false);

  // Course management state
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseSubmissions, setCourseSubmissions] = useState<CourseSubmission[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedCourseSubmission, setSelectedCourseSubmission] = useState<CourseSubmission | null>(null);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [showArchivedNews, setShowArchivedNews] = useState(false);
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [newArticle, setNewArticle] = useState({
    title: '',
    summary: '',
    category: 'Stories',
    author: '',
    imageUrl: '',
    externalUrl: '',
    publishedAt: '',
    tags: '',
    location: 'evergreen' as 'main-banner' | 'whats-new' | 'evergreen'
  });
  const [newArticleSubheadline, setNewArticleSubheadline] = useState('');
  const [newArticleBody, setNewArticleBody] = useState('');
  const [newArticleImageFile, setNewArticleImageFile] = useState<File | null>(null);
  const [newArticleImagePreview, setNewArticleImagePreview] = useState<string | null>(null);
  const [isPublishingArticle, setIsPublishingArticle] = useState(false);

  useEffect(() => {
    const artistRequestsQuery = query(
      collection(db, 'artistRequests'),
      orderBy('submittedAt', 'desc')
    );

    const advertisingQuery = query(
      collection(db, 'advertisingApplications'),
      orderBy('submittedAt', 'desc')
    );

    const episodesQuery = query(
      collection(db, 'episodes'),
      orderBy('createdAt', 'desc')
    );

    const marketplaceQuery = query(
      collection(db, 'marketplaceProducts'),
      orderBy('createdAt', 'desc')
    );

    const affiliateQuery = query(
      collection(db, 'affiliateRequests'),
      orderBy('submittedAt', 'desc')
    );


    const advertisementsQuery = query(
      collection(db, 'advertisements'),
      orderBy('createdAt', 'desc')
    );

    const advertisementAnalyticsQuery = query(
      collection(db, 'advertisementAnalytics'),
      orderBy('date', 'desc')
    );
    const coursesQuery = query(
      collection(db, 'courses'),
      orderBy('createdAt', 'desc')
    );
    const courseSubmissionsQuery = query(collection(db, 'courseSubmissions'), orderBy('submittedAt', 'desc'));
    const newsArticlesQuery = query(collection(db, 'newsArticles'), orderBy('updatedAt', 'desc'));
    const userReportsQuery = query(collection(db, 'userReports'), orderBy('submittedAt', 'desc'));

    const fetchData = async () => {
      try {
        console.log('🔄 Admin Panel: Fetching all data...');
        
        // Fetch professional artists for verified status management
        setLoadingArtists(true);
        try {
          const artistsQuery = query(
            collection(db, 'userProfiles'),
            where('isProfessional', '==', true)
          );
          const artistsSnapshot = await getDocs(artistsQuery);
          const artistsData = artistsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || data.displayName || data.username || 'Unknown',
              email: data.email || '',
              username: data.username || data.handle,
              avatarUrl: data.avatarUrl,
              isVerified: data.isVerified !== false, // All approved artists are verified by default
              isProfessional: data.isProfessional || false
            };
          });
          setProfessionalArtists(artistsData);
          console.log(`✅ Loaded ${artistsData.length} professional artists`);
        } catch (error) {
          console.error('Error loading professional artists:', error);
        } finally {
          setLoadingArtists(false);
        }
        
        const [
          artistSnapshot,
          advertisingSnapshot,
          episodesSnapshot,
          marketplaceSnapshot,
          affiliateSnapshot,
          advertisementsSnapshot,
          analyticsSnapshot,
          coursesSnapshot,
          courseSubmissionsSnapshot,
          newsArticlesSnapshot,
          userReportsSnapshot
        ] = await Promise.all([
          getDocs(artistRequestsQuery),
          getDocs(advertisingQuery),
          getDocs(episodesQuery),
          getDocs(marketplaceQuery),
          getDocs(affiliateQuery),
          getDocs(advertisementsQuery),
          getDocs(advertisementAnalyticsQuery),
          getDocs(coursesQuery),
          getDocs(courseSubmissionsQuery),
          getDocs(newsArticlesQuery),
          getDocs(userReportsQuery)
        ]);

        const requests = artistSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ArtistRequest[];
      setArtistRequests(requests);
        console.log(`✅ Loaded ${requests.length} artist requests:`, requests);

        const applications = advertisingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdvertisingApplication[];
      setAdvertisingApplications(applications);
        console.log(`✅ Loaded ${applications.length} advertising applications:`, applications);

        const episodes = episodesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Episode[];
        setEpisodes(episodes);
        console.log(`✅ Loaded ${episodes.length} episodes:`, episodes);

        const products = marketplaceSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MarketplaceProduct[];
        setMarketplaceProducts(products);
        console.log(`✅ Loaded ${products.length} marketplace products:`, products);

        const affiliateRequests = affiliateSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AffiliateProductRequest[];
        setAffiliateRequests(affiliateRequests);
        console.log(`✅ Loaded ${affiliateRequests.length} affiliate requests:`, affiliateRequests);


        const advertisements = advertisementsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Advertisement[];
        setAdvertisements(advertisements);
        console.log(`✅ Loaded ${advertisements.length} advertisements:`, advertisements);

        const analytics = analyticsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AdvertisementAnalytics[];
        setAdvertisementAnalytics(analytics);
        console.log(`✅ Loaded ${analytics.length} advertisement analytics:`, analytics);

        const courses = coursesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          publishedAt: doc.data().publishedAt?.toDate(),
          instructor: {
            ...doc.data().instructor,
            createdAt: doc.data().instructor?.createdAt?.toDate() || new Date(),
            updatedAt: doc.data().instructor?.updatedAt?.toDate() || new Date(),
          },
        })) as Course[];
        setCourses(courses);
        console.log(`✅ Loaded ${courses.length} courses:`, courses);

        const submissions = courseSubmissionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          submittedAt: doc.data().submittedAt?.toDate() || new Date(),
          reviewedAt: doc.data().reviewedAt?.toDate(),
        })) as CourseSubmission[];
        setCourseSubmissions(submissions);
        console.log(`✅ Loaded ${submissions.length} course submissions:`, submissions);

        const newsroomArticles = newsArticlesSnapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            title: data.title ?? 'Untitled story',
            summary: data.summary ?? '',
            category: data.category ?? 'Stories',
            author: data.author ?? '',
            imageUrl: data.imageUrl ?? DEFAULT_ARTICLE_IMAGE,
            publishedAt: data.publishedAt?.toDate?.(),
            updatedAt: data.updatedAt?.toDate?.(),
            tags: data.tags ?? [],
            externalUrl: data.externalUrl ?? '',
            featured: data.featured ?? false,
            content: data.content ?? '',
            sections: data.sections ?? undefined,
            location: data.location ?? 'evergreen',
            status: data.status ?? (data.publishedAt ? 'published' : 'draft'),
            artistResearchData: data.artistResearchData ?? undefined,
            archived: data.archived ?? false,
            archivedAt: data.archivedAt?.toDate?.()
          } as NewsArticle;
        });
        setNewsArticles(newsroomArticles);
        console.log(`✅ Loaded ${newsroomArticles.length} newsroom articles`);

        const reports = userReportsSnapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            userId: data.userId ?? '',
            userEmail: data.userEmail ?? '',
            username: data.username ?? '',
            displayName: data.displayName ?? '',
            message: data.message ?? '',
            status: data.status ?? 'pending',
            submittedAt: data.submittedAt?.toDate?.() ?? new Date(),
            reviewedBy: data.reviewedBy,
            reviewedAt: data.reviewedAt?.toDate?.(),
            adminNotes: data.adminNotes ?? ''
          } as UserReport;
        });
        setUserReports(reports);
        console.log(`✅ Loaded ${reports.length} user reports`);

        setLoading(false);
        console.log('✅ Admin Panel: All data loaded successfully');
      } catch (error) {
        console.error('❌ Error fetching admin panel data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      toast({
        title: 'Signed out',
        description: 'You have been signed out.'
      });
      router.push('/login');
    } catch (error) {
      console.error('Failed to sign out:', error);
      toast({
        title: 'Sign out failed',
        description: 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleApprove = async (request: ArtistRequest) => {
    setIsProcessing(true);
    try {
      // Update the artist request status
      await updateDoc(doc(db, 'artistRequests', request.id), {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: 'admin', // In a real app, this would be the admin user ID
        notes: adminNotes
      });

      // Convert portfolio image URLs to portfolio items format
      // Use serverTimestamp() for createdAt to ensure consistency with Firestore
      const portfolioItems = request.portfolioImages.map((imageUrl, index) => ({
        id: `portfolio-${Date.now()}-${index}`,
        imageUrl,
        title: 'Untitled Artwork',
        description: '',
        medium: '',
        dimensions: '',
        year: '',
        tags: [],
        createdAt: serverTimestamp() // Use serverTimestamp for consistency
      }));

      // Update the user's profile to make them a verified professional artist
      // Transfer portfolio images from the request to the user profile
      await updateDoc(doc(db, 'userProfiles', request.userId), {
        isProfessional: true,
        isVerified: true,
        portfolio: portfolioItems,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Verification approved",
        description: `${request.user.displayName} is now a verified professional artist. Portfolio images have been transferred.`,
      });

      setSelectedRequest(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to approve request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransferPortfolio = async (request: ArtistRequest) => {
    setIsProcessing(true);
    try {
      // Convert portfolio image URLs to portfolio items format
      // Use serverTimestamp() for createdAt to ensure consistency with Firestore
      const portfolioItems = request.portfolioImages.map((imageUrl, index) => ({
        id: `portfolio-${Date.now()}-${index}`,
        imageUrl,
        title: 'Untitled Artwork',
        description: '',
        medium: '',
        dimensions: '',
        year: '',
        tags: [],
        createdAt: serverTimestamp() // Use serverTimestamp for consistency
      }));

      // Get current user profile to merge with existing portfolio if any
      const userProfileRef = doc(db, 'userProfiles', request.userId);
      const userProfileSnap = await getDoc(userProfileRef);
      const existingPortfolio = userProfileSnap.data()?.portfolio || [];

      // Merge existing portfolio with new portfolio images (avoid duplicates)
      const existingUrls = new Set(existingPortfolio.map((item: any) => item.imageUrl));
      const newItems = portfolioItems.filter(item => !existingUrls.has(item.imageUrl));
      const mergedPortfolio = [...existingPortfolio, ...newItems];

      // Update the user's profile with portfolio images
      await updateDoc(userProfileRef, {
        portfolio: mergedPortfolio,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Portfolio images transferred",
        description: `${newItems.length} portfolio image(s) have been transferred to ${request.user.displayName}'s profile. Please refresh the page to see them.`,
      });
    } catch (error) {
      console.error('Error transferring portfolio images:', error);
      toast({
        title: "Transfer failed",
        description: "Failed to transfer portfolio images. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (request: ArtistRequest) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejection.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'artistRequests', request.id), {
        status: 'rejected',
        reviewedAt: serverTimestamp(),
        reviewedBy: 'admin',
        rejectionReason: rejectionReason.trim(),
        notes: adminNotes
      });

      toast({
        title: "Verification rejected",
        description: `Professional verification request from ${request.user.displayName} has been rejected.`,
      });

      setSelectedRequest(null);
      setRejectionReason('');
      setAdminNotes('');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Failed to reject request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleApproveAdApplication = async (application: AdvertisingApplication) => {
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'advertisingApplications', application.id), {
        status: 'approved',
        reviewedBy: 'admin',
        reviewedAt: serverTimestamp(),
        updatedAt: new Date()
      });

      toast({
        title: "Application approved",
        description: `Advertising application from ${application.companyName} has been approved.`,
      });

      setSelectedAdApplication(null);
    } catch (error) {
      console.error('Error approving application:', error);
      toast({
        title: "Error",
        description: "Failed to approve application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectAdApplication = async (application: AdvertisingApplication) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejection.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'advertisingApplications', application.id), {
        status: 'rejected',
        rejectionReason: rejectionReason,
        reviewedBy: 'admin',
        reviewedAt: serverTimestamp(),
        updatedAt: new Date()
      });

      toast({
        title: "Application rejected",
        description: `Advertising application from ${application.companyName} has been rejected.`,
      });

      setSelectedAdApplication(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast({
        title: "Error",
        description: "Failed to reject application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Video upload functions
  const handleVideoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
    }
  };

  const handleThumbnailFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate image file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file for the thumbnail.",
          variant: "destructive",
        });
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Thumbnail image must be smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      setThumbnailFile(file);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !videoTags.includes(newTag.trim())) {
      setVideoTags([...videoTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setVideoTags(videoTags.filter(tag => tag !== tagToRemove));
  };

  // Rich text editor handlers for image paste and resize
  const handleBodyPaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          try {
            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '-')}`;
            const storagePath = `news/articles/${fileName}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);
            const imageUrl = await getDownloadURL(storageRef);
            
            // Insert image into contentEditable div
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              
              const img = document.createElement('img');
              img.src = imageUrl;
              img.style.maxWidth = '100%';
              img.style.height = 'auto';
              img.style.display = 'block';
              img.style.margin = '1rem 0';
              img.contentEditable = 'false';
              img.draggable = true;
              
              // Make image resizable
              img.addEventListener('mousedown', (e) => {
                if (e.shiftKey) {
                  e.preventDefault();
                  const startX = e.pageX;
                  const startWidth = img.offsetWidth;
                  
                  const onMouseMove = (e: MouseEvent) => {
                    const diff = e.pageX - startX;
                    const newWidth = Math.max(200, Math.min(1200, startWidth + diff));
                    img.style.width = `${newWidth}px`;
                  };
                  
                  const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                  };
                  
                  document.addEventListener('mousemove', onMouseMove);
                  document.addEventListener('mouseup', onMouseUp);
                }
              });
              
              range.insertNode(img);
              selection.removeAllRanges();
              selection.addRange(range);
            }
            
            toast({
              title: 'Image pasted',
              description: 'Image has been inserted into the article. Hold Shift and drag to resize.',
            });
          } catch (error) {
            console.error('Failed to upload pasted image:', error);
            toast({
              title: 'Upload failed',
              description: 'Could not upload pasted image. Please try again.',
              variant: 'destructive'
            });
          }
        }
      }
    }
  };

  const toggleCategory = (category: string) => {
    if (videoCategories.includes(category)) {
      setVideoCategories(videoCategories.filter(cat => cat !== category));
    } else {
      setVideoCategories([...videoCategories, category]);
    }
  };

  const handleVideoUpload = async () => {
    if (!videoFile || !videoTitle.trim() || !videoDescription.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and select a video file.",
        variant: "destructive",
      });
      return;
    }

    // No file size limit - we'll handle large files with chunked upload

    setIsUploading(true);
    console.log('=== STARTING UPLOAD PROCESS ===');
    console.log('Video file:', videoFile?.name, 'Size:', videoFile?.size);
    console.log('Title:', videoTitle);
    console.log('Description:', videoDescription);
    
    let videoUrl = '';
      let thumbnailUrl = '';
    
    try {
      // Upload video file to Firebase Storage
      const videoFileName = `video_${Date.now()}_${videoFile.name}`;
      const videoRef = ref(storage, `episodes/${videoFileName}`);
      
      console.log('=== STARTING VIDEO UPLOAD ===');
      console.log('Video file:', videoFile.name, 'Size:', videoFile.size);
      console.log('Video reference:', videoRef.fullPath);
      
      // Test Firebase Storage connection first
      console.log('Testing Firebase Storage connection...');
      console.log('Storage instance:', storage);
      console.log('Storage app:', storage.app);
      
      try {
        console.log('Uploading video bytes...');
        console.log('Storage bucket:', (storage as any).bucket);
        console.log('Storage app:', storage.app.name);
        
        // Upload the video file with chunked upload for large files
        console.log('Starting video upload...');
        console.log('File size:', videoFile.size, 'bytes (', (videoFile.size / 1024 / 1024).toFixed(2), 'MB)');
        
        // Use uploadBytesResumable for large files with progress tracking
        const uploadTask = uploadBytesResumable(videoRef, videoFile);
        
        // Create promise that resolves when upload completes
        const uploadPromise = new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log(`Upload progress: ${progress.toFixed(2)}%`);
            },
            (error) => {
              console.error('Upload error:', error);
              reject(error);
            },
            () => {
              console.log('Upload completed successfully');
              resolve();
            }
          );
        });
        
        // Set timeout to 10 minutes for large files
        const uploadTimeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout after 10 minutes')), 600000)
        );
        
        try {
          await Promise.race([uploadPromise, uploadTimeout]);
        } catch (error) {
          console.error('Upload failed with error:', error);
          throw error;
        }
        console.log('Video bytes uploaded successfully');
        
        // Get the download URL with timeout
        console.log('Getting download URL...');
        const urlPromise = getDownloadURL(videoRef);
        const urlTimeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('URL generation timeout after 10 seconds')), 10000)
        );
        videoUrl = await Promise.race([urlPromise, urlTimeout]);
        console.log('Video URL obtained:', videoUrl);
        
      } catch (uploadError) {
        console.error('Firebase Storage upload failed:', uploadError);
        console.error('Error details:', {
          code: uploadError instanceof Error ? uploadError.message : 'Unknown',
          name: uploadError instanceof Error ? uploadError.name : 'Unknown'
        });
        
        // NO FALLBACKS - FAIL THE UPLOAD IF FIREBASE STORAGE DOESN'T WORK
        throw new Error(`Firebase Storage upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}. Please check Firebase Storage configuration.`);
      }

      // Upload thumbnail file to Firebase Storage (if provided)
      if (thumbnailFile) {
        const thumbnailFileName = `thumb_${Date.now()}_${thumbnailFile.name}`;
        const thumbnailRef = ref(storage, `episodes/thumbnails/${thumbnailFileName}`);
        
        console.log('=== STARTING THUMBNAIL UPLOAD ===');
        console.log('Thumbnail file:', thumbnailFile.name, 'Size:', thumbnailFile.size);
        console.log('Thumbnail reference:', thumbnailRef.fullPath);
        
        try {
          console.log('Uploading thumbnail bytes...');
        await uploadBytes(thumbnailRef, thumbnailFile);
          console.log('Thumbnail bytes uploaded successfully');
          
          console.log('Getting thumbnail download URL...');
        thumbnailUrl = await getDownloadURL(thumbnailRef);
          console.log('Thumbnail URL obtained:', thumbnailUrl);
        } catch (thumbnailError) {
          console.error('Thumbnail upload failed:', thumbnailError);
          // NO FALLBACKS - FAIL THE UPLOAD IF THUMBNAIL UPLOAD FAILS
          throw new Error(`Thumbnail upload failed: ${thumbnailError instanceof Error ? thumbnailError.message : 'Unknown error'}`);
        }
      } else {
        // Generate a thumbnail from the video (placeholder for now)
        // Generate Gouache placeholder URLs
        const generatePlaceholderUrl = (width: number = 400, height: number = 600) => {
          // Default to light mode colors, will be overridden by theme detection
          let backgroundColor = '#f8f9fa'; // very light gray
          let textColor = '#6b7280'; // medium gray
          
          // Try to detect theme if we're in a browser environment
          if (typeof window !== 'undefined') {
            try {
              // Check for explicit light/dark class
              if (document.documentElement.classList.contains('dark')) {
                backgroundColor = '#1f2937'; // dark gray
                textColor = '#ffffff'; // white
              } else if (document.documentElement.classList.contains('light')) {
                backgroundColor = '#f8f9fa'; // very light gray
                textColor = '#6b7280'; // medium gray
              } else {
                // No explicit theme class, check system preference
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (prefersDark) {
                  backgroundColor = '#1f2937'; // dark gray
                  textColor = '#ffffff'; // white
                }
                // Otherwise keep light mode defaults
              }
            } catch (error) {
              // If theme detection fails, keep light mode defaults
              console.warn('Theme detection failed, using light mode defaults:', error);
            }
          }
          
          return `data:image/svg+xml;base64,${btoa(`
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="${backgroundColor}" stroke="#e5e7eb" stroke-width="1"/>
              <text x="50%" y="50%" text-anchor="middle" fill="${textColor}" font-family="Arial, sans-serif" font-size="32" font-weight="bold">Gouache</text>
            </svg>
          `)}`;
        };
        
        thumbnailUrl = generatePlaceholderUrl(400, 600);
        console.log('No thumbnail file provided, using default');
      }

      // Create episode document in Firestore
      const episodeData: Omit<Episode, 'id'> = {
        title: videoTitle,
        description: videoDescription,
        videoUrl,
        thumbnailUrl,
        duration: 600, // Will be calculated from actual video later
        viewCount: 0,
        likes: 0,
        commentsCount: 0,
        tags: videoTags,
        categories: videoCategories,
        displayLocation: videoDisplayLocation,
        likedBy: [],
        docuseriesId: 'admin-episodes',
        episodeNumber: 1,
        seasonNumber: 1,
        releaseDate: new Date(),
        isPublished: true,
        isFeatured: false,
        isMainEvent: isMainEvent,
        createdAt: new Date(),
        updatedAt: new Date(),
        artist: {
          id: 'admin',
          name: 'Gouache Admin',
          handle: 'soma-admin',
          avatarUrl: '',
          isProfessional: true,
          followerCount: 0,
          followingCount: 0,
          createdAt: new Date(),
          isVerified: true
        }
      };

      console.log('=== SAVING TO FIRESTORE ===');
      console.log('Episode data:', episodeData);
      
      const savePromise = addDoc(collection(db, 'episodes'), episodeData);
      const saveTimeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Firestore save timeout after 10 seconds')), 10000)
      );
      const docRef = await Promise.race([savePromise, saveTimeout]);
      console.log('Episode saved to Firestore with ID:', docRef.id);

      toast({
        title: "Video Uploaded Successfully",
        description: "Your video has been uploaded to Firebase Storage and will appear in the home feed.",
      });

      // Reset form
      setVideoFile(null);
      setThumbnailFile(null);
      setCustomVideoUrl('');
      setVideoTitle('');
      setVideoDescription('');
      setVideoTags([]);
      setVideoCategories([]);
      setIsMainEvent(false);
      setNewTag('');
      
    } catch (error) {
      console.error('Error uploading video:', error);
      let errorMessage = "Failed to upload video. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('storage/unauthorized')) {
          errorMessage = "Storage access denied. Please check Firebase Storage rules.";
        } else if (error.message.includes('storage/bucket-not-found')) {
          errorMessage = "Firebase Storage bucket not found. Please set up Storage in Firebase Console.";
        } else if (error.message.includes('storage/quota-exceeded')) {
          errorMessage = "Storage quota exceeded. Please check your Firebase plan.";
        } else {
          errorMessage = `Upload failed: ${error.message}`;
        }
      }
      
      toast({
        title: "Upload Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Product upload function
  const handleProductUpload = async () => {
    if (!productTitle.trim() || !productDescription.trim() || !productPrice.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (productImages.length < 2) {
      toast({
        title: "Error",
        description: "Please upload at least 2 product images on a white background.",
        variant: "destructive",
      });
      return;
    }

    if (productImages.length > 5) {
      toast({
        title: "Error",
        description: "Maximum 5 product images allowed.",
        variant: "destructive",
      });
      return;
    }

    setIsProductUploading(true);

    try {
      console.log('=== STARTING PRODUCT UPLOAD ===');
      console.log('Product title:', productTitle);
      console.log('Product images count:', productImages.length);

      // Upload product images to Firebase Storage
      const uploadedImageUrls: string[] = [];
      
      for (let i = 0; i < productImages.length; i++) {
        const imageFile = productImages[i];
        console.log(`Uploading image ${i + 1}/${productImages.length}:`, imageFile.name);
        
        const imageRef = ref(storage, `marketplace/products/${Date.now()}-${imageFile.name}`);
        const uploadTask = uploadBytesResumable(imageRef, imageFile);
        
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log(`Image ${i + 1} upload progress: ${progress}%`);
            },
            (error) => {
              console.error(`Error uploading image ${i + 1}:`, error);
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                console.log(`Image ${i + 1} uploaded successfully:`, downloadURL);
                uploadedImageUrls.push(downloadURL);
                resolve(downloadURL);
              } catch (error) {
                console.error(`Error getting download URL for image ${i + 1}:`, error);
                reject(error);
              }
            }
          );
        });
      }

      console.log('All images uploaded successfully:', uploadedImageUrls);

      // Create product document in Firestore
      const productData: Omit<MarketplaceProduct, 'id'> = {
        title: productTitle,
        description: productDescription,
        price: parseFloat(productPrice),
        ...(productOriginalPrice && { originalPrice: parseFloat(productOriginalPrice) }),
        currency: 'USD',
        category: productCategory,
        subcategory: productSubcategory,
        images: uploadedImageUrls,
        sellerId: 'admin',
        sellerName: 'Gouache Marketplace',
        isAffiliate: false,
        isActive: true,
        stock: parseInt(productStock),
        rating: 0,
        reviewCount: 0,
        tags: productTags,
        salesCount: 0,
        isOnSale: isProductOnSale,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('=== SAVING PRODUCT TO FIRESTORE ===');
      console.log('Product data:', productData);
      
      const docRef = await addDoc(collection(db, 'marketplaceProducts'), productData);
      console.log('Product saved to Firestore with ID:', docRef.id);

      toast({
        title: "Product Uploaded Successfully",
        description: "Your product has been uploaded and will appear in the marketplace.",
      });

      // Reset form
      setProductTitle('');
      setProductDescription('');
      setProductPrice('');
      setProductOriginalPrice('');
      setProductCategory('art-prints');
      setProductSubcategory('fine-art-prints');
      setProductImages([]);
      setProductTags([]);
      setNewProductTag('');
      setProductStock('1');
      setIsProductOnSale(false);
      
    } catch (error) {
      console.error('Error uploading product:', error);
      let errorMessage = "Failed to upload product. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('storage/unauthorized')) {
          errorMessage = "Storage access denied. Please check Firebase Storage rules.";
        } else if (error.message.includes('storage/bucket-not-found')) {
          errorMessage = "Firebase Storage bucket not found. Please set up Storage in Firebase Console.";
        } else {
          errorMessage = `Upload failed: ${error.message}`;
        }
      }
      
      toast({
        title: "Upload Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProductUploading(false);
    }
  };

  // Advertising upload function
  const handleAdUpload = async () => {
    if (!adMediaFile || !adTitle.trim() || !adDescription.trim() || !advertiserName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select a media file.",
        variant: "destructive",
      });
      return;
    }

    setIsAdUploading(true);
    try {
      console.log('🎬 Starting advertisement upload...');
      
      // Upload media file
      const mediaRef = ref(storage, `advertisements/${Date.now()}_${adMediaFile.name}`);
      const mediaUploadResult = await uploadBytesResumable(mediaRef, adMediaFile);
      const mediaUrl = await getDownloadURL(mediaUploadResult.ref);
      console.log('✅ Advertisement media uploaded:', mediaUrl);

      // Upload thumbnail if provided
      let thumbnailUrl = '';
      if (adThumbnailFile) {
        const thumbnailRef = ref(storage, `advertisements/thumbnails/${Date.now()}_${adThumbnailFile.name}`);
        const thumbnailUploadResult = await uploadBytesResumable(thumbnailRef, adThumbnailFile);
        thumbnailUrl = await getDownloadURL(thumbnailUploadResult.ref);
        console.log('✅ Advertisement thumbnail uploaded:', thumbnailUrl);
      }

      // Create advertisement document
      const advertisementData: Omit<Advertisement, 'id'> = {
        title: adTitle,
        description: adDescription,
        advertiserName,
        advertiserWebsite: advertiserWebsite || undefined,
        mediaUrl,
        thumbnailUrl: thumbnailUrl || undefined,
        duration: parseInt(adDuration) || 30, // Default to 30 seconds
        type: 'pre-roll',
        budget: adBudget ? parseFloat(adBudget) : undefined,
        currency: 'USD',
        startDate: adStartDate ? new Date(adStartDate) : new Date(),
        endDate: adEndDate ? new Date(adEndDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isActive: true,
        impressions: 0,
        clicks: 0,
        views: 0,
        clickThroughRate: 0,
        costPerImpression: 0,
        costPerClick: 0,
        totalSpent: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin'
      };

      const docRef = await addDoc(collection(db, 'advertisements'), advertisementData);
      console.log('✅ Advertisement saved to Firestore with ID:', docRef.id);

      toast({
        title: "Advertisement Uploaded Successfully",
        description: `"${adTitle}" has been uploaded and will play as pre-roll ads.`,
      });

      // Reset form
      setAdTitle('');
      setAdDescription('');
      setAdvertiserName('');
      setAdvertiserWebsite('');
      setAdMediaFile(null);
      setAdThumbnailFile(null);
      setAdDuration('');
      setAdBudget('');
      setAdStartDate('');
      setAdEndDate('');
      setShowAdUploadModal(false);

    } catch (error) {
      console.error('Error uploading advertisement:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload advertisement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAdUploading(false);
    }
  };

  // Course management functions
  const handleCoursePublish = async (courseId: string) => {
    try {
      await updateDoc(doc(db, 'courses', courseId), {
        isPublished: true,
        publishedAt: new Date(),
        updatedAt: new Date(),
      });
      
      toast({
        title: "Course Published",
        description: "The course has been published successfully.",
      });
    } catch (error) {
      console.error('Error publishing course:', error);
      toast({
        title: "Publish Failed",
        description: "Failed to publish course. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCourseUnpublish = async (courseId: string) => {
    try {
      await updateDoc(doc(db, 'courses', courseId), {
        isPublished: false,
        updatedAt: new Date(),
      });
      
      toast({
        title: "Course Unpublished",
        description: "The course has been unpublished successfully.",
      });
    } catch (error) {
      console.error('Error unpublishing course:', error);
      toast({
        title: "Unpublish Failed",
        description: "Failed to unpublish course. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCourseSubmissionReview = async (submissionId: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      await updateDoc(doc(db, 'courseSubmissions', submissionId), {
        status,
        reviewedAt: new Date(),
        reviewedBy: 'admin',
        notes,
      });
      
      toast({
        title: "Submission Reviewed",
        description: `Course submission has been ${status}.`,
      });
    } catch (error) {
      console.error('Error reviewing course submission:', error);
      toast({
        title: "Review Failed",
        description: "Failed to review course submission. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCourseDelete = async (courseId: string) => {
    try {
      await deleteDoc(doc(db, 'courses', courseId));
      
      toast({
        title: "Course Deleted",
        description: "The course has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete course. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Product tag management functions
  const addProductTag = () => {
    if (newProductTag.trim() && !productTags.includes(newProductTag.trim())) {
      setProductTags([...productTags, newProductTag.trim()]);
      setNewProductTag('');
    }
  };

  const removeProductTag = (tagToRemove: string) => {
    setProductTags(productTags.filter(tag => tag !== tagToRemove));
  };

  // Product management functions
  const handleDeleteProduct = async (product: MarketplaceProduct) => {
    setIsProcessing(true);
    try {
      // Delete product images from Storage if they exist
      for (const imageUrl of product.images) {
        if (imageUrl.includes('firebasestorage')) {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        }
      }

      // Delete product document from Firestore
      await deleteDoc(doc(db, 'marketplaceProducts', product.id));

      toast({
        title: "Product Deleted",
        description: "Product has been successfully deleted from the marketplace.",
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Affiliate request management functions
  const handleApproveAffiliateRequest = async (request: AffiliateProductRequest) => {
    setIsProcessing(true);
    try {
      // Update the affiliate request status
      await updateDoc(doc(db, 'affiliateRequests', request.id), {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: 'admin',
        notes: adminNotes
      });

      // Create a marketplace product from the affiliate request
      const productData: Omit<MarketplaceProduct, 'id'> = {
        title: request.productTitle,
        description: request.productDescription,
        price: request.productPrice,
        currency: request.productCurrency,
        category: request.productCategory,
        subcategory: request.productSubcategory,
        images: request.productImages,
        sellerId: 'affiliate',
        sellerName: request.companyName,
        sellerWebsite: request.website,
        affiliateLink: request.affiliateLink,
        isAffiliate: true,
        isActive: true,
        stock: 999, // Unlimited stock for affiliate products
        rating: 0,
        reviewCount: 0,
        tags: [],
        salesCount: 0,
        isOnSale: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'marketplaceProducts'), productData);

      toast({
        title: "Affiliate Request Approved",
        description: "The affiliate product has been added to the marketplace.",
      });

      setSelectedAffiliateRequest(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Error approving affiliate request:', error);
      toast({
        title: "Approval Error",
        description: "Failed to approve affiliate request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectAffiliateRequest = async (request: AffiliateProductRequest) => {
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'affiliateRequests', request.id), {
        status: 'rejected',
        reviewedAt: serverTimestamp(),
        reviewedBy: 'admin',
        rejectionReason: rejectionReason
      });

      toast({
        title: "Affiliate Request Rejected",
        description: "The affiliate request has been rejected.",
      });

      setSelectedAffiliateRequest(null);
      setRejectionReason('');
      setAdminNotes('');
    } catch (error) {
      console.error('Error rejecting affiliate request:', error);
      toast({
        title: "Rejection Error",
        description: "Failed to reject affiliate request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Episode management functions
  const handleDeleteEpisode = async (episode: Episode) => {
    setIsProcessing(true);
    try {
      // Delete video file from Storage if it exists
      if (episode.videoUrl && episode.videoUrl.includes('firebasestorage')) {
        const videoRef = ref(storage, episode.videoUrl);
        await deleteObject(videoRef);
      }
      
      // Delete thumbnail file from Storage if it exists
      if (episode.thumbnailUrl && episode.thumbnailUrl.includes('firebasestorage')) {
        const thumbnailRef = ref(storage, episode.thumbnailUrl);
        await deleteObject(thumbnailRef);
      }

      // Delete episode document from Firestore
      await deleteDoc(doc(db, 'episodes', episode.id));

      toast({
        title: "Episode Deleted",
        description: `"${episode.title}" has been permanently deleted.`,
      });

      setSelectedEpisode(null);
    } catch (error) {
      console.error('Error deleting episode:', error);
      toast({
        title: "Error",
        description: "Failed to delete episode. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleMainEvent = async (episode: Episode) => {
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'episodes', episode.id), {
        isMainEvent: !episode.isMainEvent,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Episode Updated",
        description: `"${episode.title}" ${!episode.isMainEvent ? 'is now' : 'is no longer'} a main event.`,
      });
    } catch (error) {
      console.error('Error updating episode:', error);
      toast({
        title: "Error",
        description: "Failed to update episode. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuspendArtist = async (request: ArtistRequest) => {
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'userProfiles', request.userId), {
        isActive: false,
        isProfessional: false,
        suspendedAt: serverTimestamp(),
        suspendedBy: user?.id || 'admin'
      });

      await updateDoc(doc(db, 'artistRequests', request.id), {
        status: 'suspended',
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.id || 'admin'
      });

      setArtistRequests((prev) => prev.map((item) => item.id === request.id ? { ...item, status: 'suspended' } : item));

      toast({
        title: 'Artist suspended',
        description: `${request.user.displayName} has been suspended.`
      });
    } catch (error) {
      console.error('Error suspending artist:', error);
      toast({
        title: 'Suspension failed',
        description: 'Could not suspend this artist. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReinstateArtist = async (request: ArtistRequest) => {
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'userProfiles', request.userId), {
        isActive: true,
        isProfessional: true,
        suspendedAt: null,
        suspendedBy: null,
        updatedAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'artistRequests', request.id), {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.id || 'admin'
      });

      setArtistRequests((prev) => prev.map((item) => item.id === request.id ? { ...item, status: 'approved' } : item));

      toast({
        title: 'Artist reinstated',
        description: `${request.user.displayName} has been reinstated.`
      });
    } catch (error) {
      console.error('Error reinstating artist:', error);
      toast({
        title: 'Reinstate failed',
        description: 'Could not reinstate this artist. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveArtist = async (request: ArtistRequest) => {
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'artistRequests', request.id), {
        status: 'removed',
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.id || 'admin'
      });

      await deleteDoc(doc(db, 'userProfiles', request.userId));

      if (request.user.username) {
        await setDoc(doc(db, 'handles', request.user.username), { userId: null }, { merge: true });
      }

      setArtistRequests((prev) => prev.filter((item) => item.id !== request.id));

      toast({
        title: 'Artist removed',
        description: `${request.user.displayName} has been removed from Gouache.`
      });
    } catch (error) {
      console.error('Error removing artist:', error);
      toast({
        title: 'Removal failed',
        description: 'Could not remove this artist. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateNewsArticle = async () => {
    if (!newArticle.title.trim() || !newArticle.summary.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide at least a headline and summary for the article.',
        variant: 'destructive'
      });
      return;
    }

    setIsPublishingArticle(true);
    try {
      const publishedAtDate = newArticle.publishedAt ? new Date(newArticle.publishedAt) : new Date();
      const tags = newArticle.tags
        ? newArticle.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : [];
      let imageUrl = newArticle.imageUrl || DEFAULT_ARTICLE_IMAGE;

      if (newArticleImageFile) {
        try {
          const fileName = `${Date.now()}_${newArticleImageFile.name.replace(/\s+/g, '-')}`;
          const storagePath = `news/articles/${fileName}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, newArticleImageFile);
          imageUrl = await getDownloadURL(storageRef);
        } catch (error) {
          console.error('Failed to upload newsroom article image:', error);
          throw new Error('Could not upload the article image. Please try again.');
        }
      }

      // Get body content from contentEditable div
      const bodyElement = document.getElementById('article-body-editor') as HTMLDivElement;
      const bodyContent = bodyElement?.innerHTML || newArticleBody;
      
      const docRef = await addDoc(collection(db, 'newsArticles'), {
        title: newArticle.title.trim(),
        summary: newArticle.summary.trim(),
        subheadline: newArticleSubheadline.trim() || undefined,
        category: newArticle.category || 'Stories',
        author: newArticle.author?.trim() || '',
        imageUrl,
        externalUrl: newArticle.externalUrl?.trim() || '',
        featured: false,
        tags,
        content: bodyContent, // Rich HTML content with images
        location: newArticle.location || 'evergreen',
        publishedAt: publishedAtDate,
        archived: false,
        archivedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setNewsArticles((prev) => [
        {
          id: docRef.id,
          title: newArticle.title.trim(),
          summary: newArticle.summary.trim(),
          category: newArticle.category || 'Stories',
          author: newArticle.author?.trim() || '',
          imageUrl,
          externalUrl: newArticle.externalUrl?.trim() || '',
          featured: false,
          tags,
          content: bodyContent,
          location: newArticle.location || 'evergreen',
          publishedAt: publishedAtDate,
          updatedAt: new Date(),
          archived: false
        },
        ...prev
      ]);

      toast({
        title: 'Article published',
        description: `"${newArticle.title}" is now live in the newsroom feed.`
      });

      setNewArticle({
        title: '',
        summary: '',
        category: 'Stories',
        author: '',
        imageUrl: '',
        externalUrl: '',
        publishedAt: '',
        tags: '',
        location: 'evergreen'
      });
      setNewArticleSubheadline('');
      setNewArticleBody('');
      const bodyEditor = document.getElementById('article-body-editor') as HTMLDivElement;
      if (bodyEditor) {
        bodyEditor.innerHTML = '';
      }
      setNewArticleImageFile(null);
      setNewArticleImagePreview(null);
    } catch (error) {
      console.error('Failed to create news article:', error);
      toast({
        title: 'Publish failed',
        description: 'We could not publish that article. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsPublishingArticle(false);
    }
  };

  const handleNewsArticleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setNewArticleImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setNewArticleImagePreview(previewUrl);
  };

  const clearNewsArticleImage = () => {
    setNewArticleImageFile(null);
    setNewArticleImagePreview(null);
    setNewArticle((prev) => ({ ...prev, imageUrl: '' }));
  };

    let imageUrl = '';
    
    // Upload section image if provided
    if (newSectionImageFile) {
      try {
        const fileName = `${Date.now()}_${newSectionImageFile.name.replace(/\s+/g, '-')}`;
        const storagePath = `news/sections/${fileName}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, newSectionImageFile);
        imageUrl = await getDownloadURL(storageRef);
      } catch (error) {
        console.error('Failed to upload section image:', error);
        toast({
          title: 'Upload failed',
          description: 'Could not upload section image. Please try again.',
          variant: 'destructive'
        });
        return;
      }
    }

    // Validate section based on type
    const textSectionTypes = ['headline', 'subheadline', 'intro', 'body', 'outro'];
    const requiresText = textSectionTypes.includes(newSectionType) || newSectionType === 'text-image';
    const requiresImage = newSectionType === 'image' || newSectionType === 'text-image';

    if (requiresText && !newSectionContent.trim()) {
      toast({
        title: 'Content required',
        description: 'Please add text content for this section.',
        variant: 'destructive'
      });
      return;
    }

    if (requiresImage && !imageUrl && !newSectionImageFile) {
      toast({
        title: 'Image required',
        description: 'Please upload an image for this section.',
        variant: 'destructive'
      });
      return;
    }

    if (newSectionType === 'text-image' && (!newSectionContent.trim() || (!imageUrl && !newSectionImageFile))) {
      toast({
        title: 'Content and image required',
        description: 'Please add both text content and an image for this section.',
        variant: 'destructive'
      });
      return;
    }

    const newSection: ArticleSection = {
      id: `section-${Date.now()}`,
      type: newSectionType,
      content: requiresText ? newSectionContent.trim() : undefined,
      imageUrl: imageUrl || undefined,
      imagePosition: newSectionType === 'text-image' ? newSectionImagePosition : undefined,
      caption: newSectionCaption.trim() || undefined,
      order: articleSections.length
    };

    setArticleSections([...articleSections, newSection]);
    
    // Reset form
    setNewSectionType('body');
    setNewSectionContent('');
    setNewSectionImageFile(null);
    setNewSectionImagePreview(null);
    setNewSectionImagePosition('above');
    setNewSectionCaption('');

    toast({
      title: 'Section added',
      description: 'Section has been added to your article.'
    });
  };

  const removeArticleSection = (sectionId: string) => {
    setArticleSections(articleSections.filter(s => s.id !== sectionId));
  };

  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    const newSections = [...articleSections];
    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    newSections[index - 1].order = index - 1;
    newSections[index].order = index;
    setArticleSections(newSections);
  };

  const moveSectionDown = (index: number) => {
    if (index === articleSections.length - 1) return;
    const newSections = [...articleSections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    newSections[index].order = index;
    newSections[index + 1].order = index + 1;
    setArticleSections(newSections);
  };

  // Drag and drop handlers for images
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, insertIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '-')}`;
        const storagePath = `news/sections/${fileName}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const imageUrl = await getDownloadURL(storageRef);

        const newSection: ArticleSection = {
          id: `section-${Date.now()}-${Math.random()}`,
          type: 'image',
          imageUrl,
          order: insertIndex,
        };

        // Insert at the specified index
        const newSections = [...articleSections];
        newSections.splice(insertIndex, 0, newSection);
        // Reorder all sections
        newSections.forEach((section, idx) => {
          section.order = idx;
        });
        setArticleSections(newSections);

        toast({
          title: 'Image added',
          description: 'Image has been added to your article.',
        });
      } catch (error) {
        console.error('Failed to upload image:', error);
        toast({
          title: 'Upload failed',
          description: 'Could not upload image. Please try again.',
          variant: 'destructive'
        });
      }
    }
  };

  const handleImageFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length === 0) return;

    const file = files[0];
    setNewSectionImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setNewSectionImagePreview(previewUrl);
    setNewSectionType('image');
  };

  const handleArchiveNewsArticle = async (article: NewsArticle, archive: boolean) => {
    try {
      await updateDoc(doc(db, 'newsArticles', article.id), {
        archived: archive,
        archivedAt: archive ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      });

      setNewsArticles((prev) =>
        prev.map((item) =>
          item.id === article.id
            ? {
                ...item,
                archived: archive,
                archivedAt: archive ? new Date() : undefined,
                updatedAt: new Date()
              }
            : item
        )
      );

      toast({
        title: archive ? 'Article archived' : 'Article restored',
        description: `"${article.title}" has been ${archive ? 'archived' : 'restored'}.`
      });
    } catch (error) {
      console.error('Failed to update article archive state:', error);
      toast({
        title: 'Update failed',
        description: 'We could not update that article. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteNewsArticle = async (article: NewsArticle) => {
    try {
      await deleteDoc(doc(db, 'newsArticles', article.id));
      setNewsArticles((prev) => prev.filter((item) => item.id !== article.id));
      toast({
        title: 'Article removed',
        description: `"${article.title}" has been removed from the newsroom feed.`
      });
    } catch (error) {
      console.error('Failed to delete article:', error);
      toast({
        title: 'Delete failed',
        description: 'We could not remove that article. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateReportStatus = async (report: UserReport, status: 'pending' | 'reviewed' | 'resolved' | 'dismissed', adminNotes?: string) => {
    if (!user) return;
    
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'userReports', report.id), {
        status,
        reviewedAt: serverTimestamp(),
        reviewedBy: user.id,
        adminNotes: adminNotes || report.adminNotes || ''
      });

      setUserReports((prev) =>
        prev.map((item) =>
          item.id === report.id
            ? {
                ...item,
                status,
                reviewedAt: new Date(),
                reviewedBy: user.id,
                adminNotes: adminNotes || item.adminNotes || ''
              }
            : item
        )
      );

      toast({
        title: 'Report updated',
        description: `Report status changed to ${status}.`
      });
    } catch (error) {
      console.error('Failed to update report status:', error);
      toast({
        title: 'Update failed',
        description: 'We could not update that report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingRequests = artistRequests.filter(req => req.status === 'pending');
  const approvedRequests = artistRequests.filter(req => req.status === 'approved');
  const rejectedRequests = artistRequests.filter(req => req.status === 'rejected');
  const suspendedRequests = artistRequests.filter(req => req.status === 'suspended');
  const activeNewsArticles = newsArticles.filter((article) => !article.archived);
  const archivedNewsArticles = newsArticles.filter((article) => article.archived);
  const publishedArticles = newsArticles.filter((article) => !article.archived && (article.status === 'published' || (!article.status && article.publishedAt)));
  const draftedArticles = newsArticles.filter((article) => !article.archived && article.status === 'draft');
  const [showDraftedArticles, setShowDraftedArticles] = useState(false);
  const visibleNewsArticles = showArchivedNews 
    ? archivedNewsArticles 
    : showDraftedArticles 
    ? draftedArticles 
    : publishedArticles;

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Sign in required</CardTitle>
            <CardDescription>Log in with your admin account to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Admin access required</CardTitle>
            <CardDescription>
              This area is limited to Gouache admin accounts. If you need access, contact the team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push('/discover')}>
              Return to Discover
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
        <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2">
          <X className="h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {/* Professional Verification */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Professional Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => setSelectedView('artist-management')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'artist-management' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                Manage Artists
              </span>
              <Badge variant={selectedView === 'artist-management' ? 'secondary' : 'outline'}>
                ({approvedRequests.length})
              </Badge>
            </button>
            <button
              onClick={() => setSelectedView('artist-pending')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'artist-pending' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Pending</span>
              <Badge variant={selectedView === 'artist-pending' ? 'secondary' : 'outline'}>({pendingRequests.length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('artist-approved')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'artist-approved' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Approved</span>
              <Badge variant={selectedView === 'artist-approved' ? 'secondary' : 'outline'}>({approvedRequests.length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('artist-rejected')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'artist-rejected' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Rejected</span>
              <Badge variant={selectedView === 'artist-rejected' ? 'secondary' : 'outline'}>({rejectedRequests.length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('artist-suspended')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'artist-suspended' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Suspended</span>
              <Badge variant={selectedView === 'artist-suspended' ? 'secondary' : 'outline'}>({suspendedRequests.length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('artist-invites')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'artist-invites' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Invite Console</span>
              <Badge variant={selectedView === 'artist-invites' ? 'secondary' : 'outline'}>New</Badge>
            </button>
          </CardContent>
        </Card>

        {/* Newsroom */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Newsroom
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => setSelectedView('news-articles')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'news-articles' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Articles</span>
              <Badge variant={selectedView === 'news-articles' ? 'secondary' : 'outline'}>
                ({activeNewsArticles.length})
              </Badge>
            </button>
          </CardContent>
        </Card>

        {/* Episodes */}
              <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="h-4 w-4" />
              Episodes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => setSelectedView('episodes-all')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'episodes-all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Episodes</span>
              <Badge variant={selectedView === 'episodes-all' ? 'secondary' : 'outline'}>({episodes.length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('episodes-drafts')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'episodes-drafts' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Drafts</span>
              <Badge variant={selectedView === 'episodes-drafts' ? 'secondary' : 'outline'}>(0)</Badge>
            </button>
            <button
              onClick={() => setSelectedView('episodes-archived')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'episodes-archived' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Archived</span>
              <Badge variant={selectedView === 'episodes-archived' ? 'secondary' : 'outline'}>(0)</Badge>
            </button>
          </CardContent>
        </Card>

        {/* Marketplace */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Gallery
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => setSelectedView('marketplace-products')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'marketplace-products' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Products</span>
              <Badge variant={selectedView === 'marketplace-products' ? 'secondary' : 'outline'}>({marketplaceProducts.length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('marketplace-requests')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'marketplace-requests' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Requests</span>
              <Badge variant={selectedView === 'marketplace-requests' ? 'secondary' : 'outline'}>({affiliateRequests.filter(req => req.status === 'pending').length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('marketplace-archived')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'marketplace-archived' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Archived</span>
              <Badge variant={selectedView === 'marketplace-archived' ? 'secondary' : 'outline'}>(0)</Badge>
            </button>
          </CardContent>
        </Card>

        {/* Marketplace Products */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-4 w-4" />
              Marketplace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => setSelectedView('marketplace-products')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'marketplace-products' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">All Products</span>
              <Badge variant={selectedView === 'marketplace-products' ? 'secondary' : 'outline'}>({marketplaceProducts.length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('marketplace-active')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'marketplace-active' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Active Products</span>
              <Badge variant={selectedView === 'marketplace-active' ? 'secondary' : 'outline'}>({marketplaceProducts.filter(p => p.isActive).length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('marketplace-requests')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'marketplace-requests' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Product Requests</span>
              <Badge variant={selectedView === 'marketplace-requests' ? 'secondary' : 'outline'}>({affiliateRequests.filter(req => req.status === 'pending').length})</Badge>
            </button>
          </CardContent>
        </Card>

        {/* User Reports */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              User Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => setSelectedView('user-reports')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'user-reports' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Reports</span>
              <Badge variant={selectedView === 'user-reports' ? 'secondary' : 'outline'}>
                ({userReports.filter(r => r.status === 'pending').length})
              </Badge>
            </button>
          </CardContent>
        </Card>

        {/* Advertising */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Advertising
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => setSelectedView('advertising-live')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'advertising-live' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Live Media</span>
              <Badge variant={selectedView === 'advertising-live' ? 'secondary' : 'outline'}>({advertisingApplications.filter(app => app.status === 'approved').length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('advertising-requests')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'advertising-requests' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Requests</span>
              <Badge variant={selectedView === 'advertising-requests' ? 'secondary' : 'outline'}>({advertisingApplications.filter(app => app.status === 'pending').length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('advertising-archived')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'advertising-archived' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Archived</span>
              <Badge variant={selectedView === 'advertising-archived' ? 'secondary' : 'outline'}>(0)</Badge>
            </button>
            <button
              onClick={() => setSelectedView('advertising-media')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'advertising-media' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Media Ads</span>
              <Badge variant={selectedView === 'advertising-media' ? 'secondary' : 'outline'}>({advertisements.length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('advertising-analytics')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'advertising-analytics' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Analytics</span>
              <Badge variant={selectedView === 'advertising-analytics' ? 'secondary' : 'outline'}>({advertisementAnalytics.length})</Badge>
            </button>
          </CardContent>
        </Card>

      </div>

      {/* Upload Buttons */}
      <div className="flex justify-end gap-4 mb-6">
        <Button onClick={() => setShowAdUploadModal(true)} className="flex items-center gap-2">
          <Megaphone className="h-4 w-4" />
          Upload Ad
        </Button>
        <Button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload Content
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {selectedView === 'artist-management' && (
          <div className="space-y-6">
            {/* Verified Status Management */}
            <Card>
              <CardHeader>
                <CardTitle>Verified Status Management</CardTitle>
                <CardDescription>
                  Manage verified status for professional artist accounts. All approved artists are verified by default.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingArtists ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : professionalArtists.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No professional artists found.</p>
                ) : (
                  <div className="space-y-4">
                    {professionalArtists.map((artist) => (
                      <div
                        key={artist.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={artist.avatarUrl || ''} />
                            <AvatarFallback>{artist.name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{artist.name}</h3>
                              {artist.isVerified && (
                                <BadgeCheck className="h-4 w-4 text-blue-500 fill-current" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {artist.username && `@${artist.username}`} {artist.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={artist.isVerified}
                              onCheckedChange={async (checked) => {
                                try {
                                  await updateDoc(doc(db, 'userProfiles', artist.id), {
                                    isVerified: checked,
                                    updatedAt: serverTimestamp()
                                  });
                                  setProfessionalArtists(prev =>
                                    prev.map(a => a.id === artist.id ? { ...a, isVerified: checked } : a)
                                  );
                                  toast({
                                    title: checked ? "Verified status enabled" : "Verified status removed",
                                    description: `${artist.name}'s verified status has been ${checked ? 'enabled' : 'removed'}.`,
                                  });
                                } catch (error) {
                                  console.error('Error updating verified status:', error);
                                  toast({
                                    title: "Update failed",
                                    description: "Failed to update verified status. Please try again.",
                                    variant: "destructive"
                                  });
                                }
                              }}
                            />
                            <span className="text-sm text-muted-foreground">
                              {artist.isVerified ? 'Verified' : 'Not Verified'}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/profile/${artist.username || artist.id}`)}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View Profile
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Artists</CardTitle>
                <CardDescription>
                  Review verified artist accounts and suspend or remove them when necessary.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {approvedRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No verified artists have been approved yet.
                  </p>
                ) : (
                  approvedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-lg border border-border/60 p-4 transition hover:bg-muted/50"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={request.user.avatarUrl || ''} alt={request.user.displayName} />
                            <AvatarFallback>{request.user.displayName?.charAt(0).toUpperCase() || 'A'}</AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold leading-snug">
                                {request.user.displayName || request.user.username || request.user.email}
                              </h3>
                              <Badge variant="default" className="bg-emerald-600 text-emerald-50">
                                Approved
                              </Badge>
                            </div>
                            {request.user.username && (
                              <p className="text-sm text-muted-foreground">@{request.user.username}</p>
                            )}
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                              <span>Email: {request.user.email}</span>
                              <span>Reviewed: {formatDate(request.reviewedAt)}</span>
                              {request.reviewedBy && <span>Reviewed by: {request.reviewedBy}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/profile/${request.user.username || request.userId}`)}
                          >
                            <ExternalLink className="mr-1 h-4 w-4" />
                            View Profile
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSuspendArtist(request)}
                            disabled={isProcessing}
                          >
                            Suspend
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" disabled={isProcessing}>
                                Remove
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove artist account?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will delete the artist&apos;s profile and revoke their access. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveArtist(request)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Confirm removal
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Suspended Artists</CardTitle>
                <CardDescription>
                  Reinstate suspended accounts or escalate to permanent removal.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {suspendedRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No artists are currently suspended.</p>
                ) : (
                  suspendedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-lg border border-border/60 p-4 transition hover:bg-muted/50"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={request.user.avatarUrl || ''} alt={request.user.displayName} />
                            <AvatarFallback>{request.user.displayName?.charAt(0).toUpperCase() || 'A'}</AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold leading-snug">
                                {request.user.displayName || request.user.username || request.user.email}
                              </h3>
                              <Badge variant="destructive">Suspended</Badge>
                            </div>
                            {request.user.username && (
                              <p className="text-sm text-muted-foreground">@{request.user.username}</p>
                            )}
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                              <span>Email: {request.user.email}</span>
                              <span>Suspended: {formatDate(request.reviewedAt)}</span>
                              {request.reviewedBy && <span>By: {request.reviewedBy}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/profile/${request.user.username || request.userId}`)}
                          >
                            <ExternalLink className="mr-1 h-4 w-4" />
                            View Profile
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleReinstateArtist(request)}
                            disabled={isProcessing}
                          >
                            Reinstate
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" disabled={isProcessing}>
                                Remove
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove artist account?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will delete the artist&apos;s profile and revoke their access permanently.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveArtist(request)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Confirm removal
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Artist Account - Pending */}
        {selectedView === 'artist-invites' && (
          <div className="space-y-6">
            <ArtistInviteConsole />
          </div>
        )}

        {selectedView === 'artist-pending' && (
          pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                <p className="text-muted-foreground text-center">
                  All artist requests have been reviewed.
                </p>
                </CardContent>
              </Card>
            ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Pending Professional Verification Requests</h2>
              {pendingRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.user.avatarUrl || ''} />
                          <AvatarFallback>
                            {request.user.displayName?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{request.user.displayName}</h3>
                            <Badge variant="outline">Pending</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                              <p><strong>Email:</strong> {request.user.email}</p>
                              <p><strong>Experience:</strong> {request.experience}</p>
                        </div>
                            <div>
                              <p><strong>Submitted:</strong> {request.submittedAt instanceof Date ? request.submittedAt.toLocaleDateString() : (request.submittedAt as any)?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                              <p><strong>Portfolio Images:</strong> {request.portfolioImages.length}</p>
                      </div>
                          </div>
                          {request.artistStatement && (
                            <p className="text-sm mt-2">{request.artistStatement}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request)}
                          disabled={isProcessing}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setRejectionReason('');
                          }}
                          disabled={isProcessing}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
                            </div>
          )
        )}

        {/* Artist Account - Approved */}
        {selectedView === 'artist-approved' && (
          approvedRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Check className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No approved requests</h3>
                <p className="text-muted-foreground text-center">
                  No artist requests have been approved yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Verified Professional Artists</h2>
              {approvedRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.user.avatarUrl || ''} />
                          <AvatarFallback>{request.user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{request.user.displayName}</h3>
                            <Badge variant="default" className="bg-green-600">Approved</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <p><strong>Email:</strong> {request.user.email}</p>
                            <p><strong>Reviewed:</strong> {request.reviewedAt instanceof Date ? request.reviewedAt.toLocaleDateString() : (request.reviewedAt as any)?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                            <p><strong>Reviewed by:</strong> {request.reviewedBy || 'admin'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                          <Eye className="h-4 w-4 mr-1" /> View Details
                        </Button>
                        {request.portfolioImages && request.portfolioImages.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTransferPortfolio(request)}
                            disabled={isProcessing}
                            className="text-blue-600 hover:text-blue-700 border-blue-200"
                          >
                            <Upload className="h-4 w-4 mr-1" /> Transfer Portfolio
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuspendArtist(request)}
                          disabled={isProcessing}
                        >
                          Suspend
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isProcessing}>
                              Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove artist account?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the artist's profile and revoke their access. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveArtist(request)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {selectedView === 'artist-suspended' && (
          suspendedRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No suspended artists</h3>
                <p className="text-muted-foreground text-center">
                  Suspended artist accounts will appear here for review or reinstatement.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Suspended Artists</h2>
              {suspendedRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-lg transition-shadow border-amber-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.user.avatarUrl || ''} />
                          <AvatarFallback>{request.user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{request.user.displayName}</h3>
                            <Badge variant="secondary" className="bg-amber-500 text-black">Suspended</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <p><strong>Email:</strong> {request.user.email}</p>
                            <p><strong>Suspended:</strong> {request.reviewedAt instanceof Date ? request.reviewedAt.toLocaleDateString() : (request.reviewedAt as any)?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                            <p><strong>Suspended by:</strong> {request.reviewedBy || 'admin'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReinstateArtist(request)}
                          disabled={isProcessing}
                        >
                          Reinstate
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isProcessing}>
                              Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove artist account?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the artist's profile and revoke their access. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveArtist(request)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {selectedView === 'artist-rejected' && (
          rejectedRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <X className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No rejected requests</h3>
                <p className="text-muted-foreground text-center">
                  No artist requests have been rejected yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Rejected Professional Verification Requests</h2>
              {rejectedRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.user.avatarUrl || ''} />
                          <AvatarFallback>{request.user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{request.user.displayName}</h3>
                            <Badge variant="destructive">Rejected</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><strong>Reason:</strong> {request.rejectionReason || 'No reason provided'}</p>
                            <p><strong>Rejected:</strong> {request.reviewedAt instanceof Date ? request.reviewedAt.toLocaleDateString() : (request.reviewedAt as any)?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                          <Eye className="h-4 w-4 mr-1" /> View Details
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isProcessing}>
                              Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove artist account?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the artist's profile and revoke their access. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveArtist(request)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {selectedView === 'news-articles' && (
          <div className="space-y-6">
            {/* Article Editor */}
            <Card id="article-editor">
              <CardHeader>
                <CardTitle>Create newsroom article</CardTitle>
                <CardDescription>
                  Publish Gouache editorial or link out to external coverage. Articles appear in the newsroom alongside sponsored tiles.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="news-title">Headline *</Label>
                    <Input
                      id="news-title"
                      placeholder="e.g. Inside the Lagos Art Weekender"
                      value={newArticle.title}
                      onChange={(event) => setNewArticle((prev) => ({ ...prev, title: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="news-subheadline">Subheadline</Label>
                    <Input
                      id="news-subheadline"
                      placeholder="Optional subheadline"
                      value={newArticleSubheadline}
                      onChange={(e) => setNewArticleSubheadline(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="news-category">Category *</Label>
                    <Select
                      value={newArticle.category || 'Stories'}
                      onValueChange={(value) => setNewArticle((prev) => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger id="news-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Stories">Stories</SelectItem>
                        <SelectItem value="Events">Events</SelectItem>
                        <SelectItem value="News">News</SelectItem>
                        <SelectItem value="Partners">Partners</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="news-author">Author</Label>
                    <Input
                      id="news-author"
                      placeholder="Byline (optional)"
                      value={newArticle.author}
                      onChange={(event) => setNewArticle((prev) => ({ ...prev, author: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="news-summary">Standfirst *</Label>
                    <Textarea
                      id="news-summary"
                      rows={3}
                      placeholder="One or two sentences summarising the story."
                      value={newArticle.summary}
                      onChange={(event) => setNewArticle((prev) => ({ ...prev, summary: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="article-body-editor">Article Body *</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Paste images directly into the editor. Hold Shift and drag images to resize them.
                    </p>
                    <div
                      id="article-body-editor"
                      contentEditable
                      onPaste={handleBodyPaste}
                      className="min-h-[400px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      style={{ whiteSpace: 'pre-wrap' }}
                      suppressContentEditableWarning
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="news-image-upload">Upload hero image</Label>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Input
                        id="news-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleNewsArticleImageChange}
                      />
                      {(newArticleImagePreview || newArticle.imageUrl) && (
                        <Button variant="ghost" size="sm" type="button" onClick={clearNewsArticleImage}>
                          Remove image
                        </Button>
                      )}
                    </div>
                    {(newArticleImagePreview || newArticle.imageUrl) && (
                      <div className="mt-2">
                        <img
                          src={newArticleImagePreview || newArticle.imageUrl}
                          alt="Article preview"
                          className="h-32 w-full max-w-sm rounded-lg border object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="news-tags">Tags</Label>
                    <Input
                      id="news-tags"
                      placeholder="Comma separated (e.g. art fair, investment, photography)"
                      value={newArticle.tags}
                      onChange={(event) => setNewArticle((prev) => ({ ...prev, tags: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <Label>Article Location *</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Select where this article should appear on the news page:
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="location-main-banner"
                          name="article-location"
                          value="main-banner"
                          checked={newArticle.location === 'main-banner'}
                          onChange={(e) => setNewArticle((prev) => ({ ...prev, location: e.target.value as 'main-banner' | 'whats-new' | 'evergreen' }))}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="location-main-banner" className="font-normal cursor-pointer">
                          Main Banner (Hero tile - first article)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="location-whats-new"
                          name="article-location"
                          value="whats-new"
                          checked={newArticle.location === 'whats-new'}
                          onChange={(e) => setNewArticle((prev) => ({ ...prev, location: e.target.value as 'main-banner' | 'whats-new' | 'evergreen' }))}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="location-whats-new" className="font-normal cursor-pointer">
                          What&apos;s New (Featured section - articles 2-4)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="location-evergreen"
                          name="article-location"
                          value="evergreen"
                          checked={newArticle.location === 'evergreen'}
                          onChange={(e) => setNewArticle((prev) => ({ ...prev, location: e.target.value as 'main-banner' | 'whats-new' | 'evergreen' }))}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="location-evergreen" className="font-normal cursor-pointer">
                          Evergreen Article (Normal article spaces - articles 5+)
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleCreateNewsArticle} disabled={isPublishingArticle}>
                    {isPublishingArticle ? 'Publishing…' : 'Publish article'}
                  </Button>
                </div>
              </CardContent>
            </Card>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Artist Name *</Label>
                    <Input
                      placeholder="e.g. Banksy, Yayoi Kusama"
                      value={artistResearchName}
                      onChange={(e) => setArtistResearchName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Website URL (optional)</Label>
                    <Input
                      placeholder="https://artist-website.com"
                      type="url"
                      value={artistResearchWebsite}
                      onChange={(e) => setArtistResearchWebsite(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Social Media & Other Links (optional)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://instagram.com/artist, https://twitter.com/artist"
                        value={artistResearchSocialInput}
                        onChange={(e) => setArtistResearchSocialInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (artistResearchSocialInput.trim()) {
                              setArtistResearchSocialLinks([...artistResearchSocialLinks, artistResearchSocialInput.trim()]);
                              setArtistResearchSocialInput('');
                            }
                          }
                        }}
                      />
                      <Button type="button" onClick={() => {
                        if (artistResearchSocialInput.trim()) {
                          setArtistResearchSocialLinks([...artistResearchSocialLinks, artistResearchSocialInput.trim()]);
                          setArtistResearchSocialInput('');
                        }
                      }} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {artistResearchSocialLinks.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {artistResearchSocialLinks.map((link, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {link}
                            <button
                              onClick={() => setArtistResearchSocialLinks(artistResearchSocialLinks.filter((_, i) => i !== index))}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Context Images (optional)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setArtistResearchImages([...artistResearchImages, ...files]);
                        const newPreviews = files.map(file => URL.createObjectURL(file));
                        setArtistResearchImagePreviews([...artistResearchImagePreviews, ...newPreviews]);
                      }}
                    />
                    {artistResearchImagePreviews.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                        {artistResearchImagePreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img
                              src={preview}
                              alt={`Context ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 h-6 w-6 bg-background/80"
                              onClick={() => {
                                setArtistResearchImages(artistResearchImages.filter((_, i) => i !== index));
                                URL.revokeObjectURL(preview);
                                setArtistResearchImagePreviews(artistResearchImagePreviews.filter((_, i) => i !== index));
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Additional Notes (optional)</Label>
                    <Textarea
                      placeholder="Any additional context, specific topics to cover, or information about the artist..."
                      rows={3}
                      value={artistResearchNotes}
                      onChange={(e) => setArtistResearchNotes(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={async () => {
                    if (!artistResearchName.trim()) {
                      toast({
                        title: 'Artist name required',
                        description: 'Please enter the artist name.',
                        variant: 'destructive'
                      });
                      return;
                    }

                    setIsGeneratingDocuseries(true);
                    try {
                      // Upload images first
                      const imageUrls: string[] = [];
                      for (const file of artistResearchImages) {
                        try {
                          const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '-')}`;
                          const storagePath = `news/sections/${fileName}`;
                          const storageRef = ref(storage, storagePath);
                          await uploadBytes(storageRef, file);
                          const url = await getDownloadURL(storageRef);
                          imageUrls.push(url);
                        } catch (error) {
                          console.error('Failed to upload image:', error);
                        }
                      }

                      // Call AI API
                      const response = await fetch('/api/ai/generate-docuseries', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          artistName: artistResearchName,
                          website: artistResearchWebsite || undefined,
                          socialLinks: artistResearchSocialLinks,
                          contextImages: imageUrls,
                          additionalNotes: artistResearchNotes || undefined,
                        }),
                      });

                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Failed to generate docuseries');
                      }

                      const data = await response.json();
                      setDocuseriesDraft(data);

                      toast({
                        title: 'Docuseries generated',
                        description: 'Article has been generated and is ready for review.',
                      });
                    } catch (error) {
                      console.error('Error generating docuseries:', error);
                      toast({
                        title: 'Generation failed',
                        description: error instanceof Error ? error.message : 'Failed to generate docuseries. Please try again.',
                        variant: 'destructive'
                      });
                    } finally {
                      setIsGeneratingDocuseries(false);
                    }
                  }}
                  disabled={isGeneratingDocuseries || !artistResearchName.trim()}
                  className="w-full"
                >
                  {isGeneratingDocuseries ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Researching & Generating Article...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Research Artist & Generate Docuseries
                    </>
                  )}
                </Button>

                {docuseriesDraft && (
                  <Card className="border-green-500/20 bg-green-500/5">
                    <CardHeader>
                      <CardTitle className="text-green-700 dark:text-green-400">
                        Draft Ready for Review
                      </CardTitle>
                      <CardDescription>
                        Review the generated article below. You can edit it before saving as a draft.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={docuseriesDraft.title}
                          onChange={(e) => setDocuseriesDraft({ ...docuseriesDraft, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Summary</Label>
                        <Textarea
                          value={docuseriesDraft.summary}
                          onChange={(e) => setDocuseriesDraft({ ...docuseriesDraft, summary: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tags</Label>
                        <Input
                          value={docuseriesDraft.tags.join(', ')}
                          onChange={(e) => setDocuseriesDraft({ ...docuseriesDraft, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                        />
                      </div>
                      {docuseriesDraft.researchNotes && (
                        <div className="space-y-2">
                          <Label>Research Notes</Label>
                          <p className="text-sm text-muted-foreground">{docuseriesDraft.researchNotes}</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          onClick={async () => {
                            try {
                              // Upload hero image (use first section image if available)
                              let heroImageUrl = newArticle.imageUrl || '';
                              const firstImageSection = docuseriesDraft.sections.find(s => s.imageUrl);
                              if (firstImageSection?.imageUrl) {
                                heroImageUrl = firstImageSection.imageUrl;
                              }

                              const docRef = await addDoc(collection(db, 'newsArticles'), {
                                title: docuseriesDraft.title,
                                summary: docuseriesDraft.summary,
                                category: 'Stories',
                                author: newArticle.author || 'Gouache Editorial',
                                imageUrl: heroImageUrl || '/assets/placeholder-light.png',
                                tags: docuseriesDraft.tags,
                                sections: docuseriesDraft.sections.sort((a, b) => a.order - b.order),
                                status: 'draft',
                                location: 'evergreen',
                                artistResearchData: {
                                  artistName: artistResearchName,
                                  website: artistResearchWebsite || undefined,
                                  socialLinks: artistResearchSocialLinks,
                                  researchNotes: docuseriesDraft.researchNotes,
                                },
                                archived: false,
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp(),
                              });

                              toast({
                                title: 'Draft saved',
                                description: 'Article has been saved as a draft. You can find it in "Drafted Articles".',
                              });

                              // Reset form
                              setArtistResearchName('');
                              setArtistResearchWebsite('');
                              setArtistResearchSocialLinks([]);
                              setArtistResearchImages([]);
                              setArtistResearchImagePreviews([]);
                              setArtistResearchNotes('');
                              setDocuseriesDraft(null);
                            } catch (error) {
                              console.error('Error saving draft:', error);
                              toast({
                                title: 'Save failed',
                                description: 'Failed to save draft. Please try again.',
                                variant: 'destructive'
                              });
                            }
                          }}
                          className="flex-1"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Save as Draft
                        </Button>
                        <Button
                          onClick={() => {
                            // Load draft into manual editor
                            setNewArticle({
                              ...newArticle,
                              title: docuseriesDraft.title,
                              summary: docuseriesDraft.summary,
                              category: 'Stories',
                            });
                            setArticleSections(docuseriesDraft.sections.sort((a, b) => a.order - b.order));
                            setDocuseriesDraft(null);
                            toast({
                              title: 'Draft loaded',
                              description: 'Draft has been loaded into the editor below. You can make further edits.',
                            });
                          }}
                          variant="outline"
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit in Editor
                        </Button>
                        <Button
                          onClick={() => setDocuseriesDraft(null)}
                          variant="ghost"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
                    <Select
                      value={newArticle.category || 'Stories'}
                      onValueChange={(value) => setNewArticle((prev) => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger id="news-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Stories">Stories</SelectItem>
                        <SelectItem value="Events">Events</SelectItem>
                        <SelectItem value="News">News</SelectItem>
                        <SelectItem value="Partners">Partners</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="news-author">Author</Label>
                    <Input
                      id="news-author"
                      placeholder="Byline (optional)"
                      value={newArticle.author}
                      onChange={(event) => setNewArticle((prev) => ({ ...prev, author: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="news-date">Publish date</Label>
                    <Input
                      id="news-date"
                      type="datetime-local"
                      value={newArticle.publishedAt}
                      onChange={(event) => setNewArticle((prev) => ({ ...prev, publishedAt: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="news-image">Hero image URL (optional)</Label>
                    <Input
                      id="news-image"
                      placeholder="https://"
                      value={newArticle.imageUrl}
                      onChange={(event) => setNewArticle((prev) => ({ ...prev, imageUrl: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="news-link">External link</Label>
                    <Input
                      id="news-link"
                      placeholder="https://"
                      value={newArticle.externalUrl}
                      onChange={(event) => setNewArticle((prev) => ({ ...prev, externalUrl: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="news-summary">Standfirst *</Label>
                    <Textarea
                      id="news-summary"
                      rows={3}
                      placeholder="One or two sentences summarising the story."
                      value={newArticle.summary}
                      onChange={(event) => setNewArticle((prev) => ({ ...prev, summary: event.target.value }))}
                    />
                  </div>
                  {/* AI-Assisted Article Structuring - Collapsible */}
                  <div className="space-y-4 md:col-span-2">
                    <Card className="border-primary/20 bg-primary/5">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-primary" />
                              AI-Assisted Article Structuring (Optional)
                            </CardTitle>
                            <CardDescription>
                              Paste your raw text, add headlines and images, and let AI structure your article automatically
                            </CardDescription>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAiSection(!showAiSection)}
                          >
                            {showAiSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </CardHeader>
                      {showAiSection && (
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Raw Article Text *</Label>
                          <Textarea
                            placeholder="Paste your complete article text here..."
                            rows={8}
                            value={aiRawText}
                            onChange={(e) => setAiRawText(e.target.value)}
                            className="font-mono text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Headlines (optional)</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter a headline..."
                              value={aiHeadlineInput}
                              onChange={(e) => setAiHeadlineInput(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addAiHeadline();
                                }
                              }}
                            />
                            <Button type="button" onClick={addAiHeadline} size="sm">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {aiHeadlines.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {aiHeadlines.map((headline, index) => (
                                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                  {headline}
                                  <button
                                    onClick={() => removeAiHeadline(index)}
                                    className="ml-1 hover:text-destructive"
                                  >
                                    ×
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Images (optional)</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleAiImageUpload}
                          />
                          {aiImagePreviews.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                              {aiImagePreviews.map((preview, index) => (
                                <div key={index} className="relative">
                                  <img
                                    src={preview}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-32 object-cover rounded-lg border"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 h-6 w-6 bg-background/80"
                                    onClick={() => removeAiImage(index)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                  <Input
                                    placeholder="Image description..."
                                    value={aiImageDescriptions[index] || ''}
                                    onChange={(e) => {
                                      const newDescriptions = [...aiImageDescriptions];
                                      newDescriptions[index] = e.target.value;
                                      setAiImageDescriptions(newDescriptions);
                                    }}
                                    className="mt-2 text-xs"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button
                          type="button"
                          onClick={structureArticleWithAI}
                          disabled={isStructuringArticle || !aiRawText.trim()}
                          className="w-full"
                        >
                          {isStructuringArticle ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Structuring Article...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Structure Article with AI
                            </>
                          )}
                        </Button>

                        {aiGeneratedSections.length > 0 && (
                          <Card className="border-green-500/20 bg-green-500/5">
                            <CardHeader>
                              <CardTitle className="text-green-700 dark:text-green-400">
                                AI Generated {aiGeneratedSections.length} Sections
                              </CardTitle>
                              <CardDescription>
                                Review the sections below and accept to add them to your article
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {aiGeneratedSections
                                .sort((a, b) => a.order - b.order)
                                .map((section, index) => (
                                  <div key={section.id} className="border rounded-lg p-3 bg-background">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="outline">
                                        {section.type === 'image' ? 'Image' : section.type === 'text-image' ? 'Text + Image' : section.type.charAt(0).toUpperCase() + section.type.slice(1)}
                                      </Badge>
                                      {section.imagePosition && (
                                        <Badge variant="secondary">{section.imagePosition}</Badge>
                                      )}
                                    </div>
                                    {section.content && (
                                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{section.content}</p>
                                    )}
                                    {section.imageUrl && (
                                      <img src={section.imageUrl} alt={section.caption || 'Section image'} className="h-20 w-auto rounded mb-2" />
                                    )}
                                    {section.caption && (
                                      <p className="text-xs text-muted-foreground italic">{section.caption}</p>
                                    )}
                                  </div>
                                ))}
                              <div className="flex gap-2">
                                <Button onClick={acceptAiSections} className="flex-1">
                                  <Check className="h-4 w-4 mr-2" />
                                  Accept & Add Sections
                                </Button>
                                <Button onClick={rejectAiSections} variant="outline" className="flex-1">
                                  <X className="h-4 w-4 mr-2" />
                                  Reject
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </CardContent>
                      )}
                    </Card>
                  </div>

                  {/* Article Sections Builder */}
                  <div className="space-y-4 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-lg font-semibold">Article Content Builder</Label>
                        <p className="text-sm text-muted-foreground">
                          Build your article with structured sections. Drag and drop images anywhere between sections.
                        </p>
                      </div>
                    </div>

                    {/* Existing Sections with Drag & Drop Zones */}
                    {articleSections.length > 0 && (
                      <div className="space-y-2 border rounded-lg p-4 bg-muted/20">
                        {articleSections
                          .sort((a, b) => a.order - b.order)
                          .map((section, index) => (
                            <div key={section.id}>
                              {/* Drop zone before each section */}
                              <div
                                className={`h-4 border-2 border-dashed rounded transition-colors ${
                                  dragOverIndex === index ? 'border-primary bg-primary/10' : 'border-transparent'
                                }`}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, index)}
                              />
                              
                              <div className="border rounded-lg p-4 bg-background">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    <Badge variant="outline" className="capitalize">
                                      {section.type === 'headline' && <Type className="h-3 w-3 mr-1" />}
                                      {section.type === 'image' && <ImageIcon className="h-3 w-3 mr-1" />}
                                      {section.type}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">#{index + 1}</span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => moveSectionUp(index)}
                                      disabled={index === 0}
                                    >
                                      <ChevronUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => moveSectionDown(index)}
                                      disabled={index === articleSections.length - 1}
                                    >
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() => removeArticleSection(section.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Section Content Display */}
                                {(section.type === 'headline' || section.type === 'subheadline' || section.type === 'intro' || section.type === 'body' || section.type === 'outro') && section.content && (
                                  <div className="space-y-1">
                                    {section.type === 'headline' && (
                                      <h3 className="text-xl font-bold">{section.content}</h3>
                                    )}
                                    {section.type === 'subheadline' && (
                                      <h4 className="text-lg font-semibold text-muted-foreground">{section.content}</h4>
                                    )}
                                    {(section.type === 'intro' || section.type === 'body' || section.type === 'outro') && (
                                      <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-4">{section.content}</p>
                                    )}
                                  </div>
                                )}
                                
                                {section.type === 'image' && section.imageUrl && (
                                  <div className="space-y-2">
                                    <img src={section.imageUrl} alt={section.caption || 'Section image'} className="max-h-48 w-auto rounded-lg border" />
                                    {section.caption && (
                                      <p className="text-xs text-muted-foreground italic">{section.caption}</p>
                                    )}
                                  </div>
                                )}
                                
                                {section.type === 'text-image' && (
                                  <div className="space-y-2">
                                    {section.imagePosition === 'above' && section.imageUrl && (
                                      <img src={section.imageUrl} alt={section.caption || 'Section image'} className="max-h-48 w-auto rounded-lg border" />
                                    )}
                                    {section.content && (
                                      <p className="text-sm text-foreground whitespace-pre-wrap">{section.content}</p>
                                    )}
                                    {section.imagePosition === 'below' && section.imageUrl && (
                                      <img src={section.imageUrl} alt={section.caption || 'Section image'} className="max-h-48 w-auto rounded-lg border" />
                                    )}
                                    {section.caption && (
                                      <p className="text-xs text-muted-foreground italic">{section.caption}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        
                        {/* Drop zone after last section */}
                        <div
                          className={`h-4 border-2 border-dashed rounded transition-colors ${
                            dragOverIndex === articleSections.length ? 'border-primary bg-primary/10' : 'border-transparent'
                          }`}
                          onDragOver={(e) => handleDragOver(e, articleSections.length)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, articleSections.length)}
                        />
                      </div>
                    )}

                    {/* Add New Section Form */}
                    <div className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Add New Section</Label>
                        <Select value={newSectionType} onValueChange={(value) => setNewSectionType(value as 'headline' | 'subheadline' | 'intro' | 'body' | 'outro' | 'image' | 'text-image')}>
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="headline">Headline</SelectItem>
                            <SelectItem value="subheadline">Subheadline</SelectItem>
                            <SelectItem value="intro">Introduction</SelectItem>
                            <SelectItem value="body">Body Text</SelectItem>
                            <SelectItem value="outro">Conclusion</SelectItem>
                            <SelectItem value="image">Image Only</SelectItem>
                            <SelectItem value="text-image">Text + Image</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Drag and Drop Image Area */}
                      <div
                        className="border-2 border-dashed rounded-lg p-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDrop={handleImageFileDrop}
                      >
                        <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-1">
                          Drag and drop images here or use the file input below
                        </p>
                      </div>

                      {/* Text Content */}
                      {(newSectionType === 'headline' || newSectionType === 'subheadline' || newSectionType === 'intro' || newSectionType === 'body' || newSectionType === 'outro' || newSectionType === 'text-image') && (
                        <div className="space-y-2">
                          <Label>
                            {newSectionType === 'headline' && 'Headline *'}
                            {newSectionType === 'subheadline' && 'Subheadline *'}
                            {newSectionType === 'intro' && 'Introduction Text *'}
                            {newSectionType === 'body' && 'Body Text *'}
                            {newSectionType === 'outro' && 'Conclusion Text *'}
                            {newSectionType === 'text-image' && 'Text Content *'}
                          </Label>
                          <Textarea
                            placeholder={
                              newSectionType === 'headline' ? 'Enter headline...' :
                              newSectionType === 'subheadline' ? 'Enter subheadline...' :
                              newSectionType === 'intro' ? 'Enter introduction text...' :
                              newSectionType === 'body' ? 'Enter body text...' :
                              newSectionType === 'outro' ? 'Enter conclusion text...' :
                              'Enter section text content...'
                            }
                            rows={newSectionType === 'headline' || newSectionType === 'subheadline' ? 2 : 6}
                            value={newSectionContent}
                            onChange={(e) => setNewSectionContent(e.target.value)}
                          />
                        </div>
                      )}

                      {/* Image Upload */}
                      {(newSectionType === 'image' || newSectionType === 'text-image') && (
                        <div className="space-y-2">
                          <Label>Image *</Label>
                          <div className="flex flex-col gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleSectionImageChange}
                            />
                            {newSectionImagePreview && (
                              <div className="relative">
                                <img
                                  src={newSectionImagePreview}
                                  alt="Preview"
                                  className="h-32 w-auto rounded-lg border"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute top-2 right-2 h-6 w-6"
                                  onClick={clearSectionImage}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Image Position (for text-image sections) */}
                      {newSectionType === 'text-image' && (
                        <div className="space-y-2">
                          <Label>Image Position</Label>
                          <Select value={newSectionImagePosition} onValueChange={(value) => setNewSectionImagePosition(value as 'above' | 'below' | 'left' | 'right')}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="above">Above Text</SelectItem>
                              <SelectItem value="below">Below Text</SelectItem>
                              <SelectItem value="left">Left of Text</SelectItem>
                              <SelectItem value="right">Right of Text</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Image Caption */}
                      {(newSectionType === 'image' || newSectionType === 'text-image') && (
                        <div className="space-y-2">
                          <Label>Image Caption (optional)</Label>
                          <Input
                            placeholder="Enter image caption..."
                            value={newSectionCaption}
                            onChange={(e) => setNewSectionCaption(e.target.value)}
                          />
                        </div>
                      )}

                      <Button type="button" onClick={addArticleSection} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Section
                      </Button>
                    </div>

                    {/* Legacy Content Field (for backward compatibility) */}
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="news-content">Legacy Content (optional - use sections above instead)</Label>
                      <Textarea
                        id="news-content"
                        rows={4}
                        placeholder="Simple text content (legacy field - use sections above for rich content)"
                        value={newArticleContent}
                        onChange={(event) => setNewArticleContent(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="news-image-upload">Upload hero image</Label>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Input
                        id="news-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleNewsArticleImageChange}
                      />
                      {(newArticleImagePreview || newArticle.imageUrl) && (
                        <Button variant="ghost" size="sm" type="button" onClick={clearNewsArticleImage}>
                          Remove image
                        </Button>
                      )}
                    </div>
                    {(newArticleImagePreview || newArticle.imageUrl) && (
                      <div className="mt-2">
                        <img
                          src={newArticleImagePreview || newArticle.imageUrl}
                          alt="Article preview"
                          className="h-32 w-full max-w-sm rounded-lg border object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="news-tags">Tags</Label>
                    <Input
                      id="news-tags"
                      placeholder="Comma separated (e.g. art fair, investment, photography)"
                      value={newArticle.tags}
                      onChange={(event) => setNewArticle((prev) => ({ ...prev, tags: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <Label>Article Location *</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Select where this article should appear on the news page:
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="location-main-banner"
                          name="article-location"
                          value="main-banner"
                          checked={newArticle.location === 'main-banner'}
                          onChange={(e) => setNewArticle((prev) => ({ ...prev, location: e.target.value as 'main-banner' | 'whats-new' | 'evergreen' }))}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="location-main-banner" className="font-normal cursor-pointer">
                          Main Banner (Hero tile - first article)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="location-whats-new"
                          name="article-location"
                          value="whats-new"
                          checked={newArticle.location === 'whats-new'}
                          onChange={(e) => setNewArticle((prev) => ({ ...prev, location: e.target.value as 'main-banner' | 'whats-new' | 'evergreen' }))}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="location-whats-new" className="font-normal cursor-pointer">
                          What&apos;s New (Featured section - articles 2-4)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="location-evergreen"
                          name="article-location"
                          value="evergreen"
                          checked={newArticle.location === 'evergreen'}
                          onChange={(e) => setNewArticle((prev) => ({ ...prev, location: e.target.value as 'main-banner' | 'whats-new' | 'evergreen' }))}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="location-evergreen" className="font-normal cursor-pointer">
                          Evergreen Article (Normal article spaces - articles 5+)
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleCreateNewsArticle} disabled={isPublishingArticle}>
                    {isPublishingArticle ? 'Publishing…' : 'Publish article'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    {showArchivedNews 
                      ? 'Archived articles' 
                      : showDraftedArticles
                      ? 'Drafted articles'
                      : 'Published articles'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {showArchivedNews
                      ? 'Review past stories and restore any that should return to the feed.'
                      : showDraftedArticles
                      ? 'Review and publish drafted articles. Make final edits before publishing.'
                      : 'Manage everything currently live in the newsroom feed.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={!showArchivedNews && !showDraftedArticles ? 'secondary' : 'outline'}
                    onClick={() => {
                      setShowArchivedNews(false);
                      setShowDraftedArticles(false);
                    }}
                  >
                    Published ({publishedArticles.length})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={showDraftedArticles && !showArchivedNews ? 'secondary' : 'outline'}
                    onClick={() => {
                      setShowArchivedNews(false);
                      setShowDraftedArticles(true);
                    }}
                  >
                    Drafted ({draftedArticles.length})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={showArchivedNews ? 'secondary' : 'outline'}
                    onClick={() => {
                      setShowArchivedNews(true);
                      setShowDraftedArticles(false);
                    }}
                  >
                    Archived ({archivedNewsArticles.length})
                  </Button>
                </div>
              </div>

              {visibleNewsArticles.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center space-y-2">
                    <h3 className="text-lg font-semibold">
                      {showArchivedNews 
                        ? 'No archived stories yet' 
                        : showDraftedArticles 
                        ? 'No drafted articles yet'
                        : 'No stories published yet'}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {showArchivedNews
                        ? 'When you archive a story, it will move here so you can restore or permanently delete it later.'
                        : showDraftedArticles
                        ? 'Drafted articles will appear here. Review and publish drafted articles.'
                        : 'Publish your first story to populate the newsroom feed.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {visibleNewsArticles.map((article) => (
                    <Card key={article.id} className="flex flex-col overflow-hidden">
                      <div className="relative w-full pt-[60%]">
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        <Badge className="absolute top-3 left-3" variant="secondary">
                          {article.category}
                        </Badge>
                        {article.archived && (
                          <Badge className="absolute top-3 right-3" variant="destructive">
                            Archived
                          </Badge>
                        )}
                        {article.status === 'draft' && !article.archived && (
                          <Badge className="absolute top-3 right-3" variant="outline" style={{ backgroundColor: 'rgba(255, 193, 7, 0.2)' }}>
                            Draft
                          </Badge>
                        )}
                      </div>
                      <CardContent className="flex-1 p-5 space-y-3">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-lg leading-tight line-clamp-2">{article.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-3">{article.summary}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {article.author ? `${article.author} • ` : ''}
                            {article.publishedAt 
                              ? article.publishedAt.toLocaleDateString() 
                              : article.updatedAt 
                              ? `Updated ${article.updatedAt.toLocaleDateString()}`
                              : 'Draft'}
                          </span>
                          <div className="flex items-center gap-2">
                            {article.status === 'draft' && !article.archived && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      // Load draft into editor
                                      const articleDoc = await getDoc(doc(db, 'newsArticles', article.id));
                                      if (!articleDoc.exists()) {
                                        toast({
                                          title: 'Article not found',
                                          variant: 'destructive',
                                        });
                                        return;
                                      }

                                      const data = articleDoc.data();
                                      
                                      setNewArticle({
                                        title: data.title || '',
                                        summary: data.summary || '',
                                        category: data.category || 'Stories',
                                        author: data.author || '',
                                        imageUrl: data.imageUrl || '',
                                        externalUrl: data.externalUrl || '',
                                        publishedAt: '',
                                        tags: (data.tags || []).join(', '),
                                        location: data.location || 'evergreen',
                                      });

                                      setArticleSections((data.sections || []).map((s: any) => ({
                                        ...s,
                                        order: s.order || 0,
                                      })));
                                      setNewArticleContent(data.content || '');

                                      // Scroll to editor
                                      setTimeout(() => {
                                        document.getElementById('article-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                      }, 100);

                                      toast({
                                        title: 'Draft loaded',
                                        description: 'Article loaded into editor. Make your changes and publish.',
                                      });
                                    } catch (error) {
                                      console.error('Error loading draft:', error);
                                      toast({
                                        title: 'Load failed',
                                        description: 'Failed to load draft. Please try again.',
                                        variant: 'destructive',
                                      });
                                    }
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await updateDoc(doc(db, 'newsArticles', article.id), {
                                        status: 'published',
                                        publishedAt: serverTimestamp(),
                                        updatedAt: serverTimestamp(),
                                      });
                                      toast({
                                        title: 'Article published',
                                        description: `"${article.title}" is now live.`,
                                      });
                                    } catch (error) {
                                      console.error('Error publishing article:', error);
                                      toast({
                                        title: 'Publish failed',
                                        description: 'Failed to publish article. Please try again.',
                                        variant: 'destructive'
                                      });
                                    }
                                  }}
                                >
                                  Publish
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleArchiveNewsArticle(article, !article.archived)}
                            >
                              {article.archived ? 'Restore' : 'Archive'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleDeleteNewsArticle(article)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Reports */}
        {selectedView === 'user-reports' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">User Reports</h2>
                <p className="text-muted-foreground">
                  Review reports submitted by users about issues, bugs, or concerns.
                </p>
              </div>
              <Badge variant="outline">
                {userReports.filter(r => r.status === 'pending').length} pending
              </Badge>
            </div>

            {userReports.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
                  <p className="text-muted-foreground text-center">
                    User reports will appear here when submitted.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {userReports.map((report) => (
                  <Card key={report.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{report.displayName}</h3>
                              <Badge
                                variant={
                                  report.status === 'pending'
                                    ? 'default'
                                    : report.status === 'resolved'
                                    ? 'secondary'
                                    : 'outline'
                                }
                              >
                                {report.status}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p>
                                <span className="font-medium">Username:</span> {report.username}
                              </p>
                              <p>
                                <span className="font-medium">Email:</span> {report.userEmail}
                              </p>
                              <p>
                                <span className="font-medium">User ID:</span> {report.userId}
                              </p>
                              <p>
                                <span className="font-medium">Submitted:</span>{' '}
                                {report.submittedAt.toLocaleDateString()} at{' '}
                                {report.submittedAt.toLocaleTimeString()}
                              </p>
                              {report.reviewedAt && (
                                <p>
                                  <span className="font-medium">Reviewed:</span>{' '}
                                  {report.reviewedAt.toLocaleDateString()} at{' '}
                                  {report.reviewedAt.toLocaleTimeString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <Label className="text-sm font-medium mb-2 block">Report Message</Label>
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm whitespace-pre-wrap">{report.message}</p>
                          </div>
                        </div>

                        {report.adminNotes && (
                          <div className="border-t pt-4">
                            <Label className="text-sm font-medium mb-2 block">Admin Notes</Label>
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <p className="text-sm whitespace-pre-wrap">{report.adminNotes}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-4 border-t">
                          {report.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateReportStatus(report, 'reviewed')}
                                disabled={isProcessing}
                              >
                                Mark as Reviewed
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleUpdateReportStatus(report, 'resolved')}
                                disabled={isProcessing}
                              >
                                Mark as Resolved
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateReportStatus(report, 'dismissed')}
                                disabled={isProcessing}
                              >
                                Dismiss
                              </Button>
                            </>
                          )}
                          {report.status !== 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateReportStatus(report, 'pending')}
                              disabled={isProcessing}
                            >
                              Reopen
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Episodes - All */}
        {selectedView === 'episodes-all' && (
          episodes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Video className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No episodes uploaded</h3>
                <p className="text-muted-foreground text-center">
                  Upload your first video using the Upload button.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">All Episodes</h2>
              {episodes.map((episode) => (
                <Card key={episode.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-32 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={episode.thumbnailUrl}
                          alt={episode.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{episode.title}</h3>
                          {episode.isMainEvent && (
                            <Badge variant="default" className="bg-red-600">Main Event</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{episode.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{episode.viewCount} views</span>
                          <span>{episode.likes} likes</span>
                          <span>Created {episode.createdAt instanceof Date ? episode.createdAt.toLocaleDateString() : 'Recently'}</span>
                      </div>
                        </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEpisode(episode)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteEpisode(episode)}
                          disabled={isProcessing}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
          )
        )}

        {/* Marketplace - Products */}
        {selectedView === 'marketplace-products' && (
          marketplaceProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No products yet</h3>
                <p className="text-muted-foreground text-center">
                  Upload your first product using the Upload button.
                </p>
              </CardContent>
            </Card>
          ) : (
          <div className="space-y-4">
              <h2 className="text-2xl font-bold">All Products</h2>
              {marketplaceProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        {product.images.length > 0 && (
                          <img 
                            src={product.images[0]} 
                            alt={product.title}
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{product.title}</h3>
                            <Badge variant={product.isActive ? "default" : "secondary"}>
                              {product.isActive ? "Active" : "Inactive"}
                            </Badge>
                            {product.isOnSale && <Badge variant="destructive">On Sale</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-semibold">${product.price} {product.currency}</span>
                            <span>Stock: {product.stock}</span>
                            <span>Sales: {product.salesCount}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteProduct(product)}
                          disabled={isProcessing}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {/* Active Products */}
        {selectedView === 'marketplace-active' && (
          marketplaceProducts.filter(p => p.isActive).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No active products</h3>
                <p className="text-muted-foreground text-center">
                  No products are currently active in the marketplace.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Active Products</h2>
              {marketplaceProducts.filter(p => p.isActive).map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        {product.images.length > 0 && (
                          <img 
                            src={product.images[0]} 
                            alt={product.title}
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{product.title}</h3>
                            <Badge variant="default">Active</Badge>
                            {product.isOnSale && <Badge variant="destructive">On Sale</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-semibold">${product.price} {product.currency}</span>
                            <span>Stock: {product.stock}</span>
                            <span>Sales: {product.salesCount}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteProduct(product)}
                          disabled={isProcessing}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {/* Product Requests */}
        {selectedView === 'marketplace-requests' && (
          affiliateRequests.filter(req => req.status === 'pending').length === 0 ? (
              <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Link className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No affiliate requests</h3>
                <p className="text-muted-foreground text-center">
                  No affiliate product requests pending review.
                </p>
                </CardContent>
              </Card>
            ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Affiliate Product Requests</h2>
              {affiliateRequests.filter(req => req.status === 'pending').map((request) => (
                <Card key={request.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        {request.productImages.length > 0 && (
                          <img 
                            src={request.productImages[0]} 
                            alt={request.productTitle}
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{request.productTitle}</h3>
                            <Badge variant="outline">Pending</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                              <p><strong>Company:</strong> {request.companyName}</p>
                              <p><strong>Email:</strong> {request.email}</p>
                        </div>
                            <div>
                              <p><strong>Price:</strong> ${request.productPrice} {request.productCurrency}</p>
                              <p><strong>Category:</strong> {request.productCategory}</p>
                      </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAffiliateRequest(request)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveAffiliateRequest(request)}
                          disabled={isProcessing}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRejectAffiliateRequest(request)}
                          disabled={isProcessing}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
                        </div>
          )
        )}

        {/* Advertising - Requests */}
        {selectedView === 'advertising-requests' && (
          advertisingApplications.filter(app => app.status === 'pending').length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No advertising requests</h3>
                <p className="text-muted-foreground text-center">
                  No advertising applications pending review.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Advertising Applications</h2>
              {advertisingApplications.filter(app => app.status === 'pending').map((application) => (
                <Card key={application.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{application.companyName}</h3>
                          <Badge variant="outline">Pending</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                            <p><strong>Contact:</strong> {application.contactName}</p>
                            <p><strong>Email:</strong> {application.email}</p>
                        </div>
                          <div>
                            <p><strong>Type:</strong> {application.advertisingType}</p>
                            <p><strong>Budget:</strong> {application.budget || 'Not specified'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAdApplication(application)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveAdApplication(application)}
                          disabled={isProcessing}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setSelectedAdApplication(application)}
                          disabled={isProcessing}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {/* Empty states for other views */}
        {(selectedView === 'episodes-drafts' || selectedView === 'episodes-archived' || 
          selectedView === 'marketplace-archived' || selectedView === 'advertising-live' || 
          selectedView === 'advertising-archived') && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No items</h3>
              <p className="text-muted-foreground text-center">
                This section is currently empty.
              </p>
            </CardContent>
          </Card>
        )}


        {/* Advertising Media Management */}
        {selectedView === 'advertising-media' && (
          advertisements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No advertisements uploaded</h3>
                <p className="text-muted-foreground text-center">
                  Upload pre-roll advertisements to play before episodes.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Advertising Media</h2>
              {advertisements.map((ad) => (
                <Card key={ad.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="w-32 h-20 bg-muted rounded-lg flex items-center justify-center">
                          {ad.thumbnailUrl ? (
                            <img src={ad.thumbnailUrl} alt={ad.title} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Play className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{ad.title}</h3>
                            <Badge variant={ad.isActive ? 'default' : 'secondary'}>
                              {ad.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{ad.description}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                              <p><strong>Advertiser:</strong> {ad.advertiserName}</p>
                              <p><strong>Duration:</strong> {ad.duration}s</p>
                      </div>
                            <div>
                              <p><strong>Views:</strong> {ad.views.toLocaleString()}</p>
                              <p><strong>Clicks:</strong> {ad.clicks.toLocaleString()}</p>
                    </div>
                            <div>
                              <p><strong>CTR:</strong> {ad.clickThroughRate.toFixed(2)}%</p>
                              <p><strong>Budget:</strong> ${ad.budget?.toLocaleString() || 'N/A'}</p>
                        </div>
                            <div>
                              <p><strong>Start:</strong> {ad.startDate instanceof Date ? ad.startDate.toLocaleDateString() : 'N/A'}</p>
                              <p><strong>End:</strong> {ad.endDate instanceof Date ? ad.endDate.toLocaleDateString() : 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAdvertisement(ad)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            // Toggle active status
                            updateDoc(doc(db, 'advertisements', ad.id), {
                              isActive: !ad.isActive,
                              updatedAt: serverTimestamp()
                            });
                          }}
                          disabled={isProcessing}
                        >
                          {ad.isActive ? (
                            <>
                              <Pause className="h-4 w-4 mr-1" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            // Delete advertisement
                            deleteDoc(doc(db, 'advertisements', ad.id));
                          }}
                          disabled={isProcessing}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
                    </div>
          )
        )}

        {/* Advertising Analytics */}
        {selectedView === 'advertising-analytics' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Advertising Analytics</h2>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <BarChart3 className="h-8 w-8 text-primary" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Total Impressions</p>
                      <p className="text-2xl font-bold">
                        {advertisements.reduce((sum, ad) => sum + ad.impressions, 0).toLocaleString()}
                      </p>
          </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Eye className="h-8 w-8 text-primary" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Total Views</p>
                      <p className="text-2xl font-bold">
                        {advertisements.reduce((sum, ad) => sum + ad.views, 0).toLocaleString()}
                </p>
              </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <ExternalLink className="h-8 w-8 text-primary" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Total Clicks</p>
                      <p className="text-2xl font-bold">
                        {advertisements.reduce((sum, ad) => sum + ad.clicks, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Megaphone className="h-8 w-8 text-primary" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Active Ads</p>
                      <p className="text-2xl font-bold">
                        {advertisements.filter(ad => ad.isActive).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analytics Table */}
          <Card>
            <CardHeader>
                <CardTitle>Advertisement Performance</CardTitle>
                <CardDescription>Detailed analytics for each advertisement</CardDescription>
            </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {advertisements.map((ad) => (
                    <div key={ad.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">{ad.title}</h3>
                        <Badge variant={ad.isActive ? 'default' : 'secondary'}>
                          {ad.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                          <p className="text-muted-foreground">Impressions</p>
                          <p className="font-semibold">{ad.impressions.toLocaleString()}</p>
                      </div>
                        <div>
                          <p className="text-muted-foreground">Views</p>
                          <p className="font-semibold">{ad.views.toLocaleString()}</p>
                    </div>
                        <div>
                          <p className="text-muted-foreground">Clicks</p>
                          <p className="font-semibold">{ad.clicks.toLocaleString()}</p>
                    </div>
                        <div>
                          <p className="text-muted-foreground">CTR</p>
                          <p className="font-semibold">{ad.clickThroughRate.toFixed(2)}%</p>
                </div>
                        <div>
                          <p className="text-muted-foreground">Revenue</p>
                          <p className="font-semibold">${ad.totalSpent.toLocaleString()}</p>
              </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Course Management Sections - Deprecated (moved to Marketplace) */}
        {/* Published Courses */}
        {selectedView === 'courses-published' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Published Courses</h2>
            {courses.filter(c => c.isPublished).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Play className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No published courses</h3>
                  <p className="text-muted-foreground text-center">
                    No courses have been published yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {courses.filter(c => c.isPublished).map((course) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                            <p className="text-muted-foreground mb-2">{course.description}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Instructor: {course.instructor.name}</span>
                              <span>Students: {course.students}</span>
                              <span>Rating: {course.rating}/5</span>
                              <span>Price: ${course.price}</span>
                      </div>
                    </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCourseUnpublish(course.id)}
                          >
                            Unpublish
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCourseDelete(course.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Draft Courses */}
        {selectedView === 'courses-draft' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Draft Courses</h2>
            {courses.filter(c => !c.isPublished).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Edit className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No draft courses</h3>
                  <p className="text-muted-foreground text-center">
                    No courses are currently in draft status.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {courses.filter(c => !c.isPublished).map((course) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                            <p className="text-muted-foreground mb-2">{course.description}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Instructor: {course.instructor.name}</span>
                              <span>Price: ${course.price}</span>
                              <span>Created: {course.createdAt.toLocaleDateString()}</span>
                        </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleCoursePublish(course.id)}
                          >
                            Publish
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCourseDelete(course.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                    </div>
                  )}
                </div>
        )}

        {/* Course Submissions */}
        {selectedView === 'course-submissions' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Course Submission Requests</h2>
            {courseSubmissions.filter(s => s.status === 'pending').length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <User className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                  <p className="text-muted-foreground text-center">
                    No course submission requests pending review.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {courseSubmissions.filter(s => s.status === 'pending').map((submission) => (
                  <Card key={submission.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">{submission.courseTitle}</h3>
                          <p className="text-muted-foreground mb-4">{submission.courseDescription}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p><strong>Company:</strong> {submission.companyName}</p>
                              <p><strong>Contact:</strong> {submission.contactName}</p>
                              <p><strong>Email:</strong> {submission.email}</p>
                              <p><strong>Website:</strong> {submission.website}</p>
                            </div>
                            <div>
                              <p><strong>Category:</strong> {submission.courseCategory}</p>
                              <p><strong>Subcategory:</strong> {submission.courseSubcategory}</p>
                              <p><strong>Duration:</strong> {submission.courseDuration || 'Not specified'}</p>
                              <p><strong>Format:</strong> {submission.courseFormat || 'Not specified'}</p>
                            </div>
                          </div>
                          <div className="mt-4">
                            <p><strong>Instructor Bio:</strong></p>
                            <p className="text-muted-foreground">{submission.instructorBio}</p>
                          </div>
                          <div className="mt-4">
                            <p><strong>Teaching Experience:</strong></p>
                            <p className="text-muted-foreground">{submission.teachingExperience}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleCourseSubmissionReview(submission.id, 'approved')}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCourseSubmissionReview(submission.id, 'rejected')}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
              </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center justify-between">
                Upload Content
                <Button variant="ghost" size="sm" onClick={() => setShowUploadModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pb-6">
              <Tabs defaultValue="video-upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-12">
                  <TabsTrigger value="video-upload" className="text-sm font-medium">Video Upload</TabsTrigger>
                  <TabsTrigger value="product-upload" className="text-sm font-medium">Product Upload</TabsTrigger>
                </TabsList>

                <TabsContent value="video-upload" className="mt-6">
                  {/* Video Upload Form */}
                  <div className="space-y-4">
              <div className="space-y-2">
                      <Label htmlFor="video-title">Video Title *</Label>
                <Input
                  id="video-title"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Enter video title..."
                />
              </div>

              <div className="space-y-2">
                      <Label htmlFor="video-description">Video Description *</Label>
                <Textarea
                  id="video-description"
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="Enter video description..."
                        rows={3}
                />
              </div>

              <div className="space-y-2">
                      <Label htmlFor="video-file">Video File *</Label>
                <Input
                        id="video-file"
                        type="file"
                        accept="video/*"
                        onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                        className="h-12 file:mr-4 file:py-2 file:px-6 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80 file:cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                      <Label htmlFor="thumbnail-file">Thumbnail (optional)</Label>
                      <Input
                        id="thumbnail-file"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                        className="h-12 file:mr-4 file:py-2 file:px-6 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80 file:cursor-pointer"
                      />
                </div>

                    <Button
                      onClick={handleVideoUpload}
                      disabled={isUploading || !videoFile || !videoTitle.trim() || !videoDescription.trim()}
                      className="w-full h-12 text-base font-medium"
                      size="lg"
                    >
                      {isUploading ? (
                        <>
                          <Upload className="h-5 w-5 mr-2 animate-spin" />
                          Uploading Video...
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 mr-2" />
                          Upload Video
                        </>
                      )}
                    </Button>
              </div>
                </TabsContent>

                <TabsContent value="product-upload" className="mt-6">
                  {/* Product Upload Form */}
                  <div className="space-y-4">
              <div className="space-y-2">
                      <Label htmlFor="product-title">Product Title *</Label>
                      <Input
                        id="product-title"
                        value={productTitle}
                        onChange={(e) => setProductTitle(e.target.value)}
                        placeholder="Enter product title..."
                      />
              </div>

              <div className="space-y-2">
                      <Label htmlFor="product-description">Product Description *</Label>
                      <Textarea
                        id="product-description"
                        value={productDescription}
                        onChange={(e) => setProductDescription(e.target.value)}
                        placeholder="Enter product description..."
                        rows={3}
                      />
              </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                        <Label htmlFor="product-price">Price *</Label>
                  <Input
                          id="product-price"
                          type="number"
                          step="0.01"
                          value={productPrice}
                          onChange={(e) => setProductPrice(e.target.value)}
                          placeholder="0.00"
                        />
                </div>
                      <div className="space-y-2">
                        <Label htmlFor="product-category">Category *</Label>
                        <Select value={productCategory} onValueChange={(value) => {
                          setProductCategory(value);
                          setProductSubcategory(value === 'art-prints' ? 'fine-art-prints' : 'art-history');
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="art-prints">Art Prints</SelectItem>
                            <SelectItem value="art-books">Art Books</SelectItem>
                          </SelectContent>
                        </Select>
                  </div>
              </div>

                    <div className="space-y-2">
                      <Label htmlFor="product-images">Product Images * (2-5 images on white background)</Label>
                      <Input
                        id="product-images"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setProductImages(files);
                        }}
                        className="h-12 file:mr-4 file:py-2 file:px-6 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80 file:cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground">
                        Upload 2-5 high-quality images of your product on a white background
                      </p>
                    </div>

              <Button
                      onClick={handleProductUpload}
                      disabled={isProductUploading || !productTitle.trim() || !productDescription.trim() || !productPrice.trim() || productImages.length < 2}
                      className="w-full h-12 text-base font-medium"
                      size="lg"
                    >
                      {isProductUploading ? (
                        <>
                          <Upload className="h-5 w-5 mr-2 animate-spin" />
                          Uploading Product...
                  </>
                ) : (
                  <>
                          <Package className="h-5 w-5 mr-2" />
                          Upload Product
                  </>
                )}
              </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Advertising Upload Modal */}
      {showAdUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center justify-between">
                Upload Advertisement
                <Button variant="ghost" size="sm" onClick={() => setShowAdUploadModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pb-6">
          <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ad-title">Advertisement Title *</Label>
                  <Input
                    id="ad-title"
                    value={adTitle}
                    onChange={(e) => setAdTitle(e.target.value)}
                    placeholder="Enter advertisement title..."
                  />
              </div>

                <div className="space-y-2">
                  <Label htmlFor="ad-description">Description *</Label>
                  <Textarea
                    id="ad-description"
                    value={adDescription}
                    onChange={(e) => setAdDescription(e.target.value)}
                    placeholder="Enter advertisement description..."
                    rows={3}
                  />
            </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="advertiser-name">Advertiser Name *</Label>
                    <Input
                      id="advertiser-name"
                      value={advertiserName}
                      onChange={(e) => setAdvertiserName(e.target.value)}
                      placeholder="Enter advertiser name..."
                    />
                          </div>
                  <div className="space-y-2">
                    <Label htmlFor="advertiser-website">Advertiser Website</Label>
                    <Input
                      id="advertiser-website"
                      value={advertiserWebsite}
                      onChange={(e) => setAdvertiserWebsite(e.target.value)}
                      placeholder="https://example.com"
                    />
                            </div>
                            </div>

                <div className="space-y-2">
                  <Label htmlFor="ad-media">Advertisement Media * (Video/Image)</Label>
                  <Input
                    id="ad-media"
                    type="file"
                    accept="video/*,image/*"
                    onChange={(e) => setAdMediaFile(e.target.files?.[0] || null)}
                    className="h-12 file:mr-4 file:py-2 file:px-6 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80 file:cursor-pointer"
                  />
                          </div>

                <div className="space-y-2">
                  <Label htmlFor="ad-thumbnail">Thumbnail (optional)</Label>
                  <Input
                    id="ad-thumbnail"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAdThumbnailFile(e.target.files?.[0] || null)}
                    className="h-12 file:mr-4 file:py-2 file:px-6 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80 file:cursor-pointer"
                  />
                            </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ad-duration">Duration (seconds)</Label>
                    <Input
                      id="ad-duration"
                      type="number"
                      value={adDuration}
                      onChange={(e) => setAdDuration(e.target.value)}
                      placeholder="30"
                    />
                            </div>
                  <div className="space-y-2">
                    <Label htmlFor="ad-budget">Budget ($)</Label>
                    <Input
                      id="ad-budget"
                      type="number"
                      step="0.01"
                      value={adBudget}
                      onChange={(e) => setAdBudget(e.target.value)}
                      placeholder="1000.00"
                    />
                            </div>
                  <div className="space-y-2">
                    <Label htmlFor="ad-start-date">Start Date</Label>
                    <Input
                      id="ad-start-date"
                      type="date"
                      value={adStartDate}
                      onChange={(e) => setAdStartDate(e.target.value)}
                    />
                        </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ad-end-date">End Date</Label>
                  <Input
                    id="ad-end-date"
                    type="date"
                    value={adEndDate}
                    onChange={(e) => setAdEndDate(e.target.value)}
                  />
                </div>

                          <Button
                  onClick={handleAdUpload}
                  disabled={isAdUploading || !adMediaFile || !adTitle.trim() || !adDescription.trim() || !advertiserName.trim()}
                  className="w-full h-12 text-base font-medium"
                  size="lg"
                >
                  {isAdUploading ? (
                    <>
                      <Upload className="h-5 w-5 mr-2 animate-spin" />
                      Uploading Advertisement...
                    </>
                  ) : (
                    <>
                      <Megaphone className="h-5 w-5 mr-2" />
                      Upload Advertisement
                            </>
                          )}
                </Button>
                      </div>
                    </CardContent>
                  </Card>
              </div>
            )}

      {/* Request Detail Modal */}
      {selectedRequest && (
        <AlertDialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedRequest.user.avatarUrl || undefined} alt={selectedRequest.user.displayName} />
                  <AvatarFallback>{selectedRequest.user.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div>{selectedRequest.user.displayName}</div>
                  <div className="text-sm font-normal text-muted-foreground">@{selectedRequest.user.username}</div>
                </div>
              </AlertDialogTitle>
            </AlertDialogHeader>

            <div className="space-y-6">
              {/* Portfolio Images */}
              {selectedRequest.portfolioImages.length > 0 && (
              <div>
                  <Label className="text-base font-semibold">Portfolio Images</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                  {selectedRequest.portfolioImages.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Portfolio ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                    />
                  ))}
                </div>
              </div>
              )}

              {/* Artist Statement */}
              {selectedRequest.artistStatement && (
              <div>
                  <Label className="text-base font-semibold">Artist Statement</Label>
                  <p className="mt-2 text-sm text-muted-foreground">{selectedRequest.artistStatement}</p>
              </div>
              )}

              {/* Experience */}
                <div>
                <Label className="text-base font-semibold">Experience</Label>
                <p className="mt-2 text-sm text-muted-foreground">{selectedRequest.experience}</p>
                </div>

              {/* Social Links */}
              {selectedRequest.socialLinks && (
                <div>
                  <Label className="text-base font-semibold">Social Links</Label>
                  <div className="mt-2 space-y-2">
                    {selectedRequest.socialLinks.website && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <span className="text-sm">Website: {selectedRequest.socialLinks.website}</span>
                      </div>
                    )}
                    {selectedRequest.socialLinks.instagram && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <span className="text-sm">Instagram: {selectedRequest.socialLinks.instagram}</span>
                      </div>
                    )}
                    {selectedRequest.socialLinks.x && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <span className="text-sm">X: {selectedRequest.socialLinks.x}</span>
                      </div>
                    )}
                    {selectedRequest.socialLinks.tiktok && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <span className="text-sm">TikTok: {selectedRequest.socialLinks.tiktok}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <Label htmlFor="adminNotes">Admin Notes</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes about this request..."
                  rows={3}
                />
              </div>

              {/* Rejection Reason (only for pending requests) */}
              {selectedRequest.status === 'pending' && (
                <div>
                  <Label htmlFor="rejectionReason">Rejection Reason (if rejecting)</Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide a reason for rejection..."
                    rows={3}
                  />
                </div>
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedRequest(null)}>
                Close
              </AlertDialogCancel>
              {selectedRequest.status === 'pending' && (
                <>
                  <AlertDialogAction
                    onClick={() => handleReject(selectedRequest)}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Rejecting...' : 'Reject'}
                  </AlertDialogAction>
                  <AlertDialogAction
                    onClick={() => handleApprove(selectedRequest)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Approving...' : 'Approve'}
                  </AlertDialogAction>
                </>
              )}
              {selectedRequest.status === 'approved' && selectedRequest.portfolioImages && selectedRequest.portfolioImages.length > 0 && (
                <AlertDialogAction
                  onClick={() => {
                    handleTransferPortfolio(selectedRequest);
                    setSelectedRequest(null);
                  }}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? 'Transferring...' : 'Transfer Portfolio Images'}
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
