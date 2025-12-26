'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Artist } from '@/lib/types';
import { getAuth } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

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
  loading?: boolean;
}

const FollowContext = createContext<FollowContextType | undefined>(undefined);

export function FollowProvider({ children }: { children: React.ReactNode }) {
  const [followedArtists, setFollowedArtists] = useState<Artist[]>([]);
  const [followedArtistIds, setFollowedArtistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load followed artists from Firestore
  useEffect(() => {
    const loadFollowedArtists = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        setFollowedArtists([]);
        setFollowedArtistIds(new Set());
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'userProfiles', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const followedIds = data.following || [];
          setFollowedArtistIds(new Set(followedIds));
          
          // Update followingCount if it doesn't match the array length
          if (followedIds.length !== (data.followingCount || 0)) {
            try {
              await updateDoc(doc(db, 'userProfiles', user.uid), {
                followingCount: followedIds.length,
              });
            } catch (error) {
              console.error('Error syncing followingCount:', error);
            }
          }

          // Fetch artist data for followed artists
          const artistPromises = followedIds.map(async (artistId: string) => {
            try {
              const artistDoc = await getDoc(doc(db, 'userProfiles', artistId));
              if (artistDoc.exists()) {
                const artistData = artistDoc.data();
                return {
                  id: artistId,
                  name: artistData.displayName || artistData.name || artistData.username || 'Unknown Artist',
                  handle: artistData.username || artistData.handle || '',
                  avatarUrl: artistData.avatarUrl || null,
                  bio: artistData.bio || '',
                  followerCount: artistData.followerCount || 0,
                  followingCount: artistData.followingCount || 0,
                  createdAt: artistData.createdAt?.toDate?.() || (artistData.createdAt instanceof Date ? artistData.createdAt : new Date()),
                  isVerified: artistData.isVerified || false,
                  isProfessional: artistData.isProfessional || false,
                  location: artistData.location || '',
                  socialLinks: artistData.socialLinks || {},
                } as Artist;
              }
            } catch (error) {
              console.error(`Error fetching artist ${artistId}:`, error);
            }
            return null;
          });

          const artists = (await Promise.all(artistPromises)).filter(Boolean) as Artist[];
          setFollowedArtists(artists);
        }
      } catch (error) {
        console.error('Error loading followed artists:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFollowedArtists();
    const auth = getAuth();
    return auth.onAuthStateChanged(() => loadFollowedArtists());
  }, []);

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

    try {
      const userDocRef = doc(db, 'userProfiles', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create user profile if it doesn't exist
        await setDoc(userDocRef, {
          following: [artistId],
          updatedAt: serverTimestamp(),
        });
      } else {
        // Add to following array
        await updateDoc(userDocRef, {
          following: arrayUnion(artistId),
          updatedAt: serverTimestamp(),
        });
      }

      // Update local state
      setFollowedArtistIds(prev => new Set([...prev, artistId]));

      // Fetch and add artist data
      try {
        const artistDoc = await getDoc(doc(db, 'userProfiles', artistId));
        if (artistDoc.exists()) {
          const artistData = artistDoc.data();
          const artist: Artist = {
            id: artistId,
            name: artistData.displayName || artistData.name || artistData.username || 'Unknown Artist',
            handle: artistData.username || artistData.handle || '',
            avatarUrl: artistData.avatarUrl || null,
            bio: artistData.bio || '',
            followerCount: artistData.followerCount || 0,
            followingCount: artistData.followingCount || 0,
            createdAt: artistData.createdAt?.toDate?.() || (artistData.createdAt instanceof Date ? artistData.createdAt : new Date()),
            isVerified: artistData.isVerified || false,
            isProfessional: artistData.isProfessional || false,
            location: artistData.location || '',
            socialLinks: artistData.socialLinks || {},
          };
          setFollowedArtists(prev => [...prev.filter(a => a.id !== artistId), artist]);
        }
      } catch (error) {
        console.error('Error fetching artist data:', error);
      }

      // Update follower count on artist's profile
      try {
        const artistDocRef = doc(db, 'userProfiles', artistId);
        const artistDoc = await getDoc(artistDocRef);
        if (artistDoc.exists()) {
          await updateDoc(artistDocRef, {
            followerCount: (artistDoc.data().followerCount || 0) + 1,
          });
        }
      } catch (error) {
        console.error('Error updating follower count:', error);
      }

      // Update following count on user's own profile
      try {
        const userDocRef = doc(db, 'userProfiles', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const currentFollowing = userDoc.data().following || [];
          await updateDoc(userDocRef, {
            followingCount: currentFollowing.length + 1,
          });
        }
      } catch (error) {
        console.error('Error updating following count:', error);
      }
    } catch (error) {
      console.error('Error following artist:', error);
      const { toast } = await import('@/hooks/use-toast');
      toast({
        title: "Error",
        description: "Failed to follow artist. Please try again.",
        variant: "destructive",
      });
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

    try {
      const userDocRef = doc(db, 'userProfiles', user.uid);
      await updateDoc(userDocRef, {
        following: arrayRemove(artistId),
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setFollowedArtistIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(artistId);
        return newSet;
      });
      setFollowedArtists(prev => prev.filter(artist => artist.id !== artistId));

      // Update follower count on artist's profile
      try {
        const artistDocRef = doc(db, 'userProfiles', artistId);
        const artistDoc = await getDoc(artistDocRef);
        if (artistDoc.exists()) {
          const currentCount = artistDoc.data().followerCount || 0;
          await updateDoc(artistDocRef, {
            followerCount: Math.max(0, currentCount - 1),
          });
        }
      } catch (error) {
        console.error('Error updating follower count:', error);
      }

      // Update following count on user's own profile
      try {
        const userDocRef = doc(db, 'userProfiles', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const currentFollowing = userDoc.data().following || [];
          await updateDoc(userDocRef, {
            followingCount: Math.max(0, currentFollowing.length - 1),
          });
        }
      } catch (error) {
        console.error('Error updating following count:', error);
      }
    } catch (error) {
      console.error('Error unfollowing artist:', error);
      const { toast } = await import('@/hooks/use-toast');
      toast({
        title: "Error",
        description: "Failed to unfollow artist. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isFollowing = (artistId: string): boolean => {
    return followedArtistIds.has(artistId);
  };

  const getFollowedArtists = (): Artist[] => {
    return followedArtists;
  };

  const value: FollowContextType = {
    followedArtists,
    followArtist,
    unfollowArtist,
    isFollowing,
    getFollowedArtists,
    loading
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
