'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { WatchHistory, Watchlist, Episode, Docuseries } from '@/lib/types';

// Generate SOMA placeholder URLs
const generatePlaceholderUrl = (width: number = 400, height: number = 600) => {
  // Check if we're in light mode by looking at the document's class or theme
  const isLightMode = typeof window !== 'undefined' && 
    (document.documentElement.classList.contains('light') || 
     !document.documentElement.classList.contains('dark'));
  
  const backgroundColor = isLightMode ? '#f3f4f6' : '#1f2937'; // light gray or dark gray
  const textColor = isLightMode ? '#000000' : '#ffffff'; // black or white
  
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}"/>
      <text x="50%" y="50%" text-anchor="middle" fill="${textColor}" font-family="Arial, sans-serif" font-size="32" font-weight="bold">SOMA</text>
    </svg>
  `)}`;
};

interface WatchlistContextType {
  watchHistory: WatchHistory[];
  watchlist: Watchlist[];
  addToWatchlist: (docuseriesId: string) => void;
  removeFromWatchlist: (docuseriesId: string) => void;
  updateWatchHistory: (episodeId: string, watchedDuration: number, totalDuration: number) => void;
  getContinueWatching: () => Episode[];
  isInWatchlist: (docuseriesId: string) => boolean;
  getWatchProgress: (episodeId: string) => number;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [watchHistory, setWatchHistory] = useState<WatchHistory[]>([]);
  const [watchlist, setWatchlist] = useState<Watchlist[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('soma_watch_history');
    const savedWatchlist = localStorage.getItem('soma_watchlist');
    
    if (savedHistory) {
      try {
        setWatchHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Error loading watch history:', error);
      }
    }
    
    if (savedWatchlist) {
      try {
        setWatchlist(JSON.parse(savedWatchlist));
      } catch (error) {
        console.error('Error loading watchlist:', error);
      }
    } else {
      // Add some mock watchlist data for demo
      const mockWatchlist: Watchlist[] = [
        {
          id: 'watchlist_1',
          userId: 'current_user',
          docuseriesId: 'ds-1',
          docuseries: {
            id: 'ds-1',
            title: 'Abstract Expressions',
            description: 'Follow Elena Vance as she explores the depths of abstract painting.',
            thumbnailUrl: generatePlaceholderUrl(400, 600),
            bannerUrl: generatePlaceholderUrl(1200, 675),
            featuredArtist: {} as any,
            category: 'Traditional Art',
            genre: 'Documentary',
            totalEpisodes: 2,
            totalDuration: 120,
            releaseDate: new Date('2024-01-15'),
            lastUpdated: new Date('2024-01-22'),
            rating: 4.8,
            viewCount: 45000,
            isFeatured: true,
            isNew: true,
            tags: ['abstract', 'painting', 'emotion', 'color'],
            status: 'ongoing',
            episodes: [],
            createdAt: new Date('2024-01-10'),
            updatedAt: new Date('2024-01-22')
          },
          addedAt: new Date()
        }
      ];
      setWatchlist(mockWatchlist);
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('soma_watch_history', JSON.stringify(watchHistory));
  }, [watchHistory]);

  useEffect(() => {
    localStorage.setItem('soma_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const addToWatchlist = (docuseriesId: string) => {
    if (!isInWatchlist(docuseriesId)) {
      const newWatchlistItem: Watchlist = {
        id: `watchlist_${Date.now()}`,
        userId: 'current_user', // In a real app, this would come from auth
        docuseriesId,
        docuseries: {} as Docuseries, // This would be populated from API
        addedAt: new Date()
      };
      setWatchlist(prev => [...prev, newWatchlistItem]);
    }
  };

  const removeFromWatchlist = (docuseriesId: string) => {
    setWatchlist(prev => prev.filter(item => item.docuseriesId !== docuseriesId));
  };

  const updateWatchHistory = (episodeId: string, watchedDuration: number, totalDuration: number) => {
    const progress = totalDuration > 0 ? (watchedDuration / totalDuration) * 100 : 0;
    const isCompleted = progress >= 90; // Consider 90% as completed

    setWatchHistory(prev => {
      const existingIndex = prev.findIndex(item => item.episodeId === episodeId);
      const updatedItem: WatchHistory = {
        id: `history_${Date.now()}`,
        userId: 'current_user',
        episodeId,
        episode: {} as Episode, // This would be populated from API
        watchedDuration,
        totalDuration,
        lastWatchedAt: new Date(),
        isCompleted,
        progress
      };

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = updatedItem;
        return updated;
      } else {
        return [...prev, updatedItem];
      }
    });
  };

  const getContinueWatching = (): Episode[] => {
    // Return episodes that are not completed, sorted by last watched
    const incompleteHistory = watchHistory
      .filter(item => !item.isCompleted)
      .sort((a, b) => b.lastWatchedAt.getTime() - a.lastWatchedAt.getTime())
      .slice(0, 10); // Limit to 10 items

    // In a real app, you'd fetch the actual episode data
    return incompleteHistory.map(item => item.episode);
  };

  const isInWatchlist = (docuseriesId: string): boolean => {
    return watchlist.some(item => item.docuseriesId === docuseriesId);
  };

  const getWatchProgress = (episodeId: string): number => {
    const historyItem = watchHistory.find(item => item.episodeId === episodeId);
    return historyItem ? historyItem.progress : 0;
  };

  const value: WatchlistContextType = {
    watchHistory,
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    updateWatchHistory,
    getContinueWatching,
    isInWatchlist,
    getWatchProgress
  };

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (context === undefined) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
}
