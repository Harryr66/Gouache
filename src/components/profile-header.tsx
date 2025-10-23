'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, UserPlus, Edit, Upload, Plus, MapPin, Globe, Coffee, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { TipDialog } from './tip-dialog';
import { SuggestionsDialog } from './suggestions-dialog';
import { CountryFlag } from './country-flag';

interface ProfileHeaderProps {
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
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
      case 'community':
        return (
          <Button 
            variant="gradient"
            onClick={() => {/* TODO: Add community creation logic */}}
          >
            <Users className="h-4 w-4 mr-2" />
            Start Community
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
            <div className="relative h-32 w-32 rounded-full overflow-hidden flex items-center justify-center border-4 border-muted">
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
              <p className="text-muted-foreground text-lg">@{user.username}</p>
              
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
              
              {/* Tip Jar Button - Show for all professional artists with tip jar enabled */}
              {user.isProfessional && user.tipJarEnabled && (
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => setShowTipDialog(true)}
                  className="hover:gradient-border"
                >
                  <Coffee className="h-4 w-4" />
                </Button>
              )}
              
              {/* Suggestions Button - Show for all professional artists with suggestions enabled */}
              {user.isProfessional && user.suggestionsEnabled && (
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
          </div>
        </div>
      </Card>

      {/* Biography Section */}
      {(user.bio || user.countryOfOrigin || user.countryOfResidence) && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Biography
                  </h2>
                  {user.bio && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsBioExpanded(!isBioExpanded)}
                    >
                      {isBioExpanded ? 'Close Bio' : 'Read Bio'}
                    </Button>
                  )}
                </div>
                {user.bio && isBioExpanded && (
                  <div className="text-foreground leading-relaxed">
                    <p className="whitespace-pre-line text-base">{user.bio}</p>
                  </div>
                )}
                {!user.bio && isOwnProfile && (
                  <p className="text-muted-foreground italic">
                    Add a biography to tell your story (up to 5 sentences)
                  </p>
                )}
              </div>

              {(user.countryOfOrigin || user.countryOfResidence) && !user.hideLocation && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </>
              )}

              {isOwnProfile && !user.countryOfOrigin && !user.countryOfResidence && (
                <>
                  <Separator />
                  <div className="text-center py-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href="/profile/edit">
                        <MapPin className="h-4 w-4 mr-2" />
                        Add Location Information
                      </Link>
                    </Button>
                  </div>
                </>
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