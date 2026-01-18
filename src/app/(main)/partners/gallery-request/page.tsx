'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Upload, X, CheckCircle, ImageIcon, Calendar, ShoppingBag, FileText } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';
import Link from 'next/link';

const galleryRequestSchema = z.object({
  galleryName: z.string().min(2, { message: 'Gallery name must be at least 2 characters.' }),
  contactName: z.string().min(2, { message: 'Contact name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  phone: z.string().optional(),
  galleryType: z.enum(['commercial', 'non-profit', 'artist-run', 'museum', 'other']),
  location: z.string().min(5, { message: 'Please provide a full address.' }),
  city: z.string().min(2, { message: 'City is required.' }),
  country: z.string().min(2, { message: 'Country is required.' }),
  website: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  bio: z.string().min(100, { message: 'Gallery description must be at least 100 characters.' }).max(1500, { message: 'Description must be less than 1500 characters.' }),
  yearsOperating: z.string().min(1, { message: 'Please specify years operating.' }),
  artistsRepresented: z.string().min(20, { message: 'Please describe the artists you represent.' }).max(1000, { message: 'Must be less than 1000 characters.' }),
  exhibitionHistory: z.string().min(50, { message: 'Please describe your exhibition history (min 50 characters).' }).max(1500, { message: 'Must be less than 1500 characters.' }),
  instagram: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  facebook: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  x: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
});

type GalleryRequestForm = z.infer<typeof galleryRequestSchema>;

export default function GalleryRequestPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [galleryImages, setGalleryImages] = useState<{ file: File; preview: string }[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<GalleryRequestForm>({
    resolver: zodResolver(galleryRequestSchema),
    defaultValues: {
      galleryName: '',
      contactName: user?.displayName || '',
      email: user?.email || '',
      phone: '',
      galleryType: 'commercial',
      location: '',
      city: '',
      country: '',
      website: '',
      bio: '',
      yearsOperating: '',
      artistsRepresented: '',
      exhibitionHistory: '',
      instagram: '',
      facebook: '',
      x: '',
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: { file: File; preview: string }[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        if (galleryImages.length + newImages.length < 10) {
          newImages.push({
            file,
            preview: URL.createObjectURL(file),
          });
        }
      }
    }

    setGalleryImages([...galleryImages, ...newImages]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...galleryImages];
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);
    setGalleryImages(newImages);
  };

  const uploadGalleryImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const image of galleryImages) {
      const timestamp = Date.now();
      const fileName = `gallery-requests/${timestamp}-${image.file.name}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, image.file);
      const url = await getDownloadURL(storageRef);
      uploadedUrls.push(url);
    }
    
    return uploadedUrls;
  };

  async function onSubmit(values: GalleryRequestForm) {
    // Validate at least one social link or website
    if (!values.instagram && !values.website && !values.x && !values.facebook) {
      toast({
        title: 'Online Presence Required',
        description: 'Please provide at least one website or social link.',
        variant: 'destructive',
      });
      return;
    }

    // Validate gallery images
    if (galleryImages.length < 3) {
      toast({
        title: 'Gallery Images Required',
        description: 'Please upload at least 3 images of your gallery space or exhibitions.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Upload gallery images first
      setUploadingImages(true);
      const uploadedImageUrls = await uploadGalleryImages();
      setUploadingImages(false);

      // Build social links object
      const socialLinks: Record<string, string> = {};
      if (values.instagram) socialLinks.instagram = values.instagram;
      if (values.website) socialLinks.website = values.website;
      if (values.x) socialLinks.x = values.x;
      if (values.facebook) socialLinks.facebook = values.facebook;

      // Submit the request
      const response = await fetch('/api/gallery-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          galleryName: values.galleryName,
          contactName: values.contactName,
          email: values.email,
          phone: values.phone,
          galleryType: values.galleryType,
          location: values.location,
          city: values.city,
          country: values.country,
          website: values.website,
          bio: values.bio,
          yearsOperating: values.yearsOperating,
          artistsRepresented: values.artistsRepresented,
          exhibitionHistory: values.exhibitionHistory,
          galleryImages: uploadedImageUrls,
          socialLinks,
          source: 'partners-gallery-request',
          userId: user?.id || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit application');
      }

      setIsSubmitted(true);
      toast({
        title: 'Application Submitted!',
        description: 'Thank you for your application. Our team will review it and get back to you soon.',
      });
    } catch (error: any) {
      console.error('Gallery request submission error:', error);
      toast({
        title: 'Submission Failed',
        description: error.message || 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setUploadingImages(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle className="h-16 w-16 text-green-500 mb-6" />
            <h2 className="text-2xl font-bold mb-4 text-center">Application Submitted!</h2>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Thank you for applying to become a Gouache gallery partner. Our team will review your application, and we&apos;ll be in touch within 5-7 business days.
            </p>
            <div className="flex gap-4">
              <Link href="/discover">
                <Button variant="outline">Explore Gouache</Button>
              </Link>
              <Link href="/">
                <Button variant="gradient">Return Home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Request a Gallery Account</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Join Gouache as a gallery partner. Showcase exhibitions, list artworks for sale, and connect with collectors worldwide.
        </p>
      </div>

      {/* Benefits Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <Building2 className="h-8 w-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Gallery Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Create a verified gallery profile with your information, location, and represented artists.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <Calendar className="h-8 w-8 mb-2 text-primary" />
            <CardTitle className="text-lg">List Events</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Promote exhibitions, openings, and events to our growing community of art enthusiasts.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <ShoppingBag className="h-8 w-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Sell Artworks</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              List artworks for sale that appear in the Discover section&apos;s Art Market.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Application Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gallery Application Form
          </CardTitle>
          <CardDescription>
            Please complete all required fields. Applications are reviewed within 5-7 business days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Gallery Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Gallery Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="galleryName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gallery Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Modern Art Gallery" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="galleryType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gallery Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gallery type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="commercial">Commercial Gallery</SelectItem>
                            <SelectItem value="non-profit">Non-Profit Gallery</SelectItem>
                            <SelectItem value="artist-run">Artist-Run Space</SelectItem>
                            <SelectItem value="museum">Museum</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="yearsOperating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Years Operating *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 5 years, Since 2015" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Contact Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person *</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contact@gallery.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://yourgallery.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Location</h3>
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St, Suite 100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="New York" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country *</FormLabel>
                        <FormControl>
                          <Input placeholder="United States" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Gallery Description */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">About Your Gallery *</h3>
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gallery Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your gallery, its focus, mission, and what makes it unique..."
                          className="resize-none min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value.length}/1500 characters (minimum 100)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="artistsRepresented"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Artists Represented *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the artists you represent, their styles, and mediums..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value.length}/1000 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="exhibitionHistory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exhibition History *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="List notable exhibitions, art fairs, or events you've hosted or participated in..."
                          className="resize-none min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value.length}/1500 characters (minimum 50)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Gallery Images */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Gallery Images *</h3>
                <p className="text-sm text-muted-foreground">
                  Upload 3-10 images of your gallery space, exhibitions, or represented artworks.
                </p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {galleryImages.map((image, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                      <Image
                        src={image.preview}
                        alt={`Gallery ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  
                  {galleryImages.length < 10 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 flex flex-col items-center justify-center gap-2 transition-colors"
                    >
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Add Image</span>
                    </button>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                
                <p className="text-xs text-muted-foreground">
                  {galleryImages.length}/10 images uploaded {galleryImages.length < 3 && '(minimum 3 required)'}
                </p>
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Social Links *</h3>
                <p className="text-sm text-muted-foreground">
                  Provide at least one social link or website.
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="instagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram</FormLabel>
                        <FormControl>
                          <Input placeholder="https://instagram.com/yourgallery" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="facebook"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facebook</FormLabel>
                        <FormControl>
                          <Input placeholder="https://facebook.com/yourgallery" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="x"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>X (Twitter)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://x.com/yourgallery" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button 
                  variant="gradient" 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {uploadingImages ? 'Uploading Images...' : 'Submitting Application...'}
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  By submitting this application, you agree to our Terms of Service and confirm that the information provided is accurate.
                </p>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
