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
import { ArtistRequest, AdvertisingApplication, MarketplaceProduct, AffiliateProductRequest, Advertisement, AdvertisementAnalytics, Course, CourseSubmission, NewsArticle, UserReport, ArticleSection, Report } from '@/lib/types';
import { Check, X, Eye, Clock, User, Users, Calendar, ExternalLink, Upload, Video, Plus, Megaphone, Trash2, Edit, Package, ShoppingCart, Link, Image, Play, Pause, BarChart3, AlertCircle, BadgeCheck, ChevronUp, ChevronDown, Sparkles, Loader2, GripVertical, Type, ImageIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { ArtistInviteConsole } from '@/components/admin/artist-invite-console';
import { AdminMainContent } from '@/components/admin/admin-main-content';
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
  const [marketplaceProducts, setMarketplaceProducts] = useState<MarketplaceProduct[]>([]);
  const [affiliateRequests, setAffiliateRequests] = useState<AffiliateProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ArtistRequest | null>(null);
  const [selectedAdApplication, setSelectedAdApplication] = useState<AdvertisingApplication | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [selectedAffiliateRequest, setSelectedAffiliateRequest] = useState<AffiliateProductRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
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

  // Marketplace state (shop products from profiles)
  const [shopProducts, setShopProducts] = useState<any[]>([]);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [showArchivedNews, setShowArchivedNews] = useState(false);
  const [showDraftedArticles, setShowDraftedArticles] = useState(false);
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [contentReports, setContentReports] = useState<Report[]>([]);
  const [newArticle, setNewArticle] = useState({
    title: '',
    summary: '',
    category: 'Stories',
    author: '',
    authorAvatarUrl: '',
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
  const [newArticleAuthorAvatarFile, setNewArticleAuthorAvatarFile] = useState<File | null>(null);
  const [newArticleAuthorAvatarPreview, setNewArticleAuthorAvatarPreview] = useState<string | null>(null);
  const [newArticleThumbnailFile, setNewArticleThumbnailFile] = useState<File | null>(null);
  const [newArticleThumbnailPreview, setNewArticleThumbnailPreview] = useState<string | null>(null);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
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
    // Fetch shop products: artworks for sale, courses, and books
    const artworksForSaleQuery = query(
      collection(db, 'artworks'),
      where('isForSale', '==', true),
      orderBy('createdAt', 'desc')
    );
    const coursesQuery = query(
      collection(db, 'courses'),
      orderBy('createdAt', 'desc')
    );
    const booksQuery = query(
      collection(db, 'books'),
      orderBy('createdAt', 'desc')
    );
    const newsArticlesQuery = query(collection(db, 'newsArticles'), orderBy('updatedAt', 'desc'));
    const userReportsQuery = query(collection(db, 'userReports'), orderBy('submittedAt', 'desc'));
    const contentReportsQuery = query(collection(db, 'contentReports'), orderBy('timestamp', 'desc'));

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
          const artistsData = artistsSnapshot.docs.map((doc: any) => {
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
          marketplaceSnapshot,
          affiliateSnapshot,
          advertisementsSnapshot,
          analyticsSnapshot,
          artworksForSaleSnapshot,
          coursesSnapshot,
          booksSnapshot,
          newsArticlesSnapshot,
          userReportsSnapshot,
          contentReportsSnapshot
        ] = await Promise.all([
          getDocs(artistRequestsQuery),
          getDocs(advertisingQuery),
          getDocs(marketplaceQuery),
          getDocs(affiliateQuery),
          getDocs(advertisementsQuery),
          getDocs(advertisementAnalyticsQuery),
          getDocs(artworksForSaleQuery),
          getDocs(coursesQuery),
          getDocs(booksQuery),
          getDocs(newsArticlesQuery),
          getDocs(userReportsQuery),
          getDocs(contentReportsQuery)
        ]);

        const requests = artistSnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as ArtistRequest[];
      setArtistRequests(requests);
        console.log(`✅ Loaded ${requests.length} artist requests:`, requests);

        const applications = advertisingSnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as AdvertisingApplication[];
      setAdvertisingApplications(applications);
        console.log(`✅ Loaded ${applications.length} advertising applications:`, applications);

        const products = marketplaceSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        })) as MarketplaceProduct[];
        setMarketplaceProducts(products);
        console.log(`✅ Loaded ${products.length} marketplace products:`, products);

        const affiliateRequests = affiliateSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        })) as AffiliateProductRequest[];
        setAffiliateRequests(affiliateRequests);
        console.log(`✅ Loaded ${affiliateRequests.length} affiliate requests:`, affiliateRequests);


        const advertisements = advertisementsSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        })) as Advertisement[];
        setAdvertisements(advertisements);
        console.log(`✅ Loaded ${advertisements.length} advertisements:`, advertisements);

        const analytics = analyticsSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        })) as AdvertisementAnalytics[];
        setAdvertisementAnalytics(analytics);
        console.log(`✅ Loaded ${analytics.length} advertisement analytics:`, analytics);

        // Combine all shop products from different collections
        const shopProductsList: any[] = [];

        // Add artworks for sale
        artworksForSaleSnapshot.docs.forEach((doc: any) => {
          const data = doc.data();
          shopProductsList.push({
            id: doc.id,
            type: 'artwork',
            title: data.title || 'Untitled',
            description: data.description,
            price: data.price || 0,
            currency: data.currency || 'USD',
            imageUrl: data.imageUrl,
            sellerId: data.artist?.userId || data.userId,
            sellerName: data.artist?.name || data.artistName || 'Unknown',
            isAvailable: !data.sold && (data.stock === undefined || data.stock > 0),
            stock: data.stock,
            category: data.category,
            createdAt: data.createdAt?.toDate() || new Date(),
            isForSale: true
          });
        });

        // Add courses
        coursesSnapshot.docs.forEach((doc: any) => {
          const data = doc.data();
          shopProductsList.push({
            id: doc.id,
            type: 'course',
            title: data.title || 'Untitled Course',
            description: data.description,
            price: data.price || 0,
            currency: data.currency || 'USD',
            imageUrl: data.thumbnail || data.thumbnailUrl,
            sellerId: data.instructor?.userId || data.userId,
            sellerName: data.instructor?.name || 'Unknown',
            isAvailable: data.isActive !== false,
            category: data.category,
            createdAt: data.createdAt?.toDate() || new Date(),
            isPublished: data.isPublished || false
          });
        });

        // Add books
        booksSnapshot.docs.forEach((doc: any) => {
          const data = doc.data();
          shopProductsList.push({
            id: doc.id,
            type: 'book',
            title: data.title || 'Untitled Book',
            description: data.description,
            price: data.price || 0,
            currency: data.currency || 'USD',
            imageUrl: data.imageUrl || data.coverImageUrl,
            sellerId: data.artistId || data.userId,
            sellerName: data.artistName || 'Unknown',
            isAvailable: data.isAvailable !== false,
            stock: data.stock,
            category: data.category,
            createdAt: data.createdAt?.toDate() || new Date()
          });
        });

        // Sort by creation date (newest first)
        shopProductsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setShopProducts(shopProductsList);
        console.log(`✅ Loaded ${shopProductsList.length} shop products (${artworksForSaleSnapshot.docs.length} artworks, ${coursesSnapshot.docs.length} courses, ${booksSnapshot.docs.length} books):`, shopProductsList);

        const newsroomArticles = newsArticlesSnapshot.docs.map((doc: any) => {
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

        const reports = userReportsSnapshot.docs.map((doc: any) => {
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

        // Process content reports
        const contentReports = contentReportsSnapshot.docs.map((doc: any) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp || (data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()),
            reviewedAt: data.reviewedAt?.toDate ? data.reviewedAt.toDate() : undefined,
          } as Report;
        });
        setContentReports(contentReports);
        const aiReports = contentReports.filter(r => r.isAIContentReport);
        console.log(`✅ Loaded ${contentReports.length} content reports (${aiReports.length} AI-related)`);

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
      const newItems = portfolioItems.filter((item: any) => !existingUrls.has(item.imageUrl));
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

  // Reusable function to insert an image into the editor
  const insertImageIntoEditor = async (file: File) => {
          try {
            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '-')}`;
            const storagePath = `news/articles/${fileName}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);
            const imageUrl = await getDownloadURL(storageRef);
            
            // Insert image into contentEditable div
      const editor = document.getElementById('article-body-editor') as HTMLDivElement;
      if (!editor) return;
      
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
        
        // Create wrapper div for image with resize handles
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.style.margin = '1rem';
        wrapper.style.maxWidth = '100%';
        wrapper.style.textAlign = 'left';
        wrapper.style.verticalAlign = 'top';
        wrapper.style.width = 'fit-content';
        wrapper.className = 'image-wrapper';
              
              const img = document.createElement('img');
              img.src = imageUrl;
              img.style.maxWidth = '100%';
              img.style.height = 'auto';
              img.style.display = 'block';
        img.style.width = 'auto';
              img.contentEditable = 'false';
        img.draggable = false;
        img.className = 'article-image';
        
        // Add resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.style.position = 'absolute';
        resizeHandle.style.bottom = '0';
        resizeHandle.style.right = '0';
        resizeHandle.style.width = '24px';
        resizeHandle.style.height = '24px';
        resizeHandle.style.backgroundColor = '#3b82f6';
        resizeHandle.style.border = '2px solid white';
        resizeHandle.style.cursor = 'nwse-resize';
        resizeHandle.style.borderRadius = '4px 0 4px 0';
        resizeHandle.style.display = 'none';
        resizeHandle.style.zIndex = '10';
        resizeHandle.className = 'resize-handle';
        resizeHandle.title = 'Drag to resize image';
              
        // Show resize handle on image hover or when selected
        const showResizeHandle = () => {
          resizeHandle.style.display = 'block';
        };
        const hideResizeHandle = () => {
          // Only hide if image is not selected
          if (!img.style.outline || img.style.outline === 'none') {
            resizeHandle.style.display = 'none';
          }
        };
        
        wrapper.addEventListener('mouseenter', showResizeHandle);
        wrapper.addEventListener('mouseleave', hideResizeHandle);
        
        // Make image resizable with handle
        // Use a closure to ensure each resize handle only affects its own image
        (() => {
          let isResizing = false;
          let activeMoveHandler: ((e: MouseEvent) => void) | null = null;
          let activeUpHandler: ((e: MouseEvent) => void) | null = null;
          const thisImg = img; // Capture the specific image in closure
          const thisWrapper = wrapper; // Capture the specific wrapper in closure
          const thisResizeHandle = resizeHandle; // Capture the specific resize handle
          
          // Helper function to check if this image is selected
          const isImageSelected = () => {
            const outline = thisImg.style.outline || window.getComputedStyle(thisImg).outline;
            return outline && outline !== 'none' && outline.includes('solid');
          };
          
          // Function to cancel any active resize
          const cancelResize = () => {
            if (isResizing && activeMoveHandler && activeUpHandler) {
              isResizing = false;
              document.removeEventListener('mousemove', activeMoveHandler);
              document.removeEventListener('mouseup', activeUpHandler);
              activeMoveHandler = null;
              activeUpHandler = null;
            }
          };
          
          // Store cancel function on the image element so it can be called when another image is selected
          (thisImg as any).__cancelResize = cancelResize;
          
          resizeHandle.addEventListener('mousedown', (e) => {
                  e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // Cancel any other active resizes first
            const allImages = editor.querySelectorAll('.article-image');
            allImages.forEach((otherImg) => {
              if (otherImg !== thisImg && (otherImg as any).__cancelResize) {
                (otherImg as any).__cancelResize();
              }
            });
            
            // Only allow resizing if this image is currently selected
            if (!isImageSelected()) {
              return;
            }
            
            isResizing = true;
                  const startX = e.pageX;
            const startY = e.pageY;
            const startWidth = thisImg.offsetWidth;
            const startHeight = thisImg.offsetHeight;
                  
                  const onMouseMove = (e: MouseEvent) => {
              if (!isResizing) return;
              
              // Continuously check that this image is still selected
              if (!isImageSelected()) {
                cancelResize();
                return;
              }
              
              e.preventDefault();
              e.stopPropagation();
              
              const diffX = e.pageX - startX;
              const diffY = e.pageY - startY;
              const aspectRatio = startWidth / startHeight;
              
              // Calculate new dimensions maintaining aspect ratio
              let newWidth = startWidth + diffX;
              let newHeight = startHeight + diffY;
              
              // Maintain aspect ratio based on which dimension changed more
              if (Math.abs(diffX) > Math.abs(diffY)) {
                newHeight = newWidth / aspectRatio;
              } else {
                newWidth = newHeight * aspectRatio;
              }
              
              // Constrain to reasonable limits
              newWidth = Math.max(200, Math.min(1200, newWidth));
              newHeight = Math.max(150, Math.min(900, newHeight));
              
              // Only update THIS specific image
              thisImg.style.width = `${newWidth}px`;
              thisImg.style.height = `${newHeight}px`;
            };
                  
            const onMouseUp = (e: MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              cancelResize();
            };
            
            activeMoveHandler = onMouseMove;
            activeUpHandler = onMouseUp;
            
            document.addEventListener('mousemove', onMouseMove, { capture: true });
            document.addEventListener('mouseup', onMouseUp, { capture: true });
          });
        })();
        
        // Make image selectable for alignment
        img.addEventListener('click', (e) => {
          e.stopPropagation();
          
          // Cancel any active resize operations on all images
          const allImages = editor.querySelectorAll('.article-image');
          allImages.forEach((otherImg) => {
            if (otherImg !== img && (otherImg as any).__cancelResize) {
              (otherImg as any).__cancelResize();
            }
          });
          
          // Clear other selections
          document.querySelectorAll('.article-image').forEach(el => {
            (el as HTMLElement).style.outline = 'none';
            const wrapper = (el as HTMLElement).closest('.image-wrapper');
            if (wrapper) {
              const handle = wrapper.querySelector('.resize-handle') as HTMLElement;
              if (handle) handle.style.display = 'none';
            }
          });
          
          img.style.outline = '2px solid #3b82f6';
          img.style.outlineOffset = '2px';
          // Show resize handle for selected image
          resizeHandle.style.display = 'block';
        });
        
        wrapper.appendChild(img);
        wrapper.appendChild(resizeHandle);
        range.insertNode(wrapper);
        
        // Select the image
              selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNode(wrapper);
        selection.addRange(newRange);
            }
      
      editor.focus();
            
            toast({
        title: 'Image inserted',
        description: 'Image inserted. Click to select, then use alignment buttons. Drag corner to resize.',
            });
          } catch (error) {
      console.error('Failed to upload image:', error);
            toast({
              title: 'Upload failed',
        description: 'Could not upload image. Please try again.',
              variant: 'destructive'
            });
          }
  };

  // Rich text editor handlers for image paste and resize
  const handleBodyPaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          await insertImageIntoEditor(file);
        }
      }
    }
  };

  // Handle image file selection from browse button
  const handleInsertImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file.',
        variant: 'destructive'
      });
      return;
    }
    
    await insertImageIntoEditor(file);
    
    // Reset the input so the same file can be selected again
    event.target.value = '';
  };

  // Handle editor clicks to select images
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG' || target.closest('.image-wrapper')) {
      const img = target.tagName === 'IMG' ? target : target.querySelector('img');
      if (img) {
        // Clear other selections
        document.querySelectorAll('.article-image').forEach(el => {
          (el as HTMLElement).style.outline = 'none';
          const wrapper = (el as HTMLElement).closest('.image-wrapper');
          if (wrapper) {
            const handle = wrapper.querySelector('.resize-handle') as HTMLElement;
            if (handle) handle.style.display = 'none';
          }
        });
        (img as HTMLElement).style.outline = '2px solid #3b82f6';
        (img as HTMLElement).style.outlineOffset = '2px';
        // Show resize handle for selected image
        const wrapper = (img as HTMLElement).closest('.image-wrapper');
        if (wrapper) {
          const handle = wrapper.querySelector('.resize-handle') as HTMLElement;
          if (handle) handle.style.display = 'block';
        }
      }
    } else {
      // Clear all selections when clicking elsewhere
      document.querySelectorAll('.article-image').forEach(el => {
        (el as HTMLElement).style.outline = 'none';
        const wrapper = (el as HTMLElement).closest('.image-wrapper');
        if (wrapper) {
          const handle = wrapper.querySelector('.resize-handle') as HTMLElement;
          if (handle) handle.style.display = 'none';
        }
      });
    }
  };

  // Removed episode-related functions - Episodes feature removed

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
  // Removed course handlers - replaced with marketplace
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
    setProductTags(productTags.filter((tag: any) => tag !== tagToRemove));
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

      setArtistRequests((prev) => prev.map((item: any) => item.id === request.id ? { ...item, status: 'suspended' } : item));

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

      setArtistRequests((prev) => prev.map((item: any) => item.id === request.id ? { ...item, status: 'approved' } : item));

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

      setArtistRequests((prev) => prev.filter((item: any) => item.id !== request.id));

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

  const handleSaveDraftArticle = async () => {
    if (!newArticle.title.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide a headline for the article.',
        variant: 'destructive'
      });
      return;
    }

    setIsPublishingArticle(true);
    try {
      // Get body content from contentEditable div
      const bodyElement = document.getElementById('article-body-editor') as HTMLDivElement;
      const bodyContent = bodyElement?.innerHTML || '';
      
      // Upload hero image if provided
      let heroImageUrl = DEFAULT_ARTICLE_IMAGE;
      if (newArticleImageFile) {
        try {
          const fileName = `${Date.now()}_${newArticleImageFile.name.replace(/\s+/g, '-')}`;
          const storagePath = `news/articles/hero/${fileName}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, newArticleImageFile);
          heroImageUrl = await getDownloadURL(storageRef);
        } catch (error) {
          console.error('Failed to upload hero image:', error);
          toast({
            title: 'Image upload failed',
            description: 'Could not upload hero image. Using default image.',
            variant: 'destructive'
          });
        }
      }
      
      // Upload author avatar if provided
      let authorAvatarUrl: string | undefined = undefined;
      if (newArticleAuthorAvatarFile) {
        try {
          const fileName = `${Date.now()}_author_${newArticleAuthorAvatarFile.name.replace(/\s+/g, '-')}`;
          const storagePath = `news/articles/authors/${fileName}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, newArticleAuthorAvatarFile);
          authorAvatarUrl = await getDownloadURL(storageRef);
        } catch (error) {
          console.error('Failed to upload author avatar:', error);
          toast({
            title: 'Avatar upload failed',
            description: 'Could not upload author avatar image.',
            variant: 'destructive'
          });
        }
      }
      
      // Upload thumbnail if provided
      let thumbnailUrl: string | undefined = undefined;
      if (newArticleThumbnailFile) {
        try {
          const fileName = `${Date.now()}_thumbnail_${newArticleThumbnailFile.name.replace(/\s+/g, '-')}`;
          const storagePath = `news/articles/thumbnails/${fileName}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, newArticleThumbnailFile);
          thumbnailUrl = await getDownloadURL(storageRef);
        } catch (error) {
          console.error('Failed to upload thumbnail:', error);
          toast({
            title: 'Thumbnail upload failed',
            description: 'Could not upload thumbnail image.',
            variant: 'destructive'
          });
        }
      }
      
      // Build article data object, omitting undefined values
      const articleData: any = {
        title: newArticle.title.trim(),
        summary: '', // Empty summary for simplified editor
        category: 'Stories', // Default category
        imageUrl: heroImageUrl,
        externalUrl: '',
        featured: false,
        tags: [],
        content: bodyContent, // Rich HTML content with images
        location: 'evergreen',
        status: 'draft', // Save as draft
        publishedAt: null, // No published date for drafts
        archived: false,
        archivedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Only add optional fields if they have values
      if (newArticleSubheadline.trim()) {
        articleData.subheadline = newArticleSubheadline.trim();
      }
      if (newArticle.author.trim()) {
        articleData.author = newArticle.author.trim();
      } else {
        articleData.author = '';
      }
      if (authorAvatarUrl) {
        articleData.authorAvatarUrl = authorAvatarUrl;
      }
      if (thumbnailUrl) {
        articleData.thumbnailUrl = thumbnailUrl;
      }
      
      const docRef = await addDoc(collection(db, 'newsArticles'), articleData);

      const newArticleState: any = {
        id: docRef.id,
        title: newArticle.title.trim(),
        summary: '',
        category: 'Stories',
        author: newArticle.author.trim() || '',
        imageUrl: heroImageUrl,
        externalUrl: '',
        featured: false,
        tags: [],
        content: bodyContent,
        location: 'evergreen',
        status: 'draft',
        publishedAt: undefined,
        updatedAt: new Date(),
        archived: false
      };
      if (authorAvatarUrl) {
        newArticleState.authorAvatarUrl = authorAvatarUrl;
      }
      if (thumbnailUrl) {
        newArticleState.thumbnailUrl = thumbnailUrl;
      }
      setNewsArticles((prev) => [newArticleState, ...prev]);

      toast({
        title: 'Draft saved',
        description: `"${newArticle.title}" has been saved as a draft. You can publish it later.`
      });

      setNewArticle({
        title: '',
        summary: '',
        category: 'Stories',
        author: '',
        authorAvatarUrl: '',
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
      setNewArticleAuthorAvatarFile(null);
      setNewArticleAuthorAvatarPreview(null);
      setNewArticleThumbnailFile(null);
      setNewArticleThumbnailPreview(null);
      setIsPublishingArticle(false);
    } catch (error) {
      console.error('Failed to save draft:', error);
      setIsPublishingArticle(false);
      toast({
        title: 'Draft save failed',
        description: 'We could not save that draft. Please try again.',
        variant: 'destructive'
      });
      toast({
        title: 'Save failed',
        description: 'We could not save the draft. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsPublishingArticle(false);
    }
  };

  const handleCreateNewsArticle = async () => {
    if (!newArticle.title.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide a headline for the article.',
        variant: 'destructive'
      });
      return;
    }

    setIsPublishingArticle(true);
    try {
      const publishedAtDate = new Date();
      
      // Get body content from contentEditable div
      const bodyElement = document.getElementById('article-body-editor') as HTMLDivElement;
      const bodyContent = bodyElement?.innerHTML || '';
      
      if (!bodyContent.trim()) {
        toast({
          title: 'Missing content',
          description: 'Please add content to the article body.',
          variant: 'destructive'
        });
        setIsPublishingArticle(false);
        return;
      }
      
      // Upload hero image if provided
      let heroImageUrl = DEFAULT_ARTICLE_IMAGE;
      if (newArticleImageFile) {
        try {
          const fileName = `${Date.now()}_${newArticleImageFile.name.replace(/\s+/g, '-')}`;
          const storagePath = `news/articles/hero/${fileName}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, newArticleImageFile);
          heroImageUrl = await getDownloadURL(storageRef);
        } catch (error) {
          console.error('Failed to upload hero image:', error);
          toast({
            title: 'Image upload failed',
            description: 'Could not upload hero image. Using default image.',
            variant: 'destructive'
          });
        }
      }
      
      // Upload author avatar if provided
      let authorAvatarUrl: string | undefined = undefined;
      if (newArticleAuthorAvatarFile) {
        try {
          const fileName = `${Date.now()}_author_${newArticleAuthorAvatarFile.name.replace(/\s+/g, '-')}`;
          const storagePath = `news/articles/authors/${fileName}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, newArticleAuthorAvatarFile);
          authorAvatarUrl = await getDownloadURL(storageRef);
        } catch (error) {
          console.error('Failed to upload author avatar:', error);
          toast({
            title: 'Avatar upload failed',
            description: 'Could not upload author avatar image.',
            variant: 'destructive'
          });
        }
      }
      
      // Upload thumbnail if provided
      let thumbnailUrl: string | undefined = undefined;
      if (newArticleThumbnailFile) {
        try {
          const fileName = `${Date.now()}_thumbnail_${newArticleThumbnailFile.name.replace(/\s+/g, '-')}`;
          const storagePath = `news/articles/thumbnails/${fileName}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, newArticleThumbnailFile);
          thumbnailUrl = await getDownloadURL(storageRef);
        } catch (error) {
          console.error('Failed to upload thumbnail:', error);
          toast({
            title: 'Thumbnail upload failed',
            description: 'Could not upload thumbnail image.',
            variant: 'destructive'
          });
        }
      }
      
      // Build article data object, omitting undefined values
      const articleData: any = {
        title: newArticle.title.trim(),
        summary: '', // Empty summary for simplified editor
        category: 'Stories', // Default category
        imageUrl: heroImageUrl,
        externalUrl: '',
        featured: false,
        tags: [],
        content: bodyContent, // Rich HTML content with images
        location: 'evergreen',
        status: 'published', // Explicitly set as published
        publishedAt: publishedAtDate,
        archived: false,
        archivedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Only add optional fields if they have values
      if (newArticleSubheadline.trim()) {
        articleData.subheadline = newArticleSubheadline.trim();
      }
      if (newArticle.author.trim()) {
        articleData.author = newArticle.author.trim();
      } else {
        articleData.author = '';
      }
      if (authorAvatarUrl) {
        articleData.authorAvatarUrl = authorAvatarUrl;
      }
      if (thumbnailUrl) {
        articleData.thumbnailUrl = thumbnailUrl;
      }
      
      const docRef = await addDoc(collection(db, 'newsArticles'), articleData);

      setNewsArticles((prev) => [
        {
          id: docRef.id,
          title: newArticle.title.trim(),
          summary: '',
          category: 'Stories',
          author: newArticle.author.trim() || undefined,
          authorAvatarUrl: authorAvatarUrl,
          imageUrl: heroImageUrl,
          externalUrl: '',
          featured: false,
          tags: [],
          content: bodyContent,
          location: 'evergreen',
          status: 'published',
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
        authorAvatarUrl: '',
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
      setNewArticleAuthorAvatarFile(null);
      setNewArticleAuthorAvatarPreview(null);
      setNewArticleThumbnailFile(null);
      setNewArticleThumbnailPreview(null);
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

  const handleThumbnailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setNewArticleThumbnailFile(file);
    const previewUrl = URL.createObjectURL(file);
    setNewArticleThumbnailPreview(previewUrl);
  };

  const clearThumbnail = () => {
    setNewArticleThumbnailFile(null);
    setNewArticleThumbnailPreview(null);
  };

  const handleEditArticle = (article: NewsArticle) => {
    setEditingArticleId(article.id);
    setNewArticle({
      title: article.title,
      summary: article.summary || '',
      category: article.category,
      author: article.author || '',
      authorAvatarUrl: article.authorAvatarUrl || '',
      imageUrl: article.imageUrl,
      externalUrl: article.externalUrl || '',
      publishedAt: '',
      tags: '',
      location: article.location || 'evergreen'
    });
    setNewArticleSubheadline(article.subheadline || '');
    setNewArticleBody(article.content || '');
    
    // Set previews if URLs exist
    if (article.imageUrl) {
      setNewArticleImagePreview(article.imageUrl);
    }
    if (article.authorAvatarUrl) {
      setNewArticleAuthorAvatarPreview(article.authorAvatarUrl);
    }
    if ((article as any).thumbnailUrl) {
      setNewArticleThumbnailPreview((article as any).thumbnailUrl);
    }
    
    // Set editor content
    setTimeout(() => {
      const bodyEditor = document.getElementById('article-body-editor') as HTMLDivElement;
      if (bodyEditor) {
        bodyEditor.innerHTML = article.content || '';
      }
    }, 100);
  };

  const handleUpdateArticle = async () => {
    if (!editingArticleId || !newArticle.title.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide a headline for the article.',
        variant: 'destructive'
      });
      return;
    }

    setIsPublishingArticle(true);
    try {
      const bodyElement = document.getElementById('article-body-editor') as HTMLDivElement;
      const bodyContent = bodyElement?.innerHTML || '';
      
      if (!bodyContent.trim()) {
        toast({
          title: 'Missing content',
          description: 'Please add content to the article body.',
          variant: 'destructive'
        });
        setIsPublishingArticle(false);
        return;
      }
      
      // Upload hero image if new file provided
      let heroImageUrl = newArticle.imageUrl;
      if (newArticleImageFile) {
        try {
          const fileName = `${Date.now()}_${newArticleImageFile.name.replace(/\s+/g, '-')}`;
          const storagePath = `news/articles/hero/${fileName}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, newArticleImageFile);
          heroImageUrl = await getDownloadURL(storageRef);
        } catch (error) {
          console.error('Failed to upload hero image:', error);
          toast({
            title: 'Image upload failed',
            description: 'Could not upload hero image. Keeping existing image.',
            variant: 'destructive'
          });
        }
      }
      
      // Upload author avatar if new file provided
      let authorAvatarUrl: string | undefined = undefined;
      const existingArticle = newsArticles.find(a => a.id === editingArticleId);
      if (existingArticle?.authorAvatarUrl) {
        authorAvatarUrl = existingArticle.authorAvatarUrl;
      }
      if (newArticleAuthorAvatarFile) {
        try {
          const fileName = `${Date.now()}_author_${newArticleAuthorAvatarFile.name.replace(/\s+/g, '-')}`;
          const storagePath = `news/articles/authors/${fileName}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, newArticleAuthorAvatarFile);
          authorAvatarUrl = await getDownloadURL(storageRef);
        } catch (error) {
          console.error('Failed to upload author avatar:', error);
        }
      }
      
      // Upload thumbnail if new file provided
      let thumbnailUrl: string | undefined = undefined;
      if (existingArticle && (existingArticle as any).thumbnailUrl) {
        thumbnailUrl = (existingArticle as any).thumbnailUrl;
      }
      if (newArticleThumbnailFile) {
        try {
          const fileName = `${Date.now()}_thumbnail_${newArticleThumbnailFile.name.replace(/\s+/g, '-')}`;
          const storagePath = `news/articles/thumbnails/${fileName}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, newArticleThumbnailFile);
          thumbnailUrl = await getDownloadURL(storageRef);
        } catch (error) {
          console.error('Failed to upload thumbnail:', error);
        }
      }
      
      // Build update data object
      const updateData: any = {
        title: newArticle.title.trim(),
        summary: '',
        category: 'Stories',
        imageUrl: heroImageUrl,
        content: bodyContent,
        location: 'evergreen',
        updatedAt: serverTimestamp()
      };
      
      if (newArticleSubheadline.trim()) {
        updateData.subheadline = newArticleSubheadline.trim();
      }
      if (newArticle.author.trim()) {
        updateData.author = newArticle.author.trim();
      } else {
        updateData.author = '';
      }
      if (authorAvatarUrl) {
        updateData.authorAvatarUrl = authorAvatarUrl;
      }
      if (thumbnailUrl) {
        updateData.thumbnailUrl = thumbnailUrl;
      }
      
      await updateDoc(doc(db, 'newsArticles', editingArticleId), updateData);
      
      // Update local state
      setNewsArticles((prev) => prev.map((article) => 
        article.id === editingArticleId 
          ? { ...article, ...updateData, id: editingArticleId }
          : article
      ));
      
      toast({
        title: 'Article updated',
        description: `"${newArticle.title}" has been updated.`
      });
      
      // Reset form
      setEditingArticleId(null);
      setNewArticle({
        title: '',
        summary: '',
        category: 'Stories',
        author: '',
        authorAvatarUrl: '',
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
      setNewArticleAuthorAvatarFile(null);
      setNewArticleAuthorAvatarPreview(null);
      setNewArticleThumbnailFile(null);
      setNewArticleThumbnailPreview(null);
    } catch (error) {
      console.error('Failed to update article:', error);
      toast({
        title: 'Update failed',
        description: 'We could not update that article. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsPublishingArticle(false);
    }
  };

  const handleAuthorAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setNewArticleAuthorAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    setNewArticleAuthorAvatarPreview(previewUrl);
  };

  const clearAuthorAvatar = () => {
    setNewArticleAuthorAvatarFile(null);
    setNewArticleAuthorAvatarPreview(null);
    setNewArticle((prev) => ({ ...prev, authorAvatarUrl: '' }));
  };

  const handleArchiveNewsArticle = async (article: NewsArticle, archive: boolean) => {
    try {
      await updateDoc(doc(db, 'newsArticles', article.id), {
        archived: archive,
        archivedAt: archive ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      });

      setNewsArticles((prev) =>
        prev.map((item: any) =>
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
      setNewsArticles((prev) => prev.filter((item: any) => item.id !== article.id));
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
        prev.map((item: any) =>
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

  const pendingRequests = artistRequests.filter((req: any) => req.status === 'pending');
  const approvedRequests = artistRequests.filter((req: any) => req.status === 'approved');
  const rejectedRequests = artistRequests.filter((req: any) => req.status === 'rejected');
  const suspendedRequests = artistRequests.filter((req: any) => req.status === 'suspended');
  const activeNewsArticles = newsArticles.filter((article: any) => !article.archived);
  const archivedNewsArticles = newsArticles.filter((article: any) => article.archived);
  const publishedArticles = newsArticles.filter((article: any) => !article.archived && (article.status === 'published' || (!article.status && article.publishedAt)));
  const draftedArticles = newsArticles.filter((article: any) => !article.archived && article.status === 'draft');
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

  // Main admin panel content
  return (
    <AdminMainContent
      handleSignOut={handleSignOut}
      selectedView={selectedView}
      setSelectedView={setSelectedView}
      pendingRequests={pendingRequests}
      approvedRequests={approvedRequests}
      rejectedRequests={rejectedRequests}
      suspendedRequests={suspendedRequests}
      activeNewsArticles={activeNewsArticles}
      archivedNewsArticles={archivedNewsArticles}
      publishedArticles={publishedArticles}
      draftedArticles={draftedArticles}
      visibleNewsArticles={visibleNewsArticles}
      showArchivedNews={showArchivedNews}
      setShowArchivedNews={setShowArchivedNews}
      showDraftedArticles={showDraftedArticles}
      setShowDraftedArticles={setShowDraftedArticles}
      marketplaceProducts={marketplaceProducts}
      setMarketplaceProducts={setMarketplaceProducts}
      affiliateRequests={affiliateRequests}
      setAffiliateRequests={setAffiliateRequests}
      userReports={userReports}
      setUserReports={setUserReports}
      contentReports={contentReports}
      setContentReports={setContentReports}
      advertisingApplications={advertisingApplications}
      setAdvertisingApplications={setAdvertisingApplications}
      advertisements={advertisements}
      setAdvertisements={setAdvertisements}
      advertisementAnalytics={advertisementAnalytics}
      setAdvertisementAnalytics={setAdvertisementAnalytics}
      shopProducts={shopProducts}
      newsArticles={newsArticles}
      setNewsArticles={setNewsArticles}
      professionalArtists={professionalArtists}
      setProfessionalArtists={setProfessionalArtists}
      loadingArtists={loadingArtists}
      isProcessing={isProcessing}
      setIsProcessing={setIsProcessing}
      selectedRequest={selectedRequest}
      setSelectedRequest={setSelectedRequest}
      selectedAdApplication={selectedAdApplication}
      setSelectedAdApplication={setSelectedAdApplication}
      selectedProduct={selectedProduct}
      setSelectedProduct={setSelectedProduct}
      selectedAffiliateRequest={selectedAffiliateRequest}
      setSelectedAffiliateRequest={setSelectedAffiliateRequest}
      selectedAdvertisement={selectedAdvertisement}
      setSelectedAdvertisement={setSelectedAdvertisement}
      handleApprove={handleApprove}
      handleReject={handleReject}
      handleRemoveArtist={handleRemoveArtist}
      handleTransferPortfolio={handleTransferPortfolio}
      handleSuspendArtist={handleSuspendArtist}
      handleReinstateArtist={handleReinstateArtist}
      handleApproveAdApplication={handleApproveAdApplication}
      handleRejectAdApplication={handleRejectAdApplication}
      handleProductUpload={handleProductUpload}
      handleAdUpload={handleAdUpload}
      handleDeleteProduct={handleDeleteProduct}
      handleApproveAffiliateRequest={handleApproveAffiliateRequest}
      handleRejectAffiliateRequest={handleRejectAffiliateRequest}
      handleCreateNewsArticle={handleCreateNewsArticle}
      handleSaveDraftArticle={handleSaveDraftArticle}
      handleUpdateArticle={handleUpdateArticle}
      handleEditArticle={handleEditArticle}
      editingArticleId={editingArticleId}
      handleArchiveNewsArticle={handleArchiveNewsArticle}
      handleDeleteNewsArticle={handleDeleteNewsArticle}
      newArticleThumbnailFile={newArticleThumbnailFile}
      setNewArticleThumbnailFile={setNewArticleThumbnailFile}
      newArticleThumbnailPreview={newArticleThumbnailPreview}
      setNewArticleThumbnailPreview={setNewArticleThumbnailPreview}
      handleThumbnailChange={handleThumbnailChange}
      clearThumbnail={clearThumbnail}
      handleUpdateReportStatus={handleUpdateReportStatus}
      productTitle={productTitle}
      setProductTitle={setProductTitle}
      productDescription={productDescription}
      setProductDescription={setProductDescription}
      productPrice={productPrice}
      setProductPrice={setProductPrice}
      productOriginalPrice={productOriginalPrice}
      setProductOriginalPrice={setProductOriginalPrice}
      productCategory={productCategory}
      setProductCategory={setProductCategory}
      productSubcategory={productSubcategory}
      setProductSubcategory={setProductSubcategory}
      productImages={productImages}
      setProductImages={setProductImages}
      productTags={productTags}
      setProductTags={setProductTags}
      newProductTag={newProductTag}
      setNewProductTag={setNewProductTag}
      isProductUploading={isProductUploading}
      setIsProductUploading={setIsProductUploading}
      productStock={productStock}
      setProductStock={setProductStock}
      isProductOnSale={isProductOnSale}
      setIsProductOnSale={setIsProductOnSale}
      showUploadModal={showUploadModal}
      setShowUploadModal={setShowUploadModal}
      adTitle={adTitle}
      setAdTitle={setAdTitle}
      adDescription={adDescription}
      setAdDescription={setAdDescription}
      advertiserName={advertiserName}
      setAdvertiserName={setAdvertiserName}
      advertiserWebsite={advertiserWebsite}
      setAdvertiserWebsite={setAdvertiserWebsite}
      adMediaFile={adMediaFile}
      setAdMediaFile={setAdMediaFile}
      adThumbnailFile={adThumbnailFile}
      setAdThumbnailFile={setAdThumbnailFile}
      adDuration={adDuration}
      setAdDuration={setAdDuration}
      adBudget={adBudget}
      setAdBudget={setAdBudget}
      adStartDate={adStartDate}
      setAdStartDate={setAdStartDate}
      adEndDate={adEndDate}
      setAdEndDate={setAdEndDate}
      isAdUploading={isAdUploading}
      setIsAdUploading={setIsAdUploading}
      showAdUploadModal={showAdUploadModal}
      setShowAdUploadModal={setShowAdUploadModal}
      newArticle={newArticle}
      setNewArticle={setNewArticle}
      newArticleSubheadline={newArticleSubheadline}
      setNewArticleSubheadline={setNewArticleSubheadline}
      newArticleBody={newArticleBody}
      setNewArticleBody={setNewArticleBody}
      newArticleImageFile={newArticleImageFile}
      setNewArticleImageFile={setNewArticleImageFile}
      newArticleImagePreview={newArticleImagePreview}
      setNewArticleImagePreview={setNewArticleImagePreview}
      newArticleAuthorAvatarFile={newArticleAuthorAvatarFile}
      setNewArticleAuthorAvatarFile={setNewArticleAuthorAvatarFile}
      newArticleAuthorAvatarPreview={newArticleAuthorAvatarPreview}
      setNewArticleAuthorAvatarPreview={setNewArticleAuthorAvatarPreview}
      handleAuthorAvatarChange={handleAuthorAvatarChange}
      clearAuthorAvatar={clearAuthorAvatar}
      isPublishingArticle={isPublishingArticle}
      setIsPublishingArticle={setIsPublishingArticle}
      rejectionReason={rejectionReason}
      setRejectionReason={setRejectionReason}
      adminNotes={adminNotes}
      setAdminNotes={setAdminNotes}
      addProductTag={addProductTag}
      removeProductTag={removeProductTag}
      handleBodyPaste={handleBodyPaste}
      handleInsertImage={handleInsertImage}
      handleEditorClick={handleEditorClick}
      handleNewsArticleImageChange={handleNewsArticleImageChange}
      clearNewsArticleImage={clearNewsArticleImage}
      formatDate={formatDate}
      getStatusBadge={getStatusBadge}
      user={user}
      router={router}
    />
  );
}
