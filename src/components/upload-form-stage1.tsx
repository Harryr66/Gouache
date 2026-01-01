'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
// Removed toast import - using console.log only to isolate React error #300

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
    // Use setTimeout to defer state update
    setTimeout(() => {
      setFiles(selectedFiles);
    }, 0);
  };

  const handleUpload = () => {
    if (!files.length || !user) {
      console.log('Missing requirements: files or user');
      return;
    }
    
    // Use setTimeout to ensure ALL state updates are outside render cycle
    setTimeout(async () => {
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

        console.log('Files uploaded successfully:', uploadedUrls);

        // Success - update state in next tick
        setTimeout(() => {
          console.log('✅ Upload successful - updating state');
          setFiles([]);
          setUploading(false);
          alert(`Successfully uploaded ${files.length} file(s).`);
        }, 0);
      } catch (error) {
        console.error('Upload error:', error);
        setTimeout(() => {
          console.log('❌ Upload failed - updating state');
          setUploading(false);
          alert('Upload failed. Please try again.');
        }, 0);
      }
    }, 0);
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
