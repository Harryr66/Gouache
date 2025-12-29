'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/providers/auth-provider';
import { useContent } from '@/providers/content-provider';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { X, Play } from 'lucide-react';
import { compressImage } from '@/lib/image-compression';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { extractVideoThumbnail, blobToFile } from '@/lib/video-thumbnail';
import { VideoThumbnailSelector } from '@/components/video-thumbnail-selector';

// List of countries for delivery selector
const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Italy', 'Spain',
  'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland',
  'Ireland', 'Portugal', 'Greece', 'Poland', 'Czech Republic', 'Hungary', 'Romania', 'Bulgaria',
  'Croatia', 'Slovenia', 'Slovakia', 'Estonia', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta',
  'Cyprus', 'Japan', 'South Korea', 'China', 'India', 'Singapore', 'Hong Kong', 'Taiwan',
  'Thailand', 'Malaysia', 'Indonesia', 'Philippines', 'Vietnam', 'New Zealand', 'South Africa',
  'Brazil', 'Mexico', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Uruguay', 'Ecuador',
  'Venezuela', 'Panama', 'Costa Rica', 'Guatemala', 'Israel', 'United Arab Emirates', 'Saudi Arabia',
  'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Jordan', 'Lebanon', 'Egypt', 'Morocco',
  'Tunisia', 'Turkey', 'Russia', 'Ukraine', 'Belarus', 'Iceland', 'Liechtenstein', 'Monaco',
  'Andorra', 'San Marino', 'Vatican City', 'Albania', 'Bosnia and Herzegovina', 'Serbia', 'Montenegro',
  'North Macedonia', 'Kosovo', 'Moldova', 'Georgia', 'Armenia', 'Azerbaijan', 'Kazakhstan',
  'Uzbekistan', 'Kyrgyzstan', 'Tajikistan', 'Turkmenistan', 'Mongolia', 'Nepal', 'Bhutan',
  'Bangladesh', 'Sri Lanka', 'Maldives', 'Myanmar', 'Cambodia', 'Laos', 'Brunei', 'East Timor',
  'Papua New Guinea', 'Fiji', 'Samoa', 'Tonga', 'Vanuatu', 'Solomon Islands', 'Palau',
  'Micronesia', 'Marshall Islands', 'Kiribati', 'Tuvalu', 'Nauru', 'Mauritius', 'Seychelles',
  'Madagascar', 'Kenya', 'Tanzania', 'Uganda', 'Rwanda', 'Ethiopia', 'Ghana', 'Nigeria',
  'Senegal', 'Ivory Coast', 'Cameroon', 'Gabon', 'Botswana', 'Namibia', 'Zimbabwe', 'Zambia',
  'Mozambique', 'Angola', 'Malawi', 'Lesotho', 'Swaziland', 'Djibouti', 'Eritrea', 'Sudan',
  'Chad', 'Niger', 'Mali', 'Burkina Faso', 'Guinea', 'Sierra Leone', 'Liberia', 'Togo',
  'Benin', 'Gambia', 'Guinea-Bissau', 'Cape Verde', 'São Tomé and Príncipe', 'Equatorial Guinea',
  'Central African Republic', 'Democratic Republic of the Congo', 'Republic of the Congo', 'Burundi',
  'Comoros', 'Algeria', 'Libya', 'Tunisia', 'Mauritania', 'Western Sahara', 'Afghanistan',
  'Iran', 'Iraq', 'Syria', 'Yemen', 'Oman', 'Pakistan', 'Bangladesh', 'Myanmar',
  'North Korea', 'Mongolia', 'Bhutan', 'Nepal', 'Sri Lanka', 'Maldives', 'Other'
].sort();

/**
 * BASIC Artwork Upload - Portfolio only
 * Title, Description, Image - That's it
 */
export function UploadArtworkBasic() {
  const { user } = useAuth();
  const { addContent } = useContent();
  const router = useRouter();
  
  const [files, setFiles] = useState<File[]>([]);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [extractedThumbnailBlob, setExtractedThumbnailBlob] = useState<Blob | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isForSale, setIsForSale] = useState(false);
  const [isOriginal, setIsOriginal] = useState(true); // true = original, false = print
  const [priceType, setPriceType] = useState<'fixed' | 'contact'>('fixed');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'GBP' | 'EUR' | 'CAD' | 'AUD'>('USD');
  const [deliveryScope, setDeliveryScope] = useState<'worldwide' | 'specific'>('worldwide');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [countrySearch, setCountrySearch] = useState('');
  const [useAccountEmail, setUseAccountEmail] = useState(true);
  const [alternativeEmail, setAlternativeEmail] = useState('');
  const [dimensions, setDimensions] = useState({ width: '', height: '', unit: 'cm' as 'cm' | 'in' | 'px' });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [addToPortfolio, setAddToPortfolio] = useState(false); // Default to false - content goes to Discover only unless toggle is enabled
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadingFile, setCurrentUploadingFile] = useState<string>('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      // Validate video files (max 60 seconds)
      for (const file of selectedFiles) {
        if (file.type.startsWith('video/')) {
          try {
            const duration = await getVideoDuration(file);
            if (duration > 60) {
              toast({
                title: 'Video too long',
                description: `Video "${file.name}" is ${Math.round(duration)} seconds. Maximum length is 60 seconds.`,
                variant: 'destructive',
              });
              continue; // Skip this file
            }
          } catch (error) {
            toast({
              title: 'Error reading video',
              description: `Could not read video "${file.name}". Please try another file.`,
              variant: 'destructive',
            });
            continue; // Skip this file
          }
        }
      }
      
      // Only add valid files
      const validFiles = selectedFiles.filter(file => {
        if (file.type.startsWith('video/')) {
          // We already validated videos above, so if it's still in the array, it's valid
          return true;
        }
        return file.type.startsWith('image/');
      });
      
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  // Helper function to get video duration
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => reject(new Error('Failed to load video metadata'));
      video.src = URL.createObjectURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    
    // Validate video files
    for (const file of droppedFiles) {
      if (file.type.startsWith('video/')) {
        try {
          const duration = await getVideoDuration(file);
          if (duration > 60) {
            toast({
              title: 'Video too long',
              description: `Video "${file.name}" is ${Math.round(duration)} seconds. Maximum length is 60 seconds.`,
              variant: 'destructive',
            });
            droppedFiles.splice(droppedFiles.indexOf(file), 1);
          }
        } catch (error) {
          toast({
            title: 'Error reading video',
            description: `Could not read video "${file.name}". Please try another file.`,
            variant: 'destructive',
          });
          droppedFiles.splice(droppedFiles.indexOf(file), 1);
        }
      }
    }
    
    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        setThumbnailFile(file);
        // Clear extracted thumbnail when custom thumbnail is selected
        setExtractedThumbnailBlob(null);
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setThumbnailPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Thumbnail must be an image file.',
          variant: 'destructive',
        });
      }
    }
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setExtractedThumbnailBlob(null);
  };

  const handleThumbnailExtracted = (blob: Blob) => {
    setExtractedThumbnailBlob(blob);
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setThumbnailPreview(reader.result as string);
    };
    reader.readAsDataURL(blob);
  };

  const triggerFileInput = () => {
    const input = document.getElementById('images') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  // Capitalize first letter of tag for uniformity
  const capitalizeTag = (tag: string): string => {
    if (!tag) return tag;
    return tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag) {
      const capitalizedTag = capitalizeTag(trimmedTag);
      // Case-insensitive check for duplicates
      const tagExists = tags.some(t => t.toLowerCase() === capitalizedTag.toLowerCase());
      if (!tagExists) {
        setTags([...tags, capitalizedTag]);
        setTagInput('');
      }
    }
  };

  // Helper to check if tag exists (case-insensitive)
  const tagExists = (tag: string): boolean => {
    if (!tag.trim()) return false;
    const capitalizedTag = capitalizeTag(tag.trim());
    return tags.some(t => t.toLowerCase() === capitalizedTag.toLowerCase());
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !files.length || !title.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please select at least one image or video and enter a title.',
        variant: 'destructive',
      });
      return;
    }

    if (isForSale && priceType === 'fixed' && !price.trim()) {
      toast({
        title: 'Missing price',
        description: 'Please enter a price or select "Contact artist for pricing".',
        variant: 'destructive',
      });
      return;
    }

    if (isForSale && priceType === 'contact' && !useAccountEmail && !alternativeEmail.trim()) {
      toast({
        title: 'Missing email',
        description: 'Please enter an alternative email address.',
        variant: 'destructive',
      });
      return;
    }

    if (isForSale && priceType === 'contact' && !useAccountEmail && alternativeEmail.trim() && !alternativeEmail.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: 'Terms agreement required',
        description: 'Please confirm that this artwork is not AI-generated and is your own original creative work.',
        variant: 'destructive',
      });
      return;
    }

    if (tags.length === 0) {
      toast({
        title: 'Tags required',
        description: 'Please add at least one discovery tag.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Step 1: Compress images before upload (videos stay as-is for now)
      setCurrentUploadingFile('Preparing files...');
      const processedFiles = await Promise.all(
        files.map(async (file) => {
          if (file.type.startsWith('image/')) {
            try {
              const compressed = await compressImage(file);
              return compressed;
            } catch (error) {
              console.warn(`Failed to compress ${file.name}, using original:`, error);
              return file;
            }
          }
          return file; // Videos not compressed yet
        })
      );

      // Step 2: Use thumbnail (priority: custom file > extracted from selector > extract now)
      let thumbnailToUpload: File | null = thumbnailFile; // Custom uploaded file takes priority
      const firstFile = processedFiles[0];
      const isFirstFileVideo = firstFile.type.startsWith('video/');
      
      // If no custom thumbnail, use extracted from selector or extract now
      if (!thumbnailToUpload && isFirstFileVideo) {
        if (extractedThumbnailBlob) {
          // Use thumbnail extracted from the selector
          thumbnailToUpload = blobToFile(
            extractedThumbnailBlob,
            `thumbnail-${firstFile.name.replace(/\.[^/.]+$/, '.jpg')}`
          );
        } else {
          // Fallback: extract at 1 second if no selection was made
          try {
            setCurrentUploadingFile('Extracting thumbnail from video...');
            const thumbnailBlob = await extractVideoThumbnail(firstFile, 1);
            thumbnailToUpload = blobToFile(thumbnailBlob, `thumbnail-${firstFile.name.replace(/\.[^/.]+$/, '.jpg')}`);
          } catch (error) {
            console.warn('Failed to extract video thumbnail, will use Cloudflare thumbnail if available:', error);
          }
        }
      }

      // Step 3: Upload all files in parallel (with concurrency limit of 3)
      const uploadedUrls: string[] = new Array(processedFiles.length);
      const mediaTypes: ('image' | 'video')[] = new Array(processedFiles.length);
      const thumbnailUrls: (string | undefined)[] = new Array(processedFiles.length);
      const MAX_CONCURRENT_UPLOADS = 3;
      
      // Upload files in batches to avoid overwhelming the network
      for (let i = 0; i < processedFiles.length; i += MAX_CONCURRENT_UPLOADS) {
        const batch = processedFiles.slice(i, i + MAX_CONCURRENT_UPLOADS);
        
        const batchPromises = batch.map(async (file, batchIndex) => {
          const globalIndex = i + batchIndex;
          const isVideo = file.type.startsWith('video/');
          setCurrentUploadingFile(`${globalIndex + 1}/${processedFiles.length}: ${file.name}`);
          
          try {
            // Use Cloudflare if configured, otherwise fallback to Firebase
            const { uploadMedia } = await import('@/lib/media-upload-v2');
            const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';
            const uploadResult = await uploadMedia(file, mediaType, user.id);
            
            // Handle thumbnail: prioritize Cloudflare thumbnail, then custom, then extracted
            let thumbnailUrl = uploadResult.thumbnailUrl; // Use Cloudflare thumbnail if available (fastest)
            if (globalIndex === 0 && thumbnailToUpload && !thumbnailUrl) {
              // Only upload custom/extracted thumbnail if Cloudflare didn't provide one
              try {
                const { uploadMedia } = await import('@/lib/media-upload-v2');
                const thumbnailResult = await uploadMedia(thumbnailToUpload, 'image', user.id);
                thumbnailUrl = thumbnailResult.url;
              } catch (error) {
                console.warn('Failed to upload custom thumbnail:', error);
              }
            }
            
            // Update progress
            const overallProgress = ((globalIndex + 1) * 100 / processedFiles.length);
            setUploadProgress(overallProgress);
            
            return { url: uploadResult.url, type: mediaType, index: globalIndex, thumbnailUrl };
          } catch (error) {
            console.error(`Error uploading file ${globalIndex + 1}:`, error);
            throw error;
          }
        });

        // Wait for current batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Sort results by original index to maintain file order
        batchResults.sort((a, b) => a.index - b.index);
        
        // Add to arrays in correct order
        batchResults.forEach((result) => {
          uploadedUrls[result.index] = result.url;
          mediaTypes[result.index] = result.type;
          if (result.thumbnailUrl) {
            thumbnailUrls[result.index] = result.thumbnailUrl;
          }
        });
      }
      
      // Reset progress after all uploads complete
      setUploadProgress(100);
      setCurrentUploadingFile('');

      // First media file is the main display
      const primaryMediaUrl = uploadedUrls[0];
      const primaryMediaType = mediaTypes[0];
      // Remaining files are carousel items
      const supportingMedia = uploadedUrls.slice(1);
      const supportingMediaTypes = mediaTypes.slice(1);

      // Create artwork item for discover feed (always created, regardless of portfolio toggle)
      // Portfolio array update happens separately if toggle is enabled
      const primaryThumbnailUrl = thumbnailUrls[0];
      const artworkItem: any = {
        id: `artwork-${Date.now()}`,
        ...(primaryMediaType === 'image' && { imageUrl: primaryMediaUrl }), // For backward compatibility
        ...(primaryMediaType === 'video' && { videoUrl: primaryMediaUrl }),
        // Use thumbnail URL for videos (faster loading), fallback to primary media URL
        ...(primaryMediaType === 'video' && primaryThumbnailUrl && { imageUrl: primaryThumbnailUrl }),
        mediaType: primaryMediaType, // 'image' or 'video'
        mediaUrls: uploadedUrls, // All media URLs (images and videos)
        mediaTypes: mediaTypes, // Types for each media file
        ...(supportingMedia.length > 0 && { supportingImages: supportingMedia }),
        ...(supportingMedia.length > 0 && { supportingMedia: supportingMedia }),
        ...(supportingMediaTypes.length > 0 && { supportingMediaTypes: supportingMediaTypes }),
        title: title.trim(),
        description: description.trim() || '',
        type: 'artwork',
        showInPortfolio: addToPortfolio, // Controls visibility in portfolio tab
        showInShop: isForSale, // Controls visibility in shop
        isForSale: isForSale,
        artworkType: isOriginal ? 'original' : 'print',
        createdAt: new Date(),
        updatedAt: new Date(),
        likes: 0,
        commentsCount: 0,
        tags: tags,
        aiAssistance: 'none',
        isAI: false,
      };

      // Add sale-related fields if for sale (only relevant if adding to portfolio)
      if (isForSale && addToPortfolio) {
        if (priceType === 'fixed' && price.trim()) {
          artworkItem.price = parseFloat(price) * 100; // Convert to cents
          artworkItem.currency = currency;
        } else if (priceType === 'contact') {
          artworkItem.priceType = 'contact';
          artworkItem.contactForPrice = true;
          artworkItem.contactEmail = useAccountEmail ? (user.email || '') : alternativeEmail.trim();
        }
        artworkItem.deliveryScope = deliveryScope;
        if (deliveryScope === 'specific' && selectedCountries.length > 0) {
          artworkItem.deliveryCountries = selectedCountries.join(', ');
        }
      }

      // Add dimensions if provided (only relevant if adding to portfolio)
      if (addToPortfolio) {
        if (dimensions.width && dimensions.height) {
          artworkItem.dimensions = {
            width: parseFloat(dimensions.width) || 0,
            height: parseFloat(dimensions.height) || 0,
            unit: dimensions.unit,
          };
        } else {
          artworkItem.dimensions = { width: 0, height: 0, unit: 'cm' };
        }
      }

      // Recursive function to remove all undefined values (Firestore doesn't allow undefined)
      const removeUndefined = (obj: any): any => {
        if (obj === null || obj === undefined) {
          return null;
        }
        if (Array.isArray(obj)) {
          return obj.map(item => removeUndefined(item)).filter(item => item !== undefined && item !== null);
        }
        if (typeof obj === 'object' && obj.constructor === Object) {
          const cleaned: any = {};
          Object.keys(obj).forEach(key => {
            const value = removeUndefined(obj[key]);
            if (value !== undefined && value !== null) {
              cleaned[key] = value;
            }
          });
          return cleaned;
        }
        return obj;
      };

      const cleanPortfolioItem = removeUndefined(artworkItem);

      // NEW: Update user's portfolio in portfolioItems collection if toggle is enabled
      if (addToPortfolio) {
        const { PortfolioService } = await import('@/lib/database');
        
        const portfolioItemData: any = {
          userId: user.id,
          ...cleanPortfolioItem,
          showInPortfolio: true,
          deleted: false,
        };

        // Check if item already exists
        const existingItem = await PortfolioService.getPortfolioItem(artworkItem.id);
        
        if (existingItem) {
          await PortfolioService.updatePortfolioItem(artworkItem.id, portfolioItemData);
        } else {
          // Use setDoc to use the existing ID
          await setDoc(doc(db, 'portfolioItems', artworkItem.id), {
            ...portfolioItemData,
            id: artworkItem.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        // BACKWARD COMPATIBILITY: Also update userProfiles.portfolio array
        try {
          const userDocRef = doc(db, 'userProfiles', user.id);
          const userDoc = await getDoc(userDocRef);
          const currentPortfolio = userDoc.exists() ? (userDoc.data().portfolio || []) : [];
          const cleanedExistingPortfolio = currentPortfolio.map((item: any) => removeUndefined(item));
          const updatedPortfolio = [...cleanedExistingPortfolio, cleanPortfolioItem];
          const finalCleanedPortfolio = removeUndefined(updatedPortfolio);
          
          await updateDoc(userDocRef, {
            portfolio: finalCleanedPortfolio,
            updatedAt: new Date(),
          });
        } catch (legacyError) {
          console.warn('⚠️ Failed to update legacy userProfiles.portfolio (non-critical):', legacyError);
        }
      }

      // Always create artwork/post for Discover feed (regardless of portfolio toggle or sale status)
      // This ensures all uploads from this portal appear in Discover
      const artworkForDiscover: any = {
        id: artworkItem.id,
        artist: {
          id: user.id,
          name: user.displayName || user.username || 'Artist',
          handle: user.username || '',
          avatarUrl: user.avatarUrl || null,
          followerCount: user.followerCount || 0,
          followingCount: user.followingCount || 0,
          createdAt: user.createdAt || new Date(),
        },
        title: title.trim(),
        description: description.trim() || '',
        ...(primaryMediaType === 'image' && { imageUrl: primaryMediaUrl }),
        ...(primaryMediaType === 'video' && { videoUrl: primaryMediaUrl }),
        mediaType: primaryMediaType,
        mediaUrls: uploadedUrls,
        mediaTypes: mediaTypes,
        ...(supportingMedia.length > 0 && { supportingImages: supportingMedia }),
        ...(supportingMedia.length > 0 && { supportingMedia: supportingMedia }),
        ...(supportingMediaTypes.length > 0 && { supportingMediaTypes: supportingMediaTypes }),
        imageAiHint: description.trim() || title.trim() || '',
        tags: tags,
        type: 'artwork',
        showInPortfolio: addToPortfolio, // Controls visibility in portfolio tab
        showInShop: isForSale, // Controls visibility in shop
        isForSale: isForSale,
        ...(addToPortfolio && { artworkType: isOriginal ? 'original' : 'print' }),
        createdAt: new Date(),
        updatedAt: new Date(),
        views: 0,
        likes: 0,
        commentsCount: 0,
        isAI: false,
        aiAssistance: 'none' as const,
      };

      // Add dimensions if provided and adding to portfolio
      if (addToPortfolio && dimensions.width && dimensions.height) {
        artworkForDiscover.dimensions = {
          width: parseFloat(dimensions.width) || 0,
          height: parseFloat(dimensions.height) || 0,
          unit: dimensions.unit,
        };
      }

      // Add sale-related fields if for sale and adding to portfolio
      if (isForSale && addToPortfolio) {
        if (priceType === 'fixed' && price.trim()) {
          artworkForDiscover.price = parseFloat(price) * 100; // Convert to cents
          artworkForDiscover.currency = currency;
        } else if (priceType === 'contact') {
          artworkForDiscover.priceType = 'contact';
          artworkForDiscover.contactForPrice = true;
          artworkForDiscover.contactEmail = useAccountEmail ? (user.email || '') : alternativeEmail.trim();
        }
        artworkForDiscover.deliveryScope = deliveryScope;
        if (deliveryScope === 'specific' && selectedCountries.length > 0) {
          artworkForDiscover.deliveryCountries = selectedCountries.join(', ');
        }
      }

      // Create post object for Discover feed
      const postForDiscover = {
        id: `post-${Date.now()}`,
        artworkId: artworkForDiscover.id,
        artist: artworkForDiscover.artist,
        imageUrl: primaryMediaType === 'image' ? primaryMediaUrl : (uploadedUrls.find((_, i) => mediaTypes[i] === 'image') || primaryMediaUrl),
        imageAiHint: artworkForDiscover.imageAiHint,
        caption: description.trim() || '',
        likes: 0,
        commentsCount: 0,
        timestamp: new Date().toISOString(),
        createdAt: Date.now(),
        tags: tags,
      };

      // Always add to Discover feed via ContentProvider (regardless of portfolio toggle)
      await addContent(postForDiscover, artworkForDiscover);

      // If marked for sale, also add to artworks collection for shop display (legacy support)
      if (isForSale && addToPortfolio) {
        const artworkForShop: any = {
          id: artworkItem.id,
          artist: {
            id: user.id,
            name: user.displayName,
            handle: user.username,
            avatarUrl: user.avatarUrl,
            followerCount: user.followerCount || 0,
            followingCount: user.followingCount || 0,
            createdAt: user.createdAt || new Date(),
          },
          title: title.trim(),
          description: description.trim() || '',
          imageUrl: primaryMediaType === 'image' ? primaryMediaUrl : undefined,
          videoUrl: primaryMediaType === 'video' ? primaryMediaUrl : undefined,
          mediaType: primaryMediaType,
          mediaUrls: uploadedUrls,
          mediaTypes: mediaTypes,
          supportingImages: supportingMedia.length > 0 ? supportingMedia : undefined,
          supportingMedia: supportingMedia.length > 0 ? supportingMedia : undefined,
          supportingMediaTypes: supportingMediaTypes.length > 0 ? supportingMediaTypes : undefined,
          imageAiHint: description.trim() || '',
          tags: tags,
          currency: 'USD',
          isForSale: true,
          type: 'artwork',
          showInPortfolio: addToPortfolio,
          showInShop: true,
          artworkType: isOriginal ? 'original' : 'print',
          dimensions: { width: 0, height: 0, unit: 'cm' },
          createdAt: new Date(),
          updatedAt: new Date(),
          views: 0,
          likes: 0,
          isAI: false,
          aiAssistance: 'none' as const,
        };

        if (priceType === 'fixed' && price.trim()) {
          artworkForShop.price = parseFloat(price) * 100;
          artworkForShop.currency = 'USD';
        } else if (priceType === 'contact') {
          artworkForShop.priceType = 'contact';
          artworkForShop.contactForPrice = true;
          artworkForShop.contactEmail = useAccountEmail ? (user.email || '') : alternativeEmail.trim();
        }
        artworkForShop.deliveryScope = deliveryScope;
        if (deliveryScope === 'specific' && selectedCountries.length > 0) {
          artworkForShop.deliveryCountries = selectedCountries.join(', ');
        }

        // Add dimensions if provided
        if (dimensions.width && dimensions.height) {
          artworkForShop.dimensions = {
            width: parseFloat(dimensions.width) || 0,
            height: parseFloat(dimensions.height) || 0,
            unit: dimensions.unit,
          };
        } else {
          artworkForShop.dimensions = { width: 0, height: 0, unit: 'cm' };
        }

        // Create post object for feed
        const post = {
          id: `post-${Date.now()}`,
          artworkId: artworkForShop.id,
          artist: artworkForShop.artist,
          imageUrl: primaryMediaType === 'image' ? primaryMediaUrl : (uploadedUrls.find((_, i) => mediaTypes[i] === 'image') || primaryMediaUrl),
          imageAiHint: artworkForShop.imageAiHint,
          caption: description.trim() || '',
          likes: 0,
          commentsCount: 0,
          timestamp: new Date().toISOString(),
          createdAt: Date.now(),
          tags: tags,
        };

        // Add to posts/artworks collections via ContentProvider
        await addContent(post, artworkForShop);
      }

      // Reset form and cleanup object URLs
      files.forEach(file => {
        const url = URL.createObjectURL(file);
        URL.revokeObjectURL(url);
      });
      setFiles([]);
      setTitle('');
      setDescription('');
      setIsForSale(false);
      setIsOriginal(true);
      setPriceType('fixed');
      setPrice('');
      setCurrency('USD');
      setDeliveryScope('worldwide');
      setSelectedCountries([]);
      setCountrySearch('');
      setUseAccountEmail(true);
      setAlternativeEmail('');
      setDimensions({ width: '', height: '', unit: 'cm' });

      // Navigate to portfolio
      router.push('/profile?tab=portfolio');
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(0);
      setCurrentUploadingFile('');
    } finally {
      setUploading(false);
      // Reset progress after a delay to allow user to see completion
      if (uploadProgress === 100) {
        setTimeout(() => {
          setUploadProgress(0);
          setCurrentUploadingFile('');
        }, 1000);
      }
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">Please log in to upload artwork.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discover Uploads</CardTitle>
        <CardDescription>
          Upload images & videos to showcase in your portfolio, creation process & get discovered by new fans.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Media Upload (Images & Videos) */}
          <div className="space-y-2">
            <Label>Images & Videos *</Label>
            <p className="text-xs text-muted-foreground">
              Upload images or short videos (max 60 seconds). Videos will autoplay in the discover feed.
            </p>
            
            {/* Hidden file input */}
            <Input
              type="file"
              id="images"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Drag and drop area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-6 transition-colors
                ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                ${files.length === 0 ? 'cursor-pointer hover:border-primary hover:bg-primary/5' : ''}
              `}
              onClick={files.length === 0 ? triggerFileInput : undefined}
            >
              {files.length === 0 ? (
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">Click or drag images and videos here</p>
                  <p className="text-xs text-muted-foreground">
                    Select multiple files at once or add them one by one. Videos must be 60 seconds or less.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {files.length} file(s) selected
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={triggerFileInput}
                    >
                      Add More Files
                    </Button>
                  </div>
                  
                  {/* Media preview tiles */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {files.map((file, index) => {
                      const isVideo = file.type.startsWith('video/');
                      const previewUrl = URL.createObjectURL(file);
                      return (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border-2 border-muted">
                            {isVideo ? (
                              <video
                                src={previewUrl}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                              />
                            ) : (
                              <img
                                src={previewUrl}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            )}
                            {isVideo && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <Play className="h-8 w-8 text-white" />
                              </div>
                            )}
                          </div>
                          {index === 0 && (
                            <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                              Main
                            </div>
                          )}
                          {isVideo && (
                            <div className="absolute top-1 right-8 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
                              Video
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(index);
                              URL.revokeObjectURL(previewUrl);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {file.name}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  
                  {files.length > 1 && (
                    <p className="text-xs text-muted-foreground text-center">
                      First file is the main display. Others will appear in carousel.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Thumbnail Selection (for videos) */}
          {files.length > 0 && files[0].type.startsWith('video/') && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label>Select Video Thumbnail</Label>
                <p className="text-xs text-muted-foreground">
                  Scrub through your video to select the perfect frame for the thumbnail. You can also upload a custom thumbnail image below.
                </p>
              </div>
              
              {/* Video thumbnail selector */}
              <VideoThumbnailSelector
                videoFile={files[0]}
                onThumbnailSelected={handleThumbnailExtracted}
                initialTime={1}
              />
              
              {/* Option to upload custom thumbnail instead */}
              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="thumbnail">Or Upload Custom Thumbnail Image (Optional)</Label>
                {thumbnailFile && !extractedThumbnailBlob ? (
                  <div className="relative inline-block">
                    <div className="aspect-video w-full max-w-xs rounded-lg overflow-hidden border-2 border-muted">
                      <img
                        src={thumbnailPreview || ''}
                        alt="Custom thumbnail preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => {
                        setThumbnailFile(null);
                        setThumbnailPreview(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Input
                    type="file"
                    id="thumbnail"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="w-full"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Uploading a custom thumbnail will override the selected frame above.
                </p>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
            />
          </div>

          {/* Discovery Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Discovery Tags *</Label>
            <div className="flex flex-wrap gap-2 pb-2 min-h-[2.5rem]">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground ml-1"
                    onClick={() => removeTag(tag)}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Type a tag and press Enter or click Add Tag"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || tagExists(tagInput.trim())}
              >
                Add Tag
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add at least one tag. Tags help users discover your artwork through search and filters.
            </p>
          </div>

          {/* Add to Portfolio Toggle */}
          <div className="flex items-start justify-between space-x-4 py-4 border-t">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="addToPortfolio" className="text-base font-semibold cursor-pointer">
                  This is an Artwork. (Add to my portfolio).
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Enable to mark this as artwork and add to your profile's portfolio. When disabled, this will be posted as discover content only.
              </p>
            </div>
            <div className="flex-shrink-0 pt-1">
              <Switch
                id="addToPortfolio"
                checked={addToPortfolio}
                onCheckedChange={(checked) => {
                  setAddToPortfolio(checked);
                  // Reset for sale when portfolio toggle is disabled
                  if (!checked) {
                    setIsForSale(false);
                  }
                }}
              />
            </div>
          </div>

          {/* Only show Dimensions and Sale options if adding to portfolio */}
          {addToPortfolio && (
            <>
              {/* Dimensions */}
              <div className="space-y-2">
                <Label>Dimensions (Optional)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Width"
                    value={dimensions.width}
                    onChange={(e) => setDimensions({ ...dimensions, width: e.target.value })}
                    type="number"
                    min="0"
                    step="0.1"
                  />
                  <Input
                    placeholder="Height"
                    value={dimensions.height}
                    onChange={(e) => setDimensions({ ...dimensions, height: e.target.value })}
                    type="number"
                    min="0"
                    step="0.1"
                  />
                  <Select 
                    value={dimensions.unit} 
                    onValueChange={(value: 'cm' | 'in' | 'px') => setDimensions({ ...dimensions, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cm">cm</SelectItem>
                      <SelectItem value="in">in</SelectItem>
                      <SelectItem value="px">px</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Mark for Sale */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="isForSale" className="cursor-pointer text-base font-semibold">
                      Mark this item for sale
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable this to list this artwork in your shop.
                    </p>
                  </div>
                  <Switch
                    id="isForSale"
                    checked={isForSale}
                    onCheckedChange={setIsForSale}
                  />
                </div>
              </div>
            </>
          )}

          {/* Sale Options (only shown if for sale) */}
          {isForSale && (
            <div className="space-y-4 p-4 border rounded-lg border-l-2">
              <Label className="text-base font-semibold mb-4 block">Pricing & Delivery</Label>
              
              {/* Artwork Type */}
              <div className="space-y-2">
                <Label>Artwork Type</Label>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="original"
                      checked={isOriginal}
                      onCheckedChange={(checked) => setIsOriginal(checked === true)}
                    />
                    <Label htmlFor="original" className="cursor-pointer font-normal">
                      This is an original artwork
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="print"
                      checked={!isOriginal}
                      onCheckedChange={(checked) => setIsOriginal(checked !== true)}
                    />
                    <Label htmlFor="print" className="cursor-pointer font-normal">
                      This is a print
                    </Label>
                  </div>
                </div>
              </div>
              
              {/* Price Type */}
              <div className="space-y-2">
                <Label>Pricing</Label>
                <Select
                  value={priceType}
                  onValueChange={(value: 'fixed' | 'contact') => setPriceType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Set Price</SelectItem>
                    <SelectItem value="contact">Contact Artist</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fixed Price Fields */}
              {priceType === 'fixed' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select 
                      value={currency} 
                      onValueChange={(value: 'USD' | 'GBP' | 'EUR' | 'CAD' | 'AUD') => setCurrency(value)}
                    >
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="CAD">CAD (C$)</SelectItem>
                        <SelectItem value="AUD">AUD (A$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Contact Artist Email Options */}
              {priceType === 'contact' && (
                <div className="space-y-3">
                  <Label>Contact Email</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="useAccountEmail"
                        name="contactEmail"
                        checked={useAccountEmail}
                        onChange={() => {
                          setUseAccountEmail(true);
                          setAlternativeEmail('');
                        }}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="useAccountEmail" className="cursor-pointer font-normal">
                        Use account email ({user?.email || 'your email'})
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="useAlternativeEmail"
                        name="contactEmail"
                        checked={!useAccountEmail}
                        onChange={() => setUseAccountEmail(false)}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="useAlternativeEmail" className="cursor-pointer font-normal">
                        Use alternative email
                      </Label>
                    </div>
                    {!useAccountEmail && (
                      <div className="ml-6 space-y-2">
                        <Label htmlFor="alternativeEmail">Alternative Email *</Label>
                        <Input
                          id="alternativeEmail"
                          type="email"
                          value={alternativeEmail}
                          onChange={(e) => setAlternativeEmail(e.target.value)}
                          placeholder="business@example.com"
                          required={!useAccountEmail}
                        />
                        <p className="text-xs text-muted-foreground">
                          Customers will contact this email for pricing inquiries.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Delivery Scope */}
              <div className="space-y-2">
                <Label>Available for delivery</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className={deliveryScope === 'worldwide' ? '!bg-primary !text-primary-foreground hover:!bg-primary/90 hover:!text-primary-foreground border-primary' : ''}
                    onClick={() => {
                      setDeliveryScope('worldwide');
                      setSelectedCountries([]);
                      setCountrySearch('');
                    }}
                  >
                    Worldwide
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={deliveryScope === 'specific' ? '!bg-primary !text-primary-foreground hover:!bg-primary/90 hover:!text-primary-foreground border-primary' : ''}
                    onClick={() => setDeliveryScope('specific')}
                  >
                    Specific countries
                  </Button>
                </div>
                {deliveryScope === 'specific' && (
                  <div className="space-y-2 mt-3">
                    <Label>Select countries</Label>
                    <Input
                      placeholder="Search countries..."
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      className="mb-2"
                    />
                    <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                      {COUNTRIES.filter(country => 
                        country.toLowerCase().includes(countrySearch.toLowerCase())
                      ).map((country) => (
                        <div key={country} className="flex items-center space-x-2">
                          <Checkbox
                            id={`country-${country}`}
                            checked={selectedCountries.includes(country)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCountries([...selectedCountries, country]);
                              } else {
                                setSelectedCountries(selectedCountries.filter(c => c !== country));
                              }
                            }}
                          />
                          <Label 
                            htmlFor={`country-${country}`} 
                            className="cursor-pointer font-normal text-sm"
                          >
                            {country}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {selectedCountries.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">
                          Selected: {selectedCountries.length} countr{selectedCountries.length === 1 ? 'y' : 'ies'}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {selectedCountries.map((country) => (
                            <Badge key={country} variant="secondary" className="text-xs">
                              {country}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCountries(selectedCountries.filter(c => c !== country));
                                }}
                                className="ml-1 hover:text-destructive"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Terms Agreement */}
          <div className="flex items-start space-x-3 p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg">
            <Checkbox
              id="agreeToTerms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
              className="mt-1"
            />
            <label htmlFor="agreeToTerms" className="text-sm leading-relaxed cursor-pointer">
              I confirm that this artwork is not AI-generated and is my own original creative work.
            </label>
          </div>

          {/* Upload Progress */}
          {uploading && uploadProgress > 0 && (
            <div className="space-y-2">
              {currentUploadingFile && (
                <p className="text-sm text-muted-foreground">{currentUploadingFile}</p>
              )}
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">{Math.round(uploadProgress)}%</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="space-y-2">
            <Button 
              type="submit" 
              variant="gradient" 
              disabled={uploading || !files.length || !title.trim() || !agreedToTerms || tags.length === 0} 
              className="w-full"
            >
              {uploading ? 'Uploading...' : 'Upload Artwork'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
