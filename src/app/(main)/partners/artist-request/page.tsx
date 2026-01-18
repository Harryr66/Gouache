'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Palette, Upload, X, CheckCircle, ImageIcon, LinkIcon, FileText, Sparkles } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';
import Link from 'next/link';

const artistRequestSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  artistStatement: z.string().min(100, { message: 'Artist statement must be at least 100 characters.' }).max(2000, { message: 'Artist statement must be less than 2000 characters.' }),
  experience: z.string().min(50, { message: 'Experience description must be at least 50 characters.' }).max(1500, { message: 'Experience must be less than 1500 characters.' }),
  portfolioDescription: z.string().min(20, { message: 'Please describe your portfolio/body of work.' }).max(1000, { message: 'Description must be less than 1000 characters.' }),
  instagram: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  website: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  x: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  tiktok: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
});

type ArtistRequestForm = z.infer<typeof artistRequestSchema>;

export default function ArtistRequestPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [portfolioImages, setPortfolioImages] = useState<{ file: File; preview: string }[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ArtistRequestForm>({
    resolver: zodResolver(artistRequestSchema),
    defaultValues: {
      name: user?.displayName || '',
      email: user?.email || '',
      artistStatement: '',
      experience: '',
      portfolioDescription: '',
      instagram: '',
      website: '',
      x: '',
      tiktok: '',
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: { file: File; preview: string }[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        if (portfolioImages.length + newImages.length < 10) {
          newImages.push({
            file,
            preview: URL.createObjectURL(file),
          });
        }
      }
    }

    setPortfolioImages([...portfolioImages, ...newImages]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...portfolioImages];
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);
    setPortfolioImages(newImages);
  };

  const uploadPortfolioImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const image of portfolioImages) {
      const timestamp = Date.now();
      const fileName = `artist-requests/${timestamp}-${image.file.name}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, image.file);
      const url = await getDownloadURL(storageRef);
      uploadedUrls.push(url);
    }
    
    return uploadedUrls;
  };

  async function onSubmit(values: ArtistRequestForm) {
    // Validate at least one social link
    if (!values.instagram && !values.website && !values.x && !values.tiktok) {
      toast({
        title: 'Social Links Required',
        description: 'Please provide at least one social link to showcase your work.',
        variant: 'destructive',
      });
      return;
    }

    // Validate portfolio images
    if (portfolioImages.length < 3) {
      toast({
        title: 'Portfolio Images Required',
        description: 'Please upload at least 3 portfolio images to showcase your work.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Upload portfolio images first
      setUploadingImages(true);
      const uploadedImageUrls = await uploadPortfolioImages();
      setUploadingImages(false);

      // Build social links object
      const socialLinks: Record<string, string> = {};
      if (values.instagram) socialLinks.instagram = values.instagram;
      if (values.website) socialLinks.website = values.website;
      if (values.x) socialLinks.x = values.x;
      if (values.tiktok) socialLinks.tiktok = values.tiktok;

      // Submit the request
      const response = await fetch('/api/artist-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          artistStatement: values.artistStatement,
          experience: values.experience,
          portfolioDescription: values.portfolioDescription,
          portfolioImages: uploadedImageUrls,
          socialLinks,
          source: 'partners-artist-request',
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
      console.error('Artist request submission error:', error);
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
              Thank you for applying to become a Gouache artist. Our team will review your application and portfolio, and we&apos;ll be in touch within 5-7 business days.
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
            <Palette className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Request an Artist Account</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Join the Gouache community of professional artists. Share your work, connect with collectors, and grow your audience.
        </p>
      </div>

      {/* Benefits Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <Sparkles className="h-8 w-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Professional Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Create a verified artist profile with a portfolio, bio, and showcase your exhibitions.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <ImageIcon className="h-8 w-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Share Your Art</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Upload and share your artwork with our growing community of art enthusiasts.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <LinkIcon className="h-8 w-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Sell & Connect</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              List artworks for sale and connect directly with collectors interested in your work.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Application Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Artist Application Form
          </CardTitle>
          <CardDescription>
            Please complete all required fields. Applications are reviewed within 5-7 business days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Basic Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Your full name" {...field} />
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
                          <Input type="email" placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Artist Statement */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Artist Statement *</h3>
                <FormField
                  control={form.control}
                  name="artistStatement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tell us about your artistic vision and practice</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your artistic vision, themes you explore, and what drives your creative practice..."
                          className="resize-none min-h-[150px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value.length}/2000 characters (minimum 100)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Experience */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Experience & Background *</h3>
                <FormField
                  control={form.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Describe your artistic experience and background</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Include education, exhibitions, awards, years of practice, mediums you work with..."
                          className="resize-none min-h-[120px]"
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

              {/* Portfolio Images */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Portfolio Images *</h3>
                <p className="text-sm text-muted-foreground">
                  Upload 3-10 images showcasing your best work. These will be reviewed by our team.
                </p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {portfolioImages.map((image, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                      <Image
                        src={image.preview}
                        alt={`Portfolio ${index + 1}`}
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
                  
                  {portfolioImages.length < 10 && (
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
                  {portfolioImages.length}/10 images uploaded {portfolioImages.length < 3 && '(minimum 3 required)'}
                </p>

                <FormField
                  control={form.control}
                  name="portfolioDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Portfolio Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Briefly describe your portfolio, the works included, and any notable pieces..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Social Links *</h3>
                <p className="text-sm text-muted-foreground">
                  Provide at least one link where we can view more of your work.
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website / Portfolio</FormLabel>
                        <FormControl>
                          <Input placeholder="https://yourwebsite.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="instagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram</FormLabel>
                        <FormControl>
                          <Input placeholder="https://instagram.com/yourusername" {...field} />
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
                          <Input placeholder="https://x.com/yourusername" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tiktok"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>TikTok</FormLabel>
                        <FormControl>
                          <Input placeholder="https://tiktok.com/@yourusername" {...field} />
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
                  By submitting this application, you agree to our Terms of Service and confirm that the work submitted is your own original creation.
                </p>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
