'use client';

import React, { useState, useEffect, useRef, ChangeEvent, useLayoutEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Image, Calendar, ArrowLeft, Brain } from 'lucide-react';
import { UploadArtworkMinimal } from '@/components/upload-artwork-minimal';
// REMOVED: Artwork and Product upload portals
import { ThemeLoading } from '@/components/theme-loading';
import { collection, query, where, addDoc, getDocs } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function UploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<'artwork' | 'event' | 'course' | null>(null);
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
  // REMOVED: Product upload state - rebuilding from scratch

  // Listen for approved artist request - use getDocs instead of onSnapshot to avoid render issues
  useEffect(() => {
    if (!user?.id) {
      setHasApprovedArtistRequest(false);
      return;
    }
    
    // Use getDocs instead of onSnapshot to avoid state updates during render
    const checkArtistRequest = async () => {
      try {
        const q = query(
          collection(db, 'artistRequests'),
          where('userId', '==', user.id),
          where('status', '==', 'approved')
        );
        const snap = await getDocs(q);
        setHasApprovedArtistRequest(!snap.empty);
      } catch (error) {
        console.error('Error checking artist request:', error);
        setHasApprovedArtistRequest(false);
      }
    };
    
    checkArtistRequest();
    // Check periodically instead of using real-time listener
    const interval = setInterval(checkArtistRequest, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [user?.id]);


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

  // REMOVED: Product upload handlers - rebuilding from scratch

  // NEW: Artwork upload portal - built from scratch
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
        <UploadArtworkMinimal />
      </div>
    );
  }

  // Handle course redirect
  useEffect(() => {
    if (selectedType === 'course') {
      router.push('/learn/submit');
    }
  }, [selectedType, router]);

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
