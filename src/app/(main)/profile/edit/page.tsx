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
import { ArrowLeft, Upload, X, Check, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { doc, updateDoc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { ArtistRequest } from '@/lib/types';


export default function ProfileEditPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
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
    isProfessional: false,
  });

  const [artistRequestData, setArtistRequestData] = useState({
    artistStatement: '',
    experience: '',
    socialLinks: {
      instagram: '',
      twitter: '',
      website: '',
      tiktok: ''
    }
  });

  useEffect(() => {
    if (user) {
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
            isProfessional: changes.isProfessional || user.isProfessional || false,
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
          isProfessional: user.isProfessional || false,
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
    const files = event.target.files;
    if (!files || files.length === 0 || !user) return;

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
    
    try {
      const urls: string[] = [];
      
      // Upload files one by one to avoid overwhelming the system
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`📸 Uploading file ${i + 1}/${files.length}:`, file.name);
        
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
          throw new Error(`Failed to upload ${file.name}: ${fileError.message || 'Unknown error'}`);
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

    if (!artistRequestData.artistStatement.trim()) {
      toast({
        title: "Artist statement required",
        description: "Please provide an artist statement.",
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
          twitter: artistRequestData.socialLinks.twitter || undefined,
          website: artistRequestData.socialLinks.website || undefined,
          tiktok: artistRequestData.socialLinks.tiktok || undefined,
        },
        status: 'pending',
        submittedAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'artistRequests'), artistRequest);
      console.log('✅ Artist request submitted successfully:', docRef.id, artistRequest);

      toast({
        title: "Request submitted",
        description: "Your artist account request has been submitted for review.",
      });

      setShowArtistRequest(false);
      setPortfolioImages([]);
      setArtistRequestData({
        artistStatement: '',
        experience: '',
        socialLinks: { instagram: '', twitter: '', website: '', tiktok: '' }
      });
    } catch (error) {
      console.error('Error submitting artist request:', error);
      toast({
        title: "Submission failed",
        description: "Failed to submit artist request. Please try again.",
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
        isProfessional: formData.isProfessional,
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
    return <div>Loading...</div>;
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
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="City, Country"
              />
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
                <Label>Professional Artist Account</Label>
                <p className="text-sm text-muted-foreground">
                  Enable additional features like shop and community
                </p>
              </div>
              <Switch
                checked={formData.isProfessional}
                onCheckedChange={(checked) => handleInputChange('isProfessional', checked)}
              />
            </div>

            {formData.isProfessional && (
            )}
          </CardContent>
        </Card>

        {/* Artist Account Request */}
        {!formData.isProfessional && (
          <Card>
            <CardHeader>
              <CardTitle>Become a Professional Artist</CardTitle>
              <CardDescription>
                Request to become a professional artist to upload artworks, be discoverable, and access additional features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showArtistRequest ? (
                <Button 
                  onClick={() => setShowArtistRequest(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Request Artist Account
                </Button>
              ) : (
                <div className="space-y-6">
                  {/* Portfolio Images */}
                  <div className="space-y-4">
                    <div>
                      <Label>Portfolio Images *</Label>
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
                            <Label htmlFor="portfolio-upload" className="cursor-pointer">
                              <div className="text-center">
                                <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Add Image</span>
                              </div>
                            </Label>
                            <input
                              id="portfolio-upload"
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handlePortfolioImageUpload}
                              className="hidden"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Artist Statement */}
                  <div className="space-y-2">
                    <Label htmlFor="artistStatement">Artist Statement *</Label>
                    <Textarea
                      id="artistStatement"
                      value={artistRequestData.artistStatement}
                      onChange={(e) => setArtistRequestData(prev => ({ ...prev, artistStatement: e.target.value }))}
                      placeholder="Describe your artistic vision, inspiration, and what drives your creative process..."
                      rows={4}
                    />
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
                        <Label htmlFor="twitter">Twitter</Label>
                        <Input
                          id="twitter"
                          value={artistRequestData.socialLinks.twitter}
                          onChange={(e) => setArtistRequestData(prev => ({ 
                            ...prev, 
                            socialLinks: { ...prev.socialLinks, twitter: e.target.value }
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
                      disabled={isSubmittingRequest || portfolioImages.length === 0 || !artistRequestData.artistStatement.trim()}
                    >
                      {isSubmittingRequest ? 'Submitting...' : 'Submit Request'}
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