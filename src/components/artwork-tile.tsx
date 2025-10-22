'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Artwork, Artist } from '@/lib/types';
import { useFollow } from '@/providers/follow-provider';
import { usePlaceholder } from '@/hooks/use-placeholder';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { 
  UserPlus, 
  UserCheck, 
  Instagram, 
  Globe, 
  Calendar, 
  MapPin, 
  CheckCircle,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  BookOpen,
  Users,
  Play
} from 'lucide-react';

interface ArtworkTileProps {
  artwork: Artwork;
  onClick?: () => void;
}

export function ArtworkTile({ artwork, onClick }: ArtworkTileProps) {
  const { isFollowing, followArtist, unfollowArtist } = useFollow();
  const { generatePlaceholderUrl, generateAvatarPlaceholderUrl } = usePlaceholder();
  const { theme, resolvedTheme } = useTheme();
  const [showArtistPreview, setShowArtistPreview] = useState(false);

  const handleTileClick = () => {
    setShowArtistPreview(true);
    if (onClick) onClick();
  };

  const handleFollowToggle = () => {
    if (isFollowing(artwork.artist.id)) {
      unfollowArtist(artwork.artist.id);
    } else {
      followArtist(artwork.artist.id);
    }
  };

  // Mock data for artist's additional content
  const generateArtistContent = (artist: Artist) => ({
    events: [
      {
        id: `event-${artist.id}-1`,
        title: `${artist.name} - Gallery Opening`,
        description: 'Join us for an exclusive gallery opening featuring new works by the artist.',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000),
        location: artist.location || 'TBA',
        venue: 'Modern Art Gallery',
        type: 'Exhibition',
        bookingUrl: 'https://gallery-booking.com/event1',
        imageUrl: generatePlaceholderUrl(400, 200),
        price: 'Free',
        capacity: 100,
        isEditable: true
      },
      {
        id: `event-${artist.id}-2`,
        title: 'Live Art Workshop',
        description: 'Learn advanced techniques in a hands-on workshop with the artist.',
        date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
        location: 'Virtual Event',
        venue: 'Online Studio',
        type: 'Workshop',
        bookingUrl: 'https://workshop-booking.com/event2',
        imageUrl: generatePlaceholderUrl(400, 200),
        price: '$75',
        capacity: 25,
        isEditable: true
      },
      {
        id: `event-${artist.id}-3`,
        title: 'Artist Talk & Q&A',
        description: 'An intimate conversation about the creative process and artistic journey.',
        date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        location: 'Community Center',
        venue: 'Downtown Arts Center',
        type: 'Talk',
        bookingUrl: 'https://talk-booking.com/event3',
        imageUrl: generatePlaceholderUrl(400, 200),
        price: '$25',
        capacity: 50,
        isEditable: true
      }
    ],
    courses: [
      {
        id: `course-${artist.id}-1`,
        title: `${artist.name} - Masterclass`,
        price: Math.floor(Math.random() * 200) + 50,
        students: Math.floor(Math.random() * 100) + 10,
        rating: 4.5 + Math.random() * 0.5
      }
    ],
    communities: [
      {
        id: `community-${artist.id}-1`,
        name: `${artist.name}'s Art Circle`,
        members: Math.floor(Math.random() * 500) + 50,
        isPrivate: Math.random() > 0.5
      }
    ]
  });

  const artistContent = generateArtistContent(artwork.artist);
  const following = isFollowing(artwork.artist.id);

  return (
    <>
    <Card 
      className="group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden border-0" 
      onClick={handleTileClick}
    >
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={artwork.imageUrl}
            alt={artwork.imageAiHint}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Price badge */}
          {artwork.isForSale && artwork.price && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-green-600 hover:bg-green-700 text-xs">
                ${artwork.price.toLocaleString()}
              </Badge>
            </div>
          )}

          {/* AI badge */}
          {artwork.isAI && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-xs">
                AI {artwork.aiAssistance}
              </Badge>
            </div>
          )}

          {/* Artist banner at bottom */}
          <div className={`absolute bottom-0 left-0 right-0 backdrop-blur-sm p-2 ${
            (resolvedTheme || theme) === 'dark' 
              ? 'bg-black/80' 
              : 'bg-red-600'
          }`}>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={artwork.artist.avatarUrl || generateAvatarPlaceholderUrl(24, 24)} />
                <AvatarFallback className="text-xs">{artwork.artist.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-white text-sm font-medium truncate">{artwork.artist.name}</span>
                  {artwork.artist.isVerified && <CheckCircle className="h-3 w-3 text-blue-400 flex-shrink-0" />}
                </div>
                {artwork.artist.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-gray-300" />
                    <span className="text-gray-300 text-xs truncate">{artwork.artist.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Artist Preview Dialog */}
      <Dialog open={showArtistPreview} onOpenChange={setShowArtistPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Artist Profile</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Artist Header */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarImage src={artwork.artist.avatarUrl || generateAvatarPlaceholderUrl(96, 96)} alt={artwork.artist.name} />
                  <AvatarFallback>{artwork.artist.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-2xl font-bold">{artwork.artist.name}</h2>
                      {artwork.artist.isVerified && (
                        <CheckCircle className="h-5 w-5 text-blue-500 fill-blue-500" />
                      )}
                    </div>
                    <p className="text-muted-foreground">@{artwork.artist.handle}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      asChild
                      className="flex items-center gap-2"
                    >
                      <Link href={`/profile/${artwork.artist.handle}`}>
                        <ExternalLink className="h-4 w-4" />
                        View Profile
                      </Link>
                    </Button>
                    <Button
                      variant={following ? "outline" : "secondary"}
                      onClick={handleFollowToggle}
                      className="flex items-center gap-2"
                    >
                      {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                      {following ? 'Following' : 'Follow'}
                    </Button>
                    <Button variant="outline" size="icon">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-sm leading-relaxed">{artwork.artist.bio}</p>

                {/* Stats */}
                <div className="flex items-center gap-6 flex-wrap text-sm">
                  <div>
                    <span className="font-bold">{artwork.artist.followerCount.toLocaleString()}</span>
                    <span className="text-muted-foreground ml-1">followers</span>
                  </div>
                  <div>
                    <span className="font-bold">{artwork.artist.followingCount.toLocaleString()}</span>
                    <span className="text-muted-foreground ml-1">following</span>
                  </div>
                  {artwork.artist.location && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {artwork.artist.location}
                    </div>
                  )}
                </div>

                {/* Social Links */}
                {artwork.artist.socialLinks && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {artwork.artist.socialLinks.website && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={artwork.artist.socialLinks.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4 mr-2" />
                          Website
                        </a>
                      </Button>
                    )}
                    {artwork.artist.socialLinks.instagram && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={artwork.artist.socialLinks.instagram} target="_blank" rel="noopener noreferrer">
                          <Instagram className="h-4 w-4 mr-2" />
                          Instagram
                        </a>
                      </Button>
                    )}
                    {artwork.artist.socialLinks.x && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={artwork.artist.socialLinks.x} target="_blank" rel="noopener noreferrer">
                          <span className="h-4 w-4 mr-2 font-bold">𝕏</span>
                          X
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Content Tabs */}
            <Tabs defaultValue="portfolio" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="courses">Courses</TabsTrigger>
              </TabsList>

              <TabsContent value="portfolio" className="mt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {(artwork.artist.portfolioImages || []).map((portfolioItem, i) => (
                    <Card key={portfolioItem.id || i} className="aspect-square overflow-hidden border-0">
                      <Image
                        src={portfolioItem.imageUrl}
                        alt={portfolioItem.title}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover"
                      />
                    </Card>
                  ))}
                </div>
              </TabsContent>


              <TabsContent value="events" className="mt-4">
                <div className="space-y-4">
                  {(artwork.artist.events || []).map((event) => (
                    <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="flex flex-col md:flex-row">
                        {/* Event Image */}
                        <div className="md:w-1/3 h-48 md:h-auto">
                          <Image
                            src={event.imageUrl || generatePlaceholderUrl(400, 200)}
                            alt={event.title}
                            width={400}
                            height={200}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        {/* Event Details */}
                        <div className="md:w-2/3 p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-lg">{event.title}</h4>
                              <Badge variant="secondary" className="mt-1">{event.type}</Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-600">{event.price}</div>
                              <div className="text-sm text-muted-foreground">{event.capacity} spots</div>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {event.date.toLocaleDateString('en-US', { 
                                    weekday: 'short',
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  })}
                                </div>
                                <div className="text-muted-foreground">
                                  {event.date.toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })} - {event.endDate ? event.endDate.toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  }) : 'TBD'}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{event.venue}</div>
                                <div className="text-muted-foreground">{event.location}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 pt-2">
                            <Button asChild className="flex-1">
                              <a href={event.bookingUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Book Now
                              </a>
                            </Button>
                            {event.isEditable && (
                              <Button variant="outline" size="sm">
                                Edit Event
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="courses" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(artwork.artist.courses || []).map((course) => (
                    <Card key={course.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium">{course.title}</h4>
                          <Badge className="bg-green-600">${course.price}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {course.students} students
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            {(course.rating ?? 0).toFixed(1)} ⭐
                          </div>
                        </div>
                        <Button className="w-full">
                          <Play className="h-4 w-4 mr-2" />
                          View Course
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}