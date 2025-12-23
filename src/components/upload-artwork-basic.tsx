'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/providers/auth-provider';
import { useContent } from '@/providers/content-provider';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/')
    );
    
    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    const input = document.getElementById('images') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
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
        description: 'Please select at least one image and enter a title.',
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
      // Upload all images to Firebase Storage
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileRef = ref(storage, `portfolio/${user.id}/${Date.now()}_${i}_${file.name}`);
        await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(fileRef);
        uploadedUrls.push(fileUrl);
      }

      // First image is the main display image
      const primaryImageUrl = uploadedUrls[0];
      // Remaining images are carousel images
      const supportingImages = uploadedUrls.slice(1);

      // Update user's portfolio in Firestore
      const userDocRef = doc(db, 'userProfiles', user.id);
      const userDoc = await getDoc(userDocRef);
      const currentPortfolio = userDoc.exists() ? (userDoc.data().portfolio || []) : [];

      const portfolioItem: any = {
        id: `artwork-${Date.now()}`,
        imageUrl: primaryImageUrl,
        supportingImages: supportingImages.length > 0 ? supportingImages : undefined,
        title: title.trim(),
        description: description.trim() || '',
        type: 'artwork',
        showInPortfolio: true,
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
      if (isForSale) {
        if (priceType === 'fixed' && price.trim()) {
          portfolioItem.price = parseFloat(price) * 100; // Convert to cents
          portfolioItem.currency = currency;
        } else if (priceType === 'contact') {
          portfolioItem.priceType = 'contact';
          portfolioItem.contactForPrice = true;
          portfolioItem.contactEmail = useAccountEmail ? user.email : alternativeEmail.trim();
        }
        portfolioItem.deliveryScope = deliveryScope;
        if (deliveryScope === 'specific' && selectedCountries.length > 0) {
          portfolioItem.deliveryCountries = selectedCountries.join(', ');
        }
      }

      // Add dimensions if provided
      if (dimensions.width && dimensions.height) {
        portfolioItem.dimensions = {
          width: parseFloat(dimensions.width) || 0,
          height: parseFloat(dimensions.height) || 0,
          unit: dimensions.unit,
        };
      } else {
        portfolioItem.dimensions = { width: 0, height: 0, unit: 'cm' };
      }

      const updatedPortfolio = [...currentPortfolio, portfolioItem];
      
      await updateDoc(userDocRef, {
        portfolio: updatedPortfolio,
        updatedAt: new Date(),
      });

      // If marked for sale, also add to artworks collection for shop display
      if (isForSale) {
        const artworkForShop: any = {
          id: portfolioItem.id,
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
          imageUrl: primaryImageUrl,
          supportingImages: supportingImages.length > 0 ? supportingImages : undefined,
          imageAiHint: description.trim() || '',
          tags: tags,
          currency: 'USD',
          isForSale: true,
          type: 'artwork',
          showInPortfolio: true,
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
          artworkForShop.contactEmail = useAccountEmail ? user.email : alternativeEmail.trim();
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
          imageUrl: primaryImageUrl,
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

      toast({
        title: 'Artwork uploaded',
        description: 'Your artwork has been added to your portfolio' + (isForSale ? ' and shop.' : '.'),
      });

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
      toast({
        title: 'Upload failed',
        description: 'Failed to upload artwork. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
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
        <CardTitle>Upload Artwork</CardTitle>
        <CardDescription>
          Add artwork to your portfolio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Images *</Label>
            
            {/* Hidden file input */}
            <Input
              type="file"
              id="images"
              accept="image/*"
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
                  <p className="text-sm font-medium">Click or drag images here</p>
                  <p className="text-xs text-muted-foreground">
                    Select multiple images at once or add them one by one
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {files.length} image(s) selected
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={triggerFileInput}
                    >
                      Add More Images
                    </Button>
                  </div>
                  
                  {/* Image preview tiles */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {files.map((file, index) => {
                      const previewUrl = URL.createObjectURL(file);
                      return (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border-2 border-muted">
                            <img
                              src={previewUrl}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {index === 0 && (
                            <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                              Main
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
                      First image is the main display. Others will appear in carousel.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter artwork title"
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
              placeholder="Describe your artwork..."
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
                disabled={!tagInput.trim() || tags.includes(tagInput.trim())}
              >
                Add Tag
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add at least one tag. Tags help users discover your artwork through search and filters.
            </p>
          </div>

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
                    variant={deliveryScope === 'worldwide' ? 'default' : 'outline'}
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
                    variant={deliveryScope === 'specific' ? 'default' : 'outline'}
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

          {/* Submit Button */}
          <Button type="submit" disabled={uploading || !files.length || !title.trim() || !agreedToTerms || tags.length === 0} className="w-full">
            {uploading ? 'Uploading...' : 'Upload Artwork'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
