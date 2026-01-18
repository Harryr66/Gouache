import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

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

// Monthly billing cron - runs on 1st of each month at 9am UTC
export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron call
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of current month
    const billingPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); // 1st of previous month

    // Get all active partner accounts
    const partnerQuery = query(
      collection(db, 'partnerAccounts'),
      where('isActive', '==', true),
      where('billingSetupComplete', '==', true)
    );
    
    const partnerSnapshot = await getDocs(partnerQuery);
    
    if (partnerSnapshot.empty) {
      return NextResponse.json({ 
        success: true, 
        message: 'No active partners to bill',
        processedAt: now.toISOString()
      });
    }

    const results: any[] = [];

    for (const partnerDoc of partnerSnapshot.docs) {
      const partner = partnerDoc.data();
      const partnerId = partnerDoc.id;

      // Skip if no Stripe customer or payment method
      if (!partner.stripeCustomerId || !partner.paymentMethodId) {
        results.push({
          partnerId,
          status: 'skipped',
          reason: 'No payment method configured',
        });
        continue;
      }

      // Get all campaigns for this partner
      const campaignsQuery = query(
        collection(db, 'adCampaigns'),
        where('partnerId', '==', partnerId)
      );
      const campaignsSnapshot = await getDocs(campaignsQuery);

      // Calculate total spend for billing period
      let totalAmount = 0;
      const campaignBreakdown: any[] = [];

      for (const campaignDoc of campaignsSnapshot.docs) {
        const campaign = campaignDoc.data();
        const spent = campaign.spent || 0;
        
        if (spent > 0) {
          totalAmount += spent;
          campaignBreakdown.push({
            campaignId: campaignDoc.id,
            campaignTitle: campaign.title,
            impressions: campaign.impressions || 0,
            clicks: campaign.clicks || 0,
            billingModel: campaign.billingModel || 'cpc',
            totalCost: spent,
          });
        }
      }

      // Skip if nothing to charge
      if (totalAmount === 0) {
        results.push({
          partnerId,
          status: 'skipped',
          reason: 'No charges for this period',
        });
        continue;
      }

      // Minimum charge of $1 (100 cents)
      if (totalAmount < 100) {
        results.push({
          partnerId,
          status: 'skipped',
          reason: 'Amount below minimum ($1)',
          amount: totalAmount,
        });
        continue;
      }

      try {
        // Create payment intent and charge
        const paymentIntent = await stripe.paymentIntents.create({
          amount: totalAmount,
          currency: partner.currency || 'usd',
          customer: partner.stripeCustomerId,
          payment_method: partner.paymentMethodId,
          off_session: true,
          confirm: true,
          description: `Gouache Advertising - ${billingPeriodStart.toLocaleDateString()} to ${billingPeriodEnd.toLocaleDateString()}`,
          metadata: {
            partnerId,
            billingPeriodStart: billingPeriodStart.toISOString(),
            billingPeriodEnd: billingPeriodEnd.toISOString(),
            type: 'advertising_billing',
          },
        });

        // Create billing record
        await addDoc(collection(db, 'partnerBillingRecords'), {
          partnerId,
          amount: totalAmount,
          currency: partner.currency || 'usd',
          status: 'paid',
          stripePaymentIntentId: paymentIntent.id,
          billingPeriodStart,
          billingPeriodEnd,
          campaignBreakdown,
          createdAt: serverTimestamp(),
          paidAt: serverTimestamp(),
        });

        // Reset spent counters on campaigns
        for (const campaignDoc of campaignsSnapshot.docs) {
          await updateDoc(doc(db, 'adCampaigns', campaignDoc.id), {
            spent: 0,
            dailySpent: 0,
            lastSpentReset: serverTimestamp(),
          });
        }

        // Update partner's last billed date and total spent
        await updateDoc(doc(db, 'partnerAccounts', partnerId), {
          lastBilledAt: serverTimestamp(),
          totalSpentAllTime: (partner.totalSpentAllTime || 0) + totalAmount,
        });

        results.push({
          partnerId,
          status: 'charged',
          amount: totalAmount,
          paymentIntentId: paymentIntent.id,
        });
      } catch (chargeError: any) {
        console.error('Error charging partner:', chargeError);

        // Create failed billing record
        await addDoc(collection(db, 'partnerBillingRecords'), {
          partnerId,
          amount: totalAmount,
          currency: partner.currency || 'usd',
          status: 'failed',
          billingPeriodStart,
          billingPeriodEnd,
          campaignBreakdown,
          createdAt: serverTimestamp(),
          failureReason: chargeError.message,
        });

        results.push({
          partnerId,
          status: 'failed',
          amount: totalAmount,
          error: chargeError.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      billingPeriod: {
        start: billingPeriodStart.toISOString(),
        end: billingPeriodEnd.toISOString(),
      },
      results,
      processedAt: now.toISOString(),
    });
  } catch (error: any) {
    console.error('Error processing monthly billing:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process billing' },
      { status: 500 }
    );
  }
}
