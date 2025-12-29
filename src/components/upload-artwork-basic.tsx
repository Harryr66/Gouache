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
  const [bulkUploadSeparately, setBulkUploadSeparately] = useState(false); // Bulk upload each file separately

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
    
    if (!user || !files.length) {
      toast({
        title: 'Missing information',
        description: 'Please select at least one image or video.',
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

    // Title is optional - default to "Untitled" if not provided
    const finalTitle = title.trim() || 'Untitled';
    
    // Tags are optional - no validation needed

    setUploading(true);

    try {
      // Step 1: Compress images and generate blur placeholders before upload
      setCurrentUploadingFile('Preparing files...');
      const { generateBlurPlaceholder } = await import('@/lib/blur-placeholder');
      
      // For Cloudflare uploads, skip compression to preserve maximum quality
      // Cloudflare Images will optimize on their end while preserving quality
      // Only resize if image is extremely large (>4K) to avoid upload issues
      const processedFiles = await Promise.all(
        files.map(async (file) => {
          if (file.type.startsWith('image/')) {
            // Check if image is extremely large (>4K width/height)
            // Only compress if necessary to avoid upload size limits
            const img = new Image();
            const url = URL.createObjectURL(file);
            
            try {
              await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = url;
              });
              
              // Instagram/Pinterest standard: 1080px max width
              // Instagram: 1080x1080 square, 1080x1350 portrait, 1080x566 landscape
              // Pinterest: 1000x1500 recommended (2:3 ratio)
              // Resize to 1080px max width to match competitor standards
              const MAX_WIDTH = 1080;
              const MAX_HEIGHT = 1920; // Allow tall images (portrait/Stories format)
              
              if (img.width > MAX_WIDTH || img.height > MAX_HEIGHT) {
                console.log(`📐 Resizing image to Instagram/Pinterest standard: ${img.width}x${img.height} → max ${MAX_WIDTH}x${MAX_HEIGHT}`);
                URL.revokeObjectURL(url);
                try {
                  // Compress with high quality (0.95) to 1080px max width (Instagram standard)
                  const compressed = await compressImage(file, MAX_WIDTH, MAX_HEIGHT, 0.95);
                  return compressed;
                } catch (error) {
                  console.warn(`Failed to compress ${file.name}, using original:`, error);
                  return file;
                }
              } else {
                // Image is already at optimal size - upload original for maximum quality
                URL.revokeObjectURL(url);
                console.log(`✅ Uploading image at optimal resolution (${img.width}x${img.height}) - matching Instagram/Pinterest standards`);
                return file;
              }
            } catch (error) {
              URL.revokeObjectURL(url);
              // If we can't check dimensions, use original (better than compressing blindly)
              console.warn(`Could not check image dimensions for ${file.name}, using original:`, error);
              return file;
            }
          }
          return file; // Videos not compressed
        })
      );
      
      // Generate blur placeholder for first image (for instant visual feedback)
      let blurPlaceholderBase64: string | undefined;
      const firstImageFileForBlur = processedFiles.find(f => f.type.startsWith('image/'));
      if (firstImageFileForBlur) {
        try {
          setCurrentUploadingFile('Generating blur placeholder...');
          blurPlaceholderBase64 = await generateBlurPlaceholder(firstImageFileForBlur);
        } catch (error) {
          console.warn('Failed to generate blur placeholder:', error);
        }
      }

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
      
      // Upload files sequentially (one at a time) to avoid rate limiting
      // This is slower but more reliable, especially for bulk uploads
      for (let i = 0; i < processedFiles.length; i++) {
        const file = processedFiles[i];
        const isVideo = file.type.startsWith('video/');
        setCurrentUploadingFile(`${i + 1}/${processedFiles.length}: ${file.name}`);
        
        try {
          // Upload to Cloudflare (Stream for videos, Images for images)
          const { uploadMedia } = await import('@/lib/media-upload-v2');
          const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';
          const uploadResult = await uploadMedia(file, mediaType, user.id);
          
          // Handle thumbnail: prioritize Cloudflare thumbnail, then custom, then extracted
          let thumbnailUrl = uploadResult.thumbnailUrl; // Use Cloudflare thumbnail if available (fastest)
          if (i === 0 && thumbnailToUpload && !thumbnailUrl) {
            // Only upload custom/extracted thumbnail if Cloudflare didn't provide one
            try {
              const { uploadMedia } = await import('@/lib/media-upload-v2');
              const thumbnailResult = await uploadMedia(thumbnailToUpload, 'image', user.id);
              thumbnailUrl = thumbnailResult.url;
            } catch (error) {
              console.warn('Failed to upload custom thumbnail:', error);
            }
          }
          
          // Store results
          uploadedUrls[i] = uploadResult.url;
          mediaTypes[i] = mediaType;
          if (thumbnailUrl) {
            thumbnailUrls[i] = thumbnailUrl;
          }
          
          // Update progress
          const overallProgress = ((i + 1) * 100 / processedFiles.length);
          setUploadProgress(overallProgress);
        } catch (error) {
          console.error(`Error uploading file ${i + 1}:`, error);
          throw error;
        }
      }
      
      // Reset progress after all uploads complete
      setUploadProgress(100);
      setCurrentUploadingFile('');

      // Extract primary media info (first file)
      const primaryMediaUrl = uploadedUrls[0];
      const primaryMediaType = mediaTypes[0];
      const primaryThumbnailUrl = thumbnailUrls[0];
      
      // Get image dimensions for primary image if it's an image
      let primaryImageWidth: number | undefined;
      let primaryImageHeight: number | undefined;
      if (primaryMediaType === 'image' && processedFiles[0]) {
        try {
          const img = new Image();
          const objectUrl = URL.createObjectURL(processedFiles[0]);
          await new Promise((resolve, reject) => {
            img.onload = () => {
              primaryImageWidth = img.naturalWidth;
              primaryImageHeight = img.naturalHeight;
              URL.revokeObjectURL(objectUrl);
              resolve(null);
            };
            img.onerror = reject;
            img.src = objectUrl;
          });
        } catch (error) {
          console.warn('Failed to get primary image dimensions:', error);
        }
      }
      
      // Get supporting media (all files after the first)
      const supportingMedia = uploadedUrls.slice(1);
      const supportingMediaTypes = mediaTypes.slice(1);

      // BULK UPLOAD SEPARATELY: If enabled and multiple files, upload each file as separate artwork
      if (bulkUploadSeparately && processedFiles.length > 1) {
        // Use already-uploaded URLs - files are already uploaded above
        for (let i = 0; i < processedFiles.length; i++) {
          const file = processedFiles[i];
          const isVideo = file.type.startsWith('video/');
          const mediaType = mediaTypes[i];
          const uploadedUrl = uploadedUrls[i];
          const thumbnailUrl = thumbnailUrls[i];
          
          setCurrentUploadingFile(`Creating artwork ${i + 1}/${processedFiles.length}: ${file.name}`);
          
          // Get image dimensions if it's an image
          let imageWidth: number | undefined;
          let imageHeight: number | undefined;
          if (!isVideo) {
            try {
              const img = new Image();
              const objectUrl = URL.createObjectURL(file);
              await new Promise((resolve, reject) => {
                img.onload = () => {
                  imageWidth = img.naturalWidth;
                  imageHeight = img.naturalHeight;
                  URL.revokeObjectURL(objectUrl);
                  resolve(null);
                };
                img.onerror = reject;
                img.src = objectUrl;
              });
            } catch (error) {
              console.warn('Failed to get image dimensions:', error);
            }
          }
          
          // Generate blur placeholder for images (only for first image to save time)
          let fileBlurPlaceholder: string | undefined;
          if (!isVideo && i === 0) {
            // Use the already-generated blur placeholder for first image
            fileBlurPlaceholder = blurPlaceholderBase64;
          } else if (!isVideo) {
            // Generate for other images
            try {
              fileBlurPlaceholder = await generateBlurPlaceholder(file);
            } catch (error) {
              console.warn('Failed to generate blur placeholder:', error);
            }
          }
          
          // Create separate artwork item for this file
          const separateArtworkItem: any = {
            id: `artwork-${Date.now()}-${i}`,
            ...(mediaType === 'image' && { imageUrl: uploadedUrl }),
            ...(mediaType === 'video' && { videoUrl: uploadedUrl }),
            ...(mediaType === 'video' && thumbnailUrl && { imageUrl: thumbnailUrl }),
            mediaType: mediaType,
            mediaUrls: [uploadedUrl],
            mediaTypes: [mediaType],
            ...(imageWidth && { imageWidth }),
            ...(imageHeight && { imageHeight }),
            ...(blurPlaceholderBase64 && { blurPlaceholder: blurPlaceholderBase64 }),
            title: finalTitle, // Use same title for all, or could use file name
            description: description.trim() || '',
            type: 'artwork',
            showInPortfolio: addToPortfolio,
            showInShop: isForSale,
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
          
          // Add sale-related fields if for sale
          if (isForSale && addToPortfolio) {
            if (priceType === 'fixed' && price.trim()) {
              separateArtworkItem.price = parseFloat(price) * 100;
              separateArtworkItem.currency = currency;
            } else if (priceType === 'contact') {
              separateArtworkItem.priceType = 'contact';
              separateArtworkItem.contactForPrice = true;
              separateArtworkItem.contactEmail = useAccountEmail ? (user.email || '') : alternativeEmail.trim();
            }
            separateArtworkItem.deliveryScope = deliveryScope;
            if (deliveryScope === 'specific' && selectedCountries.length > 0) {
              separateArtworkItem.deliveryCountries = selectedCountries.join(', ');
            }
          }
          
          // Add dimensions if provided
          if (addToPortfolio) {
            if (dimensions.width && dimensions.height) {
              separateArtworkItem.dimensions = {
                width: parseFloat(dimensions.width) || 0,
                height: parseFloat(dimensions.height) || 0,
                unit: dimensions.unit,
              };
            } else {
              separateArtworkItem.dimensions = { width: 0, height: 0, unit: 'cm' };
            }
          }
          
          // Recursive function to remove all undefined values
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
          
          const cleanArtworkItem = removeUndefined(separateArtworkItem);
          
          // Add to portfolio if enabled
          if (addToPortfolio) {
            const { PortfolioService } = await import('@/lib/database');
            const portfolioItemData: any = {
              userId: user.id,
              ...cleanArtworkItem,
              showInPortfolio: true,
              deleted: false,
            };
            
            const existingItem = await PortfolioService.getPortfolioItem(separateArtworkItem.id);
            if (existingItem) {
              await PortfolioService.updatePortfolioItem(separateArtworkItem.id, portfolioItemData);
            } else {
              await setDoc(doc(db, 'portfolioItems', separateArtworkItem.id), {
                ...portfolioItemData,
                id: separateArtworkItem.id,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
            
            // Backward compatibility: Update userProfiles.portfolio array
            try {
              const userDocRef = doc(db, 'userProfiles', user.id);
              const userDoc = await getDoc(userDocRef);
              const currentPortfolio = userDoc.exists() ? (userDoc.data().portfolio || []) : [];
              const cleanedExistingPortfolio = currentPortfolio.map((item: any) => removeUndefined(item));
              const updatedPortfolio = [...cleanedExistingPortfolio, cleanArtworkItem];
              const finalCleanedPortfolio = removeUndefined(updatedPortfolio);
              
              await updateDoc(userDocRef, {
                portfolio: finalCleanedPortfolio,
                updatedAt: new Date(),
              });
            } catch (legacyError) {
              console.warn('⚠️ Failed to update legacy userProfiles.portfolio (non-critical):', legacyError);
            }
          }
          
          // Create artwork/post for Discover feed
          const artworkForDiscover: any = {
            id: separateArtworkItem.id,
            artist: {
              id: user.id,
              name: user.displayName || user.username || 'Artist',
              handle: user.username || '',
              avatarUrl: user.avatarUrl || null,
              followerCount: user.followerCount || 0,
              followingCount: user.followingCount || 0,
              createdAt: user.createdAt || new Date(),
            },
            title: finalTitle,
            description: description.trim() || '',
            ...(mediaType === 'image' && { imageUrl: uploadedUrl }),
            ...(mediaType === 'video' && { videoUrl: uploadedUrl }),
            mediaType: mediaType,
            mediaUrls: [uploadedUrl],
            mediaTypes: [mediaType],
            ...(mediaType === 'video' && thumbnailUrl && { imageUrl: thumbnailUrl }),
            ...(imageWidth && { imageWidth }),
            ...(imageHeight && { imageHeight }),
            ...(fileBlurPlaceholder && { blurPlaceholder: fileBlurPlaceholder }),
            imageAiHint: description.trim() || finalTitle,
            type: 'artwork',
            tags: tags,
            createdAt: new Date(),
            updatedAt: new Date(),
            likes: 0,
            commentsCount: 0,
            views: 0,
            aiAssistance: 'none',
            isAI: false,
          };

          // Create post object for Discover feed
          const postForDiscover = {
            id: `post-${Date.now()}-${i}`,
            artworkId: separateArtworkItem.id,
            artist: artworkForDiscover.artist,
            imageUrl: artworkForDiscover.imageUrl || artworkForDiscover.videoUrl || '',
            imageAiHint: artworkForDiscover.imageAiHint,
            caption: description.trim() || '',
            likes: 0,
            commentsCount: 0,
            timestamp: new Date().toISOString(),
            createdAt: Date.now(),
            tags: tags,
          };
          
          // Add to Discover feed
          await addContent(postForDiscover, artworkForDiscover);
          
          // Update progress
          const overallProgress = ((i + 1) * 100 / processedFiles.length);
          setUploadProgress(overallProgress);
        }
        
        // All bulk uploads complete
        setUploadProgress(100);
        setCurrentUploadingFile('');
        
        toast({
          title: 'Upload complete',
          description: `Successfully uploaded ${processedFiles.length} items separately.`,
        });
        
        // Reset form
        setFiles([]);
        setTitle('');
        setDescription('');
        setTags([]);
        setTagInput('');
        setThumbnailFile(null);
        setThumbnailPreview(null);
        setExtractedThumbnailBlob(null);
        setBulkUploadSeparately(false);
        
        router.refresh();
        return; // Exit early - bulk upload is complete
      }
      
      // CONTINUE WITH NORMAL SINGLE UPLOAD (existing logic below)

      // Create artwork item for portfolio (only if adding to portfolio)
      const artworkItem: any = addToPortfolio ? {
        id: `artwork-${Date.now()}`,
        ...(primaryMediaType === 'image' && { imageUrl: primaryMediaUrl }),
        ...(primaryMediaType === 'video' && { videoUrl: primaryMediaUrl }),
        mediaType: primaryMediaType,
        mediaUrls: uploadedUrls,
        mediaTypes: mediaTypes,
        ...(supportingMedia.length > 0 && { supportingImages: supportingMedia }),
        ...(supportingMedia.length > 0 && { supportingMedia: supportingMedia }),
        ...(supportingMediaTypes.length > 0 && { supportingMediaTypes: supportingMediaTypes }),
        title: finalTitle,
        description: description.trim() || '',
        type: 'artwork',
        showInPortfolio: addToPortfolio,
        showInShop: isForSale,
        isForSale: isForSale,
        artworkType: isOriginal ? 'original' : 'print',
        createdAt: new Date(),
        updatedAt: new Date(),
        likes: 0,
        commentsCount: 0,
        tags: tags,
        aiAssistance: 'none',
        isAI: false,
        ...(blurPlaceholderBase64 && { blurPlaceholder: blurPlaceholderBase64 }),
        ...(primaryImageWidth && { imageWidth: primaryImageWidth }),
        ...(primaryImageHeight && { imageHeight: primaryImageHeight }),
      } : null;

      // Add sale-related fields if for sale (only relevant if adding to portfolio)
      if (artworkItem && isForSale && addToPortfolio) {
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
      if (artworkItem && addToPortfolio) {
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

      const cleanPortfolioItem = artworkItem ? removeUndefined(artworkItem) : null;

      // NEW: Update user's portfolio in portfolioItems collection if toggle is enabled
      if (addToPortfolio && artworkItem) {
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
        id: artworkItem?.id || `artwork-${Date.now()}`,
        artist: {
          id: user.id,
          name: user.displayName || user.username || 'Artist',
          handle: user.username || '',
          avatarUrl: user.avatarUrl || null,
          followerCount: user.followerCount || 0,
          followingCount: user.followingCount || 0,
          createdAt: user.createdAt || new Date(),
        },
        title: finalTitle,
        description: description.trim() || '',
        ...(primaryMediaType === 'image' && { imageUrl: primaryMediaUrl }),
        ...(primaryMediaType === 'video' && { videoUrl: primaryMediaUrl }),
        mediaType: primaryMediaType,
        mediaUrls: uploadedUrls,
        mediaTypes: mediaTypes,
        ...(supportingMedia.length > 0 && { supportingImages: supportingMedia }),
        ...(supportingMedia.length > 0 && { supportingMedia: supportingMedia }),
        ...(supportingMediaTypes.length > 0 && { supportingMediaTypes: supportingMediaTypes }),
        imageAiHint: description.trim() || finalTitle || '',
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
      if (isForSale && addToPortfolio && artworkItem) {
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
          title: finalTitle,
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
                    <div className="space-y-3 p-4 border-2 border-primary/30 rounded-lg bg-primary/10">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="bulkUploadSeparately"
                          checked={bulkUploadSeparately}
                          onCheckedChange={(checked) => setBulkUploadSeparately(checked === true)}
                          className="h-5 w-5 mt-0.5"
                        />
                        <div className="flex-1 space-y-1">
                          <Label
                            htmlFor="bulkUploadSeparately"
                            className="text-sm font-semibold cursor-pointer block"
                          >
                            Upload each file as separate artwork
                          </Label>
                          {bulkUploadSeparately ? (
                            <p className="text-xs text-muted-foreground">
                              ✓ Each file will be uploaded as a separate artwork with the same title, description, and tags.
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              All files will be combined into one artwork. First file is the main display, others will appear in carousel.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
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
            <Label htmlFor="title">Title {bulkUploadSeparately && files.length > 1 ? '(Optional - defaults to "Untitled")' : '(Optional - defaults to "Untitled")'}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title (or leave blank for 'Untitled')"
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
            <Label htmlFor="tags">Discovery Tags (Optional)</Label>
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
              Tags help users discover your artwork through search and filters. Optional but recommended.
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
              disabled={uploading || !files.length || !agreedToTerms} 
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
