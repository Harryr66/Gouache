'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/providers/auth-provider';
import { useContent } from '@/providers/content-provider';
import { useRouter } from 'next/navigation';
import { Upload, Image as ImageIcon, Video, FileText, X, AlertCircle, Mail } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { toast } from '@/hooks/use-toast';

type UploadInitialForm = Partial<{
  title: string;
  description: string;
  category: string;
  medium: string;
  dimensions: { width: string; height: string; unit: 'cm' | 'in' };
  tags: string;
  isForSale: boolean;
  price: string;
  priceType: 'fixed' | 'contact';
  currency: string;
  isAI: boolean;
  aiAssistance: 'none' | 'assisted';
  story: string;
  materials: string;
  process: string;
  deliveryScope: 'worldwide' | 'specific';
  deliveryCountries: string;
}>;

interface UploadFormProps {
  initialFormData?: UploadInitialForm;
  titleText?: string;
  descriptionText?: string;
}

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

export function UploadForm({ initialFormData, titleText, descriptionText }: UploadFormProps) {
  const { user, avatarUrl, refreshUser } = useAuth();
  const { addContent } = useContent();
  const router = useRouter();
  
  // Check if this is a product upload (not artwork/portfolio)
  const isProductUpload = false;
  
  const [formData, setFormData] = useState({
    title: initialFormData?.title || '',
    description: initialFormData?.description || '',
    category: initialFormData?.category || '',
    medium: initialFormData?.medium || '',
    dimensions: initialFormData?.dimensions || { width: '', height: '', unit: 'cm' as const },
    tags: initialFormData?.tags || '',
    // Sale tagging only (platform no longer sells)
    isForSale: initialFormData?.isForSale ?? false,
    price: initialFormData?.price || '',
    priceType: (initialFormData?.priceType as 'fixed' | 'contact') || 'fixed',
    currency: initialFormData?.currency || 'USD',
    isAI: initialFormData?.isAI ?? false,
    aiAssistance: initialFormData?.aiAssistance || ('none' as 'none' | 'assisted'),
    story: initialFormData?.story || '',
    materials: initialFormData?.materials || '',
    process: initialFormData?.process || '',
    deliveryScope: initialFormData?.deliveryScope || 'worldwide',
    deliveryCountries: initialFormData?.deliveryCountries || ''
  });
  
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tagsList, setTagsList] = useState<string[]>(
    (initialFormData?.tags || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
  );
  
  // Country selector state
  const [selectedCountries, setSelectedCountries] = useState<string[]>(
    initialFormData?.deliveryCountries 
      ? initialFormData.deliveryCountries.split(',').map(c => c.trim()).filter(Boolean)
      : []
  );
  const [countrySearch, setCountrySearch] = useState('');

  // Handle upload success/error side effects separately from render cycle
  useEffect(() => {
    if (uploadSuccess) {
      // Defer all side effects to next tick
      setTimeout(() => {
        setLoading(false);
        toast({
          title: "Upload complete",
          description: isProductUpload 
            ? "Your product was uploaded and added to your shop."
            : "Your artwork was uploaded and added to your portfolio.",
          variant: "default",
        });
        
        // Reset flag and navigate after additional delay
        setUploadSuccess(false);
        setTimeout(() => {
          router.push('/profile?tab=portfolio');
        }, 200);
      }, 0);
    }
  }, [uploadSuccess, isProductUpload, router]);

  useEffect(() => {
    if (uploadError) {
      // Defer all side effects to next tick
      setTimeout(() => {
        setLoading(false);
        toast({
          title: "Upload failed",
          description: uploadError,
          variant: "destructive",
        });
        setUploadError(null);
      }, 0);
    }
  }, [uploadError]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles(selectedFiles);
      
      // Generate previews for all files
      const newPreviews: string[] = [];
      let loadedCount = 0;
      
      selectedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews.push(e.target?.result as string);
          loadedCount++;
          if (loadedCount === selectedFiles.length) {
            setPreviews(newPreviews);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
    if (currentPreviewIndex >= newFiles.length && newFiles.length > 0) {
      setCurrentPreviewIndex(newFiles.length - 1);
    } else if (newFiles.length === 0) {
      setCurrentPreviewIndex(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length || !user) return;

    // Use chip-based tags (optional)
    const tags = tagsList;

    setLoading(true);
    try {
      console.log('📤 UploadForm: Starting upload process...');
      
      // Upload all files to Firebase Storage
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`📤 UploadForm: Uploading file ${i + 1}/${files.length}...`);
        const fileRef = ref(storage, `portfolio/${user.id}/${Date.now()}_${i}_${file.name}`);
        await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(fileRef);
        uploadedUrls.push(fileUrl);
        console.log(`✅ UploadForm: File ${i + 1} uploaded to Storage:`, fileUrl);
      }

      // Use first image as primary imageUrl, store all in supportingImages
      const primaryImageUrl = uploadedUrls[0];
      const supportingImages = uploadedUrls.slice(1);

      // Create artwork object
      const newArtwork: any = {
        id: `artwork-${Date.now()}`,
        artist: {
          id: user.id,
          name: user.displayName,
          handle: user.username,
          avatarUrl: user.avatarUrl,
          followerCount: user.followerCount,
          followingCount: user.followingCount,
          createdAt: user.createdAt
        },
        title: formData.title,
        description: formData.description,
        imageUrl: primaryImageUrl,
        supportingImages: supportingImages, // Store additional images/videos
        imageAiHint: formData.description,
        tags: tags,
        currency: formData.currency,
        isForSale: formData.isForSale,
        // Treat all uploads as portfolio artwork
        type: 'artwork',
        showInPortfolio: true,
        showInShop: formData.isForSale || false, // Show in shop if marked for sale
        dimensions: {
          width: parseFloat(formData.dimensions.width) || 0,
          height: parseFloat(formData.dimensions.height) || 0,
          unit: formData.dimensions.unit as 'cm' | 'in' | 'px'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        views: 0,
        likes: 0,
        isAI: false, // AI artwork not permitted
        aiAssistance: 'none' as const,
      };

      // Only add optional fields if they have values
      if (formData.isForSale) {
        if (formData.priceType === 'fixed' && formData.price) {
          newArtwork.price = parseFloat(formData.price) * 100; // Convert to cents
          newArtwork.currency = formData.currency || 'USD';
        } else if (formData.priceType === 'contact') {
          newArtwork.priceType = 'contact';
          newArtwork.contactForPrice = true;
        }
        if (formData.deliveryScope) {
        newArtwork.deliveryScope = formData.deliveryScope;
      }
        if (formData.deliveryCountries) {
        newArtwork.deliveryCountries = formData.deliveryCountries;
        }
      }

      // Create post object
      const post = {
        id: `post-${Date.now()}`,
        artworkId: newArtwork.id,
        artist: newArtwork.artist,
        imageUrl: primaryImageUrl,
        imageAiHint: newArtwork.imageAiHint,
        caption: formData.description,
        likes: 0,
        commentsCount: 0,
        timestamp: new Date().toISOString(),
        createdAt: Date.now(),
        tags: newArtwork.tags
      };

      // Add to posts/artworks collections
      await addContent(post, newArtwork);
      console.log('✅ UploadForm: Added to posts/artworks collections');

      // Also add to user's portfolio in Firestore
      console.log('📤 UploadForm: Adding to user portfolio...');
      const userDocRef = doc(db, 'userProfiles', user.id);
      const userDoc = await getDoc(userDocRef);
      const currentPortfolio = userDoc.exists() ? (userDoc.data().portfolio || []) : [];
      
      const portfolioItem: any = {
        id: newArtwork.id,
        imageUrl: primaryImageUrl,
        supportingImages: supportingImages, // Store all images for carousel
        title: formData.title,
        description: formData.description || '',
        type: 'artwork',
        showInPortfolio: true,
        showInShop: formData.isForSale || false, // Show in shop if marked for sale
        isForSale: formData.isForSale || false, // Store isForSale flag
        dimensions: formData.dimensions.width && formData.dimensions.height 
          ? `${formData.dimensions.width} x ${formData.dimensions.height} ${formData.dimensions.unit}`
          : '',
        year: '', // UploadForm doesn't have year field
        tags: newArtwork.tags,
        createdAt: new Date()
      };

      // Add sale-related fields to portfolio item if for sale
      if (formData.isForSale) {
        if (formData.priceType === 'fixed' && formData.price) {
          portfolioItem.price = parseFloat(formData.price) * 100; // Convert to cents
          portfolioItem.currency = formData.currency || 'USD';
        } else if (formData.priceType === 'contact') {
          portfolioItem.priceType = 'contact';
          portfolioItem.contactForPrice = true;
        }
        if (formData.deliveryScope) {
          portfolioItem.deliveryScope = formData.deliveryScope;
        }
        if (formData.deliveryCountries) {
          portfolioItem.deliveryCountries = formData.deliveryCountries;
        }
      }

      // Only add optional fields if they have values
      if (newArtwork.deliveryScope) {
        portfolioItem.deliveryScope = newArtwork.deliveryScope;
      }
      if (newArtwork.deliveryCountries) {
        portfolioItem.deliveryCountries = newArtwork.deliveryCountries;
      }

      // Clean portfolio item to remove undefined values
      const cleanPortfolioItem: any = {};
      Object.keys(portfolioItem).forEach(key => {
        if (portfolioItem[key] !== undefined) {
          cleanPortfolioItem[key] = portfolioItem[key];
        }
      });
      
      const updatedPortfolio = [...currentPortfolio, cleanPortfolioItem];
      
      await updateDoc(userDocRef, {
        portfolio: updatedPortfolio,
        updatedAt: new Date()
      });
      console.log('✅ UploadForm: Added to user portfolio');

      // Set success flag - useEffect will handle all side effects
      setUploadSuccess(true);
    } catch (error) {
      console.error('❌ UploadForm: Error uploading artwork:', error);
      // Set error flag - useEffect will handle all side effects
      setUploadError(isProductUpload
        ? "We couldn't save your product. Please try again."
        : "We couldn't save your artwork. Please try again.");
    }
  };

  const addTag = () => {
    const newTag = tagInput.trim();
    if (!newTag) return;
    if (tagsList.includes(newTag)) {
      setTagInput('');
      return;
    }
    setTagsList([...tagsList, newTag]);
    setTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ' || e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !tagInput && tagsList.length) {
      e.preventDefault();
      setTagsList(tagsList.slice(0, -1));
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
        <CardTitle>{titleText || 'Upload Image'}</CardTitle>
        <CardDescription>
          {descriptionText || 'Share your creative work with the community'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">Image Files {files.length > 0 && `(${files.length} selected)`}</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <input
                type="file"
                id="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                multiple
                className="hidden"
              />
              <label htmlFor="file" className="cursor-pointer">
                {previews.length > 0 ? (
                  <div className="space-y-4">
                    {previews.length === 1 ? (
                      <div className="relative">
                        {files[0]?.type.startsWith('video/') ? (
                          <video
                            src={previews[0]}
                            controls
                            className="mx-auto h-64 w-auto max-w-full object-contain rounded-lg"
                          />
                        ) : (
                          <img
                            src={previews[0]}
                            alt="Preview"
                            className="mx-auto h-64 w-auto max-w-full object-contain rounded-lg"
                          />
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeFile(0);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Carousel 
                          className="w-full max-w-md mx-auto"
                          opts={{
                            align: "start",
                          }}
                          setApi={(api) => {
                            if (api) {
                              api.on("select", () => {
                                setCurrentPreviewIndex(api.selectedScrollSnap());
                              });
                            }
                          }}
                        >
                          <CarouselContent>
                            {previews.map((preview, index) => (
                              <CarouselItem key={index}>
                                <div className="relative">
                                  {files[index]?.type.startsWith('video/') ? (
                                    <video
                                      src={preview}
                                      controls
                                      className="mx-auto h-64 w-auto max-w-full object-contain rounded-lg"
                                    />
                                  ) : (
                                    <img
                                      src={preview}
                                      alt={`Preview ${index + 1}`}
                                      className="mx-auto h-64 w-auto max-w-full object-contain rounded-lg"
                                    />
                                  )}
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      removeFile(index);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          {previews.length > 1 && (
                            <>
                              <CarouselPrevious />
                              <CarouselNext />
                            </>
                          )}
                        </Carousel>
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          {currentPreviewIndex + 1} of {previews.length}
                        </p>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">Click to add more files</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Upload your image</p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, GIF, MP4 up to 10MB (multiple files supported)
                      </p>
                    </div>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Discovery Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Discovery Tags</Label>
            <div className="flex flex-wrap gap-2 pb-1">
              {tagsList.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setTagsList(tagsList.filter((t) => t !== tag))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Type a tag and press space or enter to add"
            />
            <p className="text-xs text-muted-foreground">
              Tags help discovery. Add one per word; space or enter locks it in.
            </p>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter artwork title"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your artwork..."
              rows={3}
            />
          </div>

          {/* Mark this item for sale */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="isForSale" className="cursor-pointer text-base font-semibold">
                  Mark this item for sale
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable this to list this artwork in your shop. Make sure your Shop tab is enabled in Profile Settings.
                </p>
              </div>
              <Switch
                id="isForSale"
                checked={formData.isForSale}
                onCheckedChange={(checked) => {
                  setFormData({ 
                    ...formData, 
                    isForSale: checked
                  });
                }}
              />
            </div>
          </div>


          {/* Dimensions */}
          <div className="space-y-2">
            <Label>Dimensions</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Width"
                value={formData.dimensions.width}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  dimensions: { ...formData.dimensions, width: e.target.value }
                })}
              />
              <Input
                placeholder="Height"
                value={formData.dimensions.height}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  dimensions: { ...formData.dimensions, height: e.target.value }
                })}
              />
              <Select 
                value={formData.dimensions.unit} 
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  dimensions: { ...formData.dimensions, unit: value as 'cm' | 'in' }
                })}
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

          {/* Price and Delivery (only shown if for sale) */}
          {formData.isForSale && (
            <div className="space-y-4 p-4 border rounded-lg border-l-2">
              <Label className="text-base font-semibold mb-4 block">Pricing & Delivery</Label>
          <div className="space-y-4">
                {/* Price Type */}
                <div className="space-y-2">
                  <Label>Pricing</Label>
                  <Select
                    value={formData.priceType}
                    onValueChange={(value: 'fixed' | 'contact') => setFormData({ ...formData, priceType: value })}
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
                {formData.priceType === 'fixed' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                        min="0"
                        step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select 
                    value={formData.currency} 
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger>
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

                {/* Contact Artist Note */}
                {formData.priceType === 'contact' && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Customers will be prompted to email you to inquire about pricing. Make sure your email is set in your profile.
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Available for delivery</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={formData.deliveryScope === 'worldwide' ? 'gradient' : 'outline'}
                      onClick={() => {
                        setSelectedCountries([]);
                        setFormData({ ...formData, deliveryScope: 'worldwide', deliveryCountries: '' });
                      }}
                    >
                      Worldwide
                    </Button>
                    <Button
                      type="button"
                      variant={formData.deliveryScope === 'specific' ? 'gradient' : 'outline'}
                      onClick={() => setFormData({ ...formData, deliveryScope: 'specific' })}
                    >
                      Specific countries
                    </Button>
                  </div>
                  {formData.deliveryScope === 'specific' && (
                    <div className="space-y-2">
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
                                  const updated = [...selectedCountries, country];
                                  setSelectedCountries(updated);
                                  setFormData({ ...formData, deliveryCountries: updated.join(', ') });
                                } else {
                                  const updated = selectedCountries.filter(c => c !== country);
                                  setSelectedCountries(updated);
                                  setFormData({ ...formData, deliveryCountries: updated.join(', ') });
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
                                    const updated = selectedCountries.filter(c => c !== country);
                                    setSelectedCountries(updated);
                                    setFormData({ ...formData, deliveryCountries: updated.join(', ') });
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
            </div>
          )}

          {/* Terms Agreement */}
          <div className="flex items-start space-x-3 p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg">
            <Checkbox
              id="agreeToTerms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              className="mt-1"
            />
            <label htmlFor="agreeToTerms" className="text-sm leading-relaxed cursor-pointer">
              I confirm that this artwork is not AI-generated and is my own original creative work.
            </label>
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={loading || !files.length || !agreedToTerms}>
            {loading 
              ? `Uploading ${files.length} file(s)...` 
              : `Upload ${files.length > 1 ? `${files.length} Files` : 'Image'}`
            }
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
