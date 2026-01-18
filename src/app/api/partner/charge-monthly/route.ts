import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

// This endpoint can be called by a cron job on the 1st of each month
// Or manually by an admin to process billing
export async function POST(request: NextRequest) {
  try {
    const { partnerId, forceCharge } = await request.json();

    // Get partner account
    const partnerQuery = partnerId 
      ? query(collection(db, 'partnerAccounts'), where('__name__', '==', partnerId))
      : query(collection(db, 'partnerAccounts'), where('isActive', '==', true));
    
    const partnerSnapshot = await getDocs(partnerQuery);
    
    if (partnerSnapshot.empty) {
      return NextResponse.json({ error: 'No partners found' }, { status: 404 });
    }

    const results: any[] = [];
    const now = new Date();
    const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of current month
    const billingPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); // 1st of previous month

    for (const partnerDoc of partnerSnapshot.docs) {
      const partner = partnerDoc.data();
      const partnerIdActual = partnerDoc.id;

      // Skip if no Stripe customer or payment method
      if (!partner.stripeCustomerId || !partner.paymentMethodId) {
        results.push({
          partnerId: partnerIdActual,
          status: 'skipped',
          reason: 'No payment method configured',
        });
        continue;
      }

      // Get all campaigns for this partner
      const campaignsQuery = query(
        collection(db, 'adCampaigns'),
        where('partnerId', '==', partnerIdActual)
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
            impressionCost: Math.round((campaign.impressions || 0) * (campaign.costPerImpression || 0)),
            clickCost: Math.round((campaign.clicks || 0) * (campaign.costPerClick || 0)),
            totalCost: spent,
          });
        }
      }

      // Skip if nothing to charge
      if (totalAmount === 0 && !forceCharge) {
        results.push({
          partnerId: partnerIdActual,
          status: 'skipped',
          reason: 'No charges for this period',
        });
        continue;
      }

      // Minimum charge of $1 (100 cents)
      if (totalAmount < 100) {
        results.push({
          partnerId: partnerIdActual,
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
            partnerId: partnerIdActual,
            billingPeriodStart: billingPeriodStart.toISOString(),
            billingPeriodEnd: billingPeriodEnd.toISOString(),
            type: 'advertising_billing',
          },
        });

        // Create billing record
        await addDoc(collection(db, 'partnerBillingRecords'), {
          partnerId: partnerIdActual,
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
        await updateDoc(doc(db, 'partnerAccounts', partnerIdActual), {
          lastBilledAt: serverTimestamp(),
          totalSpentAllTime: (partner.totalSpentAllTime || 0) + totalAmount,
        });

        results.push({
          partnerId: partnerIdActual,
          status: 'charged',
          amount: totalAmount,
          paymentIntentId: paymentIntent.id,
        });
      } catch (chargeError: any) {
        console.error('Error charging partner:', chargeError);

        // Create failed billing record
        await addDoc(collection(db, 'partnerBillingRecords'), {
          partnerId: partnerIdActual,
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
          partnerId: partnerIdActual,
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
    });
  } catch (error: any) {
    console.error('Error processing monthly billing:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process billing' },
      { status: 500 }
    );
  }
}
