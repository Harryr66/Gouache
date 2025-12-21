'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

/**
 * MINIMAL TEST: Absolute simplest version to isolate React error #300
 * - No toast, no alert, only console.log
 * - Use ref to track uploading state instead of useState
 * - Minimal state updates
 */
export function UploadFormStage1Minimal() {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const uploadingRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
  };

  const handleUpload = async () => {
    if (!files.length || !user || uploadingRef.current) {
      console.log('Cannot upload:', { filesLength: files.length, hasUser: !!user, isUploading: uploadingRef.current });
      return;
    }

    uploadingRef.current = true;
    if (buttonRef.current) {
      buttonRef.current.disabled = true;
      buttonRef.current.textContent = 'Uploading...';
    }

    try {
      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileRef = ref(storage, `portfolio/${user.id}/${Date.now()}_${i}_${file.name}`);
        await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(fileRef);
        uploadedUrls.push(fileUrl);
      }

      console.log('✅ Upload successful:', uploadedUrls);
      
      // Only update state after everything is done
      setFiles([]);
      uploadingRef.current = false;
      if (buttonRef.current) {
        buttonRef.current.disabled = false;
        buttonRef.current.textContent = `Upload ${files.length > 0 ? `${files.length} file(s)` : 'files'}`;
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      uploadingRef.current = false;
      if (buttonRef.current) {
        buttonRef.current.disabled = false;
        buttonRef.current.textContent = `Upload ${files.length > 0 ? `${files.length} file(s)` : 'files'}`;
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
        <CardTitle>Upload Artwork - MINIMAL TEST</CardTitle>
        <CardDescription>
          Absolute simplest version - no toast, minimal state, use refs
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
          ref={buttonRef}
          onClick={handleUpload} 
          disabled={!files.length || uploadingRef.current}
          className="w-full"
        >
          Upload {files.length > 0 ? `${files.length} file(s)` : 'files'}
        </Button>
      </CardContent>
    </Card>
  );
}
