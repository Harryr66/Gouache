'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/providers/auth-provider';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

/**
 * NEW Product Upload Portal - Built from scratch
 * Simple, working implementation
 */
export function UploadProduct() {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [uploading, setUploading] = useState(false);

  // Debug: Log when component renders
  React.useEffect(() => {
    console.log('✅ UploadProduct component rendered');
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !files.length || !title.trim() || !price.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please select images, enter a title, and set a price.',
        variant: 'destructive',
      });
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({
        title: 'Invalid price',
        description: 'Please enter a valid price.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Upload images to Firebase Storage
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const path = `marketplaceProducts/${user.id}/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const imageUrl = await getDownloadURL(storageRef);
        uploadedUrls.push(imageUrl);
      }

      // Create product document in Firestore
      const productData = {
        title: title.trim(),
        description: description.trim() || '',
        price: priceNum,
        currency: 'USD',
        category: 'art-prints',
        subcategory: 'fine-art-prints',
        images: uploadedUrls,
        sellerId: user.id,
        sellerName: user.displayName || user.username || 'Artist',
        isAffiliate: false,
        isActive: true,
        stock: 1,
        rating: 0,
        reviewCount: 0,
        tags: [],
        salesCount: 0,
        isOnSale: false,
        isApproved: true,
        status: 'approved',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, 'marketplaceProducts'), productData);

      toast({
        title: 'Product created',
        description: 'Your product has been created and will appear in your shop.',
      });

      // Reset form
      setFiles([]);
      setTitle('');
      setDescription('');
      setPrice('');
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to create product. Please try again.',
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
            <p className="text-muted-foreground">Please log in to upload products.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Product</CardTitle>
        <CardDescription>
          List a product for sale in your shop
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="product-images">Product Images *</Label>
            <Input
              id="product-images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="mt-1"
            />
            {files.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {files.length} image(s) selected
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="product-title">Product Title *</Label>
            <Input
              id="product-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter product title"
              required
            />
          </div>

          <div>
            <Label htmlFor="product-description">Description</Label>
            <Textarea
              id="product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your product..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="product-price">Price (USD) *</Label>
            <Input
              id="product-price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <Button type="submit" disabled={uploading || !files.length || !title.trim() || !price.trim()} className="w-full">
            {uploading ? 'Creating...' : 'Create Product'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
