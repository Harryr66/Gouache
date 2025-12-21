'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/providers/auth-provider';
import { useContent } from '@/providers/content-provider';
import { useRouter } from 'next/navigation';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { X } from 'lucide-react';

/**
 * NEW Artwork Upload Portal - Built from scratch with full functionality
 */
export function UploadArtworkNew() {
  const { user } = useAuth();
  const { addContent } = useContent();
  const router = useRouter();
  
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isForSale, setIsForSale] = useState(false);
  const [isOriginal, setIsOriginal] = useState(true); // true = original, false = print
  const [deliveryScope, setDeliveryScope] = useState<'worldwide' | 'specific'>('worldwide');
  const [priceType, setPriceType] = useState<'fixed' | 'contact'>('fixed');
  const [price, setPrice] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles(selectedFiles);
      
      // Generate previews
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !files.length || !title.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please select files and enter a title.',
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

    setUploading(true);

    try {
      // Upload files to Firebase Storage
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileRef = ref(storage, `portfolio/${user.id}/${Date.now()}_${i}_${file.name}`);
        await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(fileRef);
        uploadedUrls.push(fileUrl);
      }

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
          followerCount: user.followerCount || 0,
          followingCount: user.followingCount || 0,
          createdAt: user.createdAt || new Date(),
        },
        title: title.trim(),
        description: description.trim() || '',
        imageUrl: primaryImageUrl,
        supportingImages: supportingImages,
        imageAiHint: description.trim() || '',
        tags: [],
        currency: 'USD',
        isForSale: isForSale,
        type: 'artwork',
        showInPortfolio: true,
        showInShop: isForSale,
        artworkType: isOriginal ? 'original' : 'print',
        dimensions: { width: 0, height: 0, unit: 'cm' },
        createdAt: new Date(),
        updatedAt: new Date(),
        views: 0,
        likes: 0,
        isAI: false,
        aiAssistance: 'none' as const,
      };

      // Add sale-related fields if for sale
      if (isForSale) {
        if (priceType === 'fixed' && price.trim()) {
          newArtwork.price = parseFloat(price) * 100; // Convert to cents
          newArtwork.currency = 'USD';
        } else if (priceType === 'contact') {
          newArtwork.priceType = 'contact';
          newArtwork.contactForPrice = true;
        }
        newArtwork.deliveryScope = deliveryScope;
      }

      // Create post object
      const post = {
        id: `post-${Date.now()}`,
        artworkId: newArtwork.id,
        artist: newArtwork.artist,
        imageUrl: primaryImageUrl,
        imageAiHint: newArtwork.imageAiHint,
        caption: description.trim() || '',
        likes: 0,
        commentsCount: 0,
        timestamp: new Date().toISOString(),
        createdAt: Date.now(),
        tags: [],
      };

      // Add to posts/artworks collections via ContentProvider
      await addContent(post, newArtwork);

      // Update user's portfolio in Firestore
      const userDocRef = doc(db, 'userProfiles', user.id);
      const userDoc = await getDoc(userDocRef);
      const currentPortfolio = userDoc.exists() ? (userDoc.data().portfolio || []) : [];

      const portfolioItem: any = {
        id: newArtwork.id,
        imageUrl: primaryImageUrl,
        supportingImages: supportingImages,
        title: title.trim(),
        description: description.trim() || '',
        type: 'artwork',
        showInPortfolio: true,
        showInShop: isForSale,
        isForSale: isForSale,
        artworkType: isOriginal ? 'original' : 'print',
        createdAt: new Date(),
      };

      // Add sale-related fields to portfolio item if for sale
      if (isForSale) {
        if (priceType === 'fixed' && price.trim()) {
          portfolioItem.price = parseFloat(price) * 100;
          portfolioItem.currency = 'USD';
        } else if (priceType === 'contact') {
          portfolioItem.priceType = 'contact';
          portfolioItem.contactForPrice = true;
        }
        portfolioItem.deliveryScope = deliveryScope;
      }

      const updatedPortfolio = [...currentPortfolio, portfolioItem];

      await updateDoc(userDocRef, {
        portfolio: updatedPortfolio,
        updatedAt: new Date(),
      });

      toast({
        title: 'Artwork uploaded',
        description: 'Your artwork has been added to your portfolio' + (isForSale ? ' and shop.' : '.'),
      });

      // Reset form
      setFiles([]);
      setPreviews([]);
      setTitle('');
      setDescription('');
      setIsForSale(false);
      setIsOriginal(true);
      setDeliveryScope('worldwide');
      setPriceType('fixed');
      setPrice('');

      // Navigate to portfolio
      setTimeout(() => {
        router.push('/profile?tab=portfolio');
      }, 500);
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
          Upload images to your portfolio and shop.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="files">Images *</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              <input
                type="file"
                id="files"
                accept="image/*,video/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="files" className="cursor-pointer block">
                {previews.length > 0 ? (
                  <div className="space-y-4">
                    {previews.length === 1 ? (
                      <div className="relative">
                        <img
                          src={previews[0]}
                          alt="Preview"
                          className="mx-auto h-64 w-auto max-w-full object-contain rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={(e) => {
                            e.preventDefault();
                            removeFile(0);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Carousel className="w-full max-w-md mx-auto">
                          <CarouselContent>
                            {previews.map((preview, index) => (
                              <CarouselItem key={index}>
                                <div className="relative">
                                  <img
                                    src={preview}
                                    alt={`Preview ${index + 1}`}
                                    className="mx-auto h-64 w-auto max-w-full object-contain rounded-lg"
                                  />
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2"
                                    onClick={(e) => {
                                      e.preventDefault();
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
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground text-center">Click to add more files</p>
                  </div>
                ) : (
                  <div className="space-y-2 text-center">
                    <p className="text-sm font-medium">Upload your images</p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, GIF, MP4 up to 10MB (multiple files supported)
                    </p>
                  </div>
                )}
              </label>
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
                  Original
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="print"
                  checked={!isOriginal}
                  onCheckedChange={(checked) => setIsOriginal(checked !== true)}
                />
                <Label htmlFor="print" className="cursor-pointer font-normal">
                  Print
                </Label>
              </div>
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
                <div className="space-y-2">
                  <Label htmlFor="price">Price (USD) *</Label>
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
              )}

              {/* Contact Artist Note */}
              {priceType === 'contact' && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Customers will be prompted to contact you for pricing. Make sure your contact information is set in your profile.
                  </p>
                </div>
              )}

              {/* Delivery Scope */}
              <div className="space-y-2">
                <Label>Available for delivery</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={deliveryScope === 'worldwide' ? 'default' : 'outline'}
                    onClick={() => setDeliveryScope('worldwide')}
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
                  <p className="text-xs text-muted-foreground">
                    Note: Country selection will be added in a future update.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" disabled={uploading || !files.length || !title.trim()} className="w-full">
            {uploading ? 'Uploading...' : 'Upload Artwork'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
