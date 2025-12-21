'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/providers/auth-provider';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * BASIC Artwork Upload - Portfolio only
 * Title, Description, Image - That's it
 */
export function UploadArtworkBasic() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isForSale, setIsForSale] = useState(false);
  const [priceType, setPriceType] = useState<'fixed' | 'contact'>('fixed');
  const [price, setPrice] = useState('');
  const [deliveryScope, setDeliveryScope] = useState<'worldwide' | 'specific'>('worldwide');

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
        createdAt: new Date(),
        updatedAt: new Date(),
        likes: 0,
        commentsCount: 0,
        tags: [],
        aiAssistance: 'none',
        isAI: false,
      };

      // Add sale-related fields if for sale
      if (isForSale) {
        if (priceType === 'fixed' && price.trim()) {
          portfolioItem.price = parseFloat(price) * 100; // Convert to cents
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
        description: 'Your artwork has been added to your portfolio.',
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
      setPriceType('fixed');
      setPrice('');
      setDeliveryScope('worldwide');

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
