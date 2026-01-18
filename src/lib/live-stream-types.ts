/**
 * Live Stream Types
 * Types and interfaces for the Go Live / Learn Live feature
 */

export type StreamStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';
export type StreamType = 'qa' | 'class' | 'demo' | 'workshop';

export interface StreamMaterial {
  id: string;
  name: string;
  description?: string;
  affiliateUrl: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  // Track clicks for affiliate analytics
  clickCount: number;
}

export interface LiveStream {
  id: string;
  
  // Artist info
  artistId: string;
  artistName: string;
  artistAvatar?: string;
  artistUsername?: string;
  
  // Stream details
  title: string;
  description?: string;
  streamType: StreamType;
  thumbnailUrl?: string;
  
  // Scheduling
  scheduledStartTime: Date;
  scheduledEndTime?: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  
  // Status
  status: StreamStatus;
  
  // Stream technical info (for integration with streaming provider)
  streamKey?: string;
  playbackUrl?: string;
  rtmpUrl?: string;
  
  // Materials/supplies list with affiliate links
  materials: StreamMaterial[];
  
  // Engagement
  viewerCount: number;
  peakViewerCount: number;
  totalViews: number;
  likes: number;
  
  // Chat/Q&A settings
  chatEnabled: boolean;
  qaEnabled: boolean;
  
  // Monetization
  isFree: boolean;
  price?: number;
  currency?: string;
  
  // Notifications
  notificationsSent: boolean;
  reminderSent: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  
  // Tags for discoverability
  tags?: string[];
  
  // Recording (if artist wants to save)
  recordingEnabled: boolean;
  recordingUrl?: string;
}

export interface StreamViewer {
  id: string;
  streamId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  joinedAt: Date;
  leftAt?: Date;
  // For paid streams
  hasPaid?: boolean;
}

export interface StreamChatMessage {
  id: string;
  streamId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  timestamp: Date;
  isQuestion?: boolean; // For Q&A mode
  isAnswered?: boolean;
  isPinned?: boolean;
}

export interface StreamScheduleFormData {
  title: string;
  description?: string;
  streamType: StreamType;
  scheduledStartTime: Date;
  scheduledEndTime?: Date;
  thumbnailUrl?: string;
  materials: Omit<StreamMaterial, 'id' | 'clickCount'>[];
  chatEnabled: boolean;
  qaEnabled: boolean;
  isFree: boolean;
  price?: number;
  recordingEnabled: boolean;
  tags?: string[];
}

// Notification types for live streams
export interface StreamNotification {
  id: string;
  streamId: string;
  artistId: string;
  artistName: string;
  streamTitle: string;
  type: 'going_live' | 'reminder' | 'stream_ended';
  sentAt: Date;
  // List of user IDs who received this notification
  recipientIds: string[];
}

// For the artist dashboard
export interface ArtistStreamStats {
  totalStreams: number;
  totalViewers: number;
  totalLikes: number;
  totalEarnings: number;
  averageViewerCount: number;
  topStream?: LiveStream;
  affiliateClicks: number;
  affiliateEarnings: number;
}

// Stream type labels for UI
export const STREAM_TYPE_LABELS: Record<StreamType, string> = {
  qa: 'Q&A Session',
  class: 'Live Class',
  demo: 'Art Demo',
  workshop: 'Workshop',
};

// Stream status labels for UI
export const STREAM_STATUS_LABELS: Record<StreamStatus, string> = {
  scheduled: 'Scheduled',
  live: 'Live Now',
  ended: 'Ended',
  cancelled: 'Cancelled',
};
