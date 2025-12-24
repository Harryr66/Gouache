import { db } from './firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { AdCampaign } from './types';

/**
 * Fetch active ad campaigns for a specific placement
 */
export async function fetchActiveAds(
  placement: 'news' | 'discover' | 'learn',
  userId?: string
): Promise<AdCampaign[]> {
  try {
    const now = new Date();
    
    const adsQuery = query(
      collection(db, 'adCampaigns'),
      where('placement', '==', placement),
      where('isActive', '==', true)
    );

    const adsSnapshot = await getDocs(adsQuery);
    
    const ads = adsSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
          startDate: data.startDate?.toDate?.() || new Date(),
          endDate: data.endDate?.toDate?.(),
        } as AdCampaign;
      })
      .filter((ad) => {
        // Filter by date range
        if (ad.startDate && ad.startDate > now) return false;
        if (ad.endDate && ad.endDate < now) return false;
        
        // TODO: Apply dynamic targeting (exclude users, tags, etc.)
        if (ad.targetAudience?.excludeUsers && userId) {
          if (ad.targetAudience.excludeUsers.includes(userId)) return false;
        }
        
        return true;
      });

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
  if (ads.length === 0 || content.length === 0) {
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
    result.splice(position, 0, { type: 'ad', campaign: ad });
  });

  return result;
}
