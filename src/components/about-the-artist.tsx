'use client';

import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, User } from 'lucide-react';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User as UserType } from '@/lib/types';
import { usePlaceholder } from '@/hooks/use-placeholder';
import { ThemeLoading } from '@/components/theme-loading';

interface AboutTheArtistProps {
  artistId: string;
  artistName?: string;
  artistHandle?: string;
  className?: string;
  compact?: boolean;
}

export function AboutTheArtist({ artistId, artistName, artistHandle, className, compact = false }: AboutTheArtistProps) {
  const [artist, setArtist] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const { generateAvatarPlaceholderUrl, generatePlaceholderUrl } = usePlaceholder();

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, 'userProfiles', artistId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setArtist({
            id: userDoc.id,
            username: data.username || data.handle || artistHandle || `user_${userDoc.id}`,
            email: data.email || '',
            displayName: data.name || data.displayName || artistName || 'Artist',
            avatarUrl: data.avatarUrl,
            bio: data.bio || '',
            website: data.website || data.socialLinks?.website,
            isVerified: data.isVerified !== false && data.isProfessional === true,
            isProfessional: data.isProfessional || false,
            followerCount: data.followerCount || 0,
            followingCount: data.followingCount || 0,
            postCount: data.postCount || 0,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            isActive: data.isActive !== false,
            portfolio: (data.portfolio || []).map((item: any) => ({
              ...item,
              createdAt: item.createdAt?.toDate?.() || (item.createdAt instanceof Date ? item.createdAt : new Date())
            }))
          } as UserType);
        } else {
          // If profile doesn't exist, use provided name/handle
          setArtist({
            id: artistId,
            username: artistHandle || `user_${artistId}`,
            email: '',
            displayName: artistName || 'Artist',
            isVerified: false,
            isProfessional: false,
            followerCount: 0,
            followingCount: 0,
            postCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true,
            portfolio: []
          } as UserType);
        }
      } catch (error) {
        console.error('Error fetching artist:', error);
        // Fallback to provided data
        setArtist({
          id: artistId,
          username: artistHandle || `user_${artistId}`,
          email: '',
          displayName: artistName || 'Artist',
          isVerified: false,
          isProfessional: false,
          followerCount: 0,
          followingCount: 0,
          postCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
          portfolio: []
        } as UserType);
      } finally {
        setLoading(false);
      }
    };

    if (artistId) {
      fetchArtist();
    }
  }, [artistId, artistName, artistHandle]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <ThemeLoading text="" size="sm" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!artist) {
    return null;
  }

  const avatarPlaceholder = generateAvatarPlaceholderUrl(80, 80);
  const portfolioImages = artist.portfolio?.filter(item => item.imageUrl) || [];
  const previewImages = portfolioImages.slice(0, 4); // Show up to 4 portfolio images

  const padding = compact ? 'p-4' : 'p-6';
  const titleClass = compact ? 'text-lg font-semibold mb-3' : 'text-2xl font-bold mb-4';
  const avatarSize = compact ? 'h-14 w-14' : 'h-20 w-20';
  const nameClass = compact ? 'text-base font-semibold truncate' : 'text-xl font-semibold truncate';
  const usernameClass = compact ? 'text-xs text-muted-foreground mb-1' : 'text-sm text-muted-foreground mb-2';
  const bioClamp = compact ? 'line-clamp-3' : 'line-clamp-4';

  return (
    <Card className={className}>
      <CardContent className={padding}>
        <div className="space-y-3">
          {/* Section Title */}
          <h2 className={titleClass}>About The Artist</h2>
          
          {/* Header */}
          <div className="flex items-start gap-3">
            <Avatar className={`${avatarSize} border-2 border-border`}>
              <AvatarImage 
                src={artist.avatarUrl || avatarPlaceholder} 
                alt={artist.displayName}
              />
              <AvatarFallback className="text-base">
                {artist.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={nameClass}>{artist.displayName}</h3>
              </div>
              {artist.username && (
                <p className={usernameClass}>@{artist.username}</p>
              )}
              <Link
                href={`/profile/${artist.username || artist.id}`}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <User className="h-4 w-4" />
                View Profile
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Bio */}
          {artist.bio && (
            <div>
              <p className={`text-sm text-muted-foreground leading-relaxed ${bioClamp}`}>
                {artist.bio}
              </p>
            </div>
          )}

          {!compact && previewImages.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Portfolio Preview</h4>
              <div className="grid grid-cols-2 gap-2">
                {previewImages.map((item, index) => (
                  <Link
                    key={item.id || index}
                    href={`/profile/${artist.username || artist.id}`}
                    className="relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary transition-colors group"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.title || `Portfolio ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    {index === 3 && portfolioImages.length > 4 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          +{portfolioImages.length - 4} more
                        </span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
              {portfolioImages.length > 4 && (
                <Link
                  href={`/profile/${artist.username || artist.id}`}
                  className="block mt-2 text-sm text-primary hover:underline text-center"
                >
                  View all {portfolioImages.length} portfolio items
                </Link>
              )}
            </div>
          )}

          {/* View Profile Button */}
          <Button
            asChild
            variant="outline"
            className={compact ? 'w-full text-sm py-2' : 'w-full'}
          >
            <Link href={`/profile/${artist.username || artist.id}`}>
              <User className="h-4 w-4 mr-2" />
              View Full Profile
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

