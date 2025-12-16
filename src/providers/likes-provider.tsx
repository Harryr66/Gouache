'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { arrayRemove, arrayUnion, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { engagementTracker } from '@/lib/engagement-tracker';

type LikesContextValue = {
  likedArtworkIds: Set<string>;
  toggleLike: (artworkId: string) => Promise<void>;
  isLiked: (artworkId: string) => boolean;
  loading: boolean;
};

const LikesContext = createContext<LikesContextValue | undefined>(undefined);

export function LikesProvider({ children }: { children: React.ReactNode }) {
  const auth = getAuth();
  const [likedArtworkIds, setLikedArtworkIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLikes() {
      const user = auth.currentUser;
      if (!user) {
        setLikedArtworkIds(new Set());
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'userProfiles', user.uid));
        const liked = userDoc.exists() ? (userDoc.data()?.likedArtworks ?? []) : [];
        setLikedArtworkIds(new Set(liked));
      } catch (error) {
        console.error('Failed to load liked artworks', error);
      } finally {
        setLoading(false);
      }
    }

    loadLikes();
    return auth.onAuthStateChanged(() => loadLikes());
  }, [auth]);

  const toggleLike = async (artworkId: string) => {
    const user = auth.currentUser;
    if (!user) {
      // Import toast dynamically to avoid SSR issues
      const { toast } = await import('@/hooks/use-toast');
      toast({
        title: "Login Required",
        description: "Please log in to like artworks. You can browse as a guest, but need an account to save your favorites.",
        variant: "destructive",
      });
      return;
    }

    try {
      const profileRef = doc(db, 'userProfiles', user.uid);
      const snapshot = await getDoc(profileRef);
      const currentlyLiked = snapshot.exists()
        ? new Set<string>(snapshot.data()?.likedArtworks ?? [])
        : new Set<string>();

      const alreadyLiked = currentlyLiked.has(artworkId);

      if (alreadyLiked) {
        currentlyLiked.delete(artworkId);
        await updateDoc(profileRef, {
          likedArtworks: arrayRemove(artworkId),
        });
        // Track unlike engagement
        await engagementTracker.recordLike(artworkId, false);
      } else {
        currentlyLiked.add(artworkId);
        if (snapshot.exists()) {
          await updateDoc(profileRef, {
            likedArtworks: arrayUnion(artworkId),
          });
        } else {
          await setDoc(
            profileRef,
            { likedArtworks: [artworkId] },
            { merge: true }
          );
        }
        // Track like engagement
        await engagementTracker.recordLike(artworkId, true);
      }

      setLikedArtworkIds(new Set(currentlyLiked));
    } catch (error) {
      console.error('Failed to persist like', error);
    }
  };

  const value = useMemo<LikesContextValue>(
    () => ({
      likedArtworkIds,
      toggleLike,
      isLiked: (id: string) => likedArtworkIds.has(id),
      loading,
    }),
    [likedArtworkIds, toggleLike, loading]
  );

  return <LikesContext.Provider value={value}>{children}</LikesContext.Provider>;
}

export function useLikes() {
  const context = useContext(LikesContext);
  if (!context) {
    throw new Error('useLikes must be used within a LikesProvider');
  }
  return context;
}

