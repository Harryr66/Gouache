'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, ArrowLeft, Calendar, MapPin, Users, Clock, Ticket } from 'lucide-react';
import { Event } from '@/lib/types';
import Image from 'next/image';
import { AboutTheArtist } from '@/components/about-the-artist';
import { usePlaceholder } from '@/hooks/use-placeholder';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { generatePlaceholderUrl, generateAvatarPlaceholderUrl } = usePlaceholder();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, 'events', eventId);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
          const data = snapshot.data() as any;
          const fallbackImage = generatePlaceholderUrl(800, 600);
          const eventData: Event = {
            id: snapshot.id,
            artist: {
              id: data.artistId || '',
              name: data.artistName || 'Artist',
              handle: data.artistHandle || '',
              avatarUrl: data.artistAvatarUrl || generateAvatarPlaceholderUrl(150, 150),
              followerCount: data.artistFollowerCount || 0,
              followingCount: 0,
              createdAt: new Date()
            },
            title: data.title || 'Untitled Event',
            description: data.description || '',
            imageUrl: data.imageUrl || fallbackImage,
            imageAiHint: data.imageAiHint || data.title || 'Event',
            date: data.date || new Date().toISOString(),
            endDate: data.endDate || undefined,
            type: data.type || 'Exhibition',
            locationType: 'In-person',
            locationName: data.venue || data.location || '',
            locationAddress: data.location || '',
            discussionId: data.discussionId || `event-${snapshot.id}`,
            attendees: data.attendees || [],
            maxAttendees: data.maxAttendees,
            price: data.price ?? undefined,
            bookingUrl: data.bookingUrl || '',
          };
          setEvent(eventData);
        } else {
          setEvent(null);
        }
      } catch (error) {
        console.error('Error fetching event:', error);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEvent();
    }
  }, [eventId, generatePlaceholderUrl, generateAvatarPlaceholderUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Event Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The event you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
  const priceLabel = event.price === undefined || event.price === null || `${event.price}`.trim?.() === ''
    ? null
    : (typeof event.price === 'number' ? `$${event.price}` : `${event.price}`);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => router.back()} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Event Image */}
            <div className="space-y-4">
              <div className="relative w-full min-h-[400px] lg:min-h-[600px] rounded-lg overflow-hidden bg-muted">
                <Image
                  src={event.imageUrl}
                  alt={event.imageAiHint || event.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>

            {/* Event Details */}
            <div className="space-y-6">
              {/* Event Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={event.artist.avatarUrl ?? undefined} />
                      <AvatarFallback>{event.artist.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-2xl">{event.title}</CardTitle>
                      <p className="text-muted-foreground">by {event.artist.name}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="outline">{event.type}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Event Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{formattedDate}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{event.type}</span>
                    </div>
                    {priceLabel && (
                      <div className="flex items-center space-x-2">
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">{priceLabel}</span>
                      </div>
                    )}
                    {event.locationName && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{event.locationName}</span>
                      </div>
                    )}
                    {event.locationAddress && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{event.locationAddress}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {event.attendees?.length || 0} attending
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {event.description && (
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {event.description}
                      </p>
                    </div>
                  )}

                  {/* Price / Tickets */}
                  {(priceLabel || event.bookingUrl) && (
                    <div className="p-4 bg-muted rounded-lg flex flex-col gap-3">
                      {priceLabel && (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Price</p>
                            <p className="text-2xl font-bold">{priceLabel}</p>
                          </div>
                        </div>
                      )}
                      {event.bookingUrl && (
                        <div className="flex justify-start">
                          <Button asChild>
                            <a href={event.bookingUrl} target="_blank" rel="noopener noreferrer">
                              Get Tickets
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* About the Artist */}
              {event.artist.id && (
                <AboutTheArtist
                  artistId={event.artist.id}
                  artistName={event.artist.name}
                  artistHandle={event.artist.handle}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

