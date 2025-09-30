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
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, addDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { ArtistRequest, Episode, AdvertisingApplication } from '@/lib/types';
import { Check, X, Eye, Clock, User, Calendar, ExternalLink, Upload, Video, Plus, Megaphone, Trash2, Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ArtistRequest | null>(null);
  const [selectedAdApplication, setSelectedAdApplication] = useState<AdvertisingApplication | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Video upload states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoTags, setVideoTags] = useState<string[]>([]);
  const [videoCategories, setVideoCategories] = useState<string[]>([]);
  const [videoDisplayLocation, setVideoDisplayLocation] = useState<'main-banner' | 'new-releases' | 'trending' | 'most-loved' | 'all'>('new-releases');
  const [isMainEvent, setIsMainEvent] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isUploading, setIsUploading] = useState(false);

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

    const fetchData = async () => {
      try {
        const [artistSnapshot, advertisingSnapshot, episodesSnapshot] = await Promise.all([
          getDocs(artistRequestsQuery),
          getDocs(advertisingQuery),
          getDocs(episodesQuery)
        ]);

        const requests = artistSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ArtistRequest[];
        setArtistRequests(requests);

        const applications = advertisingSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AdvertisingApplication[];
        setAdvertisingApplications(applications);

        const episodes = episodesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Episode[];
        setEpisodes(episodes);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

      // Update the user's profile to make them a professional artist
      await updateDoc(doc(db, 'userProfiles', request.userId), {
        isProfessional: true,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Request approved",
        description: `${request.user.displayName} is now a professional artist.`,
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
        title: "Request rejected",
        description: `Request from ${request.user.displayName} has been rejected.`,
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
        // Generate SOMA placeholder URLs
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
              <text x="50%" y="50%" text-anchor="middle" fill="${textColor}" font-family="Arial, sans-serif" font-size="32" font-weight="bold">SOMA</text>
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
          name: 'SOMA Admin',
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
      setVideoDisplayLocation('new-releases');
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

  const pendingRequests = artistRequests.filter(req => req.status === 'pending');
  const approvedRequests = artistRequests.filter(req => req.status === 'approved');
  const rejectedRequests = artistRequests.filter(req => req.status === 'rejected');

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
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Admin Panel</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage artist account requests</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto">
          <TabsTrigger value="pending" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
            <span className="hidden sm:inline">Pending</span>
            <span className="sm:hidden">Pending</span>
            <span className="ml-1">({pendingRequests.length})</span>
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
            <span className="hidden sm:inline">Approved</span>
            <span className="sm:hidden">Approved</span>
            <span className="ml-1">({approvedRequests.length})</span>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
            <span className="hidden sm:inline">Rejected</span>
            <span className="sm:hidden">Rejected</span>
            <span className="ml-1">({rejectedRequests.length})</span>
          </TabsTrigger>
          <TabsTrigger value="advertising" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
            <Megaphone className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Advertising</span>
            <span className="sm:hidden">Ads</span>
            <span className="ml-1">({advertisingApplications.filter(app => app.status === 'pending').length})</span>
          </TabsTrigger>
          <TabsTrigger value="episodes" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
            <Video className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Episodes</span>
            <span className="sm:hidden">Videos</span>
            <span className="ml-1">({episodes.length})</span>
          </TabsTrigger>
          <TabsTrigger value="video-upload" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
            <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Upload</span>
            <span className="sm:hidden">Upload</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <div className="space-y-4">
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                  <p className="text-muted-foreground">All artist requests have been reviewed.</p>
                </CardContent>
              </Card>
            ) : (
              pendingRequests.map((request) => (
                <Card key={request.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.user.avatarUrl || undefined} alt={request.user.displayName} />
                          <AvatarFallback>{request.user.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{request.user.displayName}</h3>
                          <p className="text-sm text-muted-foreground">@{request.user.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(request.status)}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Portfolio Images</Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {request.portfolioImages.slice(0, 3).map((url, index) => (
                            <img
                              key={index}
                              src={url}
                              alt={`Portfolio ${index + 1}`}
                              className="w-full h-20 object-cover rounded"
                            />
                          ))}
                          {request.portfolioImages.length > 3 && (
                            <div className="flex items-center justify-center bg-muted rounded text-sm">
                              +{request.portfolioImages.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Artist Statement</Label>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                          {request.artistStatement}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Submitted {request.submittedAt instanceof Date ? request.submittedAt.toLocaleDateString() : (request.submittedAt as any).toDate().toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <div className="space-y-4">
            {approvedRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Check className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No approved requests</h3>
                  <p className="text-muted-foreground">No artist requests have been approved yet.</p>
                </CardContent>
              </Card>
            ) : (
              approvedRequests.map((request) => (
                <Card key={request.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.user.avatarUrl || undefined} alt={request.user.displayName} />
                          <AvatarFallback>{request.user.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{request.user.displayName}</h3>
                          <p className="text-sm text-muted-foreground">@{request.user.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(request.status)}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Approved {request.reviewedAt instanceof Date ? request.reviewedAt.toLocaleDateString() : (request.reviewedAt as any)?.toDate().toLocaleDateString()}
                      </div>
                      {request.reviewedBy && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          By {request.reviewedBy}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <div className="space-y-4">
            {rejectedRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <X className="h-12 w-12 mx-auto text-red-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No rejected requests</h3>
                  <p className="text-muted-foreground">No artist requests have been rejected yet.</p>
                </CardContent>
              </Card>
            ) : (
              rejectedRequests.map((request) => (
                <Card key={request.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.user.avatarUrl || undefined} alt={request.user.displayName} />
                          <AvatarFallback>{request.user.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{request.user.displayName}</h3>
                          <p className="text-sm text-muted-foreground">@{request.user.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(request.status)}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {request.rejectionReason && (
                        <div>
                          <Label className="text-sm font-medium">Rejection Reason</Label>
                          <p className="text-sm text-muted-foreground">{request.rejectionReason}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Rejected {request.reviewedAt instanceof Date ? request.reviewedAt.toLocaleDateString() : (request.reviewedAt as any)?.toDate().toLocaleDateString()}
                        </div>
                        {request.reviewedBy && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            By {request.reviewedBy}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="episodes" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Episodes Management</h2>
              <div className="text-sm text-muted-foreground">
                {episodes.length} total episodes
              </div>
            </div>

            {episodes.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <CardTitle className="mb-2">No episodes uploaded</CardTitle>
                  <CardDescription>
                    Upload your first video using the Upload tab.
                  </CardDescription>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {episodes.map((episode) => (
                  <Card key={episode.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-32 h-20 rounded-lg overflow-hidden bg-muted">
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
                              <Badge variant="default" className="bg-red-600 text-white">
                                Main Event
                              </Badge>
                            )}
                            <Badge variant="secondary">
                              {episode.displayLocation}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {episode.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                            <span>{episode.likes} likes</span>
                            <span>{episode.viewCount} views</span>
                            <span>{episode.categories?.join(', ')}</span>
                            <span>Created {episode.createdAt instanceof Date ? episode.createdAt.toLocaleDateString() : 'Recently'}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {episode.tags?.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
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
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleMainEvent(episode)}
                            disabled={isProcessing}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            {episode.isMainEvent ? 'Remove Main' : 'Set Main'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setSelectedEpisode(episode)}
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
            )}
          </div>
        </TabsContent>

        <TabsContent value="video-upload" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Upload Video to Home Feed
              </CardTitle>
              <CardDescription>
                Upload videos that will appear in the main home episodes feed for all SOMA users.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Video File Upload */}
              <div className="space-y-2">
                <Label htmlFor="video-upload">Video File *</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <input
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    onChange={handleVideoFileChange}
                    className="hidden"
                  />
                  <Label htmlFor="video-upload" className="cursor-pointer">
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <div>
                        <span className="text-sm font-medium">Click to upload video</span>
                        <p className="text-xs text-muted-foreground">MP4, MOV, AVI (any size)</p>
                      </div>
                    </div>
                  </Label>
                  {videoFile && (
                    <div className="mt-4">
                      <p className="text-sm font-medium">Selected: {videoFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Size: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Video URL */}
              <div className="space-y-2">
                <Label htmlFor="custom-video-url">Custom Video URL (Backup)</Label>
                <Input
                  id="custom-video-url"
                  type="url"
                  placeholder="https://example.com/video.mp4"
                  value={customVideoUrl}
                  onChange={(e) => setCustomVideoUrl(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Provide a direct video URL as backup if Firebase Storage fails. 
                  Use YouTube, Google Drive, Dropbox, or any direct MP4 URL.
                </p>
              </div>

              {/* Thumbnail Upload */}
              <div className="space-y-2">
                <Label htmlFor="thumbnail-upload">Thumbnail Image (Optional)</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <input
                    id="thumbnail-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailFileChange}
                    className="hidden"
                  />
                  <Label htmlFor="thumbnail-upload" className="cursor-pointer">
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <div>
                        <span className="text-sm font-medium">Click to upload thumbnail</span>
                        <p className="text-xs text-muted-foreground">JPG, PNG, GIF up to 5MB</p>
                      </div>
                    </div>
                  </Label>
                  {thumbnailFile && (
                    <div className="mt-4">
                      <div className="flex items-center justify-center space-x-4">
                        <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-muted-foreground/25">
                          <img
                            src={URL.createObjectURL(thumbnailFile)}
                            alt="Thumbnail preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium">Selected: {thumbnailFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Size: {(thumbnailFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                          <button
                            type="button"
                            onClick={() => setThumbnailFile(null)}
                            className="text-xs text-red-500 hover:text-red-700 mt-1"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a custom thumbnail image for better video presentation. If not provided, a default thumbnail will be used.
                </p>
              </div>

              {/* Video Title */}
              <div className="space-y-2">
                <Label htmlFor="video-title">Title *</Label>
                <Input
                  id="video-title"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Enter video title..."
                />
              </div>

              {/* Video Description */}
              <div className="space-y-2">
                <Label htmlFor="video-description">Description *</Label>
                <Textarea
                  id="video-description"
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="Enter video description..."
                  rows={4}
                />
              </div>


              {/* Art Medium Categories */}
              <div className="space-y-2">
                <Label>Art Medium Categories</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {ART_MEDIUM_CATEGORIES.map((category) => (
                    <label key={category} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={videoCategories.includes(category)}
                        onChange={() => toggleCategory(category)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{category}</span>
                    </label>
                  ))}
                </div>
                {videoCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {videoCategories.map((category) => (
                      <Badge key={category} variant="secondary" className="flex items-center gap-1">
                        {category}
                        <button
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Display Location */}
              <div className="space-y-2">
                <Label htmlFor="display-location">Display Location</Label>
                <Select value={videoDisplayLocation} onValueChange={(value: any) => setVideoDisplayLocation(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select where to display the video" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main-banner">Main Banner (Featured Hero)</SelectItem>
                    <SelectItem value="new-releases">New Releases</SelectItem>
                    <SelectItem value="trending">Trending Now</SelectItem>
                    <SelectItem value="most-loved">Most Loved</SelectItem>
                    <SelectItem value="all">All Sections</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose where this video should appear on the home feed
                </p>
              </div>

              {/* Main Event Checkbox */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    id="main-event"
                    type="checkbox"
                    checked={isMainEvent}
                    onChange={(e) => setIsMainEvent(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="main-event" className="text-sm font-medium">
                    Main Event
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Check this box for high-profile episodes that should appear in the hero banner section. 
                  This overrides the display location setting above.
                </p>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {videoTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {videoTags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <Button
                onClick={handleVideoUpload}
                disabled={isUploading || !videoFile || !videoTitle.trim() || !videoDescription.trim()}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Video to Home Feed
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advertising" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Advertising Applications</h2>
              <div className="text-sm text-muted-foreground">
                {advertisingApplications.length} total applications
              </div>
            </div>

            {advertisingApplications.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <CardTitle className="mb-2">No advertising applications</CardTitle>
                  <CardDescription>
                    No advertising applications have been submitted yet.
                  </CardDescription>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {advertisingApplications.map((application) => (
                  <Card key={application.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{application.companyName}</h3>
                            {getStatusBadge(application.status)}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div>
                              <p><strong>Contact:</strong> {application.contactName}</p>
                              <p><strong>Email:</strong> {application.email}</p>
                              {application.phone && <p><strong>Phone:</strong> {application.phone}</p>}
                              {application.website && <p><strong>Website:</strong> <a href={application.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{application.website}</a></p>}
                            </div>
                            <div>
                              <p><strong>Type:</strong> {application.advertisingType}</p>
                              {application.budget && <p><strong>Budget:</strong> {application.budget}</p>}
                              <p><strong>Submitted:</strong> {application.submittedAt instanceof Date ? application.submittedAt.toLocaleDateString() : (application.submittedAt as any)?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                            </div>
                          </div>
                          {application.targetAudience && (
                            <div className="mt-3">
                              <p className="text-sm"><strong>Target Audience:</strong> {application.targetAudience}</p>
                            </div>
                          )}
                          {application.campaignGoals && (
                            <div className="mt-2">
                              <p className="text-sm"><strong>Campaign Goals:</strong> {application.campaignGoals}</p>
                            </div>
                          )}
                          {application.message && (
                            <div className="mt-2">
                              <p className="text-sm"><strong>Additional Message:</strong> {application.message}</p>
                            </div>
                          )}
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
                          {application.status === 'pending' && (
                            <>
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
                                onClick={() => {
                                  setSelectedAdApplication(application);
                                  setRejectionReason('');
                                }}
                                disabled={isProcessing}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <AlertDialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Artist Request Review</AlertDialogTitle>
              <AlertDialogDescription>
                Review the artist request from {selectedRequest.user.displayName}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedRequest.user.avatarUrl || undefined} alt={selectedRequest.user.displayName} />
                  <AvatarFallback className="text-lg">{selectedRequest.user.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedRequest.user.displayName}</h3>
                  <p className="text-muted-foreground">@{selectedRequest.user.username}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.user.email}</p>
                </div>
                <div className="ml-auto">
                  {getStatusBadge(selectedRequest.status)}
                </div>
              </div>

              {/* Portfolio Images */}
              <div>
                <Label className="text-lg font-semibold">Portfolio Images</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {selectedRequest.portfolioImages.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Portfolio ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>

              {/* Artist Statement */}
              <div>
                <Label className="text-lg font-semibold">Artist Statement</Label>
                <p className="text-muted-foreground mt-2 whitespace-pre-wrap">{selectedRequest.artistStatement}</p>
              </div>

              {/* Experience */}
              {selectedRequest.experience && (
                <div>
                  <Label className="text-lg font-semibold">Experience & Background</Label>
                  <p className="text-muted-foreground mt-2 whitespace-pre-wrap">{selectedRequest.experience}</p>
                </div>
              )}

              {/* Social Links */}
              {selectedRequest.socialLinks && (
                <div>
                  <Label className="text-lg font-semibold">Social Media Links</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {selectedRequest.socialLinks.instagram && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <span className="text-sm">Instagram: {selectedRequest.socialLinks.instagram}</span>
                      </div>
                    )}
                    {selectedRequest.socialLinks.twitter && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <span className="text-sm">Twitter: {selectedRequest.socialLinks.twitter}</span>
                      </div>
                    )}
                    {selectedRequest.socialLinks.website && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <span className="text-sm">Website: {selectedRequest.socialLinks.website}</span>
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

      {/* Episode Detail Modal */}
      {selectedEpisode && (
        <AlertDialog open={!!selectedEpisode} onOpenChange={() => setSelectedEpisode(null)}>
          <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Episode Details</AlertDialogTitle>
              <AlertDialogDescription>
                Manage episode: {selectedEpisode.title}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-6">
              {/* Video Preview */}
              <div className="flex gap-6">
                <div className="w-64 h-36 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={selectedEpisode.thumbnailUrl}
                    alt={selectedEpisode.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{selectedEpisode.title}</h3>
                  <p className="text-muted-foreground mb-4">{selectedEpisode.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Views:</strong> {selectedEpisode.viewCount}</p>
                      <p><strong>Likes:</strong> {selectedEpisode.likes}</p>
                      <p><strong>Comments:</strong> {selectedEpisode.commentsCount}</p>
                    </div>
                    <div>
                      <p><strong>Display Location:</strong> {selectedEpisode.displayLocation}</p>
                      <p><strong>Main Event:</strong> {selectedEpisode.isMainEvent ? 'Yes' : 'No'}</p>
                      <p><strong>Published:</strong> {selectedEpisode.isPublished ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Categories and Tags */}
              <div>
                <Label className="text-lg font-semibold">Categories</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedEpisode.categories?.map((category, index) => (
                    <Badge key={index} variant="secondary">{category}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-lg font-semibold">Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedEpisode.tags?.map((tag, index) => (
                    <Badge key={index} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>

              {/* Video URL */}
              <div>
                <Label className="text-lg font-semibold">Video URL</Label>
                <p className="text-sm text-muted-foreground mt-1 break-all">{selectedEpisode.videoUrl}</p>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedEpisode(null)}>
                Close
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleToggleMainEvent(selectedEpisode)}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? 'Updating...' : (selectedEpisode.isMainEvent ? 'Remove from Main Event' : 'Set as Main Event')}
              </AlertDialogAction>
              <AlertDialogAction
                onClick={() => handleDeleteEpisode(selectedEpisode)}
                className="bg-red-600 hover:bg-red-700"
                disabled={isProcessing}
              >
                {isProcessing ? 'Deleting...' : 'Delete Episode'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}
