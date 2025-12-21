'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

/**
 * STAGE 1: Simplest product upload
 * - File picker
 * - Upload to Firebase Storage
 * - Write minimal product document to Firestore
 * - Show success message
 */
export function ProductUploadStage1() {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
  };

  const handleUpload = async () => {
    if (!files.length || !user) {
      toast({
        title: 'Missing requirements',
        description: 'Please select files and ensure you are logged in.',
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

      // Write minimal product document to Firestore
      const productData = {
        images: uploadedUrls,
        sellerId: user.id,
        sellerName: user.displayName || user.username || 'Artist',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, 'marketplaceProducts'), productData);

      // Success
      toast({
        title: 'Product uploaded',
        description: `Successfully uploaded ${files.length} image(s) and created product.`,
      });

      // Reset files
      setFiles([]);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload product. Please try again.',
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
        <CardTitle>Upload Product - Stage 1</CardTitle>
        <CardDescription>
          Simple file upload to storage + minimal Firestore document
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
          {files.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              {files.length} image(s) selected
            </p>
          )}
        </div>
        
        <Button 
          onClick={handleUpload} 
          disabled={!files.length || uploading}
          className="w-full"
        >
          {uploading ? 'Uploading...' : `Upload ${files.length > 0 ? `${files.length} image(s)` : 'images'}`}
        </Button>
      </CardContent>
    </Card>
  );
}
