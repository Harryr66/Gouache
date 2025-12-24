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
    const currentDailySpent = campaignData.dailySpent || 0;
    const budget = campaignData.budget;
    const dailyBudget = campaignData.dailyBudget;
    const uncappedBudget = campaignData.uncappedBudget || false;
    const lastSpentReset = campaignData.lastSpentReset?.toDate?.() || new Date();
    const now = new Date();
    
    // Check if we need to reset daily spent (new day)
    const needsDailyReset = now.toDateString() !== lastSpentReset.toDateString();
    const dailySpentToUse = needsDailyReset ? 0 : currentDailySpent;
    
    // Calculate new spent amounts
    const newSpent = currentSpent + costPerClick;
    const newDailySpent = dailySpentToUse + costPerClick;

    // Check budget limits
    const wouldExceedBudget = !uncappedBudget && budget && newSpent >= budget;
    const wouldExceedDailyBudget = dailyBudget && newDailySpent >= dailyBudget;

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

    // Update spending if within limits
    if (!wouldExceedBudget && !wouldExceedDailyBudget) {
      updateData.spent = newSpent;
      updateData.dailySpent = newDailySpent;
      if (needsDailyReset) {
        updateData.lastSpentReset = serverTimestamp();
      }
    } else {
      // Budget exceeded - deactivate campaign
      updateData.isActive = false;
      if (wouldExceedBudget) {
        updateData.spent = budget; // Cap at budget
      }
      if (wouldExceedDailyBudget) {
        updateData.dailySpent = dailyBudget; // Cap at daily budget
      }
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
    const currentDailySpent = campaignData.dailySpent || 0;
    const budget = campaignData.budget;
    const dailyBudget = campaignData.dailyBudget;
    const uncappedBudget = campaignData.uncappedBudget || false;
    const lastSpentReset = campaignData.lastSpentReset?.toDate?.() || new Date();
    const now = new Date();
    
    // Check if we need to reset daily spent (new day)
    const needsDailyReset = now.toDateString() !== lastSpentReset.toDateString();
    const dailySpentToUse = needsDailyReset ? 0 : currentDailySpent;
    
    // Calculate new spent amounts
    const newSpent = currentSpent + costPerImpression;
    const newDailySpent = dailySpentToUse + costPerImpression;

    // Check budget limits
    const wouldExceedBudget = !uncappedBudget && budget && newSpent >= budget;
    const wouldExceedDailyBudget = dailyBudget && newDailySpent >= dailyBudget;

    // Update campaign
    const updateData: any = {
      impressions: increment(1),
      updatedAt: serverTimestamp(),
    };

    // Update spending if within limits
    if (!wouldExceedBudget && !wouldExceedDailyBudget) {
      updateData.spent = newSpent;
      updateData.dailySpent = newDailySpent;
      if (needsDailyReset) {
        updateData.lastSpentReset = serverTimestamp();
      }
    } else {
      // Budget exceeded - deactivate campaign
      updateData.isActive = false;
      if (wouldExceedBudget) {
        updateData.spent = budget; // Cap at budget
      }
      if (wouldExceedDailyBudget) {
        updateData.dailySpent = dailyBudget; // Cap at daily budget
      }
    }

    await updateDoc(doc(db, 'adCampaigns', campaignId), updateData);
  } catch (error) {
    console.error('Error tracking ad impression:', error);
    // Don't throw - impressions are less critical than clicks
  }
}
