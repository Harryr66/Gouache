'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Trash2, Edit, Save, X, Upload } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/auth-provider';

interface PortfolioItem {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  medium: string;
  dimensions: string;
  year: string;
  tags: string[];
  createdAt: Date;
}

export function PortfolioManager() {
  const { user, refreshUser } = useAuth();
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    medium: '',
    dimensions: '',
    year: '',
    tags: ''
  });

  useEffect(() => {
    if (user?.portfolio && Array.isArray(user.portfolio)) {
      // Map portfolio items and ensure all required fields are present
      const mappedItems = user.portfolio.map((item: any) => {
        // Convert createdAt from Firestore Timestamp to Date if needed
        let createdAt: Date;
        if (item.createdAt?.toDate) {
          createdAt = item.createdAt.toDate();
        } else if (item.createdAt instanceof Date) {
          createdAt = item.createdAt;
        } else {
          createdAt = new Date();
        }
        
        return {
          id: item.id || `portfolio-${item.imageUrl}`,
          imageUrl: item.imageUrl || '',
          title: item.title || 'Untitled Artwork',
          description: item.description || '',
          medium: item.medium || '',
          dimensions: item.dimensions || '',
          year: item.year || '',
          tags: Array.isArray(item.tags) ? item.tags : [],
          createdAt: createdAt
        };
      }).filter(item => item.imageUrl); // Only include items with images
      
      console.log('📋 PortfolioManager: Loading portfolio items:', {
        count: mappedItems.length,
        totalInUser: user.portfolio.length,
        items: mappedItems.map((item: any) => ({
          id: item.id,
          title: item.title,
          imageUrl: item.imageUrl ? 'has image' : 'no image'
        }))
      });
      
      setPortfolioItems(mappedItems);
    } else {
      console.log('📋 PortfolioManager: No portfolio found in user data', {
        hasUser: !!user,
        hasPortfolio: !!user?.portfolio,
        portfolioType: typeof user?.portfolio
      });
      setPortfolioItems([]);
    }
  }, [user?.portfolio]);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const maxWidth = 1200;
        const maxHeight = 1200;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.8);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Require title before uploading
    if (!newItem.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter an artwork title before uploading.",
        variant: "destructive"
      });
      // Reset the file input
      event.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const compressedFile = await compressImage(file);
      const imageRef = ref(storage, `portfolio/${user.id}/${Date.now()}_${file.name}`);
      await uploadBytes(imageRef, compressedFile);
      const imageUrl = await getDownloadURL(imageRef);

      // Use current timestamp instead of serverTimestamp to avoid placeholder issues
      const now = new Date();
      const portfolioItem: any = {
        id: Date.now().toString(),
        imageUrl,
        title: newItem.title.trim(),
        description: newItem.description || '',
        medium: newItem.medium || '',
        dimensions: newItem.dimensions || '',
        year: newItem.year || '',
        tags: newItem.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        createdAt: now // Use Date object instead of serverTimestamp to avoid placeholder issues
      };

      console.log('📤 Uploading portfolio item:', {
        userId: user.id,
        itemId: portfolioItem.id,
        title: portfolioItem.title,
        imageUrl: portfolioItem.imageUrl ? 'has image' : 'no image',
        createdAt: portfolioItem.createdAt
      });

      // Read current portfolio from Firestore to ensure we have the latest data
      const userDocRef = doc(db, 'userProfiles', user.id);
      const userDoc = await getDoc(userDocRef);
      const currentPortfolio = userDoc.exists() ? (userDoc.data().portfolio || []) : [];
      
      // Check if item with same ID already exists
      const existingIndex = currentPortfolio.findIndex((item: any) => item.id === portfolioItem.id);
      
      // Add or update the portfolio item
      let updatedPortfolio;
      if (existingIndex >= 0) {
        // Update existing item
        updatedPortfolio = [...currentPortfolio];
        updatedPortfolio[existingIndex] = portfolioItem;
        console.log('📝 Updating existing portfolio item at index:', existingIndex);
      } else {
        // Add new item
        updatedPortfolio = [...currentPortfolio, portfolioItem];
        console.log('➕ Adding new portfolio item, total items:', updatedPortfolio.length);
      }

      // Update user profile with the complete portfolio array
      await updateDoc(userDocRef, {
        portfolio: updatedPortfolio,
        updatedAt: now
      });

      console.log('✅ Portfolio item saved to Firestore, total items:', updatedPortfolio.length);

      // Update local state immediately for instant feedback
      const localItem: PortfolioItem = {
        ...portfolioItem,
        createdAt: now
      };
      setPortfolioItems(prev => {
        // Check if item already exists to avoid duplicates
        const exists = prev.some(p => p.id === localItem.id);
        if (exists) {
          console.log('⚠️ Item already in local state, skipping duplicate');
          return prev;
        }
        console.log('✅ Adding item to local state:', localItem.id);
        return [...prev, localItem];
      });

      // Wait longer for Firestore to process and propagate the update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Refresh user data to sync with Firestore
      try {
        await refreshUser();
        console.log('✅ User data refreshed, portfolio synced with Firestore');
      } catch (refreshError) {
        console.error('⚠️ Error refreshing user data:', refreshError);
        // Don't fail the upload if refresh fails - local state is already updated
      }
      setNewItem({
        title: '',
        description: '',
        medium: '',
        dimensions: '',
        year: '',
        tags: ''
      });
      setShowAddForm(false);

      toast({
        title: "Portfolio updated",
        description: "New artwork added to your portfolio.",
      });
    } catch (error) {
      console.error('Error uploading portfolio image:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload artwork. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  const handleUpdateItem = async (item: PortfolioItem) => {
    if (!user) return;

    try {
      // Remove old item and add updated item
      const updatedItems = portfolioItems.map(p => p.id === item.id ? item : p);
      
      await updateDoc(doc(db, 'userProfiles', user.id), {
        portfolio: updatedItems,
        updatedAt: serverTimestamp()
      });

      // Refresh user data to update the portfolio in the auth context
      await refreshUser();

      setPortfolioItems(updatedItems);
      setEditingItem(null);

      toast({
        title: "Portfolio updated",
        description: "Artwork details have been updated.",
      });
    } catch (error) {
      console.error('Error updating portfolio item:', error);
      toast({
        title: "Update failed",
        description: "Failed to update artwork. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteItem = async (item: PortfolioItem) => {
    if (!user) return;

    try {
      // Delete image from storage
      if (item.imageUrl) {
        const imageRef = ref(storage, item.imageUrl);
        try {
          await deleteObject(imageRef);
        } catch (error) {
          console.error('Error deleting image from storage:', error);
          // Continue even if storage delete fails
        }
      }

      // Read current portfolio from Firestore
      const userDocRef = doc(db, 'userProfiles', user.id);
      const userDoc = await getDoc(userDocRef);
      const currentPortfolio = userDoc.exists() ? (userDoc.data().portfolio || []) : [];
      
      // Remove item from portfolio array
      const updatedPortfolio = currentPortfolio.filter((p: any) => p.id !== item.id);
      
      console.log('🗑️ Deleting portfolio item:', {
        itemId: item.id,
        beforeCount: currentPortfolio.length,
        afterCount: updatedPortfolio.length
      });

      // Update Firestore with the filtered portfolio
      await updateDoc(userDocRef, {
        portfolio: updatedPortfolio,
        updatedAt: new Date()
      });

      // Refresh user data to update the portfolio in the auth context
      await refreshUser();

      setPortfolioItems(prev => prev.filter(p => p.id !== item.id));

      toast({
        title: "Artwork deleted",
        description: "Artwork has been removed from your portfolio.",
      });
    } catch (error) {
      console.error('Error deleting portfolio item:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete artwork. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (!user?.isProfessional) {
    return null;
  }

  return (
    <div className="space-y-6">

      {/* Add New Artwork Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Artwork</CardTitle>
            <CardDescription>Upload a new piece to your portfolio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Artwork Title *</Label>
                <Input
                  id="title"
                  value={newItem.title}
                  onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter artwork title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medium">Medium</Label>
                <Input
                  id="medium"
                  value={newItem.medium}
                  onChange={(e) => setNewItem(prev => ({ ...prev, medium: e.target.value }))}
                  placeholder="Oil on canvas, Digital, etc."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="portfolio-image">Artwork Image *</Label>
              <Input
                id="portfolio-image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploading || !newItem.title.trim()}
              />
              {!newItem.title.trim() && (
                <p className="text-sm text-muted-foreground">Please enter an artwork title before uploading an image.</p>
              )}
              {isUploading && (
                <p className="text-sm text-muted-foreground">Uploading image...</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dimensions">Dimensions</Label>
                <Input
                  id="dimensions"
                  value={newItem.dimensions}
                  onChange={(e) => setNewItem(prev => ({ ...prev, dimensions: e.target.value }))}
                  placeholder="24 x 30 inches"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  value={newItem.year}
                  onChange={(e) => setNewItem(prev => ({ ...prev, year: e.target.value }))}
                  placeholder="2024"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your artwork..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={newItem.tags}
                onChange={(e) => setNewItem(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="abstract, painting, modern (comma-separated)"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Grid */}
      {portfolioItems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No artworks yet</h3>
            <p className="text-muted-foreground mb-4">
              Start building your portfolio by adding your first artwork.
            </p>
            <Button 
              variant="gradient"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Artwork
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolioItems.map((item) => (
            <Card key={item.id} className="overflow-hidden group">
              <div className="relative">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingItem(item)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteItem(item)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-1">{item.title}</h3>
                {item.medium && (
                  <p className="text-sm text-muted-foreground mb-2">{item.medium}</p>
                )}
                {item.dimensions && (
                  <p className="text-sm text-muted-foreground mb-2">{item.dimensions}</p>
                )}
                {item.year && (
                  <p className="text-sm text-muted-foreground mb-2">{item.year}</p>
                )}
                {item.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                )}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Edit Artwork
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingItem(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, title: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-medium">Medium</Label>
                <Input
                  id="edit-medium"
                  value={editingItem.medium}
                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, medium: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dimensions">Dimensions</Label>
                <Input
                  id="edit-dimensions"
                  value={editingItem.dimensions}
                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, dimensions: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-year">Year</Label>
                <Input
                  id="edit-year"
                  value={editingItem.year}
                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, year: e.target.value } : null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editingItem.description}
                onChange={(e) => setEditingItem(prev => prev ? { ...prev, description: e.target.value } : null)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags</Label>
              <Input
                id="edit-tags"
                value={editingItem.tags.join(', ')}
                onChange={(e) => setEditingItem(prev => prev ? { 
                  ...prev, 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                } : null)}
                placeholder="abstract, painting, modern (comma-separated)"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingItem(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => editingItem && handleUpdateItem(editingItem)}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
