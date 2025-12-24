import { db } from './firebase';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

/**
 * Track an ad click
 */
export async function trackAdClick(
  campaignId: string,
  userId: string | undefined,
  placement: 'news' | 'discover' | 'learn'
): Promise<void> {
  try {
    // Record the click
    await addDoc(collection(db, 'adClicks'), {
      campaignId,
      userId: userId || null,
      placement,
      clickedAt: serverTimestamp(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
      // Note: IP address would need to be captured server-side for privacy/security
    });

    // Increment click count on campaign
    await updateDoc(doc(db, 'adCampaigns', campaignId), {
      clicks: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error tracking ad click:', error);
    throw error;
  }
}

/**
 * Track an ad impression (view)
 */
export async function trackAdImpression(
  campaignId: string,
  userId: string | undefined,
  placement: 'news' | 'discover' | 'learn'
): Promise<void> {
  try {
    // Increment impression count on campaign
    await updateDoc(doc(db, 'adCampaigns', campaignId), {
      impressions: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error tracking ad impression:', error);
    // Don't throw - impressions are less critical than clicks
  }
}
