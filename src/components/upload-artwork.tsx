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

/**
 * NEW Artwork Upload Portal - Built from scratch
 * Simple, working implementation
 */
export function UploadArtwork() {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
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

      // Update user's portfolio in Firestore
      const userDocRef = doc(db, 'userProfiles', user.id);
      const userDoc = await getDoc(userDocRef);
      const currentPortfolio = userDoc.exists() ? (userDoc.data().portfolio || []) : [];

      const portfolioItem = {
        id: `artwork-${Date.now()}`,
        imageUrl: uploadedUrls[0],
        supportingImages: uploadedUrls.slice(1),
        title: title.trim(),
        description: description.trim() || '',
        type: 'artwork',
        showInPortfolio: true,
        showInShop: false,
        isForSale: false,
        createdAt: new Date(),
      };

      const updatedPortfolio = [...currentPortfolio, portfolioItem];

      await updateDoc(userDocRef, {
        portfolio: updatedPortfolio,
        updatedAt: new Date(),
      });

      toast({
        title: 'Artwork uploaded',
        description: 'Your artwork has been added to your portfolio.',
      });

      // Reset form
      setFiles([]);
      setTitle('');
      setDescription('');
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
          Upload images to your portfolio
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="files">Images *</Label>
            <Input
              id="files"
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              className="mt-1"
            />
            {files.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {files.length} file(s) selected
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter artwork title"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your artwork..."
              rows={3}
            />
          </div>

          <Button type="submit" disabled={uploading || !files.length || !title.trim()} className="w-full">
            {uploading ? 'Uploading...' : 'Upload Artwork'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
