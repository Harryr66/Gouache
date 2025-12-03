'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/providers/auth-provider';
import { useContent } from '@/providers/content-provider';
import { useRouter } from 'next/navigation';
import { Upload, Image as ImageIcon, Video, FileText, X, AlertCircle } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { toast } from '@/hooks/use-toast';

export function UploadForm() {
  const { user, avatarUrl, refreshUser } = useAuth();
  const { addContent } = useContent();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    medium: '',
    dimensions: { width: '', height: '', unit: 'cm' },
    tags: '',
    isForSale: false,
    price: '',
    currency: 'USD',
    isAI: false,
    aiAssistance: 'none' as 'none' | 'assisted',
    story: '',
    materials: '',
    process: ''
  });
  
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles(selectedFiles);
      
      // Generate previews for all files
      const newPreviews: string[] = [];
      let loadedCount = 0;
      
      selectedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews.push(e.target?.result as string);
          loadedCount++;
          if (loadedCount === selectedFiles.length) {
            setPreviews(newPreviews);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
    if (currentPreviewIndex >= newFiles.length && newFiles.length > 0) {
      setCurrentPreviewIndex(newFiles.length - 1);
    } else if (newFiles.length === 0) {
      setCurrentPreviewIndex(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length || !user) return;

    // Validate agreement to terms
    if (!agreedToTerms) {
      toast({
        title: "Agreement Required",
        description: "You must agree to the terms regarding AI-generated artwork before uploading.",
        variant: "destructive",
      });
      return;
    }

    // Validate minimum 2 tags
    const tags = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean);
    if (tags.length < 2) {
      toast({
        title: "Tags Required",
        description: "Please add at least 2 tags to your artwork.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('📤 UploadForm: Starting upload process...');
      
      // Upload all files to Firebase Storage
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`📤 UploadForm: Uploading file ${i + 1}/${files.length}...`);
        const fileRef = ref(storage, `portfolio/${user.id}/${Date.now()}_${i}_${file.name}`);
        await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(fileRef);
        uploadedUrls.push(fileUrl);
        console.log(`✅ UploadForm: File ${i + 1} uploaded to Storage:`, fileUrl);
      }

      // Use first image as primary imageUrl, store all in supportingImages
      const primaryImageUrl = uploadedUrls[0];
      const supportingImages = uploadedUrls.slice(1);

      // Create artwork object
      const newArtwork = {
        id: `artwork-${Date.now()}`,
        artist: {
          id: user.id,
          name: user.displayName,
          handle: user.username,
          avatarUrl: user.avatarUrl,
          followerCount: user.followerCount,
          followingCount: user.followingCount,
          createdAt: user.createdAt
        },
        title: formData.title,
        description: formData.description,
        imageUrl: primaryImageUrl,
        supportingImages: supportingImages, // Store additional images/videos
        imageAiHint: formData.description,
        tags: tags,
        price: formData.isForSale ? parseFloat(formData.price) : undefined,
        currency: formData.currency,
        isForSale: formData.isForSale,
        category: formData.category,
        medium: formData.medium,
        dimensions: {
          width: parseFloat(formData.dimensions.width),
          height: parseFloat(formData.dimensions.height),
          unit: formData.dimensions.unit as 'cm' | 'in' | 'px'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        views: 0,
        likes: 0,
        isAI: false, // AI artwork not permitted
        aiAssistance: 'none' as const,
        statement: formData.story,
        materialsList: formData.materials,
        processExplanation: formData.process,
      };

      // Create post object
      const post = {
        id: `post-${Date.now()}`,
        artworkId: newArtwork.id,
        artist: newArtwork.artist,
        imageUrl: primaryImageUrl,
        imageAiHint: newArtwork.imageAiHint,
        caption: formData.description,
        likes: 0,
        commentsCount: 0,
        timestamp: new Date().toISOString(),
        createdAt: Date.now(),
        tags: newArtwork.tags
      };

      // Add to posts/artworks collections
      await addContent(post, newArtwork);
      console.log('✅ UploadForm: Added to posts/artworks collections');

      // Also add to user's portfolio in Firestore
      console.log('📤 UploadForm: Adding to user portfolio...');
      const userDocRef = doc(db, 'userProfiles', user.id);
      const userDoc = await getDoc(userDocRef);
      const currentPortfolio = userDoc.exists() ? (userDoc.data().portfolio || []) : [];
      
      const portfolioItem = {
        id: newArtwork.id,
        imageUrl: primaryImageUrl,
        supportingImages: supportingImages, // Store all images for carousel
        title: formData.title,
        description: formData.description || '',
        medium: formData.medium || '',
        dimensions: formData.dimensions.width && formData.dimensions.height 
          ? `${formData.dimensions.width} x ${formData.dimensions.height} ${formData.dimensions.unit}`
          : '',
        year: '', // UploadForm doesn't have year field
        tags: newArtwork.tags,
        createdAt: new Date()
      };

      const updatedPortfolio = [...currentPortfolio, portfolioItem];
      await updateDoc(userDocRef, {
        portfolio: updatedPortfolio,
        updatedAt: new Date()
      });
      console.log('✅ UploadForm: Added to user portfolio');

      // Refresh user data to sync with Firestore
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for Firestore to process
        await refreshUser();
        console.log('✅ UploadForm: User data refreshed, portfolio synced');
      } catch (refreshError) {
        console.error('⚠️ UploadForm: Error refreshing user data:', refreshError);
        // Don't fail the upload if refresh fails
      }

      router.push('/profile');
    } catch (error) {
      console.error('❌ UploadForm: Error uploading artwork:', error);
    } finally {
      setLoading(false);
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
          Share your creative work with the community
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* AI Artwork Disclaimer */}
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-destructive">AI-Generated Artwork Policy</h3>
              <p className="text-sm text-foreground">
                AI-generated artwork is <strong>not permitted</strong> on Gouache. By uploading artwork, you agree that you will not upload AI-generated artworks. Breach of these terms will result in <strong>permanent suspension</strong> from the platform.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">Artwork Files {files.length > 0 && `(${files.length} selected)`}</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <input
                type="file"
                id="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                multiple
                className="hidden"
              />
              <label htmlFor="file" className="cursor-pointer">
                {previews.length > 0 ? (
                  <div className="space-y-4">
                    {previews.length === 1 ? (
                      <div className="relative">
                        {files[0]?.type.startsWith('video/') ? (
                          <video
                            src={previews[0]}
                            controls
                            className="mx-auto h-64 w-auto max-w-full object-contain rounded-lg"
                          />
                        ) : (
                          <img
                            src={previews[0]}
                            alt="Preview"
                            className="mx-auto h-64 w-auto max-w-full object-contain rounded-lg"
                          />
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeFile(0);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Carousel 
                          className="w-full max-w-md mx-auto"
                          opts={{
                            align: "start",
                          }}
                          setApi={(api) => {
                            if (api) {
                              api.on("select", () => {
                                setCurrentPreviewIndex(api.selectedScrollSnap());
                              });
                            }
                          }}
                        >
                          <CarouselContent>
                            {previews.map((preview, index) => (
                              <CarouselItem key={index}>
                                <div className="relative">
                                  {files[index]?.type.startsWith('video/') ? (
                                    <video
                                      src={preview}
                                      controls
                                      className="mx-auto h-64 w-auto max-w-full object-contain rounded-lg"
                                    />
                                  ) : (
                                    <img
                                      src={preview}
                                      alt={`Preview ${index + 1}`}
                                      className="mx-auto h-64 w-auto max-w-full object-contain rounded-lg"
                                    />
                                  )}
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      removeFile(index);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          {previews.length > 1 && (
                            <>
                              <CarouselPrevious />
                              <CarouselNext />
                            </>
                          )}
                        </Carousel>
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          {currentPreviewIndex + 1} of {previews.length}
                        </p>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">Click to add more files</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Upload your artwork</p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, GIF, MP4 up to 10MB (multiple files supported)
                      </p>
                    </div>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter artwork title"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your artwork..."
              rows={3}
            />
          </div>

          {/* Category and Medium */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="abstract">Abstract</SelectItem>
                  <SelectItem value="charcoal">Charcoal</SelectItem>
                  <SelectItem value="drawing">Drawing</SelectItem>
                  <SelectItem value="sculpture">Sculpture</SelectItem>
                  <SelectItem value="painting">Painting</SelectItem>
                  <SelectItem value="mixed">Mixed Media</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medium">Medium</Label>
              <Input
                id="medium"
                value={formData.medium}
                onChange={(e) => setFormData({ ...formData, medium: e.target.value })}
                placeholder="e.g., Oil on Canvas, Digital"
              />
            </div>
          </div>

          {/* Dimensions */}
          <div className="space-y-2">
            <Label>Dimensions</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Width"
                value={formData.dimensions.width}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  dimensions: { ...formData.dimensions, width: e.target.value }
                })}
              />
              <Input
                placeholder="Height"
                value={formData.dimensions.height}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  dimensions: { ...formData.dimensions, height: e.target.value }
                })}
              />
              <Select 
                value={formData.dimensions.unit} 
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  dimensions: { ...formData.dimensions, unit: value as 'cm' | 'in' | 'px' }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cm">cm</SelectItem>
                  <SelectItem value="in">in</SelectItem>
                  <SelectItem value="px">px</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags <span className="text-destructive">*</span> (Minimum 2 required)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="Enter at least 2 tags separated by commas (e.g., abstract, painting, modern)"
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.tags.split(',').map(tag => tag.trim()).filter(Boolean).length} tag(s) added
            </p>
          </div>

          {/* Artist Notes */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Artist Notes (Optional)</Label>
            
            <div className="space-y-2">
              <Label htmlFor="story">The Story Behind This Work</Label>
              <Textarea
                id="story"
                value={formData.story}
                onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                placeholder="Share the inspiration or story behind this piece..."
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="materials">Materials Used</Label>
              <Textarea
                id="materials"
                value={formData.materials}
                onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                placeholder="List materials (e.g., Oil paints, canvas, brushes)..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="process">Creation Process</Label>
              <Textarea
                id="process"
                value={formData.process}
                onChange={(e) => setFormData({ ...formData, process: e.target.value })}
                placeholder="Describe your creation process step by step..."
                rows={4}
              />
            </div>
          </div>

          {/* Sale Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="isForSale"
                checked={formData.isForSale}
                onCheckedChange={(checked) => setFormData({ ...formData, isForSale: checked })}
              />
              <Label htmlFor="isForSale">Make this artwork available for sale</Label>
            </div>

            {formData.isForSale && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select 
                    value={formData.currency} 
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Terms Agreement */}
          <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg border">
            <Checkbox
              id="agreeToTerms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              className="mt-1"
            />
            <label htmlFor="agreeToTerms" className="text-sm leading-relaxed cursor-pointer">
              I confirm that this artwork is <strong>not AI-generated</strong> and is my original creative work. I understand that uploading AI-generated artwork will result in <strong>permanent suspension</strong> from the platform.
            </label>
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={loading || !files.length || !agreedToTerms}>
            {loading ? `Uploading ${files.length} file(s)...` : `Upload ${files.length > 1 ? `${files.length} Files` : 'Artwork'}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
