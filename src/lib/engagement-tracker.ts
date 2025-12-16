/**
 * Engagement Tracker Service
 * Tracks user engagement metrics (view time, interactions) for artworks
 * Similar to social media algorithms (Instagram, TikTok, etc.)
 */

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export interface EngagementMetrics {
  artworkId: string;
  userId: string;
  viewTime: number; // Total view time in milliseconds
  lastViewedAt: Date;
  liked: boolean;
  clicked: boolean;
  engagementScore: number; // Calculated engagement score
}

export interface ArtworkEngagement {
  artworkId: string;
  totalViewTime: number; // Sum of all user view times
  totalViews: number; // Number of unique views
  totalLikes: number;
  totalClicks: number;
  engagementScore: number; // Overall engagement score
  lastUpdated: Date;
  createdAt: Date;
}

/**
 * Track view time for an artwork
 * Uses IntersectionObserver to detect when artwork is visible
 */
export class EngagementTracker {
  private viewTimeMap: Map<string, { startTime: number; isVisible: boolean }> = new Map();
  private readonly MIN_VIEW_TIME = 1000; // Minimum 1 second to count as a view
  private readonly BATCH_UPDATE_INTERVAL = 5000; // Update Firestore every 5 seconds
  private updateTimer: NodeJS.Timeout | null = null;
  private pendingUpdates: Map<string, number> = new Map();

  /**
   * Start tracking view time for an artwork
   */
  startTracking(artworkId: string): void {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      // Guest users - don't track
      return;
    }

    const startTime = Date.now();
    this.viewTimeMap.set(artworkId, { startTime, isVisible: true });

    // Schedule periodic updates
    if (!this.updateTimer) {
      this.updateTimer = setInterval(() => {
        this.flushPendingUpdates();
      }, this.BATCH_UPDATE_INTERVAL);
    }
  }

  /**
   * Stop tracking view time for an artwork
   */
  stopTracking(artworkId: string): void {
    const tracking = this.viewTimeMap.get(artworkId);
    if (!tracking) return;

    const viewTime = Date.now() - tracking.startTime;
    
    if (viewTime >= this.MIN_VIEW_TIME) {
      // Add to pending updates
      const current = this.pendingUpdates.get(artworkId) || 0;
      this.pendingUpdates.set(artworkId, current + viewTime);
    }

    this.viewTimeMap.delete(artworkId);
  }

  /**
   * Record a like/upvote for an artwork
   */
  async recordLike(artworkId: string, isLiked: boolean): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Update user's engagement record
      const userEngagementRef = doc(
        db,
        'artworkEngagement',
        `${artworkId}_${user.uid}`
      );

      await setDoc(
        userEngagementRef,
        {
          artworkId,
          userId: user.uid,
          liked: isLiked,
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );

      // Update artwork's aggregate engagement
      await this.updateArtworkEngagement(artworkId, { liked: isLiked ? 1 : -1 });
    } catch (error) {
      console.error('Error recording like:', error);
    }
  }

  /**
   * Record a click/interaction on an artwork
   */
  async recordClick(artworkId: string): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userEngagementRef = doc(
        db,
        'artworkEngagement',
        `${artworkId}_${user.uid}`
      );

      await setDoc(
        userEngagementRef,
        {
          artworkId,
          userId: user.uid,
          clicked: true,
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );

      // Update artwork's aggregate engagement
      await this.updateArtworkEngagement(artworkId, { clicked: 1 });
    } catch (error) {
      console.error('Error recording click:', error);
    }
  }

  /**
   * Flush pending view time updates to Firestore
   */
  private async flushPendingUpdates(): Promise<void> {
    if (this.pendingUpdates.size === 0) return;

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const updates = Array.from(this.pendingUpdates.entries());
    this.pendingUpdates.clear();

    try {
      // Batch update all pending view times
      const promises = updates.map(async ([artworkId, viewTime]) => {
        // Update user's engagement record
        const userEngagementRef = doc(
          db,
          'artworkEngagement',
          `${artworkId}_${user.uid}`
        );

        const userEngagementDoc = await getDoc(userEngagementRef);
        const existingViewTime = userEngagementDoc.exists()
          ? userEngagementDoc.data()?.viewTime || 0
          : 0;

        await setDoc(
          userEngagementRef,
          {
            artworkId,
            userId: user.uid,
            viewTime: existingViewTime + viewTime,
            lastViewedAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        );

        // Update artwork's aggregate engagement
        await this.updateArtworkEngagement(artworkId, { viewTime });
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Error flushing pending updates:', error);
      // Re-add failed updates to pending
      updates.forEach(([artworkId, viewTime]) => {
        const current = this.pendingUpdates.get(artworkId) || 0;
        this.pendingUpdates.set(artworkId, current + viewTime);
      });
    }
  }

  /**
   * Update aggregate engagement metrics for an artwork
   */
  private async updateArtworkEngagement(
    artworkId: string,
    updates: { viewTime?: number; liked?: number; clicked?: number }
  ): Promise<void> {
    try {
      const artworkEngagementRef = doc(db, 'artworkEngagementAggregate', artworkId);

      const updateData: any = {
        artworkId,
        lastUpdated: serverTimestamp(),
      };

      if (updates.viewTime !== undefined) {
        updateData.totalViewTime = increment(updates.viewTime);
        updateData.totalViews = increment(1);
      }

      if (updates.liked !== undefined) {
        updateData.totalLikes = increment(updates.liked);
      }

      if (updates.clicked !== undefined) {
        updateData.totalClicks = increment(updates.clicked);
      }

      await setDoc(artworkEngagementRef, updateData, { merge: true });

      // Recalculate engagement score
      await this.recalculateEngagementScore(artworkId);
    } catch (error) {
      console.error('Error updating artwork engagement:', error);
    }
  }

  /**
   * Recalculate engagement score for an artwork
   * Uses a weighted algorithm similar to social media platforms
   */
  private async recalculateEngagementScore(artworkId: string): Promise<void> {
    try {
      const artworkEngagementRef = doc(db, 'artworkEngagementAggregate', artworkId);
      const docSnap = await getDoc(artworkEngagementRef);

      if (!docSnap.exists()) return;

      const data = docSnap.data();
      const totalViewTime = data.totalViewTime || 0;
      const totalViews = data.totalViews || 0;
      const totalLikes = data.totalLikes || 0;
      const totalClicks = data.totalClicks || 0;

      // Calculate engagement score using weighted algorithm
      // Similar to Instagram/TikTok algorithms
      const avgViewTime = totalViews > 0 ? totalViewTime / totalViews : 0;
      
      // Weight factors (tunable)
      const VIEW_TIME_WEIGHT = 0.3; // Average view time is important
      const LIKES_WEIGHT = 0.4; // Likes are highly valuable
      const CLICKS_WEIGHT = 0.2; // Clicks show interest
      const VIEWS_WEIGHT = 0.1; // Raw view count matters less

      // Normalize values (log scale to prevent outliers from dominating)
      const normalizedViewTime = Math.log10(avgViewTime + 1) * 100; // Convert to 0-100 scale
      const normalizedLikes = Math.log10(totalLikes + 1) * 100;
      const normalizedClicks = Math.log10(totalClicks + 1) * 100;
      const normalizedViews = Math.log10(totalViews + 1) * 100;

      // Calculate weighted score
      const engagementScore =
        normalizedViewTime * VIEW_TIME_WEIGHT +
        normalizedLikes * LIKES_WEIGHT +
        normalizedClicks * CLICKS_WEIGHT +
        normalizedViews * VIEWS_WEIGHT;

      // Update the score
      await updateDoc(artworkEngagementRef, {
        engagementScore: Math.round(engagementScore * 100) / 100, // Round to 2 decimals
      });
    } catch (error) {
      console.error('Error recalculating engagement score:', error);
    }
  }

  /**
   * Get engagement metrics for an artwork
   */
  async getArtworkEngagement(artworkId: string): Promise<ArtworkEngagement | null> {
    try {
      const artworkEngagementRef = doc(db, 'artworkEngagementAggregate', artworkId);
      const docSnap = await getDoc(artworkEngagementRef);

      if (!docSnap.exists()) return null;

      const data = docSnap.data();
      return {
        artworkId,
        totalViewTime: data.totalViewTime || 0,
        totalViews: data.totalViews || 0,
        totalLikes: data.totalLikes || 0,
        totalClicks: data.totalClicks || 0,
        engagementScore: data.engagementScore || 0,
        lastUpdated: data.lastUpdated?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Error getting artwork engagement:', error);
      return null;
    }
  }

  /**
   * Get engagement metrics for multiple artworks (batch)
   */
  async getArtworkEngagements(artworkIds: string[]): Promise<Map<string, ArtworkEngagement>> {
    const engagements = new Map<string, ArtworkEngagement>();

    try {
      // Firestore 'in' query limit is 10, so batch if needed
      const batchSize = 10;
      for (let i = 0; i < artworkIds.length; i += batchSize) {
        const batch = artworkIds.slice(i, i + batchSize);
        const q = query(
          collection(db, 'artworkEngagementAggregate'),
          where('artworkId', 'in', batch)
        );
        const snapshot = await getDocs(q);
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          engagements.set(data.artworkId, {
            artworkId: data.artworkId,
            totalViewTime: data.totalViewTime || 0,
            totalViews: data.totalViews || 0,
            totalLikes: data.totalLikes || 0,
            totalClicks: data.totalClicks || 0,
            engagementScore: data.engagementScore || 0,
            lastUpdated: data.lastUpdated?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        });
      }
    } catch (error) {
      console.error('Error getting artwork engagements:', error);
    }

    return engagements;
  }

  /**
   * Cleanup - flush any pending updates
   */
  cleanup(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    this.flushPendingUpdates();
  }
}

// Singleton instance
export const engagementTracker = new EngagementTracker();
