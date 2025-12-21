'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * BARE BONES: Absolute minimal product upload
 * - File input only
 * - Button click logs to console
 * - NO state, NO Firebase, NO forms
 * - This is the starting point for incremental rebuild
 */
export function ProductUploadBarebones() {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    console.log('Product images selected:', files ? Array.from(files).map(f => f.name) : 'none');
  };

  const handleClick = () => {
    console.log('Product upload button clicked');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Product - BARE BONES</CardTitle>
        <CardDescription>
          Minimal implementation - just file input and button. Check console for logs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="block w-full text-sm"
        />
        
        <Button onClick={handleClick} className="w-full">
          Upload Product
        </Button>
      </CardContent>
    </Card>
  );
}
