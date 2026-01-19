'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, X, Check, Plus, Trash2, Loader2, AlertCircle, Pin, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { doc, updateDoc, getDoc, setDoc, collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateEmail, verifyBeforeUpdateEmail } from 'firebase/auth';
import { db, storage, auth } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { ArtistRequest, ShowcaseLocation } from '@/lib/types';
import { ThemeLoading } from '@/components/theme-loading';
import { NewsletterIntegrationWizard } from '@/components/newsletter-integration-wizard';
import { Suspense } from 'react';

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
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [bannerPreviewImage, setBannerPreviewImage] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [showArtistRequest, setShowArtistRequest] = useState(false);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  // Identity verification state
  const [identityVerificationStatus, setIdentityVerificationStatus] = useState<'pending' | 'verifying' | 'verified' | 'failed' | 'name_mismatch'>('pending');
  const [identitySessionId, setIdentitySessionId] = useState<string | null>(null);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [isStartingVerification, setIsStartingVerification] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const isInitialMount = useRef(true);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [newShowcaseLocation, setNewShowcaseLocation] = useState<ShowcaseLocation>({
    name: '',
    venue: '',
    city: '',
    country: '',
    website: '',
    notes: '',
    imageUrl: '',
    startDate: '',
    endDate: ''
  });

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    displayName: '',
    useDisplayName: false,
    handle: '',
    email: '',
    artistType: '',
    location: '',
    countryOfOrigin: '',
    countryOfResidence: '',
    isProfessional: false,
    tipJarEnabled: false,      // Tip jar disabled by default
    hideLocation: false,
    hideFlags: false,
    hideCard: false,
    hideShowcaseLocations: false,
    hideName: false,
    hideShop: true,   // Hidden by default
    hideLearn: true,   // Hidden by default
    hideLiveStream: false,   // Enabled by default for artists
    hideSocialIcons: false,
    hideAboutArtist: false,
    aboutInstructor: '',
    artistBio: '',  // About the Artist bio displayed on expanded artwork tiles
    bannerImageUrl: '',
    // Upcoming event fields
    eventCity: '',
    eventCountry: '',
    eventDate: '',
    eventStartDate: '',
    eventEndDate: '',
    showcaseLocations: [] as ShowcaseLocation[],
    newsletterLink: '',
    newsletterProvider: null as 'convertkit' | 'mailchimp' | 'substack' | 'custom' | null,
    socialLinks: {
      website: '',
      instagram: '',
      x: '',
      tiktok: ''
    }
  });

  const [artistRequestData, setArtistRequestData] = useState({
    artistStatement: '',
    experience: '',
    socialLinks: {
      website: '',
      instagram: '',
      x: '',
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
            artistType: changes.artistType || user.artistType || '',
            location: changes.location || user.location || '',
            countryOfOrigin: changes.countryOfOrigin || user.countryOfOrigin || '',
            countryOfResidence: changes.countryOfResidence || user.countryOfResidence || '',
            isProfessional: user.isProfessional || false,
            tipJarEnabled: user.isProfessional
              ? (changes.tipJarEnabled !== undefined
                ? changes.tipJarEnabled
                : (user.tipJarEnabled !== undefined ? user.tipJarEnabled : false))
              : false,
            hideLocation: changes.hideLocation || user.hideLocation || false,
            hideFlags: changes.hideFlags || user.hideFlags || false,
            hideCard: user.isProfessional ? (changes.hideCard || user.hideCard || false) : false,
            hideShowcaseLocations: user.isProfessional ? (changes.hideShowcaseLocations || user.hideShowcaseLocations || false) : false,
            // If undefined, default to hidden (true) until artist explicitly disables
            hideShop: user.isProfessional ? (changes.hideShop ?? (user.hideShop ?? true)) : true,
            hideLearn: user.isProfessional ? (changes.hideLearn ?? (user.hideLearn ?? true)) : true,
            hideLiveStream: user.isProfessional ? (changes.hideLiveStream ?? ((user as any).hideLiveStream ?? false)) : true,
            hideSocialIcons: user.isProfessional ? (changes.hideSocialIcons ?? ((user as any).hideSocialIcons ?? false)) : false,
            hideAboutArtist: user.isProfessional ? (changes.hideAboutArtist ?? ((user as any).hideAboutArtist ?? false)) : false,
            aboutInstructor: user.isProfessional ? (changes.aboutInstructor || (user as any).aboutInstructor || '') : '',
            artistBio: user.isProfessional ? (changes.artistBio || (user as any).artistBio || '') : '',
            bannerImageUrl: user.isProfessional ? (changes.bannerImageUrl || user.bannerImageUrl || '') : '',
            eventCity: user.isProfessional ? (changes.eventCity || user.eventCity || '') : '',
            eventCountry: user.isProfessional ? (changes.eventCountry || user.eventCountry || '') : '',
            eventDate: user.isProfessional ? (changes.eventDate || user.eventDate || '') : '',
            eventStartDate: user.isProfessional ? (changes.eventStartDate || (user as any).eventStartDate || '') : '',
            eventEndDate: user.isProfessional ? (changes.eventEndDate || (user as any).eventEndDate || '') : '',
            showcaseLocations: user.isProfessional
              ? (changes.showcaseLocations || user.showcaseLocations || [])
              : [],
            newsletterLink: changes.newsletterLink || user.newsletterLink || '',
            newsletterProvider: (user as any).newsletterProvider || null,
            socialLinks: {
              website: changes.socialLinks?.website || user.socialLinks?.website || '',
              instagram: changes.socialLinks?.instagram || user.socialLinks?.instagram || '',
              x: changes.socialLinks?.x || user.socialLinks?.x || '',
              tiktok: changes.socialLinks?.tiktok || user.socialLinks?.tiktok || ''
            }
          };
          setFormData(nextFormData);
          // Store initial form data for change detection
          initialFormDataRef.current = { ...nextFormData };
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
          let socialLinks = user.socialLinks || {};
          try {
            const userProfileDoc = await getDoc(doc(db, 'userProfiles', user.id));
            if (userProfileDoc.exists()) {
              const profileData = userProfileDoc.data();
              // Prioritize Firestore email (our source of truth for profile)
              userEmail = profileData.email || auth.currentUser?.email || user.email || '';
              // Get socialLinks from profileData if available
              if (profileData?.socialLinks) {
                socialLinks = profileData.socialLinks;
              }
            } else {
              // If no Firestore doc, use Firebase Auth email
              userEmail = auth.currentUser?.email || user.email || '';
            }
          } catch (error) {
            console.error('Error fetching email from Firestore:', error);
            // Fallback to Firebase Auth email on error
            userEmail = auth.currentUser?.email || user.email || '';
          }
          
          // Always use Firebase Auth email as source of truth, not Firestore email
          // This prevents mismatches
          const firebaseAuthEmail = auth.currentUser?.email || userEmail || '';
          
          // Don't overwrite email if it's already been set in formData (user might have just edited it)
          // But if formData email doesn't match Firebase Auth, use Firebase Auth email
          const currentEmail = formData.email && formData.email.toLowerCase() === firebaseAuthEmail.toLowerCase()
            ? formData.email
            : firebaseAuthEmail;
          
          // Split existing name for backward compatibility
          const existingName = user.displayName || '';
          const nameParts = existingName.split(' ');
          const userFirstName = (user as any).firstName || nameParts[0] || '';
          const userMiddleName = (user as any).middleName || (nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '');
          const userLastName = (user as any).lastName || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : '');
          
          const nextFormData = {
            firstName: userFirstName,
            middleName: userMiddleName,
            lastName: userLastName,
            displayName: (user as any).displayName || '',
            useDisplayName: (user as any).useDisplayName || false,
            handle: user.username || '',
            email: currentEmail,
            artistType: user.artistType || '',
            location: user.location || '',
            countryOfOrigin: user.countryOfOrigin || '',
            countryOfResidence: user.countryOfResidence || '',
            isProfessional: user.isProfessional || false,
          tipJarEnabled: user.isProfessional
            ? (user.tipJarEnabled !== undefined ? user.tipJarEnabled : false)
            : false,
          hideLocation: user.hideLocation || false,
          hideFlags: user.hideFlags || false,
          hideCard: user.isProfessional ? (user.hideCard || false) : false,
          hideShowcaseLocations: user.isProfessional ? ((user as any).hideShowcaseLocations || false) : false,
          hideName: (user as any).hideName || false,
          // Default to hidden (true) when field is undefined
          hideShop: ((user as any).hideShop ?? true),
          hideLearn: ((user as any).hideLearn ?? true),
          hideLiveStream: user.isProfessional ? (((user as any).hideLiveStream ?? false)) : true,
          hideSocialIcons: user.isProfessional ? (((user as any).hideSocialIcons ?? false)) : false,
          hideAboutArtist: user.isProfessional ? (((user as any).hideAboutArtist ?? false)) : false,
          aboutInstructor: user.isProfessional ? (((user as any).aboutInstructor || '')) : '',
          artistBio: user.isProfessional ? (((user as any).artistBio || '')) : '',
          bannerImageUrl: user.isProfessional ? (user.bannerImageUrl || '') : '',
          eventCity: user.isProfessional ? ((user as any).eventCity || '') : '',
          eventCountry: user.isProfessional ? ((user as any).eventCountry || '') : '',
          eventDate: user.isProfessional ? ((user as any).eventDate || '') : '',
          eventStartDate: user.isProfessional ? ((user as any).eventStartDate || '') : '',
          eventEndDate: user.isProfessional ? ((user as any).eventEndDate || '') : '',
          showcaseLocations: user.isProfessional ? (user.showcaseLocations || []) : [],
          newsletterLink: (user as any).newsletterLink || '',
          newsletterProvider: (user as any).newsletterProvider || null,
          socialLinks: {
            website: socialLinks.website || '',
            instagram: socialLinks.instagram || '',
            x: socialLinks.x || '',
            tiktok: socialLinks.tiktok || ''
          }
          };
          setFormData(nextFormData);
          // Store initial form data for change detection
          initialFormDataRef.current = { ...nextFormData };

          if (user.avatarUrl) {
            setPreviewImage(user.avatarUrl);
            setAvatarRemoved(false); // Reset removed flag when loading user data
          } else {
            setAvatarRemoved(false); // Reset removed flag if no avatar
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

  // Sync email on page load - check if Firebase Auth email differs from Firestore
  // This catches cases where email was verified but sync didn't happen yet
  useEffect(() => {
    if (!user || !auth.currentUser) return;
    
    const syncEmailOnLoad = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'userProfiles', user.id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const firebaseAuthEmail = auth.currentUser?.email || '';
          const firestoreEmail = userData.email || '';
          
          // If emails don't match, sync Firestore to match Firebase Auth
          if (firebaseAuthEmail && firestoreEmail && firebaseAuthEmail.toLowerCase() !== firestoreEmail.toLowerCase()) {
            console.log('📧 Email mismatch detected on profile edit page load, syncing...');
            await updateDoc(doc(db, 'userProfiles', user.id), {
              email: firebaseAuthEmail,
              updatedAt: new Date()
            });
            console.log('✅ Email synced on profile edit page load');
            // Refresh user data to reflect the change
            await refreshUser();
          }
        }
      } catch (error) {
        console.error('Error syncing email on profile edit page load:', error);
      }
    };
    
    syncEmailOnLoad();
  }, [user?.id, auth.currentUser?.email, refreshUser]);

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
    setAvatarRemoved(false); // Reset removed flag when uploading new image
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

  const removeImage = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User not found. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Mark that avatar should be removed
      setAvatarRemoved(true);
      
      // Delete the image from Firebase Storage if it exists
      if (user.avatarUrl) {
        try {
          // Extract the file path from the URL
          // Firebase Storage URLs look like: https://firebasestorage.googleapis.com/v0/b/.../o/avatars%2FuserId?alt=media&token=...
          const urlParts = user.avatarUrl.split('/o/');
          if (urlParts.length > 1) {
            const pathParts = urlParts[1].split('?');
            const decodedPath = decodeURIComponent(pathParts[0]);
            const imageRef = ref(storage, decodedPath);
            await deleteObject(imageRef);
            console.log('✅ Avatar image deleted from Storage');
          }
        } catch (storageError: any) {
          // If the file doesn't exist in storage, that's okay - just log it
          console.warn('Could not delete avatar from Storage:', storageError);
        }
      }
      
      // Clear the preview image
      setPreviewImage(null);
      
      // Update Firestore to remove avatarUrl
      const userRef = doc(db, 'userProfiles', user.id);
      await updateDoc(userRef, {
        avatarUrl: null,
        updatedAt: new Date()
      });
      
      // Refresh user data
      await refreshUser();
      
      toast({
        title: "Profile picture removed",
        description: "Your profile picture has been removed successfully.",
      });
    } catch (error) {
      console.error('Error removing profile picture:', error);
      setAvatarRemoved(false); // Reset on error
      toast({
        title: "Remove failed",
        description: "Failed to remove profile picture. Please try again.",
        variant: "destructive"
      });
    }
  };

  const removeBannerImage = () => {
    setBannerPreviewImage(null);
  };

  const handleAddShowcaseLocation = () => {
    if (!newShowcaseLocation.name.trim()) {
      toast({
        title: 'Name required',
        description: `Provide at least the name of the ${newShowcaseLocation.type === 'event' ? 'event' : 'gallery or space'}.`,
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
          venue: newShowcaseLocation.venue?.trim() || undefined,
          city: newShowcaseLocation.city?.trim() || undefined,
          country: newShowcaseLocation.country?.trim() || undefined,
          website: newShowcaseLocation.website?.trim() || undefined,
          notes: newShowcaseLocation.notes?.trim() || undefined,
          imageUrl: newShowcaseLocation.imageUrl?.trim() || undefined,
          startDate: newShowcaseLocation.startDate || undefined,
          endDate: newShowcaseLocation.endDate || undefined,
          type: newShowcaseLocation.type || 'location',
          pinned: newShowcaseLocation.pinned || false
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
      imageUrl: '',
      startDate: '',
      endDate: '',
      type: 'location',
      pinned: false
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
      toast({
        title: "No files selected",
        description: "Please select at least one image to upload.",
        variant: "destructive"
      });
      return;
    }
    

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
    
    try {
      const urls: string[] = [];
      
      // Upload files one by one to avoid overwhelming the system
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
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
          
          // Create storage reference
          const timestamp = Date.now();
          const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const imageRef = ref(storage, `portfolio/${user.id}/${fileName}`);
          
          // Upload file with metadata
          const metadata = {
            contentType: compressedFile.type,
            customMetadata: {
              uploadedBy: user.id,
              originalName: file.name
            }
          };
          
          const uploadResult = await uploadBytes(imageRef, compressedFile, metadata);
          
          // Get download URL
          const downloadURL = await getDownloadURL(imageRef);
          
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
      
      toast({
        title: "Upload successful",
        description: `${urls.length} image${urls.length > 1 ? 's' : ''} uploaded successfully.`,
      });
      
      // Reset file input
      event.target.value = '';
    } catch (error: any) {
      console.error('Portfolio image upload failed:', error);
      
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

  // Start Stripe Identity verification
  const startIdentityVerification = async () => {
    if (!user) return;
    
    setIsStartingVerification(true);
    try {
      // Generate full name from form parts for Stripe verification
      const fullName = [formData.firstName, formData.middleName, formData.lastName]
        .filter(part => part.trim())
        .join(' ');
      
      const response = await fetch('/api/stripe/identity/create-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          userId: user.id,
          expectedName: fullName || user.displayName, // Must match account name with full middle name
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start verification');
      }

      const { clientSecret, sessionId } = await response.json();
      setIdentitySessionId(sessionId);
      setIdentityVerificationStatus('verifying');

      // Load Stripe and open identity verification modal
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      
      if (stripe) {
        const result = await stripe.verifyIdentity(clientSecret);
        
        if (result.error) {
          console.error('Identity verification error:', result.error);
          setIdentityVerificationStatus('failed');
          toast({
            title: "Verification failed",
            description: result.error.message || "Identity verification was not completed.",
            variant: "destructive"
          });
        } else {
          // Check verification status
          await checkIdentityVerificationStatus(sessionId);
        }
      }
    } catch (error) {
      console.error('Error starting identity verification:', error);
      setIdentityVerificationStatus('failed');
      toast({
        title: "Verification error",
        description: error instanceof Error ? error.message : "Failed to start identity verification.",
        variant: "destructive"
      });
    } finally {
      setIsStartingVerification(false);
    }
  };

  // Check identity verification status
  const checkIdentityVerificationStatus = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/stripe/identity/create-verification?sessionId=${sessionId}`);
      const data = await response.json();

      if (data.verified && data.nameMatch) {
        setIdentityVerificationStatus('verified');
        setVerifiedName(data.verifiedName);
        toast({
          title: "Identity verified",
          description: "Your identity has been verified and matches your account name.",
        });
      } else if (data.verified && !data.nameMatch) {
        setIdentityVerificationStatus('name_mismatch');
        setVerifiedName(data.verifiedName);
        toast({
          title: "Name mismatch",
          description: `The name on your ID (${data.verifiedName}) does not match your account name (${data.expectedName}). Please update your account name or verify with matching ID.`,
          variant: "destructive"
        });
      } else if (data.status === 'requires_input') {
        setIdentityVerificationStatus('failed');
        toast({
          title: "Verification incomplete",
          description: "Please complete the verification process.",
          variant: "destructive"
        });
      } else {
        setIdentityVerificationStatus('pending');
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
    }
  };

  const handleArtistRequestSubmit = async () => {
    if (!user) return;

    if (portfolioImages.length < 3) {
      toast({
        title: "Portfolio required",
        description: "Please upload at least 3 portfolio images.",
        variant: "destructive"
      });
      return;
    }

    // Require identity verification
    if (identityVerificationStatus !== 'verified') {
      toast({
        title: "Identity verification required",
        description: "Please complete identity verification before submitting your artist request.",
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
      if (artistRequestData.socialLinks.website?.trim()) {
        socialLinks.website = artistRequestData.socialLinks.website.trim();
      }
      if (artistRequestData.socialLinks.instagram?.trim()) {
        socialLinks.instagram = artistRequestData.socialLinks.instagram.trim();
      }
      if (artistRequestData.socialLinks.x?.trim()) {
        socialLinks.x = artistRequestData.socialLinks.x.trim();
      }
      if (artistRequestData.socialLinks.tiktok?.trim()) {
        socialLinks.tiktok = artistRequestData.socialLinks.tiktok.trim();
      }

      // Convert portfolio image URLs to portfolio items format
      const portfolioItems = portfolioImages.map((imageUrl, index) => ({
        id: `portfolio-${Date.now()}-${index}`,
        imageUrl,
        title: 'Untitled Artwork',
        description: '',
        medium: '',
        dimensions: '',
        year: '',
        tags: [],
        createdAt: new Date()
      }));

      // Automatically convert the account to professional artist (no admin approval needed)
      await updateDoc(doc(db, 'userProfiles', user.id), {
        isProfessional: true,
        isVerified: true,
        portfolio: portfolioItems,
        experience: artistRequestData.experience,
        ...(artistRequestData.artistStatement?.trim() && { artistStatement: artistRequestData.artistStatement.trim() }),
        ...(Object.keys(socialLinks).length > 0 && { socialLinks }),
        ...(formData.aboutInstructor?.trim() && { aboutInstructor: formData.aboutInstructor.trim() }),
        updatedAt: serverTimestamp()
      });

      // Also save the request for record keeping (marked as approved)
      const artistRequest: any = {
        userId: user.id,
        user: cleanUser,
        portfolioImages,
        experience: artistRequestData.experience,
        status: 'approved',
        submittedAt: serverTimestamp(),
        reviewedAt: serverTimestamp(),
        reviewedBy: 'auto-approved',
        identityVerified: true,
        identitySessionId: identitySessionId,
        verifiedName: verifiedName,
      };

      // Only include optional fields if they have values (Firestore doesn't allow undefined)
      if (artistRequestData.artistStatement?.trim()) {
        artistRequest.artistStatement = artistRequestData.artistStatement.trim();
      }
      if (Object.keys(socialLinks).length > 0) {
        artistRequest.socialLinks = socialLinks;
      }

      await addDoc(collection(db, 'artistRequests'), artistRequest);
      console.log('✅ Artist account converted successfully');

      // Refresh user data to reflect the changes
      await refreshUser();

      toast({
        title: "Account converted successfully",
        description: "Your account has been converted to a professional artist account.",
      });

      // Redirect to profile
      router.push('/profile');

      setShowArtistRequest(false);
      setPortfolioImages([]);
      setArtistRequestData({
        artistStatement: '',
        experience: '',
        socialLinks: {
          website: '',
          instagram: '',
          x: '',
          tiktok: ''
        }
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

  // Store initial form data to detect actual changes
  const initialFormDataRef = useRef<any>(null);

  // Auto-save function (doesn't save images or handle changes)
  const autoSave = async (skipDebounce = false) => {
    if (!user || isInitialMount.current) return;
    
    // Don't auto-save if handle changed (needs validation)
    if (formData.handle !== user.username) return;
    
    // Check if there are actual changes from initial data
    if (initialFormDataRef.current) {
      const hasChanges = 
        formData.firstName !== initialFormDataRef.current.firstName ||
        formData.middleName !== initialFormDataRef.current.middleName ||
        formData.lastName !== initialFormDataRef.current.lastName ||
        formData.displayName !== initialFormDataRef.current.displayName ||
        formData.useDisplayName !== initialFormDataRef.current.useDisplayName ||
        formData.email !== initialFormDataRef.current.email ||
        formData.artistType !== initialFormDataRef.current.artistType ||
        formData.location !== initialFormDataRef.current.location ||
        formData.countryOfOrigin !== initialFormDataRef.current.countryOfOrigin ||
        formData.countryOfResidence !== initialFormDataRef.current.countryOfResidence ||
        // isProfessional is permanent for artist accounts, so we don't check for changes
        formData.tipJarEnabled !== initialFormDataRef.current.tipJarEnabled ||
        formData.hideLocation !== initialFormDataRef.current.hideLocation ||
        formData.hideFlags !== initialFormDataRef.current.hideFlags ||
        formData.hideShowcaseLocations !== initialFormDataRef.current.hideShowcaseLocations ||
        formData.hideName !== initialFormDataRef.current.hideName ||
        formData.hideShop !== initialFormDataRef.current.hideShop ||
        formData.hideLearn !== initialFormDataRef.current.hideLearn ||
        formData.hideLiveStream !== initialFormDataRef.current.hideLiveStream ||
        formData.hideSocialIcons !== initialFormDataRef.current.hideSocialIcons ||
        formData.hideAboutArtist !== initialFormDataRef.current.hideAboutArtist ||
        formData.aboutInstructor !== initialFormDataRef.current.aboutInstructor ||
        formData.newsletterLink !== initialFormDataRef.current.newsletterLink ||
        formData.eventCity !== initialFormDataRef.current.eventCity ||
        formData.eventCountry !== initialFormDataRef.current.eventCountry ||
        formData.eventDate !== initialFormDataRef.current.eventDate ||
        formData.eventStartDate !== initialFormDataRef.current.eventStartDate ||
        formData.eventEndDate !== initialFormDataRef.current.eventEndDate ||
        JSON.stringify(formData.showcaseLocations) !== JSON.stringify(initialFormDataRef.current.showcaseLocations) ||
        JSON.stringify(formData.socialLinks) !== JSON.stringify(initialFormDataRef.current.socialLinks);
      
      if (!hasChanges) {
        // No actual changes, don't save
        return;
      }
    }
    
    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    const performSave = async () => {
      try {
        setSaveStatus('saving');
        
        const userRef = doc(db, 'userProfiles', user.id);
        const allowArtistFields = Boolean(user.isProfessional);
        
        // CRITICAL: Email sync - Only update Firestore email if it matches Firebase Auth email
        const firebaseAuthEmail = auth.currentUser?.email || '';
        const formEmail = formData.email.trim();
        const emailToSave = (formEmail && formEmail.toLowerCase() === firebaseAuthEmail.toLowerCase()) 
          ? formEmail 
          : firebaseAuthEmail;
        
      // Generate full name from parts (legal name)
      const fullName = [formData.firstName, formData.middleName, formData.lastName]
        .filter(part => part.trim())
        .join(' ');
      
      // Use custom display name if enabled, otherwise use legal name
      const publicDisplayName = formData.useDisplayName && formData.displayName.trim() 
        ? formData.displayName.trim() 
        : fullName;
      
      const updateData: any = {
        firstName: formData.firstName,
        middleName: formData.middleName || '',
        lastName: formData.lastName,
        displayName: publicDisplayName, // Public display name (artist name or legal name)
        useDisplayName: formData.useDisplayName,
        name: fullName, // Keep legal name for backward compatibility and Stripe
        email: emailToSave, // Use synced email - same as handleSubmit
        location: formData.location,
        countryOfOrigin: formData.countryOfOrigin,
        countryOfResidence: formData.countryOfResidence,
        hideLocation: formData.hideLocation,
        hideFlags: formData.hideFlags,
        hideName: formData.hideName,
        hideShop: formData.hideShop,
        hideLearn: formData.hideLearn,
        updatedAt: new Date(),
        // isProfessional is permanent for artist accounts - always keep it true if user is already an artist
        isProfessional: user.isProfessional ? true : allowArtistFields,
        socialLinks: {
          ...(formData.socialLinks.website.trim() ? { website: formData.socialLinks.website.trim() } : {}),
          ...(formData.socialLinks.instagram.trim() ? { instagram: formData.socialLinks.instagram.trim() } : {}),
          ...(formData.socialLinks.x.trim() ? { x: formData.socialLinks.x.trim() } : {}),
          ...(formData.socialLinks.tiktok.trim() ? { tiktok: formData.socialLinks.tiktok.trim() } : {})
        },
        newsletterLink: formData.newsletterLink || null, // Save for ALL users
        hideSocialIcons: formData.hideSocialIcons
      };

        if (allowArtistFields) {
          updateData.artistType = formData.artistType;
          updateData.tipJarEnabled = formData.tipJarEnabled;
          updateData.hideCard = formData.hideCard;
          updateData.hideShowcaseLocations = formData.hideShowcaseLocations;
          updateData.hideAboutArtist = formData.hideAboutArtist;
          updateData.aboutInstructor = formData.aboutInstructor || null;
          updateData.eventCity = formData.eventCity || null;
          updateData.eventCountry = formData.eventCountry || null;
          updateData.eventDate = formData.eventDate || null;
          updateData.showcaseLocations = formData.showcaseLocations || [];
        } else {
          updateData.artistType = '';
          updateData.tipJarEnabled = false;
          updateData.hideCard = false;
          updateData.hideShowcaseLocations = false;
          updateData.hideAboutArtist = false;
          updateData.aboutInstructor = null;
          // Note: hideShop, hideLearn, newsletterLink, hideSocialIcons, and socialLinks are saved above for all users
          updateData.eventCity = null;
          updateData.eventCountry = null;
          updateData.eventDate = null;
          updateData.eventStartDate = null;
          updateData.eventEndDate = null;
          updateData.bannerImageUrl = null;
          updateData.showcaseLocations = [];
        }

        // Use setDoc with merge: true to ensure all fields are saved (same as handleSubmit)
        await withTimeout(setDoc(userRef, updateData, { merge: true }), 10000);
        
        // Refresh user data to sync changes (same as handleSubmit)
        await withTimeout(refreshUser(), 5000);
        
        // Update initial form data ref to current values after successful save
        initialFormDataRef.current = { ...formData };
        
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        
        console.log('✅ Auto-save successful:', Object.keys(updateData));
        
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
    formData.firstName,
    formData.middleName,
    formData.lastName,
    formData.displayName,
    formData.useDisplayName,
    formData.email,
    // formData.isProfessional removed - it's permanent for artist accounts
    formData.tipJarEnabled,
    formData.hideLocation,
    formData.hideFlags,
    formData.hideCard,
    formData.hideShowcaseLocations,
    formData.hideShop,
    formData.hideLearn,
    formData.hideSocialIcons,
    formData.hideAboutArtist,
    formData.aboutInstructor,
    formData.artistType,
    formData.location,
    formData.countryOfOrigin,
    formData.countryOfResidence,
    formData.newsletterLink,
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

      // Upload new image if preview exists - USE CLOUDFLARE ONLY (NO Firebase Storage)
      if (previewImage) {
        const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
        const file = fileInput?.files?.[0];
        
        if (file) {
          const compressedFile = await compressImage(file);
          // Upload to Cloudflare Images (NOT Firebase Storage)
          const { uploadMedia } = await import('@/lib/media-upload-v2');
          const uploadResult = await uploadMedia(compressedFile, 'image', user.id);
          avatarUrl = uploadResult.url; // Cloudflare Images URL
        }
      }

      let bannerImageUrl = user.bannerImageUrl;

      // Upload new banner image if preview exists - USE CLOUDFLARE ONLY (NO Firebase Storage)
      if (bannerPreviewImage) {
        const fileInput = document.getElementById('banner-upload') as HTMLInputElement;
        const file = fileInput?.files?.[0];
        
        if (file) {
          const compressedFile = await compressBannerImage(file);
          // Upload to Cloudflare Images (NOT Firebase Storage)
          const { uploadMedia } = await import('@/lib/media-upload-v2');
          const uploadResult = await uploadMedia(compressedFile, 'image', user.id);
          bannerImageUrl = uploadResult.url; // Cloudflare Images URL
        }
      }

      // Update user profile - filter out undefined values
      const userRef = doc(db, 'userProfiles', user.id);
      // For artist accounts, isProfessional is permanent and cannot be changed
      const allowArtistFields = Boolean(user.isProfessional);
      
      // CRITICAL: Email sync - Only update Firestore email if it matches Firebase Auth email
      // Firebase Auth email is the source of truth for password reset and authentication
      const firebaseAuthEmail = auth.currentUser?.email || '';
      const formEmail = formData.email.trim();
      
      // If email in form doesn't match Firebase Auth, use Firebase Auth email
      // This prevents mismatches when email verification hasn't completed
      const emailToSave = (formEmail && formEmail.toLowerCase() === firebaseAuthEmail.toLowerCase()) 
        ? formEmail 
        : firebaseAuthEmail;
      
      if (formEmail && formEmail.toLowerCase() !== firebaseAuthEmail.toLowerCase()) {
        console.warn('⚠️ Email mismatch detected in profile edit:', {
          formEmail: formEmail,
          firebaseAuthEmail: firebaseAuthEmail,
          userId: user.id
        });
        console.warn('⚠️ Using Firebase Auth email to prevent mismatch');
      }
      
      // Generate full name from parts (legal name)
      const fullName = [formData.firstName, formData.middleName, formData.lastName]
        .filter(part => part.trim())
        .join(' ');
      
      // Use custom display name if enabled, otherwise use legal name
      const publicDisplayName = formData.useDisplayName && formData.displayName.trim() 
        ? formData.displayName.trim() 
        : fullName;
      
      const updateData: any = {
        firstName: formData.firstName,
        middleName: formData.middleName || '',
        lastName: formData.lastName,
        displayName: publicDisplayName, // Public display name (artist name or legal name)
        useDisplayName: formData.useDisplayName,
        name: fullName, // Keep legal name for backward compatibility and Stripe
        handle: formData.handle,
        email: emailToSave, // Always use Firebase Auth email or verified email
        location: formData.location,
        countryOfOrigin: formData.countryOfOrigin,
        countryOfResidence: formData.countryOfResidence,
        hideLocation: formData.hideLocation,
        hideFlags: formData.hideFlags,
        hideName: formData.hideName,
        hideShop: formData.hideShop,
        hideLearn: formData.hideLearn,
        updatedAt: new Date(),
        // isProfessional is permanent for artist accounts - always keep it true if user is already an artist
        isProfessional: user.isProfessional ? true : allowArtistFields,
        socialLinks: {
          ...(formData.socialLinks.website.trim() ? { website: formData.socialLinks.website.trim() } : {}),
          ...(formData.socialLinks.instagram.trim() ? { instagram: formData.socialLinks.instagram.trim() } : {}),
          ...(formData.socialLinks.x.trim() ? { x: formData.socialLinks.x.trim() } : {}),
          ...(formData.socialLinks.tiktok.trim() ? { tiktok: formData.socialLinks.tiktok.trim() } : {})
        },
        newsletterLink: formData.newsletterLink || null, // Save for ALL users
        hideSocialIcons: formData.hideSocialIcons
      };

      // Update email in Firebase Auth if it has changed
      // IMPORTANT: Only update Firestore email AFTER Firebase Auth email is successfully updated
      // This prevents email mismatches
      if (auth.currentUser && formData.email && formData.email.trim().toLowerCase() !== auth.currentUser.email?.toLowerCase()) {
        try {
          // Configure action code settings to redirect to our custom domain
          const actionCodeSettings = {
            url: `${typeof window !== 'undefined' ? window.location.origin : 'https://gouache.art'}/auth/verify-email?mode=verifyAndChangeEmail`,
            handleCodeInApp: false, // Open in browser, not in-app
          };
          
          // verifyBeforeUpdateEmail sends a verification email to the new address
          // The email will be updated after the user clicks the verification link
          await verifyBeforeUpdateEmail(auth.currentUser, formData.email.trim(), actionCodeSettings);
          console.log('✅ Verification email sent to new email address');
          
          // IMPORTANT: Don't update Firestore email yet - wait for verification
          // Firestore email will be synced automatically when Firebase Auth email changes
          // The auth provider will detect the change and sync it
          toast({
            title: "Verification email sent",
            description: `A verification email has been sent to ${formData.email}. Please check your inbox and click the verification link to complete the email change. Your profile will be updated automatically after you verify and refresh the page.`,
            variant: "default",
            duration: 10000
          });
          
          // Remove email from updateData - we'll sync it after verification
          // This ensures Firestore email always matches Firebase Auth email
          delete updateData.email;
          
          // Refresh user data after a short delay to check if email was updated
          // This helps catch immediate updates
          setTimeout(() => {
            refreshUser().catch(console.error);
          }, 2000);
        } catch (error: any) {
          console.error('Error sending verification email:', error);
          
          // If verification fails, don't update Firestore email
          // This prevents mismatches
          delete updateData.email;
          
          // Handle specific error cases
          if (error.code === 'auth/requires-recent-login') {
            toast({
              title: "Email update requires re-authentication",
              description: "Please sign out and sign back in, then try updating your email again. Your current email will remain unchanged until verification is complete.",
              variant: "default"
            });
          } else if (error.code === 'auth/operation-not-allowed') {
            toast({
              title: "Email update not available",
              description: "Email verification is not enabled for your account. Your current email will remain unchanged.",
              variant: "default"
            });
          } else {
            toast({
              title: "Email update failed",
              description: "There was an issue updating your email. Your current email will remain unchanged. Please try again later.",
              variant: "destructive"
            });
          }
        }
      }

      if (allowArtistFields) {
        updateData.artistType = formData.artistType;
        updateData.tipJarEnabled = formData.tipJarEnabled;
        updateData.hideCard = formData.hideCard;
        updateData.hideShowcaseLocations = formData.hideShowcaseLocations;
        updateData.hideAboutArtist = formData.hideAboutArtist;
        updateData.aboutInstructor = formData.aboutInstructor || null;
        updateData.eventCity = formData.eventCity || null;
        updateData.eventCountry = formData.eventCountry || null;
        updateData.eventDate = formData.eventDate || null;
        updateData.eventStartDate = formData.eventStartDate || null;
        updateData.eventEndDate = formData.eventEndDate || null;
        updateData.showcaseLocations = formData.showcaseLocations || [];
      } else {
        updateData.artistType = '';
        updateData.tipJarEnabled = false;
        updateData.hideCard = false;
        updateData.hideShowcaseLocations = false;
        updateData.hideAboutArtist = false;
        updateData.aboutInstructor = null;
        // Note: hideShop, hideLearn, newsletterLink, hideSocialIcons, and socialLinks are saved above for all users
        updateData.eventCity = null;
        updateData.eventCountry = null;
        updateData.eventDate = null;
        updateData.eventStartDate = null;
        updateData.eventEndDate = null;
        updateData.bannerImageUrl = null;
        updateData.showcaseLocations = [];
      }

      // Update avatarUrl - handle new uploads and removals
      if (avatarRemoved) {
        // Avatar was explicitly removed
        updateData.avatarUrl = null;
      } else if (avatarUrl !== undefined && avatarUrl !== user.avatarUrl) {
        // New image uploaded
        updateData.avatarUrl = avatarUrl;
      } else if (avatarUrl === null && !user.avatarUrl) {
        // No avatar and no new upload
        updateData.avatarUrl = null;
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
      
      // Reset avatar removed flag after successful update
      if (avatarRemoved) {
        setAvatarRemoved(false);
      }

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
        <ThemeLoading text="" size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-4xl w-full max-w-full overflow-x-hidden">
      <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Back</span>
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
                    alt={[formData.firstName, formData.lastName].filter(p => p).join(' ')} 
                  />
                  <AvatarFallback className="text-xl">
                    {formData.firstName?.charAt(0)?.toUpperCase() || 'U'}
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

        {/* Simple Newsletter Link Section - Artist accounts only */}
        {isArtistAccount && (
        <Card id="newsletter-link">
          <CardHeader>
            <CardTitle>Newsletter Link</CardTitle>
            <CardDescription>
              Add a link to your newsletter signup page or landing page. This appears under your follower count on your profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newsletterLink">Newsletter or Landing Page URL (optional)</Label>
              <Input
                id="newsletterLink"
                type="url"
                value={formData.newsletterLink}
                onChange={(e) => handleInputChange('newsletterLink', e.target.value)}
                placeholder="https://example.com/newsletter or https://example.com/signup"
              />
              <p className="text-xs text-muted-foreground">
                Add any URL to your newsletter signup page, landing page, or website.
              </p>
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
            {/* Name Fields - Split for Stripe ID verification */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    required
                    placeholder="John"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name (Optional)</Label>
                  <Input
                    id="middleName"
                    value={formData.middleName}
                    onChange={(e) => handleInputChange('middleName', e.target.value)}
                    placeholder="Robert"
                  />
                  <p className="text-xs text-muted-foreground">Include if on your ID</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    required
                    placeholder="Smith"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter your full legal name exactly as it appears on your government-issued ID for identity verification.
              </p>
            </div>

            {/* Display Name (Artist Name) - Optional */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Use Display Name (Artist/Brand Name)</Label>
                  <p className="text-sm text-muted-foreground">
                    Show a custom name on your profile instead of your legal name for privacy
                  </p>
                </div>
                <Switch
                  checked={formData.useDisplayName}
                  onCheckedChange={(checked) => handleInputChange('useDisplayName', checked)}
                />
              </div>
              
              {formData.useDisplayName && (
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name (Public) *</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    placeholder="Your artist or brand name"
                    required={formData.useDisplayName}
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the name that will appear on your public profile. Your legal name remains private and is only used for identity verification.
                  </p>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Privacy Settings - Available to all users */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Privacy Settings</h3>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Hide name on profile</Label>
                  <p className="text-sm text-muted-foreground">
                    Only your handle will be visible on your public profile
                  </p>
                </div>
                <Switch
                  checked={formData.hideName}
                  onCheckedChange={(checked) => handleInputChange('hideName', checked)}
                />
              </div>
            </div>

            {/* Edit Profile Features - Artist accounts only */}
            {isArtistAccount && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Edit Profile Features</h3>
              
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
                  <Label>Hide Events & Locations</Label>
                  <p className="text-sm text-muted-foreground">
                    Hide the "Events & Locations" carousel from your public profile
                  </p>
                </div>
                <Switch
                  checked={formData.hideShowcaseLocations}
                  onCheckedChange={(checked) => handleInputChange('hideShowcaseLocations', checked)}
                />
              </div>

              {/* Shop and Learn toggles - Artist accounts only */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Shop</Label>
                  <p className="text-sm text-muted-foreground">
                    Show the "Shop" tab on your public profile
                  </p>
                </div>
                <Switch
                  checked={!formData.hideShop}
                  onCheckedChange={(checked) => {
                    if (!checked) {
                      const confirmDisable = window.confirm(
                        'Are you sure you want to disable your Shop tab? Customers will no longer see your shop on your profile.'
                      );
                      if (!confirmDisable) return;
                    }
                    handleInputChange('hideShop', !checked);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Learn</Label>
                  <p className="text-sm text-muted-foreground">
                    Show the "Learn" tab on your public profile to display your courses
                  </p>
                </div>
                <Switch
                  checked={!formData.hideLearn}
                  onCheckedChange={(checked) => {
                    if (!checked) {
                      const confirmDisable = window.confirm(
                        'Are you sure you want to disable your Learn tab? Customers will no longer see your courses on your profile.'
                      );
                      if (!confirmDisable) return;
                    }
                    handleInputChange('hideLearn', !checked);
                  }}
                />
              </div>

              {/* Tip Jar Setting */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Tip Jar</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow fans to send you tips to support your work
                  </p>
                </div>
                <Switch
                  checked={formData.tipJarEnabled || false}
                  onCheckedChange={(checked) => handleInputChange('tipJarEnabled', checked)}
                />
              </div>

              {/* Social Media Links */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold">Social Media Links</h3>
                <p className="text-sm text-muted-foreground">
                  Add your social media links. These will appear on your profile.
                </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="social-website">Website (optional)</Label>
                      <Input
                        id="social-website"
                        type="url"
                        value={formData.socialLinks.website}
                        onChange={(e) => handleInputChange('socialLinks', { ...formData.socialLinks, website: e.target.value })}
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="social-instagram">Instagram (optional)</Label>
                      <Input
                        id="social-instagram"
                        type="text"
                        value={formData.socialLinks.instagram}
                        onChange={(e) => handleInputChange('socialLinks', { ...formData.socialLinks, instagram: e.target.value })}
                        placeholder="@username or URL"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="social-x">X / Twitter (optional)</Label>
                      <Input
                        id="social-x"
                        type="text"
                        value={formData.socialLinks.x}
                        onChange={(e) => handleInputChange('socialLinks', { ...formData.socialLinks, x: e.target.value })}
                        placeholder="@username or URL"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="social-tiktok">TikTok (optional)</Label>
                      <Input
                        id="social-tiktok"
                        type="text"
                        value={formData.socialLinks.tiktok}
                        onChange={(e) => handleInputChange('socialLinks', { ...formData.socialLinks, tiktok: e.target.value })}
                        placeholder="@username or URL"
                      />
                    </div>
                  </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Hide social icons</Label>
                  <p className="text-sm text-muted-foreground">
                    Hide social media icons in the "About the Instructor" section on course pages
                  </p>
                </div>
                <Switch
                  checked={formData.hideSocialIcons}
                  onCheckedChange={(checked) => handleInputChange('hideSocialIcons', checked)}
                />
              </div>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Newsletter Integration - HIDDEN FOR NOW */}
        {false && (
        <Card id="newsletter-integration">
          <CardHeader>
            <CardTitle>Newsletter Integration</CardTitle>
            <CardDescription>
              Connect your newsletter provider to allow visitors to subscribe directly from your profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="p-4 text-center text-muted-foreground">Loading newsletter setup...</div>}>
              <NewsletterIntegrationWizard />
              </Suspense>
            </CardContent>
          </Card>
        )}

        {isArtistAccount && (
          <Card id="showcase-locations">
            <CardHeader>
              <CardTitle>Events & Locations</CardTitle>
              <CardDescription>
                Add events and showcase locations. Events are labeled as "Current" if they've started, or "Upcoming" if they start in the future. You can pin items to appear first in the carousel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="showcase-type">Type *</Label>
                  <Select
                    value={newShowcaseLocation.type || 'location'}
                    onValueChange={(value: 'event' | 'location') =>
                      setNewShowcaseLocation((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="location">Location</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="showcase-name">{newShowcaseLocation.type === 'event' ? 'Event name *' : 'Gallery or space name *'}</Label>
                  <Input
                    id="showcase-name"
                    placeholder={newShowcaseLocation.type === 'event' ? 'Exhibition Opening' : 'Gallery 302'}
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
                <div className="space-y-2">
                  <Label htmlFor="showcase-start-date">Start Date (Optional)</Label>
                  <Input
                    id="showcase-start-date"
                    type="date"
                    value={newShowcaseLocation.startDate || ''}
                    onChange={(event) =>
                      setNewShowcaseLocation((prev) => ({ ...prev, startDate: event.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {newShowcaseLocation.type === 'event' 
                      ? 'Event date. If in the future, labeled "Upcoming". If today or past, labeled "Current".'
                      : 'If not set, location shows immediately'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="showcase-end-date">End Date (Optional)</Label>
                  <Input
                    id="showcase-end-date"
                    type="date"
                    value={newShowcaseLocation.endDate || ''}
                    onChange={(event) =>
                      setNewShowcaseLocation((prev) => ({ ...prev, endDate: event.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">If not set, {newShowcaseLocation.type === 'event' ? 'event' : 'location'} remains indefinitely</p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="showcase-pinned"
                      checked={newShowcaseLocation.pinned || false}
                      onCheckedChange={(checked) =>
                        setNewShowcaseLocation((prev) => ({ ...prev, pinned: checked }))
                      }
                    />
                    <Label htmlFor="showcase-pinned" className="cursor-pointer">
                      Pin to start of carousel
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-8">
                    Pinned items appear first in the carousel, before current events
                  </p>
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
                  Add {newShowcaseLocation.type === 'event' ? 'Event' : 'Location'}
                </Button>
              </div>
              {formData.showcaseLocations.length > 0 ? (
                <div className="grid gap-3">
                  {formData.showcaseLocations.map((location, index) => {
                    const now = new Date();
                    const startDate = location.startDate ? new Date(location.startDate) : null;
                    const isCurrent = startDate && now >= startDate;
                    const isUpcoming = startDate && now < startDate;
                    
                    return (
                      <div
                        key={`${location.name}-${index}`}
                        className="rounded-lg border border-muted bg-muted/20 p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-3"
                      >
                        <div className="space-y-1 text-sm flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground">{location.name}</p>
                            <Badge variant="secondary" className="text-xs">
                              {location.type === 'event' ? 'Event' : 'Location'}
                            </Badge>
                            {location.pinned && (
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <Pin className="h-3 w-3" />
                                Pinned
                              </Badge>
                            )}
                            {location.startDate && (
                              <Badge variant={isCurrent ? "default" : "secondary"} className="text-xs">
                                {isCurrent ? 'Current' : isUpcoming ? 'Upcoming' : 'Past'}
                              </Badge>
                            )}
                          </div>
                          {location.venue && (
                            <p className="text-muted-foreground text-xs">{location.venue}</p>
                          )}
                          {(location.city || location.country) && (
                            <p className="text-muted-foreground">
                              {[location.city, location.country].filter(Boolean).join(', ')}
                            </p>
                          )}
                          {location.startDate && (
                            <p className="text-muted-foreground text-xs">
                              {new Date(location.startDate).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                              {location.endDate && ` - ${new Date(location.endDate).toLocaleDateString('en-US', { 
                                month: 'long', 
                                day: 'numeric' 
                              })}`}
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
                        <div className="flex gap-2 self-start">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updated = [...formData.showcaseLocations];
                              updated[index] = { ...updated[index], pinned: !updated[index].pinned };
                              setFormData((prev) => ({ ...prev, showcaseLocations: updated }));
                            }}
                            title={location.pinned ? 'Unpin' : 'Pin to start'}
                          >
                            <Pin className={`h-4 w-4 ${location.pinned ? 'fill-current' : ''}`} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleRemoveShowcaseLocation(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No events or locations listed yet. Add events and showcase locations to display them in a carousel on your profile.
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
            {/* Artist Account Status - Read-only */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <Label>Artist Account</Label>
                <p className="text-sm text-muted-foreground">
                  Your account is permanently set as a professional artist account. This cannot be changed.
                </p>
              </div>
              <Badge variant="default" className="bg-green-600">
                <Check className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>

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
                  {/* Step 1: Identity Verification */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold",
                        identityVerificationStatus === 'verified' 
                          ? "bg-green-500 text-white" 
                          : "bg-primary text-primary-foreground"
                      )}>
                        {identityVerificationStatus === 'verified' ? <Check className="h-4 w-4" /> : '1'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Label className="text-base">Identity Verification *</Label>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-5 w-5 p-0 hover:bg-transparent"
                                type="button"
                              >
                                <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Why do I need to verify my identity?</DialogTitle>
                                <DialogDescription className="pt-4">
                                  Gouache enforces ID verifications to prevent against fraudsters impersonating artists and listing or selling counterfeit artworks. ID verification is handled securely via Stripe Identification.
                                </DialogDescription>
                              </DialogHeader>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Verify your identity using a government-issued ID. The name must match your account name exactly.
                        </p>
                      </div>
                    </div>
                    
                    {identityVerificationStatus === 'pending' && (
                      <div className="ml-11 space-y-3">
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-amber-800 dark:text-amber-200">Important</p>
                              <p className="text-sm text-amber-700 dark:text-amber-300">
                                Your account name is: <strong>{[formData.firstName, formData.middleName, formData.lastName].filter(p => p.trim()).join(' ') || user?.displayName}</strong>. 
                                The name on your ID must match this exactly, including middle name if present.
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button 
                          type="button"
                          onClick={startIdentityVerification}
                          disabled={isStartingVerification}
                        >
                          {isStartingVerification ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Starting verification...
                            </>
                          ) : (
                            'Verify My Identity'
                          )}
                        </Button>
                      </div>
                    )}
                    
                    {identityVerificationStatus === 'verifying' && (
                      <div className="ml-11 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                          <p className="text-blue-800 dark:text-blue-200">Verification in progress...</p>
                        </div>
                      </div>
                    )}
                    
                    {identityVerificationStatus === 'verified' && (
                      <div className="ml-11 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium text-green-800 dark:text-green-200">Identity Verified</p>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              Verified as: {verifiedName}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {identityVerificationStatus === 'name_mismatch' && (
                      <div className="ml-11 space-y-3">
                        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-red-800 dark:text-red-200">Name Mismatch</p>
                              <p className="text-sm text-red-700 dark:text-red-300">
                                ID name: <strong>{verifiedName}</strong><br />
                                Account name: <strong>{[formData.firstName, formData.middleName, formData.lastName].filter(p => p.trim()).join(' ') || user?.displayName}</strong><br />
                                Please update your account name above to match your ID exactly, including middle name if present, then verify again.
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIdentityVerificationStatus('pending');
                            setIdentitySessionId(null);
                          }}
                        >
                          Try Again
                        </Button>
                      </div>
                    )}
                    
                    {identityVerificationStatus === 'failed' && (
                      <div className="ml-11 space-y-3">
                        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-red-800 dark:text-red-200">Verification Failed</p>
                              <p className="text-sm text-red-700 dark:text-red-300">
                                Please try again with a valid government-issued ID.
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button 
                          type="button"
                          onClick={startIdentityVerification}
                          disabled={isStartingVerification}
                        >
                          Try Again
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Portfolio Images */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold",
                        portfolioImages.length >= 3 
                          ? "bg-green-500 text-white" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        {portfolioImages.length >= 3 ? <Check className="h-4 w-4" /> : '2'}
                      </div>
                      <div>
                        <Label className="text-base">Portfolio Images *</Label>
                        <p className="text-sm text-muted-foreground">
                          Upload 3-10 images showcasing your best work
                        </p>
                      </div>
                    </div>
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

                  {/* About the Instructor */}
                  <div className="space-y-2">
                    <Label htmlFor="aboutInstructor">About the Instructor (optional, max 2 sentences)</Label>
                    <Textarea
                      id="aboutInstructor"
                      value={formData.aboutInstructor}
                      onChange={(e) => {
                        const value = e.target.value;
                        const sentences = value.split(/[.!?]+/).filter(s => s.trim().length > 0);
                        if (sentences.length <= 2) {
                          handleInputChange('aboutInstructor', value);
                        }
                      }}
                      placeholder="Write a brief description about yourself as an instructor..."
                      rows={3}
                      maxLength={300}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.aboutInstructor.split(/[.!?]+/).filter(s => s.trim().length > 0).length}/2 sentences
                    </p>
                  </div>

                  {/* Social Links */}
                  <div className="space-y-4">
                    <Label>Social Media Links</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="website">Website (optional)</Label>
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
                        <Label htmlFor="instagram">Instagram (optional)</Label>
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
                        <Label htmlFor="x">X / Twitter (optional)</Label>
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
                        <Label htmlFor="tiktok">TikTok (optional)</Label>
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
                      disabled={isSubmittingRequest || portfolioImages.length < 3 || identityVerificationStatus !== 'verified'}
                    >
                      {isSubmittingRequest ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Artist Account Request'
                      )}
                    </Button>
                    {(portfolioImages.length < 3 || identityVerificationStatus !== 'verified') && (
                      <p className="text-xs text-muted-foreground">
                        {identityVerificationStatus !== 'verified' && 'Complete identity verification • '}
                        {portfolioImages.length < 3 && `Upload ${3 - portfolioImages.length} more portfolio image${3 - portfolioImages.length > 1 ? 's' : ''}`}
                      </p>
                    )}
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