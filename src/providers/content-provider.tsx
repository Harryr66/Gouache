
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { type Post, type Artwork, type Discussion, type StoryItem, type Artist } from '@/lib/types';
import { postData as initialPosts, artworkData as initialArtworks, discussionsData as initialDiscussions } from '@/lib/data';
import { useAuth } from './auth-provider';
import {
  idbGetPosts,
  idbGetArtworks,
  idbGetDiscussions,
  idbAddPost,
  idbAddArtwork,
  idbAddDiscussion,
  idbDeletePost,
  idbDeleteArtwork,
  idbDeleteDiscussion,
  idbUpdatePost,
  idbUpdateDiscussion,
  idbUpdateArtwork,
  idbGetStoryItems,
  idbAddStoryItem,
  idbDeleteStoryItem,
} from '@/lib/idb';
import { useToast } from '@/hooks/use-toast';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, onSnapshot, orderBy, query, writeBatch, doc, addDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';


interface ContentContextType {
  posts: Post[];
  artworks: Artwork[];
  discussions: Discussion[];
  storyItems: StoryItem[];
  addContent: (newPost: Post, newArtwork: Artwork) => void;
  deleteContentByArtworkId: (artworkId: string) => void;
  updatePostCaption: (postId: string, newCaption: string) => void;
  updateArtworkTitle: (artworkId: string, newTitle: string) => void;
  updateDiscussion: (discussion: Discussion) => Promise<void>;
  addStoryItem: (file: File, config: { captionConfigs?: StoryItem['captionConfigs']; mediaConfig?: StoryItem['mediaConfig'] }) => Promise<StoryItem>;
  deleteStoryItem: (storyItemId: string) => Promise<void>;
  resharePost: (postToReshare: Post) => Promise<void>;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider = ({ children }: { children: ReactNode }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [storyItems, setStoryItems] = useState<StoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user, avatarUrl } = useAuth();
  const { toast } = useToast();

  // Load from Firestore on mount.
  useEffect(() => {
    if (!user || isLoaded) return;

    const setupFirestoreListeners = async () => {
        try {
            // Check if initial seeding is needed
            const postsSnapshot = await getDocs(collection(db, 'posts'));
            if (postsSnapshot.empty) {
                console.log("No content found in Firestore. Seeding initial data for prototype...");
                const batch = writeBatch(db);
                initialPosts.forEach(post => batch.set(doc(db, 'posts', post.id), post));
                initialArtworks.forEach(artwork => batch.set(doc(db, 'artworks', artwork.id), artwork));
                initialDiscussions.forEach(discussion => batch.set(doc(db, 'discussions', discussion.id), discussion));
                await batch.commit();
                console.log("Initial data seeded successfully.");
            }

            const createListener = (collectionName: string, setter: React.Dispatch<React.SetStateAction<any[]>>, orderField: string = 'createdAt') => {
                const q = query(collection(db, collectionName), orderBy(orderField, 'desc'));
                return onSnapshot(q, (snapshot) => {
                    const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                    setter(items as any);
                }, (error) => {
                    console.error(`Error listening to ${collectionName}:`, error);
                    toast({ variant: 'destructive', title: 'Connection Error', description: `Could not sync ${collectionName}.` });
                });
            };

            const unsubscribePosts = createListener('posts', setPosts);
            const unsubscribeArtworks = createListener('artworks', setArtworks, 'id');
            const unsubscribeDiscussions = createListener('discussions', setDiscussions, 'timestamp');
            
            // Story items have a 24-hour TTL managed on the client
            const unsubscribeStories = onSnapshot(collection(db, 'storyItems'), (snapshot) => {
                const now = Date.now();
                const twentyFourHours = 24 * 60 * 60 * 1000;
                const items = snapshot.docs
                    .map(doc => ({ ...doc.data(), id: doc.id } as StoryItem))
                    .filter(item => now - item.createdAt < twentyFourHours);
                setStoryItems(items.sort((a, b) => a.createdAt - b.createdAt));
            });

            setIsLoaded(true);

            return () => {
                unsubscribePosts();
                unsubscribeArtworks();
                unsubscribeDiscussions();
                unsubscribeStories();
            };

        } catch (error) {
            console.error("Failed to initialize Firestore listeners:", error);
            toast({ variant: 'destructive', title: 'Database Error', description: 'Could not connect to the database. Please check your Firebase setup and security rules.' });
            setIsLoaded(true); // Mark as loaded to prevent retries
        }
    };

    const unsubscribe = setupFirestoreListeners();

    return () => {
        unsubscribe.then(fn => fn && fn());
    };
  }, [user, isLoaded, toast]);
  
  // This effect handles user logout. It clears the local state.
  useEffect(() => {
    if (!user) {
        setPosts([]);
        setArtworks([]);
        setDiscussions([]);
        setStoryItems([]);
        setIsLoaded(false); // Reset loaded state for next login
    }
  }, [user]);

  // Helper function to clean undefined values
  const cleanObject = (obj: any) => {
    const cleaned = { ...obj };
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined) {
        cleaned[key] = null;
      } else if (typeof cleaned[key] === 'object' && cleaned[key] !== null) {
        cleaned[key] = cleanObject(cleaned[key]);
      }
    });
    return cleaned;
  };

  const addContent = async (newPost: Post, newArtwork: Artwork) => {
    try {
        const batch = writeBatch(db);

        const discussionRef = doc(collection(db, 'discussions'));
        const newDiscussion: Discussion = {
            id: discussionRef.id,
            title: `Discussion for "${newArtwork.title}"`,
            author: newArtwork.artist,
            timestamp: 'Just now',
            content: newPost.caption,
            upvotes: 0,
            downvotes: 0,
            isPinned: false,
            replyCount: 0,
            replies: [],
        };

        const cleanedDiscussion = cleanObject(newDiscussion);
        batch.set(discussionRef, cleanedDiscussion);

        // Explicitly handle undefined in artist
        if (newArtwork.artist.avatarUrl === undefined) {
          newArtwork.artist.avatarUrl = null;
        }

        const artworkRef = doc(db, 'artworks', newArtwork.id);
        const cleanedArtwork = cleanObject({ ...newArtwork, discussionId: discussionRef.id });
        // Override createdAt and updatedAt with serverTimestamp for proper Firestore querying
        cleanedArtwork.createdAt = serverTimestamp();
        cleanedArtwork.updatedAt = serverTimestamp();
        batch.set(artworkRef, cleanedArtwork);

        const postRef = doc(db, 'posts', newPost.id);
        const cleanedPost = cleanObject({ ...newPost, discussionId: discussionRef.id });
        // Override createdAt with serverTimestamp for proper Firestore querying
        cleanedPost.createdAt = serverTimestamp();
        batch.set(postRef, cleanedPost);

        await batch.commit();

        toast({
            title: "Post Live!",
            description: `Your content is now live on the feed and your profile.`,
        });

    } catch (error) {
        console.error("Error adding content:", error);
        toast({ variant: 'destructive', title: 'Upload Failed', description: `Could not save your content: ${(error as Error).message || 'Unknown error'}` });
    }
  };

  const deleteContentByArtworkId = async (artworkId: string) => {
    const artworkToDelete = artworks.find(a => a.id === artworkId);
    const postToDelete = posts.find(p => p.artworkId === artworkId);
    
    try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'artworks', artworkId));
        if (postToDelete) {
            batch.delete(doc(db, 'posts', postToDelete.id));
        }
        if (artworkToDelete?.discussionId) {
            batch.delete(doc(db, 'discussions', artworkToDelete.discussionId));
        }
        await batch.commit();
        toast({ title: "Content Deleted", description: "The content has been permanently removed." });
    } catch (error) {
        console.error("Error deleting content:", error);
        toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not remove the content from the database.' });
    }
  };

  const updatePostCaption = async (postId: string, newCaption: string) => {
     try {
        await setDoc(doc(db, 'posts', postId), { caption: newCaption }, { merge: true });
     } catch (error) {
        console.error("Error updating caption:", error);
     }
  };
  
  const updateArtworkTitle = async (artworkId: string, newTitle: string) => {
     try {
        await setDoc(doc(db, 'artworks', artworkId), { title: newTitle }, { merge: true });
     } catch (error) {
         console.error("Error updating title:", error);
     }
  };

  const updateDiscussion = async (discussion: Discussion) => {
      try {
        await setDoc(doc(db, 'discussions', discussion.id), discussion, { merge: true });
      } catch (error) {
          console.error("Error updating discussion:", error);
      }
  }

  const addStoryItem = async (file: File, config: { captionConfigs?: StoryItem['captionConfigs']; mediaConfig?: StoryItem['mediaConfig'] }): Promise<StoryItem> => {
    if (!user) {
        throw new Error('User not authenticated.');
    }
    const storageRef = ref(storage, `stories/${user.id || "demo-user"}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
     const mediaUrl = await getDownloadURL(storageRef);

    const newItem: Omit<StoryItem, 'id'> = {
        artistId: user.id || "demo-user",
        mediaUrl,
        mediaType: file.type.startsWith('video') ? 'video' : 'image',
        createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        captionConfigs: config.captionConfigs,
        mediaConfig: config.mediaConfig,
    };
    
    const docRef = await addDoc(collection(db, 'storyItems'), newItem);
    return { ...newItem, id: docRef.id };
  };

  const deleteStoryItem = async (storyItemId: string) => {
    try {
        await deleteDoc(doc(db, 'stories', storyItemId));
        // You might also want to delete the file from Firebase Storage here.
        toast({ title: 'Story Deleted', description: 'Your story has been removed.' });
    } catch (error) {
        console.error("Error deleting story:", error);
    }
  }

  const resharePost = async (postToReshare: Post) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'You must be logged in to reshare.' });
      throw new Error('You must be logged in to reshare.');
    }

    const currentUserArtist: Artist = {
      followerCount: 0,
      followingCount: 0,
      createdAt: new Date(),
      id: user.id || "demo-user",
      name: user.displayName || 'Anonymous User',
      handle: JSON.parse(localStorage.getItem(`userProfile-${user.id || "demo-user"}`) || '{}').handle || user.email?.split('@')[0] || 'anonymous',
      avatarUrl: avatarUrl || undefined,
    };
    
    const newPost: Omit<Post, 'id'> = {
      ...postToReshare,
      resharedBy: currentUserArtist,
      timestamp: 'Just now',
      createdAt: Date.now(),
      likes: 0,
      commentsCount: 0,
    };
    
    await addDoc(collection(db, 'posts'), newPost);
  };
  
  const value = {
    posts,
    artworks,
    discussions,
    storyItems,
    addContent,
    deleteContentByArtworkId,
    updatePostCaption,
    updateArtworkTitle,
    updateDiscussion,
    addStoryItem,
    deleteStoryItem,
    resharePost,
  };

  return (
    <ContentContext.Provider value={value}>
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => {
  const context = useContext(ContentContext);
  if (context === undefined) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
};
