'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface VideoControlContextType {
  registerVideo: (videoId: string, playCallback: () => void, pauseCallback: () => void) => () => void;
  requestPlay: (videoId: string) => boolean;
  isPlaying: (videoId: string) => boolean;
  getConnectionSpeed: () => 'slow' | 'medium' | 'fast' | 'unknown';
}

const VideoControlContext = createContext<VideoControlContextType | undefined>(undefined);

const MAX_CONCURRENT_VIDEOS = 3;

export function VideoControlProvider({ children }: { children: React.ReactNode }) {
  const [playingVideos, setPlayingVideos] = useState<Set<string>>(new Set());
  const videoCallbacks = useRef<Map<string, { play: () => void; pause: () => void }>>(new Map());
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'medium' | 'fast' | 'unknown'>('unknown');

  // Detect connection speed using Network Information API (if available) or fallback
  useEffect(() => {
    const detectConnectionSpeed = () => {
      // Check for Network Information API (Chrome/Edge)
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      if (connection) {
        // Use effectiveType if available (4g, 3g, 2g, slow-2g)
        if (connection.effectiveType) {
          if (connection.effectiveType === '4g') {
            setConnectionSpeed('fast');
          } else if (connection.effectiveType === '3g') {
            setConnectionSpeed('medium');
          } else {
            setConnectionSpeed('slow');
          }
          return;
        }
        
        // Fallback to downlink speed (Mbps)
        if (connection.downlink !== undefined) {
          if (connection.downlink >= 2) {
            setConnectionSpeed('fast');
          } else if (connection.downlink >= 0.5) {
            setConnectionSpeed('medium');
          } else {
            setConnectionSpeed('slow');
          }
          return;
        }
      }
      
      // Fallback: assume medium speed if API not available
      setConnectionSpeed('medium');
    };

    detectConnectionSpeed();
    
    // Listen for connection changes
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', detectConnectionSpeed);
      return () => connection.removeEventListener('change', detectConnectionSpeed);
    }
  }, []);

  const registerVideo = useCallback((videoId: string, playCallback: () => void, pauseCallback: () => void) => {
    videoCallbacks.current.set(videoId, { play: playCallback, pause: pauseCallback });
    
    // Return cleanup function
    return () => {
      videoCallbacks.current.delete(videoId);
      setPlayingVideos(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    };
  }, []);

  const requestPlay = useCallback((videoId: string): boolean => {
    const currentPlaying = playingVideos.size;
    
    // If already playing, allow it
    if (playingVideos.has(videoId)) {
      return true;
    }
    
    // If at max concurrent videos, pause oldest video
    if (currentPlaying >= MAX_CONCURRENT_VIDEOS) {
      // Pause the first video in the set (oldest)
      const oldestVideoId = Array.from(playingVideos)[0];
      if (oldestVideoId) {
        const callbacks = videoCallbacks.current.get(oldestVideoId);
        if (callbacks) {
          callbacks.pause();
        }
        setPlayingVideos(prev => {
          const next = new Set(prev);
          next.delete(oldestVideoId);
          return next;
        });
      }
    }
    
    // Register this video as playing
    setPlayingVideos(prev => new Set(prev).add(videoId));
    return true;
  }, [playingVideos]);

  const isPlaying = useCallback((videoId: string): boolean => {
    return playingVideos.has(videoId);
  }, [playingVideos]);

  const getConnectionSpeed = useCallback((): 'slow' | 'medium' | 'fast' | 'unknown' => {
    return connectionSpeed;
  }, [connectionSpeed]);

  return (
    <VideoControlContext.Provider
      value={{
        registerVideo,
        requestPlay,
        isPlaying,
        getConnectionSpeed,
      }}
    >
      {children}
    </VideoControlContext.Provider>
  );
}

export function useVideoControl() {
  const context = useContext(VideoControlContext);
  if (context === undefined) {
    throw new Error('useVideoControl must be used within a VideoControlProvider');
  }
  return context;
}
