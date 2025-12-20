'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Calendar, ShoppingBag } from 'lucide-react';
import { Gallery } from '@/lib/types';

const gallerySignupSchema = z.object({
  galleryName: z.string().min(2, { message: 'Gallery name must be at least 2 characters.' }),
  handle: z.string().min(3, 'Username must be at least 3 characters.').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  galleryType: z.enum(['commercial', 'non-profit', 'artist-run', 'museum', 'other']),
  location: z.string().min(2, { message: 'Location is required.' }),
  city: z.string().optional(),
  country: z.string().optional(),
  website: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  bio: z.string().max(500, { message: 'Bio must be less than 500 characters.' }).optional(),
});

export default function PartnersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof gallerySignupSchema>>({
    resolver: zodResolver(gallerySignupSchema),
    defaultValues: {
      galleryName: '',
      handle: '',
      email: '',
      password: '',
      galleryType: 'commercial',
      location: '',
      city: '',
      country: '',
      website: '',
      contactPhone: '',
      bio: '',
    },
  });

  async function onSubmit(values: z.infer<typeof gallerySignupSchema>) {
    setIsLoading(true);

    try {
      // Create user with Firebase Auth first
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );

      const user = userCredential.user;

      // Update user profile with display name
      await updateProfile(user, {
        displayName: values.galleryName,
      });

      // Create gallery document in Firestore
      const galleryData: Gallery = {
        id: user.uid,
        name: values.galleryName,
        handle: values.handle,
        avatarUrl: undefined,
        bio: values.bio || undefined,
        website: values.website || undefined,
        location: values.location,
        city: values.city || undefined,
        country: values.country || undefined,
        followerCount: 0,
        followingCount: 0,
        isVerified: false,
        galleryType: values.galleryType,
        contactEmail: values.email,
        contactPhone: values.contactPhone || undefined,
        createdAt: new Date(),
        events: [],
        artworksForSale: [],
      };

      // Store gallery data in Firestore
      await setDoc(doc(db, 'users', values.handle), {
        ...galleryData,
        accountRole: 'gallery',
        email: values.email,
        displayName: values.galleryName,
        username: values.handle,
        isProfessional: true,
        isActive: true,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Store in userProfiles for username login support
      await setDoc(doc(db, 'userProfiles', user.uid), {
        ...galleryData,
        accountRole: 'gallery',
        email: values.email,
        displayName: values.galleryName,
        username: values.handle,
        isProfessional: true,
        isActive: true,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Store in galleries collection
      await setDoc(doc(db, 'galleries', user.uid), galleryData);

      toast({
        title: 'Gallery Account Created!',
        description: `Welcome to Gouache, ${values.galleryName}! Your gallery account has been created successfully.`,
      });

      // Redirect to gallery dashboard
      router.push('/gallery/dashboard');
    } catch (error: any) {
      console.error('Gallery signup error:', error);

      let errorMessage = 'An error occurred during signup. Please try again.';

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      }

      toast({
        title: 'Signup Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl w-full max-w-full overflow-x-hidden">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 break-words">Partner with Gouache</h1>
        <p className="text-muted-foreground text-lg">
          Create a Gallery account to list events and artworks for sale
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <Building2 className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Gallery Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Create a professional gallery profile with your information, location, and social links.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Calendar className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>List Events</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Showcase your upcoming exhibitions, openings, and events to reach art enthusiasts.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <ShoppingBag className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Sell Artworks</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              List artworks for sale that will appear in the Discover section when users filter by "For Sale".
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Gallery Account</CardTitle>
          <CardDescription>
            Fill out the form below to create your gallery account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  name="handle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username *</FormLabel>
                      <FormControl>
                        <Input placeholder="modern_art_gallery" {...field} />
                      </FormControl>
                      <FormDescription>
                        This will be your unique gallery handle
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location *</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St, New York, NY" {...field} />
                    </FormControl>
                    <FormDescription>
                      Full address or location description
                    </FormDescription>
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
                      <FormLabel>City</FormLabel>
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
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="United States" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://gallery.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about your gallery..."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Brief description of your gallery (max 500 characters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button variant="gradient" type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Gallery Account
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

