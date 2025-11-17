'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Artist } from '@/lib/types';
import { getAuth } from 'firebase/auth';

// Generate Gouache avatar placeholder URLs
const generateAvatarPlaceholderUrl = (width: number = 150, height: number = 150) => {
  // Default to light mode colors, will be overridden by theme detection
  let backgroundColor = '#f8f9fa'; // very light gray
  let textColor = '#6b7280'; // medium gray
  
  // Try to detect theme if we're in a browser environment
  if (typeof window !== 'undefined') {
    try {
      // Check for explicit light/dark class
      if (document.documentElement.classList.contains('dark')) {
        backgroundColor = '#1f2937'; // dark gray
        textColor = '#ffffff'; // white
      } else if (document.documentElement.classList.contains('light')) {
        backgroundColor = '#f8f9fa'; // very light gray
        textColor = '#6b7280'; // medium gray
      } else {
        // No explicit theme class, check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          backgroundColor = '#1f2937'; // dark gray
          textColor = '#ffffff'; // white
        }
        // Otherwise keep light mode defaults
      }
    } catch (error) {
      // If theme detection fails, keep light mode defaults
      console.warn('Theme detection failed, using light mode defaults:', error);
    }
  }
  
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}" stroke="#e5e7eb" stroke-width="1"/>
      <text x="50%" y="50%" text-anchor="middle" fill="${textColor}" font-family="Arial, sans-serif" font-size="24" font-weight="bold">Gouache</text>
    </svg>
  `)}`;
};

interface FollowContextType {
  followedArtists: Artist[];
  followArtist: (artistId: string) => void;
  unfollowArtist: (artistId: string) => void;
  isFollowing: (artistId: string) => boolean;
  getFollowedArtists: () => Artist[];
}

const FollowContext = createContext<FollowContextType | undefined>(undefined);

export function FollowProvider({ children }: { children: React.ReactNode }) {
  const [followedArtists, setFollowedArtists] = useState<Artist[]>([]);

  // Load followed artists from localStorage on mount
  useEffect(() => {
    const savedFollows = localStorage.getItem('soma_followed_artists');
    if (savedFollows) {
      try {
        setFollowedArtists(JSON.parse(savedFollows));
      } catch (error) {
        console.error('Error loading followed artists:', error);
      }
    } else {
      // Add some mock followed artists for demo
      const mockFollowedArtists: Artist[] = [
        {
          id: 'artist-1',
          name: 'Elena Vance',
          handle: 'elena_vance',
          avatarUrl: generateAvatarPlaceholderUrl(150, 150),
          bio: 'Abstract expressionist painter exploring the intersection of color and emotion.',
          followerCount: 1250,
          followingCount: 89,
          createdAt: new Date('2023-01-15'),
          isVerified: true,
          isProfessional: true,
          location: 'New York, NY',
          socialLinks: {
            instagram: '@elena_vance',
            website: 'elena-vance.com'
          }
        },
        {
          id: 'artist-2',
          name: 'Marcus Chen',
          handle: 'marcus_chen',
          avatarUrl: generateAvatarPlaceholderUrl(150, 150),
          bio: 'Digital artist creating futuristic cityscapes and urban narratives.',
          followerCount: 2100,
          followingCount: 156,
          createdAt: new Date('2022-11-20'),
          isVerified: true,
          isProfessional: true,
          location: 'Los Angeles, CA',
          socialLinks: {
            instagram: '@marcus_chen',
            website: 'marcuschen.art'
          }
        }
      ];
      setFollowedArtists(mockFollowedArtists);
    }
  }, []);

  // Save to localStorage whenever followed artists change
  useEffect(() => {
    localStorage.setItem('soma_followed_artists', JSON.stringify(followedArtists));
  }, [followedArtists]);

  const followArtist = async (artistId: string) => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      // Import toast dynamically to avoid SSR issues
      const { toast } = await import('@/hooks/use-toast');
      toast({
        title: "Login Required",
        description: "Please log in to follow artists. You can browse as a guest, but need an account to follow your favorites.",
        variant: "destructive",
      });
      return;
    }

    // In a real app, you'd fetch the artist data from API
    // For now, we'll create a mock artist
    const mockArtist: Artist = {
      id: artistId,
      name: `Artist ${artistId}`,
      handle: `artist_${artistId}`,
      avatarUrl: generateAvatarPlaceholderUrl(150, 150),
      bio: 'Artist bio',
      followerCount: Math.floor(Math.random() * 10000),
      followingCount: Math.floor(Math.random() * 1000),
      createdAt: new Date(),
      isVerified: Math.random() > 0.5,
      isProfessional: true,
      location: 'Various',
      socialLinks: {
        instagram: `@artist_${artistId}`,
        website: `https://artist${artistId}.com`
      }
    };

    if (!isFollowing(artistId)) {
      setFollowedArtists(prev => [...prev, mockArtist]);
    }
  };

  const unfollowArtist = async (artistId: string) => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      // Import toast dynamically to avoid SSR issues
      const { toast } = await import('@/hooks/use-toast');
      toast({
        title: "Login Required",
        description: "Please log in to unfollow artists.",
        variant: "destructive",
      });
      return;
    }

    setFollowedArtists(prev => prev.filter(artist => artist.id !== artistId));
  };

  const isFollowing = (artistId: string): boolean => {
    return followedArtists.some(artist => artist.id === artistId);
  };

  const getFollowedArtists = (): Artist[] => {
    return followedArtists;
  };

  const value: FollowContextType = {
    followedArtists,
    followArtist,
    unfollowArtist,
    isFollowing,
    getFollowedArtists
  };

  return (
    <FollowContext.Provider value={value}>
      {children}
    </FollowContext.Provider>
  );
}

export function useFollow() {
  const context = useContext(FollowContext);
  if (context === undefined) {
    throw new Error('useFollow must be used within a FollowProvider');
  }
  return context;
}
