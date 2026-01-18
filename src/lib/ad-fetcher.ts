import { db } from './firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { AdCampaign } from './types';

/**
 * Fetch active ad campaigns for a specific placement
 */
export async function fetchActiveAds(
  placement: 'news' | 'discover' | 'learn',
  specificPlacement?: 'discover-tiles' | 'news-tiles' | 'news-banner' | 'learn-tiles' | 'learn-banner',
  userId?: string
): Promise<AdCampaign[]> {
  try {
    const now = new Date();
    
    // Query for campaigns that match the placement
    // Support both legacy 'placement' field and new 'placements' array
    const adsQuery = query(
      collection(db, 'adCampaigns'),
      where('isActive', '==', true)
    );

    const adsSnapshot = await getDocs(adsQuery);
    
    console.log(`[Ads] Found ${adsSnapshot.docs.length} active campaigns`);
    
    const ads = adsSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        const startDate = data.startDate?.toDate?.() || (data.startDate ? new Date(data.startDate) : new Date());
        const endDate = data.endDate?.toDate?.() || (data.endDate ? new Date(data.endDate) : undefined);
        
        console.log(`[Ads] Campaign "${data.title}": startDate=${startDate.toISOString()}, now=${now.toISOString()}, isActive=${data.isActive}`);
        
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
          startDate,
          endDate,
          lastSpentReset: data.lastSpentReset?.toDate?.() || data.lastSpentReset,
        } as AdCampaign;
      })
      .filter((ad) => {
        // Filter by placement - support both legacy and new system
        const matchesLegacyPlacement = ad.placement === placement;
        const matchesNewPlacement = specificPlacement && ad.placements?.includes(specificPlacement);
        const matchesGeneralPlacement = !specificPlacement && ad.placements?.some(p => p.startsWith(placement));
        
        if (!matchesLegacyPlacement && !matchesNewPlacement && !matchesGeneralPlacement) {
          console.log(`[Ads] Filtered out "${ad.title}": placement mismatch`);
          return false;
        }
        
        // Filter by date range
        const startCheck = ad.startDate && ad.startDate > now;
        const endCheck = ad.endDate && ad.endDate < now;
        
        if (startCheck) {
          console.log(`[Ads] Filtered out "${ad.title}": startDate in future`);
          return false;
        }
        if (endCheck) {
          console.log(`[Ads] Filtered out "${ad.title}": endDate passed`);
          return false;
        }
        
        // Filter by budget - don't show ads that have exceeded budget (unless uncapped)
        if (!ad.uncappedBudget && ad.budget && ad.spent !== undefined) {
          if (ad.spent >= ad.budget) return false;
        }
        
        // Filter by daily budget - check if daily limit reached
        if (ad.dailyBudget && ad.dailySpent !== undefined) {
          // Handle lastSpentReset date conversion
          let lastResetDate: Date;
          const lastReset = ad.lastSpentReset || ad.startDate;
          
          if (lastReset instanceof Date) {
            lastResetDate = lastReset;
          } else {
            // Handle Firestore Timestamp or other date-like objects
            const resetValue = lastReset as any;
            if (resetValue && typeof resetValue === 'object' && typeof resetValue.toDate === 'function') {
              lastResetDate = resetValue.toDate();
            } else {
              lastResetDate = new Date(resetValue);
            }
          }
          
          const isNewDay = now.toDateString() !== lastResetDate.toDateString();
          
          // If same day and daily budget exceeded, don't show
          if (!isNewDay && ad.dailySpent >= ad.dailyBudget) return false;
        }
        
        // TODO: Apply dynamic targeting (exclude users, tags, etc.)
        if (ad.targetAudience?.excludeUsers && userId) {
          if (ad.targetAudience.excludeUsers.includes(userId)) return false;
        }
        
        console.log(`[Ads] ✅ Including "${ad.title}" in feed`);
        return true;
      });

    console.log(`[Ads] Returning ${ads.length} ads for ${specificPlacement || placement}`);
    return ads;
  } catch (error) {
    console.error('Error fetching ads:', error);
    return [];
  }
}

/**
 * Mix ads into a content array at random positions
 * Returns a new array with ads interspersed
 */
export function mixAdsIntoContent<T extends { id: string }>(
  content: T[],
  ads: AdCampaign[],
  maxAds: number = 3
): Array<T | { type: 'ad'; campaign: AdCampaign }> {
  console.log(`[Ads] mixAdsIntoContent: ${content.length} content items, ${ads.length} ads available`);
  
  if (ads.length === 0 || content.length === 0) {
    console.log(`[Ads] Skipping mix: ${ads.length === 0 ? 'no ads' : 'no content'}`);
    return content;
  }

  const shuffledAds = [...ads].sort(() => Math.random() - 0.5).slice(0, maxAds);
  const result: Array<T | { type: 'ad'; campaign: AdCampaign }> = [...content];
  
  // Insert ads at random positions (every 3-5 items)
  const adInterval = Math.floor(Math.random() * 2) + 3; // 3 or 4
  
  shuffledAds.forEach((ad, index) => {
    const position = Math.min(
      (index + 1) * adInterval,
      result.length - 1
    );
    console.log(`[Ads] Inserting "${ad.title}" at position ${position}`);
    result.splice(position, 0, { type: 'ad', campaign: ad });
  });

  console.log(`[Ads] Mixed result: ${result.length} total items (${shuffledAds.length} ads inserted)`);
  return result;
}

/**
 * Fetch a single banner ad for a specific placement
 * Returns the first active IMAGE banner ad found, or null if none available
 * BANNERS ARE IMAGE-ONLY to reduce system strain - video ads are filtered out
 */
export async function fetchBannerAd(
  placement: 'news-banner' | 'learn-banner',
  userId?: string
): Promise<AdCampaign | null> {
  const ads = await fetchActiveAds(
    placement.startsWith('news') ? 'news' : 'learn',
    placement,
    userId
  );
  
  // Filter to image-only ads for banners (video not supported to reduce system strain)
  const imageAds = ads.filter(ad => ad.mediaType === 'image');
  
  if (imageAds.length === 0 && ads.length > 0) {
    console.log('[Ads] Banner placement has video ads but banners are image-only, skipping');
  }
  
  // Return the first image banner ad found
  return imageAds.length > 0 ? imageAds[0] : null;
}
