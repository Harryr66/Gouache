/**
 * Live Stream Service
 * Firestore operations for the Go Live / Learn Live feature
 */

import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import {
  LiveStream,
  StreamMaterial,
  StreamChatMessage,
  StreamViewer,
  StreamScheduleFormData,
  StreamStatus,
} from './live-stream-types';

// Collection references
const STREAMS_COLLECTION = 'liveStreams';
const CHAT_COLLECTION = 'streamChat';
const VIEWERS_COLLECTION = 'streamViewers';

// Helper to convert Firestore timestamp to Date
const toDate = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  return new Date();
};

// Helper to convert LiveStream from Firestore
const convertStream = (doc: any): LiveStream => {
  const data = doc.data();
  return {
    id: doc.id,
    artistId: data.artistId || '',
    artistName: data.artistName || '',
    artistAvatar: data.artistAvatar,
    artistUsername: data.artistUsername,
    title: data.title || '',
    description: data.description,
    streamType: data.streamType || 'class',
    thumbnailUrl: data.thumbnailUrl,
    scheduledStartTime: toDate(data.scheduledStartTime),
    scheduledEndTime: data.scheduledEndTime ? toDate(data.scheduledEndTime) : undefined,
    actualStartTime: data.actualStartTime ? toDate(data.actualStartTime) : undefined,
    actualEndTime: data.actualEndTime ? toDate(data.actualEndTime) : undefined,
    status: data.status || 'scheduled',
    streamKey: data.streamKey,
    playbackUrl: data.playbackUrl,
    rtmpUrl: data.rtmpUrl,
    materials: data.materials || [],
    viewerCount: data.viewerCount || 0,
    peakViewerCount: data.peakViewerCount || 0,
    totalViews: data.totalViews || 0,
    likes: data.likes || 0,
    chatEnabled: data.chatEnabled ?? true,
    qaEnabled: data.qaEnabled ?? true,
    isFree: data.isFree ?? true,
    price: data.price,
    currency: data.currency || 'USD',
    notificationsSent: data.notificationsSent || false,
    reminderSent: data.reminderSent || false,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    tags: data.tags || [],
    recordingEnabled: data.recordingEnabled ?? false,
    recordingUrl: data.recordingUrl,
  };
};

/**
 * Create a new scheduled live stream
 */
export async function createLiveStream(
  artistId: string,
  artistName: string,
  artistAvatar: string | undefined,
  artistUsername: string | undefined,
  formData: StreamScheduleFormData
): Promise<string> {
  const materials: StreamMaterial[] = formData.materials.map((m, index) => ({
    ...m,
    id: `material_${Date.now()}_${index}`,
    clickCount: 0,
  }));

  const streamData = {
    artistId,
    artistName,
    artistAvatar,
    artistUsername,
    title: formData.title,
    description: formData.description || '',
    streamType: formData.streamType,
    thumbnailUrl: formData.thumbnailUrl || '',
    scheduledStartTime: Timestamp.fromDate(formData.scheduledStartTime),
    scheduledEndTime: formData.scheduledEndTime
      ? Timestamp.fromDate(formData.scheduledEndTime)
      : null,
    status: 'scheduled' as StreamStatus,
    materials,
    viewerCount: 0,
    peakViewerCount: 0,
    totalViews: 0,
    likes: 0,
    chatEnabled: formData.chatEnabled,
    qaEnabled: formData.qaEnabled,
    isFree: formData.isFree,
    price: formData.price || 0,
    currency: 'USD',
    notificationsSent: false,
    reminderSent: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    tags: formData.tags || [],
    recordingEnabled: formData.recordingEnabled,
  };

  const docRef = await addDoc(collection(db, STREAMS_COLLECTION), streamData);
  return docRef.id;
}

/**
 * Start a live stream (go live)
 */
export async function startLiveStream(streamId: string): Promise<void> {
  const streamRef = doc(db, STREAMS_COLLECTION, streamId);
  const streamDoc = await getDoc(streamRef);
  
  if (!streamDoc.exists()) {
    throw new Error('Stream not found');
  }
  
  const streamData = streamDoc.data();
  
  await updateDoc(streamRef, {
    status: 'live',
    actualStartTime: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  // Send notifications to followers (fire and forget)
  if (!streamData.notificationsSent) {
    fetch('/api/live-stream/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        streamId,
        artistId: streamData.artistId,
        artistName: streamData.artistName,
        streamTitle: streamData.title,
        type: 'going_live',
      }),
    }).catch(err => console.error('Failed to send live notifications:', err));
  }
}

/**
 * End a live stream
 */
export async function endLiveStream(streamId: string): Promise<void> {
  const streamRef = doc(db, STREAMS_COLLECTION, streamId);
  await updateDoc(streamRef, {
    status: 'ended',
    actualEndTime: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Cancel a scheduled stream
 */
export async function cancelLiveStream(streamId: string): Promise<void> {
  const streamRef = doc(db, STREAMS_COLLECTION, streamId);
  await updateDoc(streamRef, {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get a single stream by ID
 */
export async function getLiveStream(streamId: string): Promise<LiveStream | null> {
  const streamRef = doc(db, STREAMS_COLLECTION, streamId);
  const streamDoc = await getDoc(streamRef);
  
  if (!streamDoc.exists()) {
    return null;
  }
  
  return convertStream(streamDoc);
}

/**
 * Get all upcoming/scheduled streams
 */
export async function getScheduledStreams(limitCount: number = 20): Promise<LiveStream[]> {
  const now = Timestamp.now();
  const q = query(
    collection(db, STREAMS_COLLECTION),
    where('status', '==', 'scheduled'),
    where('scheduledStartTime', '>=', now),
    orderBy('scheduledStartTime', 'asc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(convertStream);
}

/**
 * Get all currently live streams
 */
export async function getLiveStreams(): Promise<LiveStream[]> {
  const q = query(
    collection(db, STREAMS_COLLECTION),
    where('status', '==', 'live'),
    orderBy('viewerCount', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(convertStream);
}

/**
 * Get streams by artist ID
 */
export async function getArtistStreams(artistId: string): Promise<LiveStream[]> {
  const q = query(
    collection(db, STREAMS_COLLECTION),
    where('artistId', '==', artistId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(convertStream);
}

/**
 * Get past/ended streams (for recordings/replays)
 */
export async function getPastStreams(limitCount: number = 20): Promise<LiveStream[]> {
  const q = query(
    collection(db, STREAMS_COLLECTION),
    where('status', '==', 'ended'),
    where('recordingUrl', '!=', ''),
    orderBy('recordingUrl'),
    orderBy('actualEndTime', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(convertStream);
}

/**
 * Update stream viewer count
 */
export async function updateViewerCount(streamId: string, count: number): Promise<void> {
  const streamRef = doc(db, STREAMS_COLLECTION, streamId);
  const streamDoc = await getDoc(streamRef);
  
  if (streamDoc.exists()) {
    const currentPeak = streamDoc.data().peakViewerCount || 0;
    await updateDoc(streamRef, {
      viewerCount: count,
      peakViewerCount: count > currentPeak ? count : currentPeak,
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Increment total views
 */
export async function incrementTotalViews(streamId: string): Promise<void> {
  const streamRef = doc(db, STREAMS_COLLECTION, streamId);
  await updateDoc(streamRef, {
    totalViews: increment(1),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Like a stream
 */
export async function likeStream(streamId: string): Promise<void> {
  const streamRef = doc(db, STREAMS_COLLECTION, streamId);
  await updateDoc(streamRef, {
    likes: increment(1),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Track affiliate link click
 */
export async function trackMaterialClick(
  streamId: string,
  materialId: string
): Promise<void> {
  const streamRef = doc(db, STREAMS_COLLECTION, streamId);
  const streamDoc = await getDoc(streamRef);
  
  if (streamDoc.exists()) {
    const materials = streamDoc.data().materials || [];
    const updatedMaterials = materials.map((m: StreamMaterial) => {
      if (m.id === materialId) {
        return { ...m, clickCount: (m.clickCount || 0) + 1 };
      }
      return m;
    });
    
    await updateDoc(streamRef, {
      materials: updatedMaterials,
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Update stream materials
 */
export async function updateStreamMaterials(
  streamId: string,
  materials: StreamMaterial[]
): Promise<void> {
  const streamRef = doc(db, STREAMS_COLLECTION, streamId);
  await updateDoc(streamRef, {
    materials,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Add a chat message
 */
export async function addChatMessage(
  streamId: string,
  userId: string,
  userName: string,
  userAvatar: string | undefined,
  message: string,
  isQuestion: boolean = false
): Promise<string> {
  const chatData = {
    streamId,
    userId,
    userName,
    userAvatar,
    message,
    timestamp: serverTimestamp(),
    isQuestion,
    isAnswered: false,
    isPinned: false,
  };
  
  const docRef = await addDoc(
    collection(db, STREAMS_COLLECTION, streamId, CHAT_COLLECTION),
    chatData
  );
  return docRef.id;
}

/**
 * Subscribe to chat messages (real-time)
 */
export function subscribeToChatMessages(
  streamId: string,
  callback: (messages: StreamChatMessage[]) => void
): () => void {
  const q = query(
    collection(db, STREAMS_COLLECTION, streamId, CHAT_COLLECTION),
    orderBy('timestamp', 'asc'),
    limit(100)
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages: StreamChatMessage[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        streamId: data.streamId,
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        message: data.message,
        timestamp: toDate(data.timestamp),
        isQuestion: data.isQuestion || false,
        isAnswered: data.isAnswered || false,
        isPinned: data.isPinned || false,
      };
    });
    callback(messages);
  });
}

/**
 * Subscribe to stream updates (real-time)
 */
export function subscribeToStream(
  streamId: string,
  callback: (stream: LiveStream | null) => void
): () => void {
  const streamRef = doc(db, STREAMS_COLLECTION, streamId);
  
  return onSnapshot(streamRef, (doc) => {
    if (doc.exists()) {
      callback(convertStream(doc));
    } else {
      callback(null);
    }
  });
}

/**
 * Subscribe to live streams (real-time)
 */
export function subscribeToLiveStreams(
  callback: (streams: LiveStream[]) => void
): () => void {
  const q = query(
    collection(db, STREAMS_COLLECTION),
    where('status', '==', 'live'),
    orderBy('viewerCount', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const streams = snapshot.docs.map(convertStream);
    callback(streams);
  });
}

/**
 * Mark notifications as sent
 */
export async function markNotificationsSent(streamId: string): Promise<void> {
  const streamRef = doc(db, STREAMS_COLLECTION, streamId);
  await updateDoc(streamRef, {
    notificationsSent: true,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Mark reminder as sent
 */
export async function markReminderSent(streamId: string): Promise<void> {
  const streamRef = doc(db, STREAMS_COLLECTION, streamId);
  await updateDoc(streamRef, {
    reminderSent: true,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a stream (only if scheduled, not started)
 */
export async function deleteLiveStream(streamId: string): Promise<void> {
  const streamRef = doc(db, STREAMS_COLLECTION, streamId);
  const streamDoc = await getDoc(streamRef);
  
  if (streamDoc.exists()) {
    const status = streamDoc.data().status;
    if (status === 'scheduled') {
      await deleteDoc(streamRef);
    } else {
      throw new Error('Cannot delete a stream that has already started');
    }
  }
}
