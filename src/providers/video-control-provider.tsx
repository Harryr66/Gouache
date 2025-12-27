'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface VideoControlContextType {
  registerVideo: (videoId: string, playCallback: () => void, pauseCallback: () => void, onEnded?: () => void) => () => void;
  requestPlay: (videoId: string) => boolean;
  isPlaying: (videoId: string) => boolean;
  getConnectionSpeed: () => 'slow' | 'medium' | 'fast' | 'unknown';
  registerVisibleVideo: (videoId: string) => void;
  unregisterVisibleVideo: (videoId: string) => void;
  canAutoplay: (videoId: string) => boolean; // Returns true if video can autoplay (50% rule)
  handleVideoEnded: (videoId: string) => void; // Call when video ends to trigger next in queue
}

const VideoControlContext = createContext<VideoControlContextType | undefined>(undefined);

const MAX_CONCURRENT_VIDEOS = 3;

export function VideoControlProvider({ children }: { children: React.ReactNode }) {
  const [playingVideos, setPlayingVideos] = useState<Set<string>>(new Set());
  const videoCallbacks = useRef<Map<string, { play: () => void; pause: () => void; onEnded?: () => void }>>(new Map());
  const [visibleVideos, setVisibleVideos] = useState<Set<string>>(new Set());
  const videoQueue = useRef<string[]>([]);
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'medium' | 'fast' | 'unknown'>('unknown');
  const pendingAutoplayChecks = useRef<Set<string>>(new Set());

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

  const registerVideo = useCallback((videoId: string, playCallback: () => void, pauseCallback: () => void, onEnded?: () => void) => {
    videoCallbacks.current.set(videoId, { play: playCallback, pause: pauseCallback, onEnded });
    
    // Return cleanup function
    return () => {
      videoCallbacks.current.delete(videoId);
      setPlayingVideos(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
      // Remove from queue if present
      videoQueue.current = videoQueue.current.filter(id => id !== videoId);
    };
  }, []);
  
  const registerVisibleVideo = useCallback((videoId: string) => {
    setVisibleVideos(prev => {
      const next = new Set(prev);
      if (!next.has(videoId)) {
        next.add(videoId);
      }
      return next;
    });
  }, []);
  
  const unregisterVisibleVideo = useCallback((videoId: string) => {
    setVisibleVideos(prev => {
      const next = new Set(prev);
      next.delete(videoId);
      return next;
    });
    // Remove from queue if present
    videoQueue.current = videoQueue.current.filter(id => id !== videoId);
  }, []);
  
  const canAutoplay = useCallback((videoId: string): boolean => {
    // Check if this video is already playing
    if (playingVideos.has(videoId)) {
      return true;
    }
    
    // Only allow autoplay for 50% of visible videos
    const visibleCount = visibleVideos.size;
    
    // If no visible videos registered yet, check if this video is in the process of registering
    // Allow first video to autoplay immediately
    if (visibleCount === 0) {
      // If this video is trying to autoplay, it should be visible - allow it
      // This handles the case where videos register and try to autoplay simultaneously
      return true; // First video can always autoplay
    }
    
    // Calculate 50% of visible videos (rounded up)
    const maxAutoplay = Math.ceil(visibleCount * 0.5);
    const currentlyPlaying = playingVideos.size;
    
    // Check if we can add another autoplay video
    return currentlyPlaying < maxAutoplay;
  }, [visibleVideos, playingVideos]);
  
  // Handle video ended - play next in queue
  const handleVideoEnded = useCallback((videoId: string) => {
    // Remove from playing set
    setPlayingVideos(prev => {
      const next = new Set(prev);
      next.delete(videoId);
      return next;
    });
    
    // Call onEnded callback if registered
    const callbacks = videoCallbacks.current.get(videoId);
    if (callbacks?.onEnded) {
      callbacks.onEnded();
    }
    
    // Play next video in queue if available
    if (videoQueue.current.length > 0) {
      const nextVideoId = videoQueue.current.shift();
      if (nextVideoId) {
        const nextCallbacks = videoCallbacks.current.get(nextVideoId);
        if (nextCallbacks && canAutoplay(nextVideoId)) {
          nextCallbacks.play();
          setPlayingVideos(prev => new Set(prev).add(nextVideoId));
        } else if (nextVideoId) {
          // If can't autoplay, add back to queue
          videoQueue.current.unshift(nextVideoId);
        }
      }
    }
  }, [canAutoplay]);

  const requestPlay = useCallback((videoId: string): boolean => {
    // If already playing, allow it
    if (playingVideos.has(videoId)) {
      return true;
    }
    
    // Check if we can autoplay (50% rule)
    if (!canAutoplay(videoId)) {
      // Add to queue instead of playing immediately
      if (!videoQueue.current.includes(videoId)) {
        videoQueue.current.push(videoId);
      }
      return false;
    }
    
    // If at max concurrent videos, pause oldest video
    const currentPlaying = playingVideos.size;
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
        // Add to queue
        if (!videoQueue.current.includes(oldestVideoId)) {
          videoQueue.current.push(oldestVideoId);
        }
      }
    }
    
    // Register this video as playing
    setPlayingVideos(prev => new Set(prev).add(videoId));
    // Remove from queue if present
    videoQueue.current = videoQueue.current.filter(id => id !== videoId);
    return true;
  }, [playingVideos, canAutoplay]);

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
        registerVisibleVideo,
        unregisterVisibleVideo,
        canAutoplay,
        handleVideoEnded,
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
