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
    // Get campaign to check budget and billing model
    const campaignDoc = await getDoc(doc(db, 'adCampaigns', campaignId));
    if (!campaignDoc.exists()) {
      console.error('Campaign not found:', campaignId);
      return;
    }

    const campaignData = campaignDoc.data();
    const billingModel = campaignData.billingModel || 'cpc'; // Default to CPC for legacy
    const costPerClick = campaignData.costPerClick || 0;
    const currentSpent = campaignData.spent || 0;
    const currentDailySpent = campaignData.dailySpent || 0;
    const budget = campaignData.budget;
    const dailyBudget = campaignData.dailyBudget;
    const uncappedBudget = campaignData.uncappedBudget || false;
    
    // Only charge for clicks if billing model is CPC
    const chargeAmount = billingModel === 'cpc' ? costPerClick : 0;
    
    // Handle lastSpentReset date conversion
    let lastSpentResetDate: Date;
    if (campaignData.lastSpentReset) {
      if (campaignData.lastSpentReset instanceof Date) {
        lastSpentResetDate = campaignData.lastSpentReset;
      } else if (campaignData.lastSpentReset.toDate) {
        lastSpentResetDate = campaignData.lastSpentReset.toDate();
      } else {
        lastSpentResetDate = new Date(campaignData.lastSpentReset);
      }
    } else {
      lastSpentResetDate = new Date();
    }
    
    const now = new Date();
    
    // Check if we need to reset daily spent (new day)
    const needsDailyReset = now.toDateString() !== lastSpentResetDate.toDateString();
    const dailySpentToUse = needsDailyReset ? 0 : currentDailySpent;
    
    // Calculate new spent amounts
    const newSpent = currentSpent + chargeAmount;
    const newDailySpent = dailySpentToUse + chargeAmount;

    // Check budget limits (only if we're charging)
    const wouldExceedBudget = chargeAmount > 0 && !uncappedBudget && budget && newSpent >= budget;
    const wouldExceedDailyBudget = chargeAmount > 0 && dailyBudget && newDailySpent >= dailyBudget;

    // Record the click
    await addDoc(collection(db, 'adClicks'), {
      campaignId,
      userId: userId || null,
      placement,
      clickedAt: serverTimestamp(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
    });

    // Update campaign
    const updateData: any = {
      clicks: increment(1),
      updatedAt: serverTimestamp(),
    };

    // Only update spending if billing model is CPC
    if (chargeAmount > 0) {
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
    // Get campaign to check budget and billing model
    const campaignDoc = await getDoc(doc(db, 'adCampaigns', campaignId));
    if (!campaignDoc.exists()) {
      console.error('Campaign not found:', campaignId);
      return;
    }

    const campaignData = campaignDoc.data();
    const billingModel = campaignData.billingModel || 'cpc'; // Default to CPC for legacy
    const costPerImpression = campaignData.costPerImpression || 0;
    const currentSpent = campaignData.spent || 0;
    const currentDailySpent = campaignData.dailySpent || 0;
    const budget = campaignData.budget;
    const dailyBudget = campaignData.dailyBudget;
    const uncappedBudget = campaignData.uncappedBudget || false;
    
    // Only charge for impressions if billing model is CPM
    const chargeAmount = billingModel === 'cpm' ? costPerImpression : 0;
    
    // Handle lastSpentReset date conversion
    let lastSpentResetDate: Date;
    if (campaignData.lastSpentReset) {
      if (campaignData.lastSpentReset instanceof Date) {
        lastSpentResetDate = campaignData.lastSpentReset;
      } else if (campaignData.lastSpentReset.toDate) {
        lastSpentResetDate = campaignData.lastSpentReset.toDate();
      } else {
        lastSpentResetDate = new Date(campaignData.lastSpentReset);
      }
    } else {
      lastSpentResetDate = new Date();
    }
    
    const now = new Date();
    
    // Check if we need to reset daily spent (new day)
    const needsDailyReset = now.toDateString() !== lastSpentResetDate.toDateString();
    const dailySpentToUse = needsDailyReset ? 0 : currentDailySpent;
    
    // Calculate new spent amounts
    const newSpent = currentSpent + chargeAmount;
    const newDailySpent = dailySpentToUse + chargeAmount;

    // Check budget limits (only if we're charging)
    const wouldExceedBudget = chargeAmount > 0 && !uncappedBudget && budget && newSpent >= budget;
    const wouldExceedDailyBudget = chargeAmount > 0 && dailyBudget && newDailySpent >= dailyBudget;

    // Update campaign
    const updateData: any = {
      impressions: increment(1),
      updatedAt: serverTimestamp(),
    };

    // Only update spending if billing model is CPM
    if (chargeAmount > 0) {
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
    }

    await updateDoc(doc(db, 'adCampaigns', campaignId), updateData);
  } catch (error) {
    console.error('Error tracking ad impression:', error);
    // Don't throw - impressions are less critical than clicks
  }
}
