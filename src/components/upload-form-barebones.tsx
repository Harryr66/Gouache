'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * BARE BONES: Absolute minimal artwork upload
 * - File input only
 * - Button click logs to console
 * - NO state, NO Firebase, NO forms
 * - This is the starting point for incremental rebuild
 */
export function UploadFormBarebones() {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    console.log('Files selected:', files ? Array.from(files).map(f => f.name) : 'none');
  };

  const handleClick = () => {
    console.log('Upload button clicked');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Artwork - BARE BONES</CardTitle>
        <CardDescription>
          Minimal implementation - just file input and button. Check console for logs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileChange}
          className="block w-full text-sm"
        />
        
        <Button onClick={handleClick} className="w-full">
          Upload
        </Button>
      </CardContent>
    </Card>
  );
}
