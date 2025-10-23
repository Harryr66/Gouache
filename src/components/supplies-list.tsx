'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, ExternalLink, Package, Trash2, Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AffiliateProduct {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  affiliateLink: string;
  createdAt: Date;
}

interface SuppliesListProps {
  isOwnProfile: boolean;
}

export function SuppliesList({ isOwnProfile }: SuppliesListProps) {
  const [supplies, setSupplies] = useState<AffiliateProduct[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newSupply, setNewSupply] = useState({
    name: '',
    description: '',
    imageUrl: '',
    affiliateLink: '',
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // TODO: Implement actual image upload to Firebase Storage
      // For now, create a mock URL
      const mockUrl = URL.createObjectURL(file);
      setNewSupply(prev => ({ ...prev, imageUrl: mockUrl }));
      toast({
        title: "Image uploaded",
        description: "Product image uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddSupply = () => {
    if (!newSupply.name.trim() || !newSupply.description.trim() || !newSupply.affiliateLink.trim()) {
      toast({
        title: "Complete all fields",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const supply: AffiliateProduct = {
      id: Date.now().toString(),
      name: newSupply.name,
      description: newSupply.description,
      imageUrl: newSupply.imageUrl,
      affiliateLink: newSupply.affiliateLink,
      createdAt: new Date(),
    };

    setSupplies(prev => [...prev, supply]);
    setNewSupply({ name: '', description: '', imageUrl: '', affiliateLink: '' });
    setShowAddForm(false);
    
    toast({
      title: "Supply added",
      description: "New supply item added to your list.",
    });
  };

  const handleEditSupply = (id: string) => {
    const supply = supplies.find(s => s.id === id);
    if (supply) {
      setNewSupply({
        name: supply.name,
        description: supply.description,
        imageUrl: supply.imageUrl,
        affiliateLink: supply.affiliateLink,
      });
      setEditingId(id);
      setShowAddForm(true);
    }
  };

  const handleUpdateSupply = () => {
    if (!editingId) return;

    setSupplies(prev => prev.map(supply => 
      supply.id === editingId 
        ? { ...supply, ...newSupply }
        : supply
    ));

    setNewSupply({ name: '', description: '', imageUrl: '', affiliateLink: '' });
    setEditingId(null);
    setShowAddForm(false);
    
    toast({
      title: "Supply updated",
      description: "Supply item updated successfully.",
    });
  };

  const handleDeleteSupply = (id: string) => {
    setSupplies(prev => prev.filter(supply => supply.id !== id));
    toast({
      title: "Supply removed",
      description: "Supply item removed from your list.",
    });
  };

  const handleCancel = () => {
    setNewSupply({ name: '', description: '', imageUrl: '', affiliateLink: '' });
    setEditingId(null);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Supplies List</h3>
          <p className="text-sm text-muted-foreground">
            Share products you use and earn affiliate revenue
          </p>
        </div>
        {isOwnProfile && (
          <Button
            variant="gradient"
            onClick={() => setShowAddForm(true)}
            disabled={isUploading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Supply
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && isOwnProfile && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Supply' : 'Add New Supply'}</CardTitle>
            <CardDescription>
              Add products you use to help others and earn affiliate revenue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supply-name">Product Name *</Label>
              <Input
                id="supply-name"
                value={newSupply.name}
                onChange={(e) => setNewSupply(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Professional Oil Paint Set"
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supply-description">Description *</Label>
              <Textarea
                id="supply-description"
                value={newSupply.description}
                onChange={(e) => setNewSupply(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the product's purpose or why you recommend it..."
                rows={3}
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supply-image">Product Image *</Label>
              <Input
                id="supply-image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploading}
              />
              {isUploading && (
                <p className="text-sm text-muted-foreground">Uploading image...</p>
              )}
              {newSupply.imageUrl && (
                <div className="mt-2">
                  <img
                    src={newSupply.imageUrl}
                    alt="Product preview"
                    className="w-20 h-20 object-cover rounded border"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="affiliate-link">Affiliate Link *</Label>
              <Input
                id="affiliate-link"
                value={newSupply.affiliateLink}
                onChange={(e) => setNewSupply(prev => ({ ...prev, affiliateLink: e.target.value }))}
                placeholder="https://example.com/product?ref=yourcode"
                disabled={isUploading}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={editingId ? handleUpdateSupply : handleAddSupply}
                disabled={isUploading}
                className="flex-1"
              >
                {editingId ? 'Update Supply' : 'Add Supply'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supplies Grid */}
      {supplies.length === 0 ? (
        <Card className="p-8 text-center">
          <CardContent>
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No supplies yet</CardTitle>
            <CardDescription className="mb-4">
              {isOwnProfile 
                ? "Share the products you use to help others and earn affiliate revenue."
                : "This artist hasn't shared any supplies yet."
              }
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {supplies.map((supply) => (
            <Card key={supply.id} className="overflow-hidden group">
              <div className="relative">
                <img
                  src={supply.imageUrl}
                  alt={supply.name}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="text-xs">
                    Affiliate
                  </Badge>
                </div>
                {isOwnProfile && (
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleEditSupply(supply.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteSupply(supply.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2 line-clamp-2">{supply.name}</h4>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                  {supply.description}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open(supply.affiliateLink, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Product
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
