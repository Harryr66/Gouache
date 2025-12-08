'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Share2, ArrowLeft, Calendar, MapPin, Users, Clock, Bookmark, Flag } from 'lucide-react';
import { Event } from '@/lib/types';
import Image from 'next/image';
import { AboutTheArtist } from '@/components/about-the-artist';
import { usePlaceholder } from '@/hooks/use-placeholder';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { generatePlaceholderUrl, generateAvatarPlaceholderUrl } = usePlaceholder();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isAttending, setIsAttending] = useState(false);

  useEffect(() => {
    // For now, we'll use placeholder data
    // In production, fetch from Firestore
    const fetchEvent = async () => {
      try {
        setLoading(true);
        // TODO: Fetch event from Firestore
        // For now, create a placeholder event
        const placeholderEvent: Event = {
          id: eventId,
          artist: {
            id: 'placeholder-artist',
            name: 'Placeholder Artist',
            handle: 'placeholder',
            avatarUrl: generateAvatarPlaceholderUrl(150, 150),
            followerCount: 0,
            followingCount: 0,
            createdAt: new Date()
          },
          title: 'Placeholder Event',
          description: 'This is a placeholder event description.',
          imageUrl: generatePlaceholderUrl(800, 600),
          imageAiHint: 'Event placeholder',
          date: new Date().toISOString(),
          type: 'Exhibition',
          locationType: 'In-person',
          locationName: 'Gallery',
          discussionId: `discussion-${eventId}`
        };
        setEvent(placeholderEvent);
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

  const handleBookmark = () => setIsBookmarked(!isBookmarked);
  const handleAttend = () => setIsAttending(!isAttending);
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

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

              {/* Action Buttons */}
              <div className="flex items-center space-x-4">
                <Button
                  variant={isAttending ? "default" : "outline"}
                  onClick={handleAttend}
                  className="flex items-center space-x-2"
                >
                  <Users className="h-4 w-4" />
                  <span>{isAttending ? 'Attending' : 'Attend Event'}</span>
                </Button>
                <Button variant="outline" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBookmark}
                  className={isBookmarked ? 'text-yellow-500' : ''}
                >
                  <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                </Button>
                <Button variant="ghost" size="icon">
                  <Flag className="h-4 w-4" />
                </Button>
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

                  {/* Price */}
                  {event.price && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Price</p>
                          <p className="text-2xl font-bold">${event.price.toLocaleString()}</p>
                        </div>
                        <Button>Get Tickets</Button>
                      </div>
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

