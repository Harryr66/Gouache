import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  // Also allow Vercel's internal cron calls
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  return vercelCronHeader === '1';
}

// Daily campaign reset cron - runs at midnight UTC
// Resets daily spend counters and reactivates campaigns that were paused due to daily budget
export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron call
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const results: any[] = [];

    // Get all campaigns (both active and paused)
    const campaignsQuery = query(collection(db, 'adCampaigns'));
    const campaignsSnapshot = await getDocs(campaignsQuery);

    for (const campaignDoc of campaignsSnapshot.docs) {
      const campaign = campaignDoc.data();
      const campaignId = campaignDoc.id;

      // Check if campaign has a daily budget and was paused due to it
      const dailyBudget = campaign.dailyBudget || 0;
      const dailySpent = campaign.dailySpent || 0;
      const wasActive = campaign.isActive;
      const totalBudget = campaign.budget;
      const totalSpent = campaign.spent || 0;
      const uncappedBudget = campaign.uncappedBudget || false;

      // Check if campaign should be reactivated
      // Reactivate if: was paused, has daily budget, and daily spent >= daily budget
      // But NOT if total budget is exceeded (unless uncapped)
      const pausedDueToDailyBudget = !wasActive && dailyBudget > 0 && dailySpent >= dailyBudget;
      const totalBudgetExceeded = !uncappedBudget && totalBudget && totalSpent >= totalBudget;

      // Check campaign dates
      const startDate = campaign.startDate?.toDate?.() || new Date(campaign.startDate);
      const endDate = campaign.endDate?.toDate?.() || (campaign.endDate ? new Date(campaign.endDate) : null);
      const isWithinDateRange = startDate <= now && (!endDate || endDate >= now);

      const updateData: any = {
        dailySpent: 0,
        lastSpentReset: serverTimestamp(),
      };

      // Reactivate campaign if it was paused due to daily budget (not total budget)
      if (pausedDueToDailyBudget && !totalBudgetExceeded && isWithinDateRange) {
        updateData.isActive = true;
        results.push({
          campaignId,
          action: 'reactivated',
          reason: 'Daily budget reset',
        });
      } else if (dailySpent > 0) {
        results.push({
          campaignId,
          action: 'reset_daily_spend',
          previousDailySpent: dailySpent,
        });
      }

      // Only update if there's something to change
      if (dailySpent > 0 || updateData.isActive) {
        await updateDoc(doc(db, 'adCampaigns', campaignId), updateData);
      }
    }

    // Clean up old impression records (older than 2 days) to save storage
    // This is safe because we only need yesterday's records for deduplication
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const oldDateString = twoDaysAgo.toISOString().split('T')[0];

    const oldImpressionsQuery = query(
      collection(db, 'adImpressions'),
      where('impressionDate', '<', oldDateString)
    );
    const oldImpressionsSnapshot = await getDocs(oldImpressionsQuery);
    
    let deletedImpressions = 0;
    for (const impressionDoc of oldImpressionsSnapshot.docs) {
      // Note: Using batch delete would be more efficient for large datasets
      // For now, we'll just count them - actual deletion can be done via Firebase console
      // or a separate cleanup job if volume becomes significant
      deletedImpressions++;
    }

    return NextResponse.json({
      success: true,
      processedAt: now.toISOString(),
      campaignsProcessed: campaignsSnapshot.size,
      results,
      oldImpressionsFound: deletedImpressions,
    });
  } catch (error: any) {
    console.error('Error in daily campaign reset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process daily reset' },
      { status: 500 }
    );
  }
}
