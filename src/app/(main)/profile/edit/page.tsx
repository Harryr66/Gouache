'use client';

import React, { useState, useEffect } from 'react';
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
import { ArrowLeft, Upload, X, Check, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { doc, updateDoc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { ArtistRequest } from '@/lib/types';
import { ThemeLoading } from '@/components/theme-loading';

// Countries list for dropdowns
const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 
  'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland',
  'Japan', 'South Korea', 'China', 'India', 'Brazil', 'Mexico', 
  'Argentina', 'Colombia', 'South Africa', 'Egypt', 'Morocco',
  'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Portugal',
  'Greece', 'Turkey', 'Israel', 'United Arab Emirates', 'Singapore',
  'New Zealand', 'Ireland', 'Austria', 'Czech Republic', 'Russia',
  'Nigeria', 'Kenya', 'Ghana', 'Chile', 'Peru', 'Venezuela',
  'Philippines', 'Thailand', 'Indonesia', 'Malaysia', 'Vietnam'
];

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

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
  const [showArtistRequest, setShowArtistRequest] = useState(false);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    handle: '',
    bio: '',
    artistType: '',
    location: '',
    countryOfOrigin: '',
    countryOfResidence: '',
    isProfessional: false,
    tipJarEnabled: false,
    suggestionsEnabled: false,
    hideLocation: false,
    hideFlags: false,
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
    if (user) {
      // Test Firebase connection when user is available
      testFirebaseConnection();
      
      // Check for offline changes first
      const offlineChanges = localStorage.getItem(`profile_offline_changes_${user.id}`);
      if (offlineChanges) {
        try {
          const changes = JSON.parse(offlineChanges);
          setFormData({
            name: changes.name || user.displayName || '',
            handle: changes.handle || user.username || '',
            bio: changes.bio || user.bio || '',
            artistType: changes.artistType || user.artistType || '',
            location: changes.location || user.location || '',
            countryOfOrigin: changes.countryOfOrigin || user.countryOfOrigin || '',
            countryOfResidence: changes.countryOfResidence || user.countryOfResidence || '',
            isProfessional: changes.isProfessional || user.isProfessional || false,
            tipJarEnabled: changes.tipJarEnabled || user.tipJarEnabled || false,
            suggestionsEnabled: changes.suggestionsEnabled || user.suggestionsEnabled || false,
            hideLocation: changes.hideLocation || user.hideLocation || false,
            hideFlags: changes.hideFlags || user.hideFlags || false,
          });
          
          if (changes.avatarUrl && changes.avatarUrl !== user.avatarUrl) {
            setPreviewImage(changes.avatarUrl);
          }
          
          console.log('Applied offline changes to form');
        } catch (error) {
          console.error('Error applying offline changes:', error);
        }
      } else {
        setFormData({
          name: user.displayName || '',
          handle: user.username || '',
          bio: user.bio || '',
          artistType: user.artistType || '',
          location: user.location || '',
          countryOfOrigin: user.countryOfOrigin || '',
          countryOfResidence: user.countryOfResidence || '',
          isProfessional: user.isProfessional || false,
          tipJarEnabled: user.tipJarEnabled || false,
          suggestionsEnabled: user.suggestionsEnabled || false,
          hideLocation: user.hideLocation || false,
          hideFlags: user.hideFlags || false,
        });
      }
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

  const removeImage = () => {
    setPreviewImage(null);
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
      const cleanUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        ...(user.avatarUrl && { avatarUrl: user.avatarUrl }),
        ...(user.bio && { bio: user.bio }),
        ...(user.location && { location: user.location }),
        ...(user.website && { website: user.website }),
        followerCount: user.followerCount || 0,
        followingCount: user.followingCount || 0,
        postCount: user.postCount || 0,
        isVerified: user.isVerified || false,
        isProfessional: user.isProfessional || false,
        createdAt: user.createdAt || new Date(),
        updatedAt: user.updatedAt || new Date()
      };

      const artistRequest: Omit<ArtistRequest, 'id'> = {
        userId: user.id,
        user: cleanUser as any,
        portfolioImages,
        artistStatement: artistRequestData.artistStatement,
        experience: artistRequestData.experience,
        socialLinks: {
          instagram: artistRequestData.socialLinks.instagram || undefined,
          x: artistRequestData.socialLinks.x || undefined,
          website: artistRequestData.socialLinks.website || undefined,
          tiktok: artistRequestData.socialLinks.tiktok || undefined,
        },
        status: 'pending',
        submittedAt: new Date()
      };

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
      toast({
        title: "Submission failed",
        description: "Failed to submit verification request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

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

      // Update user profile - filter out undefined values
      const userRef = doc(db, 'userProfiles', user.id);
      const updateData: any = {
        name: formData.name,
        handle: formData.handle,
        bio: formData.bio,
        artistType: formData.artistType,
        location: formData.location,
        countryOfOrigin: formData.countryOfOrigin,
        countryOfResidence: formData.countryOfResidence,
        isProfessional: formData.isProfessional,
        tipJarEnabled: formData.tipJarEnabled,
        suggestionsEnabled: formData.suggestionsEnabled,
        hideLocation: formData.hideLocation,
        hideFlags: formData.hideFlags,
        updatedAt: new Date()
      };

      // Only include avatarUrl if it's not undefined
      if (avatarUrl !== undefined) {
        updateData.avatarUrl = avatarUrl;
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
            </div>
          </CardContent>
        </Card>


        {/* Account Settings */}
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

        {/* Artist Account Request */}
        {formData.isProfessional && !user?.isVerified && (
          <Card>
            <CardHeader>
              <CardTitle>Request Professional Verification</CardTitle>
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
                  Request Professional Verification
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