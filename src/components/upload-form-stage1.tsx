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
 * STAGE 1: Simplest artwork upload
 * - File picker
 * - Upload to Firebase Storage
 * - Show success message
 * - NO database writes, NO forms, NO navigation
 */
export function UploadFormStage1() {
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
      const uploadedUrls: string[] = [];
      
      // Upload all files to Firebase Storage
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileRef = ref(storage, `portfolio/${user.id}/${Date.now()}_${i}_${file.name}`);
        await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(fileRef);
        uploadedUrls.push(fileUrl);
      }

      // Success - just show message, no database writes
      toast({
        title: 'Files uploaded',
        description: `Successfully uploaded ${files.length} file(s) to storage.`,
      });

      // Reset files
      setFiles([]);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload files. Please try again.',
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
        <CardTitle>Upload Artwork - Stage 1</CardTitle>
        <CardDescription>
          Simple file upload to storage only (no database writes)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
          {files.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              {files.length} file(s) selected
            </p>
          )}
        </div>
        
        <Button 
          onClick={handleUpload} 
          disabled={!files.length || uploading}
          className="w-full"
        >
          {uploading ? 'Uploading...' : `Upload ${files.length > 0 ? `${files.length} file(s)` : 'files'}`}
        </Button>
      </CardContent>
    </Card>
  );
}
