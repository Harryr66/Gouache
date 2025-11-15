'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Lightbulb,
  ImageIcon,
  Calendar,
  Brain,
  Settings,
  LogOut,
  Building2,
  Mail,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { TipDialog } from './tip-dialog';
import { SuggestionsDialog } from './suggestions-dialog';
import { CountryFlag } from './country-flag';
import { ShowcaseLocation } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

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
    profileRingColor?: string;
    tipJarEnabled?: boolean;
    suggestionsEnabled?: boolean;
    hideLocation?: boolean;
    hideFlags?: boolean;
    hideCard?: boolean;
    hideUpcomingEvents?: boolean;
    hideShowcaseLocations?: boolean;
    // Upcoming event fields
    eventCity?: string;
    eventCountry?: string;
    eventDate?: string;
    showcaseLocations?: ShowcaseLocation[];
    newsletterLink?: string;
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
  const [showSuggestionsDialog, setShowSuggestionsDialog] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await firebaseSignOut(auth);
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully.'
      });
      router.push('/login');
    } catch (error) {
      console.error('Failed to sign out:', error);
      toast({
        title: 'Sign out failed',
        description: 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  // Early return if user is not properly loaded
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading profile...</h1>
          <p className="text-muted-foreground">Please wait while we load your profile data.</p>
        </div>
      </div>
    );
  }

  const getDynamicButton = () => {
    if (!isOwnProfile || !user.isProfessional) return null;

    switch (currentTab) {
      case 'shop':
        return (
          <Button variant="gradient">
            <Plus className="h-4 w-4 mr-2" />
            List an Item
          </Button>
        );
      case 'learn':
        return (
          <Button 
            variant="gradient"
            asChild
          >
            <a href="/learn/submit">
              <Brain className="h-4 w-4 mr-2" />
              Create Course
            </a>
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar Section */}
          <div className="flex-shrink-0">
            <div className="relative h-40 w-40 md:h-48 md:w-48 rounded-full overflow-hidden flex items-center justify-center border-4 border-muted">
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
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-headline font-bold text-foreground">
                {user.displayName || 'User'}
              </h1>
              <p className="text-muted-foreground text-lg">{user.username}</p>
              {user.location && !user.hideLocation && (
                <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{user.location}</span>
                </div>
              )}
              
              {user.isProfessional && (
                <Badge variant="secondary" className="mt-2">
                  Professional Artist
                </Badge>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-6 text-sm">
              {user.isProfessional && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">{user.followerCount}</span>
                  <span className="text-muted-foreground">followers</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <UserPlus className="h-4 w-4" />
                <span className="font-medium">{user.followingCount}</span>
                <span className="text-muted-foreground">following</span>
              </div>
            </div>

            {/* Newsletter Link - Prominent Display */}
            {user.newsletterLink && (
              <div className="flex items-center gap-2">
                <Button 
                  asChild
                  variant="gradient"
                  size="lg"
                  className="font-semibold"
                >
                  <a 
                    href={user.newsletterLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Subscribe to Newsletter
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {isOwnProfile ? (
                <>
                  <Button asChild variant="outline">
                    <Link href="/profile/edit">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Link>
                  </Button>
                  
                  
                  {user.isProfessional && (
                    <Button asChild variant="gradient">
                      <a href="/upload">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </a>
                    </Button>
                  )}
                  
                  {getDynamicButton()}
                  <Button
                    asChild
                    variant="outline"
                    size="icon"
                    aria-label="Open general settings"
                  >
                    <Link href="/settings">
                      <Settings className="h-4 w-4" />
                    </Link>
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline"
                  onClick={onFollowToggle}
                >
                  <Heart className="h-4 w-4 mr-2" />
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
              )}
              
              {/* Tip Jar Button - Show for all professional artists with tip jar enabled (default true) */}
              {user.isProfessional && (user.tipJarEnabled !== false) && (
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => setShowTipDialog(true)}
                  className="hover:gradient-border"
                >
                  <Coffee className="h-4 w-4" />
                </Button>
              )}
              
              {/* Suggestions Button - Show for all professional artists with suggestions enabled (default true) */}
              {user.isProfessional && (user.suggestionsEnabled !== false) && (
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSuggestionsDialog(true)}
                  className="hover:gradient-border"
                >
                  <Lightbulb className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Artist Location (moved from Upcoming Events) */}
            {(user.countryOfOrigin || user.countryOfResidence) && !user.hideLocation && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {user.countryOfOrigin && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-muted-foreground mb-1">Country of Origin</p>
                      <div className="flex items-center gap-2">
                        {!user.hideFlags && <CountryFlag country={user.countryOfOrigin} size="sm" />}
                        <p className="text-foreground">{user.countryOfOrigin}</p>
                      </div>
                    </div>
                  </div>
                )}
                {user.countryOfResidence && (
                  <div className="flex items-start gap-3">
                    <Globe className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-muted-foreground mb-1">Currently Based In</p>
                      <div className="flex items-center gap-2">
                        {!user.hideFlags && <CountryFlag country={user.countryOfResidence} size="sm" />}
                        <p className="text-foreground">
                          {user.location && user.countryOfResidence 
                            ? `${user.location}, ${user.countryOfResidence}`
                            : user.countryOfResidence
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Bio Section - Separate Card */}
      {user.bio && (
        <Card className="mt-6">
          <CardContent className="p-6">
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

      {/* Upcoming Events Section - Separate Card */}
      {user.isProfessional && !user.hideUpcomingEvents && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Upcoming Events
                </h2>
                {isOwnProfile && (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/profile/edit#upcoming-events">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Link>
                  </Button>
                )}
              </div>
              
              {/* Upcoming Event Banner */}
              {user.bannerImageUrl && (
                <div className="mb-4">
                  <div className="relative w-full h-48 md:h-64 rounded-lg overflow-hidden">
                    <img
                      src={user.bannerImageUrl}
                      alt={`${user.displayName}'s upcoming event banner`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              
              {/* Upcoming Event Banner Placeholder */}
              {!user.bannerImageUrl && isOwnProfile && (
                <div className="mb-4">
                  <div className="relative w-full h-48 md:h-64 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/10 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-muted-foreground text-sm mb-2">
                        Add an upcoming event banner image (taller rectangle works best)
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/profile/edit#upcoming-events">
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Add Upcoming Event Banner
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Upcoming Event Details */}
              {(user.eventDate || user.eventCity || user.eventCountry) ? (
                <div className="space-y-2 pt-3">
                  {(user.eventCity || user.eventCountry) && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {[user.eventCity, user.eventCountry].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {user.eventDate && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {new Date(user.eventDate).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  )}
                </div>
              ) : (
                isOwnProfile && (
                  <div className="pt-3">
                    <p className="text-sm text-muted-foreground mb-3">
                      No upcoming events scheduled. Add an event to let visitors know about your next show or exhibition.
                    </p>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/profile/edit#upcoming-events">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Upcoming Event
                      </Link>
                    </Button>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Where to See My Work Section - Separate Card */}
      {user.isProfessional && !user.hideShowcaseLocations && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Where to See My Work
                </h2>
                {isOwnProfile && (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/profile/edit#showcase-locations">
                      <Edit className="h-4 w-4 mr-2" />
                      Manage
                    </Link>
                  </Button>
                )}
              </div>
              {user.showcaseLocations && user.showcaseLocations.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {user.showcaseLocations.map((location, index) => (
                    <div key={`${location.name}-${location.website || location.city || index}`} className="rounded-lg border border-muted bg-muted/20 p-3 flex gap-3">
                      {location.imageUrl && (
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-muted">
                          <img src={location.imageUrl} alt={location.name || 'Gallery'} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div className="space-y-1 text-sm flex-1">
                        <p className="font-semibold text-foreground">
                          {location.name || 'Gallery'}
                        </p>
                        {location.venue && (
                          <p className="text-muted-foreground text-xs">
                            {location.venue}
                          </p>
                        )}
                        {(location.city || location.country) && (
                          <p className="text-muted-foreground">
                            {[location.city, location.country].filter(Boolean).join(', ')}
                          </p>
                        )}
                        {location.website && (
                          <a
                            href={location.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline break-all flex items-center gap-1"
                          >
                            Visit Website
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {location.notes && (
                          <p className="text-muted-foreground text-xs mt-1">{location.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {isOwnProfile
                      ? 'Highlight galleries and spaces that are currently showing your work. Add locations to let visitors know where they can see your art in person.'
                      : 'This artist hasn't listed any current gallery showings.'}
                  </p>
                  {isOwnProfile && (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/profile/edit#showcase-locations">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Location
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tip Jar Dialog */}
      <TipDialog
        isOpen={showTipDialog}
        onClose={() => setShowTipDialog(false)}
        artistName={user.displayName || user.username}
        artistId={user.id}
      />

      {/* Suggestions Dialog */}
      <SuggestionsDialog
        isOpen={showSuggestionsDialog}
        onClose={() => setShowSuggestionsDialog(false)}
        artistName={user.displayName || user.username}
        artistId={user.id}
      />

    </>
  );
}