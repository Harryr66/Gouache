'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './auth-provider';
import { useToast } from '@/hooks/use-toast';
import {
  LiveStream,
  StreamScheduleFormData,
  StreamChatMessage,
} from '@/lib/live-stream-types';
import {
  createLiveStream,
  startLiveStream,
  endLiveStream,
  cancelLiveStream,
  getLiveStream,
  getScheduledStreams,
  getLiveStreams,
  getArtistStreams,
  getPastStreams,
  likeStream,
  trackMaterialClick,
  updateStreamMaterials,
  addChatMessage,
  subscribeToChatMessages,
  subscribeToStream,
  subscribeToLiveStreams,
  deleteLiveStream,
} from '@/lib/live-stream-service';

interface LiveStreamContextType {
  // State
  liveStreams: LiveStream[];
  scheduledStreams: LiveStream[];
  myStreams: LiveStream[];
  currentStream: LiveStream | null;
  chatMessages: StreamChatMessage[];
  isLoading: boolean;
  
  // Stream operations
  scheduleStream: (formData: StreamScheduleFormData) => Promise<string | null>;
  goLive: (streamId: string) => Promise<boolean>;
  endStream: (streamId: string) => Promise<boolean>;
  cancelStream: (streamId: string) => Promise<boolean>;
  deleteStream: (streamId: string) => Promise<boolean>;
  
  // Viewer operations
  joinStream: (streamId: string) => void;
  leaveStream: () => void;
  sendChatMessage: (message: string, isQuestion?: boolean) => Promise<boolean>;
  likeCurrentStream: () => Promise<boolean>;
  clickMaterial: (materialId: string) => Promise<void>;
  
  // Fetch operations
  refreshLiveStreams: () => Promise<void>;
  refreshScheduledStreams: () => Promise<void>;
  refreshMyStreams: () => Promise<void>;
  getStreamById: (streamId: string) => Promise<LiveStream | null>;
}

const LiveStreamContext = createContext<LiveStreamContextType | undefined>(undefined);

export const LiveStreamProvider = ({ children }: { children: ReactNode }) => {
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [scheduledStreams, setScheduledStreams] = useState<LiveStream[]>([]);
  const [myStreams, setMyStreams] = useState<LiveStream[]>([]);
  const [currentStream, setCurrentStream] = useState<LiveStream | null>(null);
  const [chatMessages, setChatMessages] = useState<StreamChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  // Real-time subscription refs
  const [streamUnsubscribe, setStreamUnsubscribe] = useState<(() => void) | null>(null);
  const [chatUnsubscribe, setChatUnsubscribe] = useState<(() => void) | null>(null);
  
  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [live, scheduled] = await Promise.all([
          getLiveStreams(),
          getScheduledStreams(),
        ]);
        setLiveStreams(live);
        setScheduledStreams(scheduled);
        
        // Load user's streams if logged in
        if (user?.uid) {
          const myStreamsList = await getArtistStreams(user.uid);
          setMyStreams(myStreamsList);
        }
      } catch (error) {
        console.error('Error loading live streams:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
    
    // Subscribe to live streams updates
    const unsubscribe = subscribeToLiveStreams((streams) => {
      setLiveStreams(streams);
    });
    
    return () => {
      unsubscribe();
    };
  }, [user?.uid]);
  
  // Refresh functions
  const refreshLiveStreams = useCallback(async () => {
    try {
      const live = await getLiveStreams();
      setLiveStreams(live);
    } catch (error) {
      console.error('Error refreshing live streams:', error);
    }
  }, []);
  
  const refreshScheduledStreams = useCallback(async () => {
    try {
      const scheduled = await getScheduledStreams();
      setScheduledStreams(scheduled);
    } catch (error) {
      console.error('Error refreshing scheduled streams:', error);
    }
  }, []);
  
  const refreshMyStreams = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const myStreamsList = await getArtistStreams(user.uid);
      setMyStreams(myStreamsList);
    } catch (error) {
      console.error('Error refreshing my streams:', error);
    }
  }, [user?.uid]);
  
  const getStreamById = useCallback(async (streamId: string) => {
    try {
      return await getLiveStream(streamId);
    } catch (error) {
      console.error('Error getting stream:', error);
      return null;
    }
  }, []);
  
  // Schedule a new stream
  const scheduleStream = useCallback(async (formData: StreamScheduleFormData): Promise<string | null> => {
    if (!user?.uid || !profile) {
      toast({
        title: 'Error',
        description: 'You must be logged in to schedule a stream',
        variant: 'destructive',
      });
      return null;
    }
    
    try {
      const streamId = await createLiveStream(
        user.uid,
        profile.displayName || profile.username || 'Artist',
        profile.profileImage,
        profile.username,
        formData
      );
      
      toast({
        title: 'Stream Scheduled',
        description: 'Your live stream has been scheduled successfully!',
      });
      
      await refreshMyStreams();
      await refreshScheduledStreams();
      
      return streamId;
    } catch (error) {
      console.error('Error scheduling stream:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule stream. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  }, [user?.uid, profile, toast, refreshMyStreams, refreshScheduledStreams]);
  
  // Go live
  const goLive = useCallback(async (streamId: string): Promise<boolean> => {
    try {
      await startLiveStream(streamId);
      toast({
        title: "You're Live!",
        description: 'Your stream is now live. Your followers have been notified.',
      });
      await refreshMyStreams();
      return true;
    } catch (error) {
      console.error('Error starting stream:', error);
      toast({
        title: 'Error',
        description: 'Failed to start stream. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, refreshMyStreams]);
  
  // End stream
  const endStream = useCallback(async (streamId: string): Promise<boolean> => {
    try {
      await endLiveStream(streamId);
      toast({
        title: 'Stream Ended',
        description: 'Your live stream has ended.',
      });
      await refreshMyStreams();
      return true;
    } catch (error) {
      console.error('Error ending stream:', error);
      toast({
        title: 'Error',
        description: 'Failed to end stream. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, refreshMyStreams]);
  
  // Cancel stream
  const cancelStream = useCallback(async (streamId: string): Promise<boolean> => {
    try {
      await cancelLiveStream(streamId);
      toast({
        title: 'Stream Cancelled',
        description: 'Your scheduled stream has been cancelled.',
      });
      await refreshMyStreams();
      await refreshScheduledStreams();
      return true;
    } catch (error) {
      console.error('Error cancelling stream:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel stream. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, refreshMyStreams, refreshScheduledStreams]);
  
  // Delete stream
  const deleteStream = useCallback(async (streamId: string): Promise<boolean> => {
    try {
      await deleteLiveStream(streamId);
      toast({
        title: 'Stream Deleted',
        description: 'Your scheduled stream has been deleted.',
      });
      await refreshMyStreams();
      await refreshScheduledStreams();
      return true;
    } catch (error) {
      console.error('Error deleting stream:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete stream. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, refreshMyStreams, refreshScheduledStreams]);
  
  // Join a stream as viewer
  const joinStream = useCallback((streamId: string) => {
    // Unsubscribe from previous stream if any
    if (streamUnsubscribe) streamUnsubscribe();
    if (chatUnsubscribe) chatUnsubscribe();
    
    // Subscribe to stream updates
    const unsubStream = subscribeToStream(streamId, (stream) => {
      setCurrentStream(stream);
    });
    setStreamUnsubscribe(() => unsubStream);
    
    // Subscribe to chat messages
    const unsubChat = subscribeToChatMessages(streamId, (messages) => {
      setChatMessages(messages);
    });
    setChatUnsubscribe(() => unsubChat);
  }, [streamUnsubscribe, chatUnsubscribe]);
  
  // Leave stream
  const leaveStream = useCallback(() => {
    if (streamUnsubscribe) {
      streamUnsubscribe();
      setStreamUnsubscribe(null);
    }
    if (chatUnsubscribe) {
      chatUnsubscribe();
      setChatUnsubscribe(null);
    }
    setCurrentStream(null);
    setChatMessages([]);
  }, [streamUnsubscribe, chatUnsubscribe]);
  
  // Send chat message
  const sendChatMessage = useCallback(async (message: string, isQuestion: boolean = false): Promise<boolean> => {
    if (!currentStream || !user?.uid || !profile) {
      return false;
    }
    
    try {
      await addChatMessage(
        currentStream.id,
        user.uid,
        profile.displayName || profile.username || 'User',
        profile.profileImage,
        message,
        isQuestion
      );
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, [currentStream, user?.uid, profile]);
  
  // Like current stream
  const likeCurrentStream = useCallback(async (): Promise<boolean> => {
    if (!currentStream) return false;
    
    try {
      await likeStream(currentStream.id);
      return true;
    } catch (error) {
      console.error('Error liking stream:', error);
      return false;
    }
  }, [currentStream]);
  
  // Track material click
  const clickMaterial = useCallback(async (materialId: string): Promise<void> => {
    if (!currentStream) return;
    
    try {
      await trackMaterialClick(currentStream.id, materialId);
    } catch (error) {
      console.error('Error tracking material click:', error);
    }
  }, [currentStream]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamUnsubscribe) streamUnsubscribe();
      if (chatUnsubscribe) chatUnsubscribe();
    };
  }, [streamUnsubscribe, chatUnsubscribe]);
  
  const value: LiveStreamContextType = {
    liveStreams,
    scheduledStreams,
    myStreams,
    currentStream,
    chatMessages,
    isLoading,
    scheduleStream,
    goLive,
    endStream,
    cancelStream,
    deleteStream,
    joinStream,
    leaveStream,
    sendChatMessage,
    likeCurrentStream,
    clickMaterial,
    refreshLiveStreams,
    refreshScheduledStreams,
    refreshMyStreams,
    getStreamById,
  };
  
  return (
    <LiveStreamContext.Provider value={value}>
      {children}
    </LiveStreamContext.Provider>
  );
};

export const useLiveStream = () => {
  const context = useContext(LiveStreamContext);
  if (context === undefined) {
    throw new Error('useLiveStream must be used within a LiveStreamProvider');
  }
  return context;
};
