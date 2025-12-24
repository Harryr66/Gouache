import { db } from './firebase';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, getDoc } from 'firebase/firestore';

/**
 * Track an ad click
 */
export async function trackAdClick(
  campaignId: string,
  userId: string | undefined,
  placement: 'news' | 'discover' | 'learn'
): Promise<void> {
  try {
    // Get campaign to check budget and cost per click
    const campaignDoc = await getDoc(doc(db, 'adCampaigns', campaignId));
    if (!campaignDoc.exists()) {
      console.error('Campaign not found:', campaignId);
      return;
    }

    const campaignData = campaignDoc.data();
    const costPerClick = campaignData.costPerClick || 0;
    const currentSpent = campaignData.spent || 0;
    const budget = campaignData.budget;

    // Calculate new spent amount
    const newSpent = currentSpent + costPerClick;

    // Check if budget would be exceeded
    const wouldExceedBudget = budget && newSpent >= budget;

    // Record the click
    await addDoc(collection(db, 'adClicks'), {
      campaignId,
      userId: userId || null,
      placement,
      clickedAt: serverTimestamp(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
      // Note: IP address would need to be captured server-side for privacy/security
    });

    // Update campaign
    const updateData: any = {
      clicks: increment(1),
      updatedAt: serverTimestamp(),
    };

    // Only update spent if budget allows
    if (!wouldExceedBudget) {
      updateData.spent = newSpent;
    } else {
      // Budget exceeded - deactivate campaign
      updateData.isActive = false;
      updateData.spent = budget; // Cap at budget
    }

    await updateDoc(doc(db, 'adCampaigns', campaignId), updateData);
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
    // Get campaign to check budget and cost per impression
    const campaignDoc = await getDoc(doc(db, 'adCampaigns', campaignId));
    if (!campaignDoc.exists()) {
      console.error('Campaign not found:', campaignId);
      return;
    }

    const campaignData = campaignDoc.data();
    const costPerImpression = campaignData.costPerImpression || 0;
    const currentSpent = campaignData.spent || 0;
    const budget = campaignData.budget;

    // Calculate new spent amount
    const newSpent = currentSpent + costPerImpression;

    // Check if budget would be exceeded
    const wouldExceedBudget = budget && newSpent >= budget;

    // Update campaign
    const updateData: any = {
      impressions: increment(1),
      updatedAt: serverTimestamp(),
    };

    // Only update spent if budget allows
    if (!wouldExceedBudget) {
      updateData.spent = newSpent;
    } else {
      // Budget exceeded - deactivate campaign
      updateData.isActive = false;
      updateData.spent = budget; // Cap at budget
    }

    await updateDoc(doc(db, 'adCampaigns', campaignId), updateData);
  } catch (error) {
    console.error('Error tracking ad impression:', error);
    // Don't throw - impressions are less critical than clicks
  }
}
