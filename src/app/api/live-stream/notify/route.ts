import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

/**
 * POST /api/live-stream/notify
 * Send notifications to followers when an artist goes live
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { streamId, artistId, artistName, streamTitle, type } = body;

    if (!streamId || !artistId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: streamId, artistId, type' },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // Get all followers of this artist
    const followsSnapshot = await db
      .collection('follows')
      .where('followingId', '==', artistId)
      .get();

    const followerIds = followsSnapshot.docs.map(doc => doc.data().followerId);

    if (followerIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No followers to notify',
        notificationsSent: 0,
      });
    }

    // Create notification document for each follower
    const batch = db.batch();
    const notificationsRef = db.collection('notifications');
    const timestamp = new Date();

    let notificationMessage = '';
    let notificationTitle = '';

    switch (type) {
      case 'going_live':
        notificationTitle = `${artistName} is live!`;
        notificationMessage = `${artistName} started a live stream: "${streamTitle}"`;
        break;
      case 'reminder':
        notificationTitle = 'Stream Starting Soon';
        notificationMessage = `${artistName}'s stream "${streamTitle}" is starting in 15 minutes`;
        break;
      case 'stream_ended':
        notificationTitle = 'Stream Ended';
        notificationMessage = `${artistName}'s stream "${streamTitle}" has ended`;
        break;
      default:
        notificationTitle = 'Live Stream Update';
        notificationMessage = `Update from ${artistName}`;
    }

    // Create notifications for each follower (batch write)
    for (const followerId of followerIds) {
      const notificationDoc = notificationsRef.doc();
      batch.set(notificationDoc, {
        userId: followerId,
        type: 'live_stream',
        subType: type,
        title: notificationTitle,
        message: notificationMessage,
        data: {
          streamId,
          artistId,
          artistName,
          streamTitle,
        },
        read: false,
        createdAt: timestamp,
      });
    }

    // Also update the stream document to mark notifications as sent
    if (type === 'going_live') {
      const streamRef = db.collection('liveStreams').doc(streamId);
      batch.update(streamRef, {
        notificationsSent: true,
        updatedAt: timestamp,
      });
    } else if (type === 'reminder') {
      const streamRef = db.collection('liveStreams').doc(streamId);
      batch.update(streamRef, {
        reminderSent: true,
        updatedAt: timestamp,
      });
    }

    // Record the notification batch
    const notificationRecordRef = db.collection('streamNotifications').doc();
    batch.set(notificationRecordRef, {
      streamId,
      artistId,
      artistName,
      streamTitle,
      type,
      sentAt: timestamp,
      recipientCount: followerIds.length,
    });

    await batch.commit();

    console.log(`[Live Stream Notify] Sent ${followerIds.length} notifications for stream ${streamId}`);

    return NextResponse.json({
      success: true,
      message: `Notifications sent to ${followerIds.length} followers`,
      notificationsSent: followerIds.length,
    });
  } catch (error) {
    console.error('[Live Stream Notify] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
}
