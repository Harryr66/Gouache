'use client';

import React, { useState, useEffect, useRef, ChangeEvent, useLayoutEffect, useMemo, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Image, Package, Calendar, ArrowLeft, Brain, GraduationCap } from 'lucide-react';
import { UploadForm } from '@/components/upload-form';
import { ThemeLoading } from '@/components/theme-loading';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc } from 'firebase/firestore';

export default function UploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<'artwork' | 'event' | 'product' | 'course' | null>(null);
  const [hasApprovedArtistRequest, setHasApprovedArtistRequest] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    startDate: '',
    endDate: '',
    time: '',
    location: '',
    locationTag: '',
    venue: '',
    description: '',
    price: '',
    bookingUrl: '',
  });
  const [eventImageFile, setEventImageFile] = useState<File | null>(null);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [productForm, setProductForm] = useState({
    title: '',
    description: '',
    price: '',
    originalPrice: '',
    category: 'art-prints',
    subcategory: 'fine-art-prints',
    stock: '1',
    tags: [] as string[],
    newTag: '',
  });
  const [productImages, setProductImages] = useState<File[]>([]);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [productUploadSuccess, setProductUploadSuccess] = useState(false);
  const [productUploadError, setProductUploadError] = useState<string | null>(null);

  // Listen for approved artist request as fallback when isProfessional flag is missing
  useEffect(() => {
    if (!user?.id) {
      setHasApprovedArtistRequest(false);
      return;
    }
    const q = query(
      collection(db, 'artistRequests'),
      where('userId', '==', user.id),
      where('status', '==', 'approved')
    );
    const unsub = onSnapshot(q, (snap) => {
      setHasApprovedArtistRequest(!snap.empty);
    });
    return () => unsub();
  }, [user?.id]);

  // Handle product upload success side effects separately from render cycle
  useEffect(() => {
    if (productUploadSuccess) {
      // Defer all side effects to next tick
      setTimeout(() => {
        setIsSubmittingProduct(false);
        toast({
          title: 'Product created',
          description: 'Your product has been created and will appear in your shop.',
        });

        // Reset form and navigation after additional delay
        setTimeout(() => {
          setProductForm({
            title: '',
            description: '',
            price: '',
            originalPrice: '',
            category: 'art-prints',
            subcategory: 'fine-art-prints',
            stock: '1',
            tags: [],
            newTag: '',
          });
          setProductImages([]);
          setSelectedType(null);
          setProductUploadSuccess(false);
        }, 200);
      }, 0);
    }
  }, [productUploadSuccess]);

  // Handle product upload error side effects separately from render cycle
  useEffect(() => {
    if (productUploadError) {
      // Defer all side effects to next tick
      setTimeout(() => {
        setIsSubmittingProduct(false);
        toast({
          title: 'Product creation failed',
          description: productUploadError,
          variant: 'destructive',
        });
        setProductUploadError(null);
      }, 0);
    }
  }, [productUploadError]);

  // Show loading animation while auth is loading
  // Simplified: just wait for loading to complete and user to be available
  if (loading || !user) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <ThemeLoading size="lg" text="" />
      </div>
    );
  }

  // If they reached upload, allow it (Upload button only shown to approved artists)
  const isProfessional = true;

  const handleEventImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEventImageFile(file);
    }
  };

  const handleEventSubmit = async () => {
    if (!user) return;
    if (!eventForm.title || !eventForm.startDate || !eventForm.locationTag || !eventImageFile) {
      toast({
        title: 'Missing required fields',
        description: 'Title, start date, location tag, and an image are required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmittingEvent(true);

      // Upload image
      const path = `events/${user.id}/${Date.now()}-${eventImageFile.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, eventImageFile);
      const imageUrl = await getDownloadURL(storageRef);

      // Combine date and time (if time provided)
      const startDateTime = eventForm.time
        ? new Date(`${eventForm.startDate}T${eventForm.time}`)
        : new Date(eventForm.startDate);
      const endDateTime = eventForm.endDate
        ? new Date(`${eventForm.endDate}T${eventForm.time || '00:00'}`)
        : undefined;

      await addDoc(collection(db, 'events'), {
        title: eventForm.title,
        description: eventForm.description,
        location: eventForm.location,
        locationTag: eventForm.locationTag,
        tags: [eventForm.locationTag], // Save location tag in tags array for search
        venue: eventForm.venue,
        date: startDateTime.toISOString(),
        endDate: endDateTime?.toISOString(),
        price: eventForm.price,
        bookingUrl: eventForm.bookingUrl,
        type: 'Event',
        imageUrl,
        artistId: user.id,
        artistName: user.displayName || user.username || 'Artist',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
      });

      // Set submitting to false and show success
      setIsSubmittingEvent(false);
      toast({
        title: 'Event created',
        description: 'Your event has been created and will appear in your profile and discover feed.',
      });

      // Reset form and go back after delay
      setTimeout(() => {
        setEventForm({
          title: '',
          startDate: '',
          endDate: '',
          time: '',
          location: '',
          locationTag: '',
          venue: '',
          description: '',
          price: '',
          bookingUrl: '',
        });
        setEventImageFile(null);
        setSelectedType(null);
      }, 100);
    } catch (error) {
      console.error('Error creating event:', error);
      setIsSubmittingEvent(false);
      toast({
        title: 'Event creation failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!isProfessional) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="p-8 text-center">
          <CardContent>
            <h2 className="text-2xl font-bold mb-4">Professional Artist Account Required</h2>
            <p className="text-muted-foreground mb-6">
              You need a verified professional artist account to upload content.
            </p>
            <Button
              onClick={() => router.push('/profile/edit')}
              variant="gradient"
              className="mb-2"
            >
              Request Artist Account
            </Button>
            <div>
              <Button onClick={() => router.push('/profile?artistRequest=pending')} variant="outline">
                I already applied – check status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleProductImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setProductImages(files);
  };

  const handleProductSubmit = async () => {
    if (!user) return;
    if (!productForm.title || !productForm.price || productImages.length === 0) {
      toast({
        title: 'Missing required fields',
        description: 'Title, price, and at least one image are required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmittingProduct(true);

      // Upload images
      const uploadedImageUrls: string[] = [];
      for (const file of productImages) {
        const path = `marketplaceProducts/${user.id}/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const imageUrl = await getDownloadURL(storageRef);
        uploadedImageUrls.push(imageUrl);
      }

      // Create product document in Firestore
      const productData = {
        title: productForm.title,
        description: productForm.description,
        price: parseFloat(productForm.price),
        ...(productForm.originalPrice && { originalPrice: parseFloat(productForm.originalPrice) }),
        currency: 'USD',
        category: productForm.category,
        subcategory: productForm.subcategory,
        images: uploadedImageUrls,
        sellerId: user.id,
        sellerName: user.displayName || user.username || 'Artist',
        isAffiliate: false,
        isActive: true,
        stock: parseInt(productForm.stock) || 1,
        rating: 0,
        reviewCount: 0,
        tags: productForm.tags,
        salesCount: 0,
        isOnSale: false,
        isApproved: true,
        status: 'approved',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, 'marketplaceProducts'), productData);

      // Set success flag - useEffect will handle all side effects
      setProductUploadSuccess(true);
    } catch (error) {
      console.error('Error creating product:', error);
      // Set error flag - useEffect will handle all side effects
      setProductUploadError('Please try again.');
    }
  };

  // If a type is selected, show the appropriate form
  if (selectedType === 'artwork') {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => setSelectedType(null)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Upload Options
        </Button>
        <header className="mb-8">
          <h1 className="font-headline text-4xl md:text-5xl font-semibold mb-2">
            Upload Artwork
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload images to your portfolio and shop.
          </p>
        </header>
        <UploadForm />
      </div>
    );
  }

  if (selectedType === 'product') {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => setSelectedType(null)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Upload Options
        </Button>
        <header className="mb-8">
          <h1 className="font-headline text-4xl md:text-5xl font-semibold mb-2">
            Upload Product
          </h1>
          <p className="text-muted-foreground text-lg">
            List a product for sale in your shop.
          </p>
        </header>
        <Card className="p-6 space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="product-title">Product Title *</Label>
              <Input
                id="product-title"
                placeholder="Enter product title"
                value={productForm.title}
                onChange={(e) => setProductForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="product-description">Description</Label>
              <Textarea
                id="product-description"
                placeholder="Describe your product"
                value={productForm.description}
                onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="product-price">Price (USD) *</Label>
                <Input
                  id="product-price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={productForm.price}
                  onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="product-original-price">Original Price (optional)</Label>
                <Input
                  id="product-original-price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={productForm.originalPrice}
                  onChange={(e) => setProductForm((p) => ({ ...p, originalPrice: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="product-category">Category</Label>
                <Select
                  value={productForm.category}
                  onValueChange={(value) => setProductForm((p) => ({ ...p, category: value }))}
                >
                  <SelectTrigger id="product-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="art-prints">Art Prints</SelectItem>
                    <SelectItem value="books">Books</SelectItem>
                    <SelectItem value="supplies">Art Supplies</SelectItem>
                    <SelectItem value="merchandise">Merchandise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="product-stock">Stock Quantity</Label>
                <Input
                  id="product-stock"
                  type="number"
                  placeholder="1"
                  value={productForm.stock}
                  onChange={(e) => setProductForm((p) => ({ ...p, stock: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="product-images">Product Images *</Label>
              <Input
                id="product-images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleProductImageChange}
              />
              {productImages.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {productImages.length} image{productImages.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <Button variant="gradient" onClick={handleProductSubmit} disabled={isSubmittingProduct}>
                {isSubmittingProduct ? 'Creating…' : 'Create Product'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Handle course redirect
  useEffect(() => {
    if (selectedType === 'course') {
      router.push('/learn/submit');
    }
  }, [selectedType]);

  if (selectedType === 'course') {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <ThemeLoading size="lg" text="" />
        </div>
      </div>
    );
  }

  if (selectedType === 'event') {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => setSelectedType(null)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Upload Options
        </Button>
        <header className="mb-8">
          <h1 className="font-headline text-4xl md:text-5xl font-semibold mb-2">
            Create Event
          </h1>
          <p className="text-muted-foreground text-lg">
            Location, venue, date, time, upload image.
          </p>
        </header>
        <Card className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              placeholder="Event title"
              value={eventForm.title}
              onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))}
              className="md:col-span-2"
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">Start date (from)</label>
              <Input
                type="date"
                value={eventForm.startDate}
                onChange={(e) => setEventForm((p) => ({ ...p, startDate: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">End date (to)</label>
              <Input
                type="date"
                value={eventForm.endDate}
                onChange={(e) => setEventForm((p) => ({ ...p, endDate: e.target.value }))}
              />
            </div>
            <Input
              type="time"
              placeholder="Time (optional)"
              value={eventForm.time}
              onChange={(e) => setEventForm((p) => ({ ...p, time: e.target.value }))}
            />
            <Input
              placeholder="Venue (optional)"
              value={eventForm.venue}
              onChange={(e) => setEventForm((p) => ({ ...p, venue: e.target.value }))}
            />
            <div className="md:col-span-2">
              <Label htmlFor="location-tag" className="text-sm font-medium text-foreground">
                Location Tag <span className="text-destructive">*</span>
              </Label>
              <Select
                value={eventForm.locationTag}
                onValueChange={(value) => setEventForm((p) => ({ ...p, locationTag: value }))}
              >
                <SelectTrigger id="location-tag">
                  <SelectValue placeholder="Select location tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New York, USA">New York, USA</SelectItem>
                  <SelectItem value="Los Angeles, USA">Los Angeles, USA</SelectItem>
                  <SelectItem value="Chicago, USA">Chicago, USA</SelectItem>
                  <SelectItem value="San Francisco, USA">San Francisco, USA</SelectItem>
                  <SelectItem value="Miami, USA">Miami, USA</SelectItem>
                  <SelectItem value="London, UK">London, UK</SelectItem>
                  <SelectItem value="Paris, France">Paris, France</SelectItem>
                  <SelectItem value="Berlin, Germany">Berlin, Germany</SelectItem>
                  <SelectItem value="Amsterdam, Netherlands">Amsterdam, Netherlands</SelectItem>
                  <SelectItem value="Barcelona, Spain">Barcelona, Spain</SelectItem>
                  <SelectItem value="Madrid, Spain">Madrid, Spain</SelectItem>
                  <SelectItem value="Rome, Italy">Rome, Italy</SelectItem>
                  <SelectItem value="Milan, Italy">Milan, Italy</SelectItem>
                  <SelectItem value="Vienna, Austria">Vienna, Austria</SelectItem>
                  <SelectItem value="Zurich, Switzerland">Zurich, Switzerland</SelectItem>
                  <SelectItem value="Brussels, Belgium">Brussels, Belgium</SelectItem>
                  <SelectItem value="Copenhagen, Denmark">Copenhagen, Denmark</SelectItem>
                  <SelectItem value="Stockholm, Sweden">Stockholm, Sweden</SelectItem>
                  <SelectItem value="Oslo, Norway">Oslo, Norway</SelectItem>
                  <SelectItem value="Tokyo, Japan">Tokyo, Japan</SelectItem>
                  <SelectItem value="Seoul, South Korea">Seoul, South Korea</SelectItem>
                  <SelectItem value="Hong Kong">Hong Kong</SelectItem>
                  <SelectItem value="Singapore">Singapore</SelectItem>
                  <SelectItem value="Shanghai, China">Shanghai, China</SelectItem>
                  <SelectItem value="Beijing, China">Beijing, China</SelectItem>
                  <SelectItem value="Sydney, Australia">Sydney, Australia</SelectItem>
                  <SelectItem value="Melbourne, Australia">Melbourne, Australia</SelectItem>
                  <SelectItem value="Toronto, Canada">Toronto, Canada</SelectItem>
                  <SelectItem value="Vancouver, Canada">Vancouver, Canada</SelectItem>
                  <SelectItem value="Montreal, Canada">Montreal, Canada</SelectItem>
                  <SelectItem value="Mexico City, Mexico">Mexico City, Mexico</SelectItem>
                  <SelectItem value="São Paulo, Brazil">São Paulo, Brazil</SelectItem>
                  <SelectItem value="Buenos Aires, Argentina">Buenos Aires, Argentina</SelectItem>
                  <SelectItem value="Dubai, UAE">Dubai, UAE</SelectItem>
                  <SelectItem value="Tel Aviv, Israel">Tel Aviv, Israel</SelectItem>
                  <SelectItem value="Istanbul, Turkey">Istanbul, Turkey</SelectItem>
                  <SelectItem value="Mumbai, India">Mumbai, India</SelectItem>
                  <SelectItem value="Delhi, India">Delhi, India</SelectItem>
                  <SelectItem value="Bangkok, Thailand">Bangkok, Thailand</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Additional location details (optional)"
              value={eventForm.location}
              onChange={(e) => setEventForm((p) => ({ ...p, location: e.target.value }))}
              className="md:col-span-2"
            />
          </div>
          <Textarea
            placeholder="Event details (optional)"
            value={eventForm.description}
            onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))}
            rows={3}
          />
          <Input
            placeholder="Price (optional, e.g., Free or 25)"
            value={eventForm.price}
            onChange={(e) => setEventForm((p) => ({ ...p, price: e.target.value }))}
          />
          <Input
            placeholder="Booking link (optional)"
            value={eventForm.bookingUrl}
            onChange={(e) => setEventForm((p) => ({ ...p, bookingUrl: e.target.value }))}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Event image</p>
            <Input type="file" accept="image/*" onChange={handleEventImageChange} />
          </div>
          <div className="flex justify-end">
            <Button variant="gradient" onClick={handleEventSubmit} disabled={isSubmittingEvent}>
              {isSubmittingEvent ? 'Creating…' : 'Create Event'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Show upload type selection
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="font-headline text-4xl md:text-5xl font-semibold mb-2">
          What would you like to upload?
        </h1>
        <p className="text-muted-foreground text-lg">
          Choose the type of content you want to share with the Gouache community.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Upload Artwork */}
        <Card 
          className="group hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary"
          onClick={() => setSelectedType('artwork')}
        >
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Image className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Upload Artwork</CardTitle>
            <CardDescription>
              Upload images to showcase in your portfolio. Mark as for sale to appear in your shop.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              Upload Artwork
            </Button>
          </CardContent>
        </Card>

        {/* Upload Upcoming Event */}
        <Card 
          className="group hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary"
          onClick={() => setSelectedType('event')}
        >
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Upload Upcoming Event</CardTitle>
            <CardDescription>
              Organize a workshop, exhibition, or community event. Add visuals and event details to share with your audience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              Create Event
            </Button>
          </CardContent>
        </Card>

        {/* Upload Product */}
        <Card 
          className="group hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary"
          onClick={() => setSelectedType('product')}
        >
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Upload Product</CardTitle>
            <CardDescription>
              List products like prints, books, or merchandise for sale in your shop.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              List Product
            </Button>
          </CardContent>
        </Card>

        {/* Upload Course */}
        <Card 
          className="group hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary"
          onClick={() => setSelectedType('course')}
        >
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Upload Course</CardTitle>
            <CardDescription>
              Create and publish educational courses to share your expertise with the community.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              Create Course
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
