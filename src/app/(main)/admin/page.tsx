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
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, addDoc, deleteDoc, getDocs, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '@/lib/firebase';
import { ArtistRequest, Episode, AdvertisingApplication, MarketplaceProduct, AffiliateProductRequest, Advertisement, AdvertisementAnalytics, Course, CourseSubmission } from '@/lib/types';
import { Check, X, Eye, Clock, User, Calendar, ExternalLink, Upload, Video, Plus, Megaphone, Trash2, Edit, Package, ShoppingCart, Link, Image, Play, Pause, BarChart3 } from 'lucide-react';
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
    const courseSubmissionsQuery = query(
      collection(db, 'courseSubmissions'),
      orderBy('submittedAt', 'desc')
    );

    const fetchData = async () => {
      try {
        console.log('🔄 Admin Panel: Fetching all data...');
        const [artistSnapshot, advertisingSnapshot, episodesSnapshot, marketplaceSnapshot, affiliateSnapshot, advertisementsSnapshot, analyticsSnapshot, coursesSnapshot, courseSubmissionsSnapshot] = await Promise.all([
          getDocs(artistRequestsQuery),
          getDocs(advertisingQuery),
          getDocs(episodesQuery),
          getDocs(marketplaceQuery),
          getDocs(affiliateQuery),
          getDocs(advertisementsQuery),
          getDocs(advertisementAnalyticsQuery),
          getDocs(coursesQuery),
          getDocs(courseSubmissionsQuery)
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

      // Update the user's profile to make them a verified professional artist
      await updateDoc(doc(db, 'userProfiles', request.userId), {
        isProfessional: true,
        isVerified: true,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Verification approved",
        description: `${request.user.displayName} is now a verified professional artist.`,
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
        sellerName: 'Gouache Learn',
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

  const pendingRequests = artistRequests.filter(req => req.status === 'pending');
  const approvedRequests = artistRequests.filter(req => req.status === 'approved');
  const rejectedRequests = artistRequests.filter(req => req.status === 'rejected');
  const suspendedRequests = artistRequests.filter(req => req.status === 'suspended');

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Professional Verification */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Professional Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
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
              Learn
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

        {/* Course Management */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Play className="h-4 w-4" />
              Course Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => setSelectedView('courses-published')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'courses-published' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Published Courses</span>
              <Badge variant={selectedView === 'courses-published' ? 'secondary' : 'outline'}>({courses.filter(c => c.isPublished).length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('courses-draft')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'courses-draft' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Draft Courses</span>
              <Badge variant={selectedView === 'courses-draft' ? 'secondary' : 'outline'}>({courses.filter(c => !c.isPublished).length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('course-submissions')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'course-submissions' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Course Requests</span>
              <Badge variant={selectedView === 'course-submissions' ? 'secondary' : 'outline'}>({courseSubmissions.filter(s => s.status === 'pending').length})</Badge>
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
              <h2 className="text-2xl font-bold">Learn Products</h2>
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

        {/* Learn - Affiliate Requests */}
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

        {/* Course Management Sections */}
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
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
