'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, X, Check, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { doc, updateDoc, getDoc, setDoc, collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateEmail, verifyBeforeUpdateEmail } from 'firebase/auth';
import { db, storage, auth } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { ArtistRequest, ShowcaseLocation } from '@/lib/types';
import { ThemeLoading } from '@/components/theme-loading';

// Countries list for dropdowns
const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 
  'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland',
  'Japan', 'South Korea', 'China', 'India', 'Brazil', 'Mexico', 
  'Argentina', 'Colombia', 'South Africa', 'Egypt', 'Morocco',
  'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Portugal',
  'Greece', 'Turkey', 'Israel', 'United Arab Emirates', 'Singapore', 'Belarus',
  'New Zealand', 'Ireland', 'Austria', 'Czech Republic', 'Russia',
  'Nigeria', 'Kenya', 'Ghana', 'Chile', 'Peru', 'Venezuela',
  'Philippines', 'Thailand', 'Indonesia', 'Malaysia', 'Vietnam'
];

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const isArtistAccount = Boolean(user?.isProfessional);

  // Test Firebase connectivity
  const testFirebaseConnection = async () => {
    try {
      console.log('🔍 Testing Firebase connection...');
      console.log('📊 Auth state:', auth.currentUser ? 'Authenticated' : 'Not authenticated');
      console.log('📊 Storage bucket:', storage.app.options.storageBucket);
      console.log('📊 User ID:', auth.currentUser?.uid);
      
      // Test storage write permissions
      if (auth.currentUser) {
        const testRef = ref(storage, `test/${auth.currentUser.uid}/connection-test.txt`);
        const testBlob = new Blob(['Firebase connection test'], { type: 'text/plain' });
        await uploadBytes(testRef, testBlob);
        console.log('✅ Firebase storage write test successful');
        
        // Clean up test file
        await deleteObject(testRef);
        console.log('✅ Firebase storage cleanup successful');
      }
    } catch (error) {
      console.error('❌ Firebase connection test failed:', error);
    }
  };

  // Test portfolio upload with a sample file
  const testPortfolioUpload = async () => {
    try {
      console.log('🧪 Testing portfolio upload with sample file...');
      
      if (!auth.currentUser) {
        console.error('❌ No authenticated user');
        toast({
          title: "Test failed",
          description: "No authenticated user found",
          variant: "destructive"
        });
        return;
      }

      // Create a test image file
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, 100, 100);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.fillText('TEST', 25, 50);
      }
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error('❌ Failed to create test image blob');
          return;
        }
        
        const testFile = new File([blob], 'test-image.png', { type: 'image/png' });
        console.log('📸 Created test file:', testFile.name, testFile.size, 'bytes');
        
        // Test the upload function directly
        const mockEvent = {
          target: {
            files: [testFile],
            value: ''
          }
        } as any;
        
        await handlePortfolioImageUpload(mockEvent);
      }, 'image/png');
      
    } catch (error) {
      console.error('❌ Test portfolio upload failed:', error);
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "Test upload failed",
        variant: "destructive"
      });
    }
  };
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [bannerPreviewImage, setBannerPreviewImage] = useState<string | null>(null);
  const [showArtistRequest, setShowArtistRequest] = useState(false);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const isInitialMount = useRef(true);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [newShowcaseLocation, setNewShowcaseLocation] = useState({
    name: '',
    venue: '',
    city: '',
    country: '',
    website: '',
    notes: '',
    imageUrl: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    handle: '',
    email: '',
    bio: '',
    artistType: '',
    location: '',
    countryOfOrigin: '',
    countryOfResidence: '',
    isProfessional: false,
    tipJarEnabled: true,
    suggestionsEnabled: true,
    hideLocation: false,
    hideFlags: false,
    hideCard: false,
    bannerImageUrl: '',
    // Upcoming event fields
    eventCity: '',
    eventCountry: '',
    eventDate: '',
    showcaseLocations: [] as ShowcaseLocation[],
  });

  const [artistRequestData, setArtistRequestData] = useState({
    artistStatement: '',
    experience: '',
    socialLinks: {
      instagram: '',
      x: '',
      website: '',
      tiktok: ''
    }
  });

  useEffect(() => {
    if (user && isInitialMount.current) {
      // Test Firebase connection when user is available
      testFirebaseConnection();
      
      // Check for offline changes first
      const offlineChanges = localStorage.getItem(`profile_offline_changes_${user.id}`);
      if (offlineChanges) {
        try {
          const changes = JSON.parse(offlineChanges);
          const nextFormData = {
            name: changes.name || user.displayName || '',
            handle: changes.handle || user.username || '',
            email: changes.email || user.email || '',
            bio: changes.bio || user.bio || '',
            artistType: changes.artistType || user.artistType || '',
            location: changes.location || user.location || '',
            countryOfOrigin: changes.countryOfOrigin || user.countryOfOrigin || '',
            countryOfResidence: changes.countryOfResidence || user.countryOfResidence || '',
            isProfessional: user.isProfessional || false,
            tipJarEnabled: user.isProfessional
              ? (changes.tipJarEnabled !== undefined
                ? changes.tipJarEnabled
                : (user.tipJarEnabled !== undefined ? user.tipJarEnabled : true))
              : false,
            suggestionsEnabled: user.isProfessional
              ? (changes.suggestionsEnabled !== undefined
                ? changes.suggestionsEnabled
                : (user.suggestionsEnabled !== undefined ? user.suggestionsEnabled : true))
              : false,
            hideLocation: changes.hideLocation || user.hideLocation || false,
            hideFlags: changes.hideFlags || user.hideFlags || false,
            hideCard: user.isProfessional ? (changes.hideCard || user.hideCard || false) : false,
            bannerImageUrl: user.isProfessional ? (changes.bannerImageUrl || user.bannerImageUrl || '') : '',
            eventCity: user.isProfessional ? (changes.eventCity || user.eventCity || '') : '',
            eventCountry: user.isProfessional ? (changes.eventCountry || user.eventCountry || '') : '',
            eventDate: user.isProfessional ? (changes.eventDate || user.eventDate || '') : '',
            showcaseLocations: user.isProfessional
              ? (changes.showcaseLocations || user.showcaseLocations || [])
              : [],
          };
          setFormData(nextFormData);
          if (!user.isProfessional) {
            setBannerPreviewImage(null);
          }
          
          if (changes.avatarUrl && changes.avatarUrl !== user.avatarUrl) {
            setPreviewImage(changes.avatarUrl);
          }
          
          if (user.isProfessional && changes.bannerImageUrl && changes.bannerImageUrl !== user.bannerImageUrl) {
            setBannerPreviewImage(changes.bannerImageUrl);
          }
          
          console.log('Applied offline changes to form');
        } catch (error) {
          console.error('Error applying offline changes:', error);
        }
      } else {
        // Fetch email from Firestore first (source of truth), then fallback to Firebase Auth
        const loadUserData = async () => {
          let userEmail = '';
          try {
            const userProfileDoc = await getDoc(doc(db, 'userProfiles', user.id));
            if (userProfileDoc.exists()) {
              const profileData = userProfileDoc.data();
              // Prioritize Firestore email (our source of truth for profile)
              userEmail = profileData.email || auth.currentUser?.email || user.email || '';
            } else {
              // If no Firestore doc, use Firebase Auth email
              userEmail = auth.currentUser?.email || user.email || '';
            }
          } catch (error) {
            console.error('Error fetching email from Firestore:', error);
            // Fallback to Firebase Auth email on error
            userEmail = auth.currentUser?.email || user.email || '';
          }
          
          // Don't overwrite email if it's already been set in formData (user might have just edited it)
          const currentEmail = formData.email || userEmail;
          
          const nextFormData = {
            name: user.displayName || '',
            handle: user.username || '',
            email: currentEmail,
            bio: user.bio || '',
            artistType: user.artistType || '',
            location: user.location || '',
            countryOfOrigin: user.countryOfOrigin || '',
            countryOfResidence: user.countryOfResidence || '',
            isProfessional: user.isProfessional || false,
          tipJarEnabled: user.isProfessional
            ? (user.tipJarEnabled !== undefined ? user.tipJarEnabled : true)
            : false,
          suggestionsEnabled: user.isProfessional
            ? (user.suggestionsEnabled !== undefined ? user.suggestionsEnabled : true)
            : false,
          hideLocation: user.hideLocation || false,
          hideFlags: user.hideFlags || false,
          hideCard: user.isProfessional ? (user.hideCard || false) : false,
          bannerImageUrl: user.isProfessional ? (user.bannerImageUrl || '') : '',
          eventCity: user.isProfessional ? ((user as any).eventCity || '') : '',
          eventCountry: user.isProfessional ? ((user as any).eventCountry || '') : '',
          eventDate: user.isProfessional ? ((user as any).eventDate || '') : '',
          showcaseLocations: user.isProfessional ? (user.showcaseLocations || []) : [],
          };
          setFormData(nextFormData);

          if (user.avatarUrl) {
            setPreviewImage(user.avatarUrl);
          }

          if (user.isProfessional && user.bannerImageUrl) {
            setBannerPreviewImage(user.bannerImageUrl);
          } else if (!user.isProfessional) {
            setBannerPreviewImage(null);
          }
        };
        
        loadUserData();
      }
      
      // Mark initial mount as complete
      isInitialMount.current = false;
    }
  }, [user]);

  // Helper function to add timeout to Firestore operations
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
      )
    ]);
  };

  const checkHandleAvailability = async (handle: string) => {
    if (!handle || handle === user?.username) {
      setHandleAvailable(null);
      return;
    }

    setIsCheckingHandle(true);
    try {
      const handleDoc = await withTimeout(getDoc(doc(db, 'handles', handle)), 5000);
      setHandleAvailable(!handleDoc.exists());
    } catch (error) {
      console.error('Error checking handle:', error);
      setHandleAvailable(null);
    } finally {
      setIsCheckingHandle(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'handle') {
      checkHandleAvailability(value);
    }
  };


  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Client-side compression
    const compressedFile = await compressImage(file);
    const previewUrl = URL.createObjectURL(compressedFile);
    setPreviewImage(previewUrl);
  };

  const handleBannerImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Client-side compression for banner (wider aspect ratio)
    const compressedFile = await compressBannerImage(file);
    const previewUrl = URL.createObjectURL(compressedFile);
    setBannerPreviewImage(previewUrl);
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const maxWidth = 400;
        const maxHeight = 400;
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          }
        }, 'image/jpeg', 0.8);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const compressBannerImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const maxWidth = 1200;
        const maxHeight = 400;
        let { width, height } = img;

        // Maintain aspect ratio but prefer wider images for banners
        const aspectRatio = width / height;
        if (aspectRatio > 3) {
          // Very wide image, crop to 3:1 ratio
          width = maxWidth;
          height = maxWidth / 3;
        } else if (aspectRatio < 2) {
          // Not wide enough, scale to fit height
          height = maxHeight;
          width = height * aspectRatio;
        } else {
          // Good aspect ratio, scale to fit width
          width = maxWidth;
          height = maxWidth / aspectRatio;
        }

        canvas.width = width;
        canvas.height = height;

        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          }
        }, 'image/jpeg', 0.8);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const removeImage = () => {
    setPreviewImage(null);
  };

  const removeBannerImage = () => {
    setBannerPreviewImage(null);
  };

  const handleAddShowcaseLocation = () => {
    if (!newShowcaseLocation.name.trim()) {
      toast({
        title: 'Add the gallery name',
        description: 'Provide at least the name of the gallery or space.',
        variant: 'destructive'
      });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      showcaseLocations: [
        ...prev.showcaseLocations,
        {
          name: newShowcaseLocation.name.trim(),
          venue: newShowcaseLocation.venue.trim() || undefined,
          city: newShowcaseLocation.city.trim() || undefined,
          country: newShowcaseLocation.country.trim() || undefined,
          website: newShowcaseLocation.website.trim() || undefined,
          notes: newShowcaseLocation.notes.trim() || undefined,
          imageUrl: newShowcaseLocation.imageUrl.trim() || undefined
        }
      ]
    }));

    setNewShowcaseLocation({
      name: '',
      venue: '',
      city: '',
      country: '',
      website: '',
      notes: '',
      imageUrl: ''
    });

    toast({
      title: 'Location added',
      description: 'Remember to publish your changes.'
    });
  };

  const handleRemoveShowcaseLocation = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      showcaseLocations: prev.showcaseLocations.filter((_, i) => i !== index)
    }));
  };

  const handlePortfolioImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🎯 handlePortfolioImageUpload called with event:', event);
    console.log('🎯 Event target:', event.target);
    console.log('🎯 Event target files:', event.target.files);
    
    const files = event.target.files;
    if (!files || files.length === 0) {
      console.log('❌ No files selected');
      toast({
        title: "No files selected",
        description: "Please select at least one image to upload.",
        variant: "destructive"
      });
      return;
    }
    
    console.log('✅ Files selected:', files.length, Array.from(files).map(f => f.name));

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload portfolio images.",
        variant: "destructive"
      });
      return;
    }

    // Check Firebase Auth state
    if (!auth.currentUser) {
      toast({
        title: "Authentication expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive"
      });
      return;
    }

    if (portfolioImages.length + files.length > 10) {
      toast({
        title: "Too many images",
        description: "You can upload a maximum of 10 portfolio images.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    console.log('📸 Starting portfolio image upload...', files.length, 'files');
    console.log('🔐 User authenticated:', !!auth.currentUser, 'User ID:', auth.currentUser?.uid);
    
    try {
      const urls: string[] = [];
      
      // Upload files one by one to avoid overwhelming the system
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`📸 Uploading file ${i + 1}/${files.length}:`, file.name, file.size, 'bytes');
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} is not a valid image file. Please upload JPG, PNG, or GIF images only.`);
        }
        
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`${file.name} is too large. Please upload images smaller than 10MB.`);
        }
        
        try {
          // Compress image
          const compressedFile = await compressImage(file);
          console.log(`✅ Image compressed:`, compressedFile.size, 'bytes');
          
          // Create storage reference
          const timestamp = Date.now();
          const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const imageRef = ref(storage, `portfolio/${user.id}/${fileName}`);
          console.log(`📤 Uploading to:`, imageRef.fullPath);
          
          // Upload file with metadata
          const metadata = {
            contentType: compressedFile.type,
            customMetadata: {
              uploadedBy: user.id,
              originalName: file.name
            }
          };
          
          const uploadResult = await uploadBytes(imageRef, compressedFile, metadata);
          console.log(`✅ Upload successful:`, uploadResult.metadata.fullPath);
          
          // Get download URL
          const downloadURL = await getDownloadURL(imageRef);
          console.log(`✅ Download URL obtained:`, downloadURL);
          
          urls.push(downloadURL);
        } catch (fileError: any) {
          console.error(`❌ Error uploading file ${file.name}:`, fileError);
          
          // Provide more specific error messages
          if (fileError.code === 'storage/unauthorized') {
            throw new Error(`Authentication failed. Please log in again and try uploading ${file.name}.`);
          } else if (fileError.code === 'storage/canceled') {
            throw new Error(`Upload canceled for ${file.name}. Please try again.`);
          } else if (fileError.code === 'storage/unknown') {
            throw new Error(`Network error while uploading ${file.name}. Please check your connection and try again.`);
          } else if (fileError.code === 'storage/invalid-format') {
            throw new Error(`Invalid file format for ${file.name}. Please use JPG, PNG, or GIF images.`);
          } else if (fileError.code === 'storage/object-not-found') {
            throw new Error(`Storage error for ${file.name}. Please try again.`);
          } else {
            throw new Error(`Failed to upload ${file.name}: ${fileError.message || 'Unknown error'}`);
          }
        }
      }

      setPortfolioImages(prev => [...prev, ...urls]);
      console.log(`✅ All ${urls.length} portfolio images uploaded successfully`);
      
      toast({
        title: "Upload successful",
        description: `${urls.length} image${urls.length > 1 ? 's' : ''} uploaded successfully.`,
      });
      
      // Reset file input
      event.target.value = '';
    } catch (error: any) {
      console.error('❌ Portfolio image upload failed:', error);
      
      // Log additional debugging information
      console.error('🔍 Debug info:', {
        userExists: !!user,
        authUserExists: !!auth.currentUser,
        authUserUid: auth.currentUser?.uid,
        storageBucket: storage.app.options.storageBucket,
        errorCode: error.code,
        errorMessage: error.message
      });
      
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload portfolio images. Please check your internet connection and try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removePortfolioImage = (index: number) => {
    setPortfolioImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleArtistRequestSubmit = async () => {
    if (!user) return;

    if (portfolioImages.length === 0) {
      toast({
        title: "Portfolio required",
        description: "Please upload at least one portfolio image.",
        variant: "destructive"
      });
      return;
    }


    setIsSubmittingRequest(true);
    try {
      // Create a clean user object without undefined values
      // Convert Date objects to Firestore Timestamps
      const cleanUser = {
        id: user.id,
        username: user.username || '',
        email: user.email || '',
        displayName: user.displayName || '',
        ...(user.avatarUrl && { avatarUrl: user.avatarUrl }),
        ...(user.bio && { bio: user.bio }),
        ...(user.location && { location: user.location }),
        ...(user.website && { website: user.website }),
        followerCount: user.followerCount || 0,
        followingCount: user.followingCount || 0,
        postCount: user.postCount || 0,
        isVerified: user.isVerified || false,
        isProfessional: user.isProfessional || false,
        createdAt: user.createdAt 
          ? (user.createdAt instanceof Date ? Timestamp.fromDate(user.createdAt) : user.createdAt)
          : serverTimestamp(),
        updatedAt: user.updatedAt 
          ? (user.updatedAt instanceof Date ? Timestamp.fromDate(user.updatedAt) : user.updatedAt)
          : serverTimestamp()
      };

      // Build socialLinks object only with defined values
      const socialLinks: any = {};
      if (artistRequestData.socialLinks.instagram?.trim()) {
        socialLinks.instagram = artistRequestData.socialLinks.instagram.trim();
      }
      if (artistRequestData.socialLinks.x?.trim()) {
        socialLinks.x = artistRequestData.socialLinks.x.trim();
      }
      if (artistRequestData.socialLinks.website?.trim()) {
        socialLinks.website = artistRequestData.socialLinks.website.trim();
      }
      if (artistRequestData.socialLinks.tiktok?.trim()) {
        socialLinks.tiktok = artistRequestData.socialLinks.tiktok.trim();
      }

      const artistRequest: any = {
        userId: user.id,
        user: cleanUser,
        portfolioImages,
        experience: artistRequestData.experience,
        status: 'pending',
        submittedAt: serverTimestamp()
      };

      // Only include optional fields if they have values (Firestore doesn't allow undefined)
      if (artistRequestData.artistStatement?.trim()) {
        artistRequest.artistStatement = artistRequestData.artistStatement.trim();
      }
      if (Object.keys(socialLinks).length > 0) {
        artistRequest.socialLinks = socialLinks;
      }

      const docRef = await addDoc(collection(db, 'artistRequests'), artistRequest);
      console.log('✅ Artist request submitted successfully:', docRef.id, artistRequest);

      toast({
        title: "Verification request submitted",
        description: "Your professional artist verification request has been submitted for review.",
      });

      // Redirect to profile with pending indicator
      router.push('/profile?artistRequest=pending');

      setShowArtistRequest(false);
      setPortfolioImages([]);
      setArtistRequestData({
        artistStatement: '',
        experience: '',
        socialLinks: { instagram: '', x: '', website: '', tiktok: '' }
      });
    } catch (error) {
      console.error('Error submitting artist request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error details:', {
        error,
        user: user ? { id: user.id, email: user.email, username: user.username } : 'No user',
        portfolioImagesCount: portfolioImages.length,
        artistRequestData
      });
      toast({
        title: "Submission failed",
        description: errorMessage || "Failed to submit verification request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Auto-save function (doesn't save images or handle changes)
  const autoSave = async (skipDebounce = false) => {
    if (!user || isInitialMount.current) return;
    
    // Don't auto-save if handle changed (needs validation)
    if (formData.handle !== user.username) return;
    
    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    const performSave = async () => {
      try {
        setSaveStatus('saving');
        
        const userRef = doc(db, 'userProfiles', user.id);
        const allowArtistFields = Boolean(user.isProfessional);
        const updateData: any = {
          name: formData.name,
          email: formData.email, // Save email to Firestore for username login support
          bio: formData.bio,
          location: formData.location,
          countryOfOrigin: formData.countryOfOrigin,
          countryOfResidence: formData.countryOfResidence,
          hideLocation: formData.hideLocation,
          hideFlags: formData.hideFlags,
          updatedAt: new Date(),
          isProfessional: allowArtistFields,
        };

        if (allowArtistFields) {
          updateData.artistType = formData.artistType;
          updateData.tipJarEnabled = formData.tipJarEnabled;
          updateData.suggestionsEnabled = formData.suggestionsEnabled;
          updateData.hideCard = formData.hideCard;
          updateData.eventCity = formData.eventCity || null;
          updateData.eventCountry = formData.eventCountry || null;
          updateData.eventDate = formData.eventDate || null;
          updateData.showcaseLocations = formData.showcaseLocations || [];
        } else {
          updateData.artistType = '';
          updateData.tipJarEnabled = false;
          updateData.suggestionsEnabled = false;
          updateData.hideCard = false;
          updateData.eventCity = null;
          updateData.eventCountry = null;
          updateData.eventDate = null;
          updateData.bannerImageUrl = null;
          updateData.showcaseLocations = [];
        }

        await withTimeout(setDoc(userRef, updateData, { merge: true }), 5000);
        
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        
        // Clear offline changes after successful save
        localStorage.removeItem(`profile_offline_changes_${user.id}`);
      } catch (error) {
        console.error('Auto-save error:', error);
        setSaveStatus('error');
        
        // Store changes in localStorage for offline mode
        try {
          const offlineChanges = {
            ...formData,
            timestamp: new Date().toISOString()
          };
          localStorage.setItem(`profile_offline_changes_${user.id}`, JSON.stringify(offlineChanges));
        } catch (storageError) {
          console.error('Error saving offline changes:', storageError);
        }
        
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    };
    
    if (skipDebounce) {
      performSave();
    } else {
      autoSaveTimeoutRef.current = setTimeout(performSave, 1500); // 1.5 second debounce
    }
  };

  // Auto-save when formData changes (excluding handle and images)
  useEffect(() => {
    if (isInitialMount.current) return;
    
    autoSave();
    
    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [
    formData.name,
    formData.email,
    formData.bio,
    formData.artistType,
    formData.location,
    formData.countryOfOrigin,
    formData.countryOfResidence,
    formData.isProfessional,
    formData.tipJarEnabled,
    formData.suggestionsEnabled,
    formData.hideLocation,
    formData.hideFlags,
    formData.hideCard,
    formData.eventCity,
    formData.eventCountry,
    formData.eventDate,
    JSON.stringify(formData.showcaseLocations),
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 Profile edit form submitted - using setDoc with merge');
    
    if (!user) return;
    
    if (formData.handle !== user.username && handleAvailable !== true) {
      toast({
        title: "Handle not available",
        description: "Please choose a different handle.",
        variant: "destructive"
      });
      return;
    }
            
    setIsLoading(true);
    
    // Test connection before attempting save
    try {
      await withTimeout(getDoc(doc(db, 'userProfiles', user.id)), 3000);
    } catch (error) {
      console.error('Connection test failed:', error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server. Please check your internet connection and try again.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }
    try {
      let avatarUrl = user.avatarUrl;

      // Upload new image if preview exists
      if (previewImage) {
        const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
        const file = fileInput?.files?.[0];
        
        if (file) {
          const compressedFile = await compressImage(file);
          const imageRef = ref(storage, `avatars/${user.id}`);
          await uploadBytes(imageRef, compressedFile);
          avatarUrl = await getDownloadURL(imageRef);
        }
      }

      let bannerImageUrl = user.bannerImageUrl;

      // Upload new banner image if preview exists
      if (bannerPreviewImage) {
        const fileInput = document.getElementById('banner-upload') as HTMLInputElement;
        const file = fileInput?.files?.[0];
        
        if (file) {
          const compressedFile = await compressBannerImage(file);
          const imageRef = ref(storage, `banners/${user.id}`);
          await uploadBytes(imageRef, compressedFile);
          bannerImageUrl = await getDownloadURL(imageRef);
        }
      }

      // Update user profile - filter out undefined values
      const userRef = doc(db, 'userProfiles', user.id);
      const allowArtistFields = Boolean(user.isProfessional);
      const updateData: any = {
        name: formData.name,
        handle: formData.handle,
        email: formData.email, // Save email to Firestore for username login support
        bio: formData.bio,
        location: formData.location,
        countryOfOrigin: formData.countryOfOrigin,
        countryOfResidence: formData.countryOfResidence,
        hideLocation: formData.hideLocation,
        hideFlags: formData.hideFlags,
        updatedAt: new Date(),
        isProfessional: allowArtistFields,
      };

      // Update email in Firebase Auth if it has changed
      // Use verifyBeforeUpdateEmail to send verification email to the new address
      // This is required by Firebase Auth for security
      if (auth.currentUser && formData.email && formData.email !== auth.currentUser.email) {
        try {
          // verifyBeforeUpdateEmail sends a verification email to the new address
          // The email will be updated after the user clicks the verification link
          await verifyBeforeUpdateEmail(auth.currentUser, formData.email);
          console.log('✅ Verification email sent to new email address');
          toast({
            title: "Verification email sent",
            description: `A verification email has been sent to ${formData.email}. Please check your inbox and click the verification link to complete the email change.`,
            variant: "default"
          });
        } catch (error: any) {
          console.error('Error sending verification email:', error);
          // Handle specific error cases
          if (error.code === 'auth/requires-recent-login') {
            // User needs to re-authenticate - email still saved to Firestore
            toast({
              title: "Email saved to profile",
              description: "Email updated in profile. Please sign out and sign back in, then try updating your email again.",
              variant: "default"
            });
          } else if (error.code === 'auth/operation-not-allowed') {
            // Email verification not allowed - email still saved to Firestore
            toast({
              title: "Email saved to profile",
              description: "Email updated in profile. Email verification is not enabled for your account. The email is saved and can be used for username login.",
              variant: "default"
            });
          } else {
            // Other errors - email still saved to Firestore
            toast({
              title: "Email saved to profile",
              description: "Email updated in profile. There was an issue sending the verification email, but the email is saved and can be used for username login.",
              variant: "default"
            });
          }
        }
      }

      if (allowArtistFields) {
        updateData.artistType = formData.artistType;
        updateData.tipJarEnabled = formData.tipJarEnabled;
        updateData.suggestionsEnabled = formData.suggestionsEnabled;
        updateData.hideCard = formData.hideCard;
        updateData.eventCity = formData.eventCity || null;
        updateData.eventCountry = formData.eventCountry || null;
        updateData.eventDate = formData.eventDate || null;
        updateData.showcaseLocations = formData.showcaseLocations || [];
      } else {
        updateData.artistType = '';
        updateData.tipJarEnabled = false;
        updateData.suggestionsEnabled = false;
        updateData.hideCard = false;
        updateData.eventCity = null;
        updateData.eventCountry = null;
        updateData.eventDate = null;
        updateData.bannerImageUrl = null;
        updateData.showcaseLocations = [];
      }

      // Only include avatarUrl if it's not undefined
      if (avatarUrl !== undefined) {
        updateData.avatarUrl = avatarUrl;
      }

      if (allowArtistFields) {
        if (bannerImageUrl !== undefined) {
          updateData.bannerImageUrl = bannerImageUrl;
        }
      } else {
        updateData.bannerImageUrl = null;
      }

      // Create or update user profile with timeout (setDoc with merge will create if doesn't exist)
      await withTimeout(setDoc(userRef, updateData, { merge: true }), 10000);

      // Update handle mapping if changed
      if (formData.handle !== user.username) {
        // Remove old handle
        if (user.username) {
          await withTimeout(setDoc(doc(db, 'handles', user.username), { userId: null }, { merge: true }), 5000);
        }
        // Add new handle
        await withTimeout(setDoc(doc(db, 'handles', formData.handle), { userId: user.id }, { merge: true }), 5000);
      }

      await withTimeout(refreshUser(), 5000);
      
      // Clear offline changes after successful save
      localStorage.removeItem(`profile_offline_changes_${user.id}`);

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });

      router.push(`/profile/${user.id}`);
    } catch (error) {
      console.error('Error updating profile:', error);
      
      // Check for specific Firebase errors
      if ((error as any)?.code === 'unavailable' || (error as any)?.message?.includes('offline')) {
        toast({
          title: "Connection Error",
          description: "Unable to connect to the server. Your changes will be saved locally and synced when connection is restored.",
          variant: "destructive"
        });
        
        // Store changes in localStorage for offline mode
        try {
          const offlineChanges = {
            ...formData,
            avatarUrl: previewImage || user.avatarUrl,
            bannerImageUrl: bannerPreviewImage || user.bannerImageUrl,
            timestamp: new Date().toISOString()
          };
          localStorage.setItem(`profile_offline_changes_${user.id}`, JSON.stringify(offlineChanges));
          console.log('Profile changes saved offline');
        } catch (storageError) {
          console.error('Error saving offline changes:', storageError);
        }
      } else if ((error as any)?.message?.includes('timed out') || (error as any)?.message?.includes('timeout')) {
        toast({
          title: "Request Timeout",
          description: "The server is taking too long to respond. Please check your connection and try again.",
          variant: "destructive"
        });
      } else if ((error as any)?.message?.includes('undefined')) {
        toast({
          title: "Update failed",
          description: "There was an issue with the profile data. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Update failed",
          description: `Unable to save changes: ${(error as any)?.message || 'Connection error'}`,
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ThemeLoading text="Loading profile..." size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Edit Profile</h1>
        {saveStatus === 'saving' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Saving...</span>
          </div>
        )}
        {saveStatus === 'saved' && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <Check className="h-4 w-4" />
            <span>Saved</span>
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>Save failed</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Avatar Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
            <CardDescription>
              Upload a new profile picture. Click to change or remove.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage 
                    src={previewImage || user.avatarUrl} 
                    alt={formData.name} 
                  />
                  <AvatarFallback className="text-xl">
                    {formData.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {previewImage && (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={removeImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Change Picture
                    </span>
                  </Button>
                </Label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {user.avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeImage}
                  >
                    Remove Picture
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events Section */}
        {isArtistAccount && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>
              Set up your upcoming event with a banner image, date, and location
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Banner Image */}
            <div className="space-y-4">
              <Label>Event Banner Image</Label>
              {bannerPreviewImage || user.bannerImageUrl ? (
                <div className="relative">
                  <div className="relative w-full h-48 md:h-64 rounded-lg overflow-hidden">
                    <img
                      src={bannerPreviewImage || user.bannerImageUrl}
                      alt="Upcoming event banner preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {bannerPreviewImage && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 h-6 w-6 rounded-full p-0"
                      onClick={removeBannerImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="relative w-full h-32 md:h-40 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/10 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-muted-foreground text-sm mb-2">
                      No upcoming event banner uploaded
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="banner-upload" className="cursor-pointer">
                        <Button type="button" variant="outline" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Upcoming Event Banner
                          </span>
                        </Button>
                      </Label>
                      <div className="text-xs text-muted-foreground">
                        Recommended: ~1200x800 (tall rectangle)
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 items-center">
                <Label htmlFor="banner-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      {bannerPreviewImage || user.bannerImageUrl ? 'Change Banner' : 'Upload Banner'}
                    </span>
                  </Button>
                </Label>
                <div className="text-xs text-muted-foreground">
                  Recommended: ~1200x800 (tall rectangle)
                </div>
                <input
                  id="banner-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleBannerImageUpload}
                  className="hidden"
                />
                {(bannerPreviewImage || user.bannerImageUrl) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeBannerImage}
                  >
                    Remove Banner
                  </Button>
                )}
              </div>
            </div>

            {/* Event Date and Location */}
            <div className="space-y-4 pt-4 border-t">
              <Label>Event Date & Location</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eventDate">Event Date</Label>
                  <Input
                    id="eventDate"
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) => handleInputChange('eventDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventCountry">Event Country</Label>
                  <Select 
                    value={formData.eventCountry || ''} 
                    onValueChange={(value) => handleInputChange('eventCountry', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventCity">Event City</Label>
                  <Input
                    id="eventCity"
                    value={formData.eventCity}
                    onChange={(e) => handleInputChange('eventCity', e.target.value)}
                    placeholder="City / Venue city"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="handle">Handle *</Label>
                <div className="relative">
                  <Input
                    id="handle"
                    value={formData.handle}
                    onChange={(e) => handleInputChange('handle', e.target.value)}
                    required
                    className="pr-10"
                  />
                  {isCheckingHandle && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  )}
                  {handleAvailable === true && (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                  {handleAvailable === false && (
                    <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                  )}
                </div>
                {handleAvailable === false && (
                  <p className="text-sm text-red-500">This handle is already taken</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="your@email.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Update your email address. This will be used for login and notifications.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio {user?.isProfessional ? '(extended biography for artists)' : '(up to 5 sentences)'}</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => {
                  if (user?.isProfessional) {
                    // Professional artists can have extended biographies
                    handleInputChange('bio', e.target.value);
                  } else {
                    // Regular users limited to 5 sentences
                    const sentences = e.target.value.split(/[.!?]+/).filter(s => s.trim());
                    if (sentences.length <= 5) {
                      handleInputChange('bio', e.target.value);
                    }
                  }
                }}
                placeholder={user?.isProfessional 
                  ? "Share your artistic journey, inspirations, and story..." 
                  : "Tell your story in up to 5 sentences..."
                }
                rows={user?.isProfessional ? 8 : 5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {user?.isProfessional 
                  ? `${formData.bio.length} characters`
                  : `${formData.bio.split(/[.!?]+/).filter(s => s.trim()).length} / 5 sentences`
                }
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="countryOfOrigin">Country of Origin</Label>
                <Select 
                  value={formData.countryOfOrigin || ''} 
                  onValueChange={(value) => handleInputChange('countryOfOrigin', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your country of origin" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="countryOfResidence">Country of Residence</Label>
                <Select 
                  value={formData.countryOfResidence || ''} 
                  onValueChange={(value) => handleInputChange('countryOfResidence', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your country of residence" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">City / Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="City, State/Region"
              />
            </div>

            {/* Privacy Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Privacy Settings</h3>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Hide Location Information</Label>
                  <p className="text-sm text-muted-foreground">
                    Hide your country and location from your public profile
                  </p>
                </div>
                <Switch
                  checked={formData.hideLocation}
                  onCheckedChange={(checked) => handleInputChange('hideLocation', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Hide Country Flags</Label>
                  <p className="text-sm text-muted-foreground">
                    Hide country flags while keeping location text visible
                  </p>
                </div>
                <Switch
                  checked={formData.hideFlags}
                  onCheckedChange={(checked) => handleInputChange('hideFlags', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Hide Upcoming Events</Label>
                  <p className="text-sm text-muted-foreground">
                    Hide the entire "Upcoming Events" section from your public profile
                  </p>
                </div>
                <Switch
                  checked={formData.hideCard}
                  onCheckedChange={(checked) => handleInputChange('hideCard', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {isArtistAccount && (
          <Card>
            <CardHeader>
              <CardTitle>Where to See My Work</CardTitle>
              <CardDescription>
                Showcase galleries or partner spaces currently exhibiting your work. These locations appear on your public profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="showcase-name">Gallery or space name *</Label>
                  <Input
                    id="showcase-name"
                    placeholder="Gallery 302"
                    value={newShowcaseLocation.name}
                    onChange={(event) =>
                      setNewShowcaseLocation((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="showcase-venue">Venue (optional)</Label>
                  <Input
                    id="showcase-venue"
                    placeholder="Building, floor or room"
                    value={newShowcaseLocation.venue}
                    onChange={(event) =>
                      setNewShowcaseLocation((prev) => ({ ...prev, venue: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="showcase-city">City</Label>
                  <Input
                    id="showcase-city"
                    placeholder="Paris"
                    value={newShowcaseLocation.city}
                    onChange={(event) =>
                      setNewShowcaseLocation((prev) => ({ ...prev, city: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="showcase-country">Country</Label>
                  <Input
                    id="showcase-country"
                    placeholder="France"
                    value={newShowcaseLocation.country}
                    onChange={(event) =>
                      setNewShowcaseLocation((prev) => ({ ...prev, country: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="showcase-link">Website or listing URL</Label>
                  <Input
                    id="showcase-link"
                    placeholder="https://gallery302.com/exhibitions"
                    value={newShowcaseLocation.website}
                    onChange={(event) =>
                      setNewShowcaseLocation((prev) => ({ ...prev, website: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="showcase-image">Image URL</Label>
                  <Input
                    id="showcase-image"
                    placeholder="https://"
                    value={newShowcaseLocation.imageUrl}
                    onChange={(event) =>
                      setNewShowcaseLocation((prev) => ({ ...prev, imageUrl: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="showcase-notes">Notes (optional)</Label>
                  <Textarea
                    id="showcase-notes"
                    rows={3}
                    placeholder="Add viewing hours, curator details, or what to look out for."
                    value={newShowcaseLocation.notes}
                    onChange={(event) =>
                      setNewShowcaseLocation((prev) => ({ ...prev, notes: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={handleAddShowcaseLocation}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add location
                </Button>
              </div>
              {formData.showcaseLocations.length > 0 ? (
                <div className="grid gap-3">
                  {formData.showcaseLocations.map((location, index) => (
                    <div
                      key={`${location.name}-${index}`}
                      className="rounded-lg border border-muted bg-muted/20 p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-3"
                    >
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold text-foreground">{location.name}</p>
                        {(location.city || location.country) && (
                          <p className="text-muted-foreground">
                            {[location.city, location.country].filter(Boolean).join(', ')}
                          </p>
                        )}
                        {location.website && (
                          <a
                            href={location.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline break-all"
                          >
                            {location.website}
                          </a>
                        )}
                        {location.notes && (
                          <p className="text-muted-foreground">{location.notes}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive self-start"
                        onClick={() => handleRemoveShowcaseLocation(index)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No locations listed yet. Add galleries or partner spaces to highlight where to see your work in person.
                </p>
              )}
            </CardContent>
          </Card>
        )}


        {/* Account Settings */}
        {isArtistAccount && (
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Artist Account</Label>
                <p className="text-sm text-muted-foreground">
                  Enable artist features like portfolio uploads and discoverability
                </p>
              </div>
              <Switch
                checked={formData.isProfessional}
                onCheckedChange={(checked) => handleInputChange('isProfessional', checked)}
              />
            </div>

            {/* Tip Jar Setting - Only for professional artists */}
            {formData.isProfessional && (
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Tip Jar</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow fans to send you tips to support your work
                  </p>
                </div>
                <Switch
                  checked={formData.tipJarEnabled}
                  onCheckedChange={(checked) => handleInputChange('tipJarEnabled', checked)}
                />
              </div>
            )}

            {/* Suggestions Setting - Only for professional artists */}
            {formData.isProfessional && (
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Fan Suggestions</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow fans to send you suggestions for future artwork
                  </p>
                </div>
                <Switch
                  checked={formData.suggestionsEnabled}
                  onCheckedChange={(checked) => handleInputChange('suggestionsEnabled', checked)}
                />
              </div>
            )}

            {/* Verified Professional Artist Status */}
            {formData.isProfessional && (
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label>Verified Professional Artist</Label>
                    {user?.isVerified ? (
                      <Badge variant="default" className="bg-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Pending Review
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {user?.isVerified 
                      ? "You are a verified professional artist with full platform access"
                      : "Request verification to access advanced features and gain credibility"
                    }
                  </p>
                </div>
                {!user?.isVerified && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowArtistRequest(true)}
                  >
                    Request Verification
                  </Button>
                )}
              </div>
            )}

          </CardContent>
        </Card>
        )}

        {/* Artist Account Request */}
        {!isArtistAccount && !user?.isVerified && (
          <Card>
            <CardHeader>
              <CardTitle>Request Professional Artist Account</CardTitle>
              <CardDescription>
                Submit your portfolio and credentials to become a verified professional artist with enhanced features and credibility.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showArtistRequest ? (
                <Button 
                  onClick={() => setShowArtistRequest(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Request Professional Artist Account
                </Button>
              ) : (
                <div className="space-y-6">
                  {/* Portfolio Images */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Portfolio Images *</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={testPortfolioUpload}
                            className="text-xs"
                          >
                            Test Upload
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const fileInput = document.getElementById('portfolio-upload') as HTMLInputElement;
                              console.log('🔍 File input element:', fileInput);
                              if (fileInput) {
                                console.log('🔍 File input found, triggering click');
                                fileInput.click();
                              } else {
                                console.error('❌ File input element not found');
                              }
                            }}
                            className="text-xs"
                          >
                            Debug File Input
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Upload 3-10 images showcasing your best work
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {portfolioImages.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Portfolio ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="absolute top-2 right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100"
                              onClick={() => removePortfolioImage(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {portfolioImages.length < 10 && (
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center h-32">
                            <div 
                              className="cursor-pointer w-full h-full flex items-center justify-center"
                              onClick={() => {
                                console.log('🎯 Add image clicked, triggering file input');
                                const fileInput = document.getElementById('portfolio-upload') as HTMLInputElement;
                                if (fileInput) {
                                  console.log('🎯 File input found, clicking it');
                                  fileInput.click();
                                } else {
                                  console.error('❌ File input not found');
                                }
                              }}
                            >
                              <div className="text-center">
                                <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Add Image</span>
                              </div>
                            </div>
                            <input
                              id="portfolio-upload"
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handlePortfolioImageUpload}
                              className="hidden"
                              style={{ display: 'none' }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="space-y-2">
                    <Label htmlFor="experience">Experience & Background</Label>
                    <Textarea
                      id="experience"
                      value={artistRequestData.experience}
                      onChange={(e) => setArtistRequestData(prev => ({ ...prev, experience: e.target.value }))}
                      placeholder="Tell us about your artistic journey, education, exhibitions, or any relevant experience..."
                      rows={3}
                    />
                  </div>

                  {/* Social Links */}
                  <div className="space-y-4">
                    <Label>Social Media Links</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="instagram">Instagram</Label>
                        <Input
                          id="instagram"
                          value={artistRequestData.socialLinks.instagram}
                          onChange={(e) => setArtistRequestData(prev => ({ 
                            ...prev, 
                            socialLinks: { ...prev.socialLinks, instagram: e.target.value }
                          }))}
                          placeholder="@username or URL"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="x">X (formerly Twitter)</Label>
                        <Input
                          id="x"
                          value={artistRequestData.socialLinks.x}
                          onChange={(e) => setArtistRequestData(prev => ({ 
                            ...prev, 
                            socialLinks: { ...prev.socialLinks, x: e.target.value }
                          }))}
                          placeholder="@username or URL"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          value={artistRequestData.socialLinks.website}
                          onChange={(e) => setArtistRequestData(prev => ({ 
                            ...prev, 
                            socialLinks: { ...prev.socialLinks, website: e.target.value }
                          }))}
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tiktok">TikTok</Label>
                        <Input
                          id="tiktok"
                          value={artistRequestData.socialLinks.tiktok}
                          onChange={(e) => setArtistRequestData(prev => ({ 
                            ...prev, 
                            socialLinks: { ...prev.socialLinks, tiktok: e.target.value }
                          }))}
                          placeholder="@username or URL"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowArtistRequest(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleArtistRequestSubmit}
                      disabled={isSubmittingRequest || portfolioImages.length === 0}
                    >
                      {isSubmittingRequest ? 'Submitting...' : 'Submit Verification Request'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit Button - Only show if not viewing artist request */}
        {!showArtistRequest && (
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              disabled={isLoading || handleAvailable === false}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}