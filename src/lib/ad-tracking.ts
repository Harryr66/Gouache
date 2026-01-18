import { db } from './firebase';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, getDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';

/**
 * Generate a simple browser fingerprint for anonymous users
 * This is not cryptographically secure but sufficient for ad deduplication
 */
function getAnonymousFingerprint(): string {
  if (typeof window === 'undefined') return '';
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    navigator.maxTouchPoints || 0,
  ];
  
  // Simple hash function
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `anon_${Math.abs(hash).toString(36)}`;
}

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
    // Check if this user has already had an impression for this ad today
    // This prevents charging for the same user seeing the same ad multiple times per day
    // For anonymous users, use a browser fingerprint
    const trackingId = userId || getAnonymousFingerprint();
    
    if (trackingId) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingImpressionQuery = query(
        collection(db, 'adImpressions'),
        where('campaignId', '==', campaignId),
        where('trackingId', '==', trackingId),
        where('impressionDate', '==', today.toISOString().split('T')[0])
      );
      
      const existingImpressions = await getDocs(existingImpressionQuery);
      
      if (!existingImpressions.empty) {
        // User already saw this ad today - don't count as billable impression
        console.log('Skipping duplicate impression for:', trackingId, 'campaign:', campaignId);
        return;
      }
      
      // Record this impression to prevent duplicates
      await addDoc(collection(db, 'adImpressions'), {
        campaignId,
        trackingId, // Use trackingId instead of userId for both logged-in and anonymous
        userId: userId || null, // Keep userId for reference if available
        isAnonymous: !userId,
        placement,
        impressionDate: today.toISOString().split('T')[0], // YYYY-MM-DD format for easy querying
        impressionAt: serverTimestamp(),
      });
    }
    
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
