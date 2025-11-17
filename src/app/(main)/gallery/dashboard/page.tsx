'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, ShoppingBag, Plus, Trash2, Edit2, X, Save } from 'lucide-react';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, deleteDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Gallery } from '@/lib/types';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function GalleryDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events');

  // Event form state
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    endDate: '',
    location: '',
    venue: '',
    type: 'Exhibition',
    bookingUrl: '',
    price: '',
    capacity: '',
    imageUrl: '',
  });
  const [eventImageFile, setEventImageFile] = useState<File | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Artwork form state
  const [newArtwork, setNewArtwork] = useState({
    title: '',
    artistName: '',
    artistId: '',
    description: '',
    price: '',
    currency: 'USD',
    medium: '',
    dimensions: '',
    year: '',
    tags: '',
  });
  const [artworkImageFile, setArtworkImageFile] = useState<File | null>(null);
  const [editingArtworkId, setEditingArtworkId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.accountRole !== 'gallery') {
      router.push('/partners');
      return;
    }

    loadGalleryData();
  }, [user, router]);

  const loadGalleryData = async () => {
    if (!user) return;

    try {
      const galleryDoc = await getDoc(doc(db, 'galleries', user.id));
      if (galleryDoc.exists()) {
        const data = galleryDoc.data();
        setGallery({
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          events: data.events?.map((e: any) => ({
            ...e,
            date: e.date?.toDate() || new Date(),
            endDate: e.endDate?.toDate(),
          })) || [],
          artworksForSale: data.artworksForSale?.map((a: any) => ({
            ...a,
            createdAt: a.createdAt?.toDate() || new Date(),
          })) || [],
        } as Gallery);
      }
    } catch (error) {
      console.error('Error loading gallery data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load gallery data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEventImageUpload = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    const fileRef = ref(storage, `gallery-events/${user.id}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  };

  const handleAddEvent = async () => {
    if (!gallery || !user) return;

    try {
      let imageUrl = newEvent.imageUrl;
      if (eventImageFile) {
        imageUrl = await handleEventImageUpload(eventImageFile);
      }

      const event = {
        id: Date.now().toString(),
        title: newEvent.title,
        description: newEvent.description,
        date: new Date(newEvent.date),
        endDate: newEvent.endDate ? new Date(newEvent.endDate) : undefined,
        location: newEvent.location,
        venue: newEvent.venue || undefined,
        type: newEvent.type,
        bookingUrl: newEvent.bookingUrl || undefined,
        imageUrl: imageUrl || undefined,
        price: newEvent.price || undefined,
        capacity: newEvent.capacity ? parseInt(newEvent.capacity) : undefined,
        isEditable: true,
      };

      const updatedEvents = [...(gallery.events || []), event];
      await updateDoc(doc(db, 'galleries', user.id), {
        events: updatedEvents,
        updatedAt: serverTimestamp(),
      });

      setGallery({ ...gallery, events: updatedEvents });
      setNewEvent({
        title: '',
        description: '',
        date: '',
        endDate: '',
        location: '',
        venue: '',
        type: 'Exhibition',
        bookingUrl: '',
        price: '',
        capacity: '',
        imageUrl: '',
      });
      setEventImageFile(null);
      toast({
        title: 'Event Added',
        description: 'Your event has been added successfully.',
      });
    } catch (error) {
      console.error('Error adding event:', error);
      toast({
        title: 'Error',
        description: 'Failed to add event.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateEvent = async (eventId: string) => {
    if (!gallery || !user) return;

    try {
      let imageUrl = newEvent.imageUrl;
      if (eventImageFile) {
        imageUrl = await handleEventImageUpload(eventImageFile);
      }

      const updatedEvents = gallery.events?.map((e) =>
        e.id === eventId
          ? {
              ...e,
              title: newEvent.title,
              description: newEvent.description,
              date: new Date(newEvent.date),
              endDate: newEvent.endDate ? new Date(newEvent.endDate) : undefined,
              location: newEvent.location,
              venue: newEvent.venue || undefined,
              type: newEvent.type,
              bookingUrl: newEvent.bookingUrl || undefined,
              imageUrl: imageUrl || e.imageUrl,
              price: newEvent.price || undefined,
              capacity: newEvent.capacity ? parseInt(newEvent.capacity) : undefined,
            }
          : e
      ) || [];

      await updateDoc(doc(db, 'galleries', user.id), {
        events: updatedEvents,
        updatedAt: serverTimestamp(),
      });

      setGallery({ ...gallery, events: updatedEvents });
      setEditingEventId(null);
      setNewEvent({
        title: '',
        description: '',
        date: '',
        endDate: '',
        location: '',
        venue: '',
        type: 'Exhibition',
        bookingUrl: '',
        price: '',
        capacity: '',
        imageUrl: '',
      });
      setEventImageFile(null);
      toast({
        title: 'Event Updated',
        description: 'Your event has been updated successfully.',
      });
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: 'Error',
        description: 'Failed to update event.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!gallery || !user) return;

    try {
      const updatedEvents = gallery.events?.filter((e) => e.id !== eventId) || [];
      await updateDoc(doc(db, 'galleries', user.id), {
        events: updatedEvents,
        updatedAt: serverTimestamp(),
      });

      setGallery({ ...gallery, events: updatedEvents });
      toast({
        title: 'Event Deleted',
        description: 'Your event has been deleted.',
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete event.',
        variant: 'destructive',
      });
    }
  };

  const handleArtworkImageUpload = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    const fileRef = ref(storage, `gallery-artworks/${user.id}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  };

  const handleAddArtwork = async () => {
    if (!gallery || !user || !artworkImageFile) {
      toast({
        title: 'Image Required',
        description: 'Please upload an image for the artwork.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const imageUrl = await handleArtworkImageUpload(artworkImageFile);
      const tags = newArtwork.tags.split(',').map((t) => t.trim()).filter(Boolean);

      const artwork = {
        id: Date.now().toString(),
        title: newArtwork.title,
        artistName: newArtwork.artistName,
        artistId: newArtwork.artistId || undefined,
        imageUrl,
        price: parseFloat(newArtwork.price),
        currency: newArtwork.currency,
        description: newArtwork.description || undefined,
        medium: newArtwork.medium || undefined,
        dimensions: newArtwork.dimensions || undefined,
        year: newArtwork.year || undefined,
        tags,
        isAvailable: true,
        createdAt: new Date(),
      };

      const updatedArtworks = [...(gallery.artworksForSale || []), artwork];
      await updateDoc(doc(db, 'galleries', user.id), {
        artworksForSale: updatedArtworks,
        updatedAt: serverTimestamp(),
      });

      // Also add to artworks collection for discover page
      await addDoc(collection(db, 'artworks'), {
        ...artwork,
        galleryId: user.id,
        galleryName: gallery.name,
        isForSale: true,
        category: newArtwork.medium || 'Other',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setGallery({ ...gallery, artworksForSale: updatedArtworks });
      setNewArtwork({
        title: '',
        artistName: '',
        artistId: '',
        description: '',
        price: '',
        currency: 'USD',
        medium: '',
        dimensions: '',
        year: '',
        tags: '',
      });
      setArtworkImageFile(null);
      toast({
        title: 'Artwork Added',
        description: 'Your artwork has been listed for sale.',
      });
    } catch (error) {
      console.error('Error adding artwork:', error);
      toast({
        title: 'Error',
        description: 'Failed to add artwork.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateArtwork = async (artworkId: string) => {
    if (!gallery || !user) return;

    try {
      let imageUrl = '';
      if (artworkImageFile) {
        imageUrl = await handleArtworkImageUpload(artworkImageFile);
      } else {
        // If no new image file, keep the existing image
        const existingArtwork = gallery.artworksForSale?.find(a => a.id === artworkId);
        imageUrl = existingArtwork?.imageUrl || '';
      }

      const tags = newArtwork.tags.split(',').map((t) => t.trim()).filter(Boolean);

      const updatedArtworks = gallery.artworksForSale?.map((a) =>
        a.id === artworkId
          ? {
              ...a,
              title: newArtwork.title,
              artistName: newArtwork.artistName,
              artistId: newArtwork.artistId || undefined,
              imageUrl: imageUrl || a.imageUrl,
              price: parseFloat(newArtwork.price),
              currency: newArtwork.currency,
              description: newArtwork.description || undefined,
              medium: newArtwork.medium || undefined,
              dimensions: newArtwork.dimensions || undefined,
              year: newArtwork.year || undefined,
              tags,
            }
          : a
      ) || [];

      await updateDoc(doc(db, 'galleries', user.id), {
        artworksForSale: updatedArtworks,
        updatedAt: serverTimestamp(),
      });

      setGallery({ ...gallery, artworksForSale: updatedArtworks });
      setEditingArtworkId(null);
      setNewArtwork({
        title: '',
        artistName: '',
        artistId: '',
        description: '',
        price: '',
        currency: 'USD',
        medium: '',
        dimensions: '',
        year: '',
        tags: '',
      });
      setArtworkImageFile(null);
      toast({
        title: 'Artwork Updated',
        description: 'Your artwork has been updated.',
      });
    } catch (error) {
      console.error('Error updating artwork:', error);
      toast({
        title: 'Error',
        description: 'Failed to update artwork.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteArtwork = async (artworkId: string) => {
    if (!gallery || !user) return;

    try {
      const updatedArtworks = gallery.artworksForSale?.filter((a) => a.id !== artworkId) || [];
      await updateDoc(doc(db, 'galleries', user.id), {
        artworksForSale: updatedArtworks,
        updatedAt: serverTimestamp(),
      });

      // Also mark as unavailable in artworks collection
      const artworksQuery = query(collection(db, 'artworks'), where('galleryId', '==', user.id));
      const artworksSnapshot = await getDocs(artworksQuery);
      artworksSnapshot.forEach(async (docSnapshot) => {
        const data = docSnapshot.data();
        if (data.id === artworkId || data.title === gallery.artworksForSale?.find((a) => a.id === artworkId)?.title) {
          await updateDoc(docSnapshot.ref, {
            isForSale: false,
            isAvailable: false,
            updatedAt: serverTimestamp(),
          });
        }
      });

      setGallery({ ...gallery, artworksForSale: updatedArtworks });
      toast({
        title: 'Artwork Deleted',
        description: 'Your artwork has been removed from sale.',
      });
    } catch (error) {
      console.error('Error deleting artwork:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete artwork.',
        variant: 'destructive',
      });
    }
  };

  const startEditingEvent = (event: any) => {
    setEditingEventId(event.id);
    setNewEvent({
      title: event.title,
      description: event.description,
      date: format(event.date, 'yyyy-MM-dd'),
      endDate: event.endDate ? format(event.endDate, 'yyyy-MM-dd') : '',
      location: event.location,
      venue: event.venue || '',
      type: event.type,
      bookingUrl: event.bookingUrl || '',
      price: event.price || '',
      capacity: event.capacity?.toString() || '',
      imageUrl: event.imageUrl || '',
    });
  };

  const startEditingArtwork = (artwork: any) => {
    setEditingArtworkId(artwork.id);
    setNewArtwork({
      title: artwork.title,
      artistName: artwork.artistName,
      artistId: artwork.artistId || '',
      description: artwork.description || '',
      price: artwork.price.toString(),
      currency: artwork.currency,
      medium: artwork.medium || '',
      dimensions: artwork.dimensions || '',
      year: artwork.year || '',
      tags: artwork.tags?.join(', ') || '',
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Gallery Not Found</h1>
          <Button onClick={() => router.push('/partners')}>Create Gallery Account</Button>
        </div>
      </div>
    );
  }

  const now = new Date();
  const ongoingEvents = gallery.events?.filter((e) => {
    const startDate = new Date(e.date);
    const endDate = e.endDate ? new Date(e.endDate) : startDate;
    return startDate <= now && endDate >= now;
  }) || [];
  const upcomingEvents = gallery.events?.filter((e) => new Date(e.date) > now) || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{gallery.name} Dashboard</h1>
        <p className="text-muted-foreground">Manage your events and artworks for sale</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="events">
            <Calendar className="h-4 w-4 mr-2" />
            Events
          </TabsTrigger>
          <TabsTrigger value="artworks">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Artworks for Sale
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Event</CardTitle>
              <CardDescription>Create a new event or exhibition</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  placeholder="Event Title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                />
                <Select
                  value={newEvent.type}
                  onValueChange={(value) => setNewEvent({ ...newEvent, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Exhibition">Exhibition</SelectItem>
                    <SelectItem value="Opening">Opening</SelectItem>
                    <SelectItem value="Workshop">Workshop</SelectItem>
                    <SelectItem value="Talk">Talk</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Event Description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                rows={3}
              />
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Start Date</label>
                  <Input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">End Date (optional)</label>
                  <Input
                    type="date"
                    value={newEvent.endDate}
                    onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  placeholder="Location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                />
                <Input
                  placeholder="Venue (optional)"
                  value={newEvent.venue}
                  onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <Input
                  placeholder="Price (optional)"
                  value={newEvent.price}
                  onChange={(e) => setNewEvent({ ...newEvent, price: e.target.value })}
                />
                <Input
                  placeholder="Capacity (optional)"
                  type="number"
                  value={newEvent.capacity}
                  onChange={(e) => setNewEvent({ ...newEvent, capacity: e.target.value })}
                />
                <Input
                  placeholder="Booking URL (optional)"
                  value={newEvent.bookingUrl}
                  onChange={(e) => setNewEvent({ ...newEvent, bookingUrl: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Event Image (optional)</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEventImageFile(e.target.files?.[0] || null)}
                />
              </div>
              <Button
                onClick={editingEventId ? () => handleUpdateEvent(editingEventId) : handleAddEvent}
                disabled={!newEvent.title || !newEvent.date || !newEvent.location}
              >
                {editingEventId ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Event
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </>
                )}
              </Button>
              {editingEventId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingEventId(null);
                    setNewEvent({
                      title: '',
                      description: '',
                      date: '',
                      endDate: '',
                      location: '',
                      venue: '',
                      type: 'Exhibition',
                      bookingUrl: '',
                      price: '',
                      capacity: '',
                      imageUrl: '',
                    });
                    setEventImageFile(null);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </CardContent>
          </Card>

          {ongoingEvents.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Ongoing Events</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {ongoingEvents.map((event) => (
                  <Card key={event.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{event.title}</CardTitle>
                          <Badge variant="secondary" className="mt-2">Ongoing</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditingEvent(event)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                      <p className="text-sm">
                        <strong>Date:</strong> {format(event.date, 'MMM d, yyyy')}
                        {event.endDate && ` - ${format(event.endDate, 'MMM d, yyyy')}`}
                      </p>
                      <p className="text-sm">
                        <strong>Location:</strong> {event.location}
                      </p>
                      {event.price && (
                        <p className="text-sm">
                          <strong>Price:</strong> {event.price}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {upcomingEvents.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {upcomingEvents.map((event) => (
                  <Card key={event.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{event.title}</CardTitle>
                          <Badge variant="outline" className="mt-2">Upcoming</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditingEvent(event)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                      <p className="text-sm">
                        <strong>Date:</strong> {format(event.date, 'MMM d, yyyy')}
                        {event.endDate && ` - ${format(event.endDate, 'MMM d, yyyy')}`}
                      </p>
                      <p className="text-sm">
                        <strong>Location:</strong> {event.location}
                      </p>
                      {event.price && (
                        <p className="text-sm">
                          <strong>Price:</strong> {event.price}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {gallery.events?.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No events yet. Add your first event above.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="artworks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Artwork for Sale</CardTitle>
              <CardDescription>List an artwork that will appear in the Discover section</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  placeholder="Artwork Title"
                  value={newArtwork.title}
                  onChange={(e) => setNewArtwork({ ...newArtwork, title: e.target.value })}
                />
                <Input
                  placeholder="Artist Name"
                  value={newArtwork.artistName}
                  onChange={(e) => setNewArtwork({ ...newArtwork, artistName: e.target.value })}
                />
              </div>
              <Textarea
                placeholder="Description"
                value={newArtwork.description}
                onChange={(e) => setNewArtwork({ ...newArtwork, description: e.target.value })}
                rows={3}
              />
              <div className="grid md:grid-cols-3 gap-4">
                <Input
                  placeholder="Price"
                  type="number"
                  value={newArtwork.price}
                  onChange={(e) => setNewArtwork({ ...newArtwork, price: e.target.value })}
                />
                <Select
                  value={newArtwork.currency}
                  onValueChange={(value) => setNewArtwork({ ...newArtwork, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Medium"
                  value={newArtwork.medium}
                  onChange={(e) => setNewArtwork({ ...newArtwork, medium: e.target.value })}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  placeholder="Dimensions (e.g., 24x30 in)"
                  value={newArtwork.dimensions}
                  onChange={(e) => setNewArtwork({ ...newArtwork, dimensions: e.target.value })}
                />
                <Input
                  placeholder="Year"
                  value={newArtwork.year}
                  onChange={(e) => setNewArtwork({ ...newArtwork, year: e.target.value })}
                />
              </div>
              <Input
                placeholder="Tags (comma-separated)"
                value={newArtwork.tags}
                onChange={(e) => setNewArtwork({ ...newArtwork, tags: e.target.value })}
              />
              <div>
                <label className="text-sm font-medium mb-2 block">Artwork Image *</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setArtworkImageFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              <Button
                onClick={editingArtworkId ? () => handleUpdateArtwork(editingArtworkId) : handleAddArtwork}
                disabled={!newArtwork.title || !newArtwork.artistName || !newArtwork.price || (!artworkImageFile && !editingArtworkId)}
              >
                {editingArtworkId ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Artwork
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Artwork
                  </>
                )}
              </Button>
              {editingArtworkId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingArtworkId(null);
                    setNewArtwork({
                      title: '',
                      artistName: '',
                      artistId: '',
                      description: '',
                      price: '',
                      currency: 'USD',
                      medium: '',
                      dimensions: '',
                      year: '',
                      tags: '',
                    });
                    setArtworkImageFile(null);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </CardContent>
          </Card>

          {gallery.artworksForSale && gallery.artworksForSale.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Listed Artworks</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gallery.artworksForSale.map((artwork) => (
                  <Card key={artwork.id}>
                    <div className="relative aspect-square">
                      <img
                        src={artwork.imageUrl}
                        alt={artwork.title}
                        className="w-full h-full object-cover rounded-t-lg"
                      />
                    </div>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{artwork.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">by {artwork.artistName}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditingArtwork(artwork)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteArtwork(artwork.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold mb-2">
                        {artwork.currency} {artwork.price.toLocaleString()}
                      </p>
                      {artwork.medium && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Medium:</strong> {artwork.medium}
                        </p>
                      )}
                      {artwork.dimensions && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Dimensions:</strong> {artwork.dimensions}
                        </p>
                      )}
                      <Badge variant={artwork.isAvailable ? 'default' : 'secondary'} className="mt-2">
                        {artwork.isAvailable ? 'Available' : 'Sold'}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {(!gallery.artworksForSale || gallery.artworksForSale.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No artworks listed yet. Add your first artwork above.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

