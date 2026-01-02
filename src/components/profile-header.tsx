'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  Users,
  UserPlus,
  Edit,
  Upload,
  Plus,
  MapPin,
  Globe,
  Coffee,
  ImageIcon,
  Calendar,
  Brain,
  Settings,
  LogOut,
  Building2,
  Mail,
  ExternalLink,
  ChevronUp,
  Package,
  Pin,
} from 'lucide-react';
import { Instagram, Twitter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ThemeLoading } from '@/components/theme-loading';
import { TipDialog } from './tip-dialog';
import { CountryFlag } from './country-flag';
import { ShowcaseLocation } from '@/lib/types';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { NewsletterSubscribeModal } from './newsletter-subscribe-modal';

interface ProfileHeaderProps {
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    bannerImageUrl?: string;
    bio?: string;
    location?: string;
    countryOfOrigin?: string;
    countryOfResidence?: string;
    followerCount: number;
    followingCount: number;
    isProfessional: boolean;
    isVerified?: boolean;
    profileRingColor?: string;
    tipJarEnabled?: boolean;
    suggestionsEnabled?: boolean;
    hideLocation?: boolean;
    hideFlags?: boolean;
    hideCard?: boolean;
    hideShowcaseLocations?: boolean;
    hideSocialIcons?: boolean;
    // Legacy event fields (will be converted to showcaseLocations)
    eventCity?: string;
    eventCountry?: string;
    eventDate?: string;
    eventStartDate?: string;
    eventEndDate?: string;
    showcaseLocations?: ShowcaseLocation[];
    newsletterLink?: string;
    newsletterProvider?: 'convertkit' | 'mailchimp' | 'substack' | 'custom' | null;
    socialLinks?: {
      website?: string;
      instagram?: string;
      x?: string;
      tiktok?: string;
    };
  };
  isOwnProfile: boolean;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
  currentTab?: string;
}

export function ProfileHeader({ 
  user, 
  isOwnProfile, 
  isFollowing = false,
  onFollowToggle,
  currentTab
}: ProfileHeaderProps) {
  const [showTipDialog, setShowTipDialog] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [isEventsExpanded, setIsEventsExpanded] = useState(false);
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);

  // Early return if user is not properly loaded
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[200px]">
        <ThemeLoading size="lg" text="" />
      </div>
    );
  }


  return (
    <>
      <Card className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Avatar Section */}
          <div className="flex-shrink-0">
            <div className="relative h-32 w-32 md:h-48 md:w-48 rounded-full overflow-hidden flex items-center justify-center border-4 border-muted mx-auto md:mx-0">
              <Avatar className="h-full w-full">
                <AvatarImage 
                  src={user.avatarUrl} 
                  alt={user.displayName || 'User'}
                  className="h-full w-full object-cover rounded-full"
                />
                <AvatarFallback className="text-2xl h-full w-full rounded-full">
                  {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* User Information */}
          <div className="flex-1 space-y-3 md:space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-headline font-bold text-foreground">
                  {user.displayName || 'User'}
                </h1>
              </div>
              <p className="text-muted-foreground text-base md:text-lg">{user.username}</p>
              {user.location && !user.hideLocation && (
                <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{user.location}</span>
                  {/* Country Flags */}
                  {!user.hideFlags && (user.countryOfOrigin || user.countryOfResidence) && (
                    <div className="flex items-center gap-1 ml-2">
                      {user.countryOfOrigin && (
                        <CountryFlag country={user.countryOfOrigin} size="sm" />
                      )}
                      {user.countryOfResidence && user.countryOfResidence !== user.countryOfOrigin && (
                        <CountryFlag country={user.countryOfResidence} size="sm" />
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {user.isProfessional && (
                <Badge variant="secondary" className="mt-2">
                  Professional Artist
                </Badge>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-4 md:gap-6 text-xs md:text-sm">
              {user.isProfessional && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="font-medium">{user.followerCount}</span>
                  <span className="text-muted-foreground">followers</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <UserPlus className="h-3 w-3 md:h-4 md:w-4" />
                <span className="font-medium">{user.followingCount}</span>
                <span className="text-muted-foreground">following</span>
              </div>
            </div>

            {/* Newsletter Link & Social Icons - Single Row */}
            {((user.newsletterProvider || user.newsletterLink) || (!user.hideSocialIcons && user.socialLinks)) && (
              <div className="flex items-center gap-2">
                {/* Newsletter Button */}
                {(user.newsletterProvider || user.newsletterLink) && (
                  <>
                    {user.newsletterProvider && user.newsletterProvider !== 'custom' ? (
                      // API-based provider: Show modal
                      <>
                        <Button 
                          onClick={() => setShowNewsletterModal(true)}
                          variant="outline"
                          size="sm"
                          className="text-xs md:text-sm"
                        >
                          <Mail className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                          <span className="hidden sm:inline">Newsletter</span>
                          <span className="sm:hidden">News</span>
                        </Button>
                        <NewsletterSubscribeModal
                          open={showNewsletterModal}
                          onOpenChange={setShowNewsletterModal}
                          artistId={user.id}
                          artistName={user.displayName}
                          provider={user.newsletterProvider}
                        />
                      </>
                    ) : (
                      // Custom provider or legacy newsletterLink: Show redirect link
                      <Button 
                        asChild
                        variant="outline"
                        size="sm"
                        className="text-xs md:text-sm"
                      >
                        <a 
                          href={user.newsletterLink || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 md:gap-2"
                        >
                          <Mail className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                          <span className="hidden sm:inline">Newsletter</span>
                          <span className="sm:hidden">News</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </>
                )}

                {/* Social Icons */}
                {!user.hideSocialIcons && user.socialLinks && (
                  <>
                {user.socialLinks.website && (
                  <Button 
                    asChild
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 md:h-9 md:w-9"
                  >
                    <a 
                      href={user.socialLinks.website.startsWith('http') ? user.socialLinks.website : `https://${user.socialLinks.website}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      aria-label="Website"
                    >
                      <Globe className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {user.socialLinks.instagram && (
                  <Button 
                    asChild
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 md:h-9 md:w-9"
                  >
                    <a 
                      href={user.socialLinks.instagram.startsWith('http') ? user.socialLinks.instagram : `https://instagram.com/${user.socialLinks.instagram.replace('@', '')}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                    >
                      <Instagram className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {user.socialLinks.x && (
                  <Button 
                    asChild
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 md:h-9 md:w-9"
                  >
                    <a 
                      href={user.socialLinks.x.startsWith('http') ? user.socialLinks.x : `https://x.com/${user.socialLinks.x.replace('@', '')}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      aria-label="X (Twitter)"
                    >
                      <Twitter className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {user.socialLinks.tiktok && (
                  <Button 
                    asChild
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 md:h-9 md:w-9"
                  >
                    <a 
                      href={user.socialLinks.tiktok.startsWith('http') ? user.socialLinks.tiktok : `https://tiktok.com/@${user.socialLinks.tiktok.replace('@', '')}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      aria-label="TikTok"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                    </a>
                  </Button>
                )}
                  </>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 md:gap-3 items-center">
              {isOwnProfile ? (
                <>
                  <Button asChild variant="outline" size="sm" className="text-xs md:text-sm flex-1 sm:flex-initial min-w-[120px]">
                    <Link href="/profile/edit">
                      <Edit className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                      Edit Profile
                    </Link>
                  </Button>
                  {user.isProfessional && (
                    <Button asChild variant="gradient" size="sm" className="text-xs md:text-sm flex-1 sm:flex-initial min-w-[120px]">
                      <Link href="/upload">
                        <Upload className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        Upload
                      </Link>
                    </Button>
                  )}
                  <Button
                    asChild
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0"
                    aria-label="Open general settings"
                  >
                    <Link href="/settings">
                      <Settings className="h-3 w-3 md:h-4 md:w-4" />
                    </Link>
                  </Button>
                  {user.isProfessional && (user.tipJarEnabled !== false) && (
                    <Button 
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0 hover:gradient-border"
                      onClick={() => setShowTipDialog(true)}
                    >
                      <Coffee className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                  )}
                </>
              ) : (
                <Button 
                  variant={isFollowing ? "gradient" : "outline"}
                  size="sm"
                  className="text-xs md:text-sm"
                  onClick={onFollowToggle}
                >
                  <Heart className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
              )}
            </div>

            {/* Location block removed per request */}
          </div>
        </div>
      </Card>

      {/* Bio Section - Separate Card */}
      {user.bio && (
        <Card className="mt-4 md:mt-6">
          <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">About</h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsBioExpanded(!isBioExpanded)}
                    >
                      {isBioExpanded ? 'Close Bio' : 'Read Bio'}
                    </Button>
                </div>
            {isBioExpanded && (
                  <div className="text-foreground leading-relaxed">
                    <p className="whitespace-pre-line text-base">{user.bio}</p>
                  </div>
                )}
          </CardContent>
        </Card>
      )}

      {/* Combined Events & Locations Carousel */}
      {user.isProfessional && !user.hideShowcaseLocations && (() => {
        const now = new Date();
        const allItems: (ShowcaseLocation & { status: 'current' | 'upcoming' })[] = [];

        // Convert legacy event data to ShowcaseLocation format
        if (user.eventDate || user.eventCity || user.eventCountry || user.bannerImageUrl) {
          const eventStartDate = user.eventStartDate || user.eventDate;
          const eventEndDate = user.eventEndDate;
          
          // Check if event should be shown (within date range)
          let shouldShow = true;
          if (eventStartDate) {
            const startDate = new Date(eventStartDate);
            if (now < startDate) {
              // Event hasn't started yet - it's upcoming
              shouldShow = true;
            } else if (eventEndDate) {
              const endDate = new Date(eventEndDate);
              if (now > endDate) {
                shouldShow = false; // Event has ended
              }
            }
          }

          if (shouldShow) {
            const eventStart = eventStartDate ? new Date(eventStartDate) : null;
            const status: 'current' | 'upcoming' = eventStart && now >= eventStart ? 'current' : 'upcoming';
            
            allItems.push({
              id: 'legacy-event',
              name: 'Event',
              city: user.eventCity,
              country: user.eventCountry,
              imageUrl: user.bannerImageUrl,
              startDate: eventStartDate || user.eventDate,
              endDate: eventEndDate,
              type: 'event',
              pinned: false,
              status,
            });
          }
        }

        // Add showcase locations
        if (user.showcaseLocations && user.showcaseLocations.length > 0) {
          user.showcaseLocations.forEach((location) => {
            const startDate = location.startDate ? new Date(location.startDate) : null;
            const endDate = location.endDate ? new Date(location.endDate) : null;
            
            // Check if location should be shown
            let shouldShow = true;
            if (startDate && now < startDate) {
              shouldShow = false; // Not started yet
            } else if (endDate && now > endDate) {
              shouldShow = false; // Already ended
            }

            if (shouldShow) {
              const status: 'current' | 'upcoming' = startDate && now >= startDate ? 'current' : 'upcoming';
              allItems.push({
                ...location,
                type: location.type || 'location',
                status,
              });
            }
          });
        }

        // Sort: pinned first, then current events, then upcoming events
        allItems.sort((a, b) => {
          // Pinned items first
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          
          // Then current events before upcoming
          if (a.status === 'current' && b.status === 'upcoming') return -1;
          if (a.status === 'upcoming' && b.status === 'current') return 1;
          
          // Within same status, sort by start date (earliest first)
          const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
          const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
          return aDate - bDate;
        });

        if (allItems.length === 0) return null;

        return (
          <Card className="mt-4 md:mt-6">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-base md:text-lg lg:text-xl font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
                  <span className="truncate">Events & Locations</span>
                </h2>
                {isOwnProfile && (
                  <Button asChild variant="outline" size="sm" className="text-xs flex-shrink-0">
                    <Link href="/profile/edit#showcase-locations">
                      <Edit className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                      <span className="hidden sm:inline">Manage</span>
                      <span className="sm:hidden">Edit</span>
                    </Link>
                  </Button>
                )}
              </div>

              <Carousel className="w-full">
                <CarouselContent className="-ml-2 md:-ml-4">
                  {allItems.map((item, index) => {
                    const isCurrent = item.status === 'current';
                    return (
                      <CarouselItem key={item.id || index} className="pl-2 md:pl-4 basis-full md:basis-1/2">
                        <div className="relative rounded-lg border border-muted bg-muted/20 overflow-hidden group h-full">
                          {/* Image */}
                          {item.imageUrl && (
                            <div className="relative w-full h-40 sm:h-48 md:h-64">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                              {/* Status Badge */}
                              <div className="absolute top-2 left-2">
                                <Badge variant={isCurrent ? "default" : "secondary"} className="bg-background/80 backdrop-blur-sm">
                                  {item.pinned && <Pin className="h-3 w-3 mr-1" />}
                                  {isCurrent ? 'Current' : 'Upcoming'}
                                </Badge>
                              </div>
                            </div>
                          )}
                          
                          {/* Content */}
                          <div className="p-3 md:p-4 space-y-2">
                            {!item.imageUrl && (
                              <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                                <Badge variant={isCurrent ? "default" : "secondary"} className="text-xs">
                                  {item.pinned && <Pin className="h-3 w-3 mr-1" />}
                                  {isCurrent ? 'Current' : 'Upcoming'}
                                </Badge>
                        </div>
                      )}
                            <h3 className="font-semibold text-base md:text-lg line-clamp-2">{item.name}</h3>
                            {item.venue && (
                              <p className="text-sm text-muted-foreground">{item.venue}</p>
                            )}
                            {(item.city || item.country) && (
                              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                {[item.city, item.country].filter(Boolean).join(', ')}
                              </p>
                            )}
                            {item.startDate && (
                              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                {new Date(item.startDate).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                                {item.endDate && ` - ${new Date(item.endDate).toLocaleDateString('en-US', { 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}`}
                          </p>
                        )}
                            {item.website && (
                          <a
                                href={item.website}
                            target="_blank"
                            rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1 text-sm"
                          >
                                Visit Website
                                <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                            {item.notes && (
                              <p className="text-sm text-muted-foreground mt-2">{item.notes}</p>
                        )}
                      </div>
                    </div>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                {allItems.length > 1 && (
                  <>
                    <CarouselPrevious className="hidden md:flex -left-12" />
                    <CarouselNext className="hidden md:flex -right-12" />
                  </>
                )}
              </Carousel>
          </CardContent>
        </Card>
        );
      })()}

      {/* Tip Jar Dialog */}
      <TipDialog
        isOpen={showTipDialog}
        onClose={() => setShowTipDialog(false)}
        artistName={user.displayName || user.username}
        artistId={user.id}
      />


    </>
  );
}