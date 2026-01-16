/**
 * Engagement Scorer
 * Calculates engagement scores for artworks to determine feed ranking
 * Similar to social media algorithms (Instagram, TikTok, etc.)
 */

import { Artwork } from '@/lib/types';
import { ArtworkEngagement } from './engagement-tracker';

export interface ScoredArtwork extends Artwork {
  engagementScore: number;
  finalScore: number; // Combined engagement + recency score
}

/**
 * Calculate engagement-based score for artwork ranking
 * Combines engagement metrics with recency for a balanced feed
 */
export class EngagementScorer {
  // Weight factors (tunable)
  private readonly ENGAGEMENT_WEIGHT = 0.7; // 70% engagement metrics
  private readonly RECENCY_WEIGHT = 0.3; // 30% recency boost

  // Recency decay parameters
  private readonly RECENCY_HALF_LIFE_DAYS = 7; // Score halves every 7 days
  private readonly MAX_RECENCY_BOOST = 1.0; // Maximum recency multiplier

  /**
   * Score artworks based on engagement and recency
   * @param followedArtistIds - Set of artist IDs that the user follows (for priority boost)
   */
  scoreArtworks(
    artworks: Artwork[],
    engagements: Map<string, ArtworkEngagement>,
    followedArtistIds?: Set<string>
  ): ScoredArtwork[] {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return artworks.map((artwork) => {
      // Check for hidden _placeholder tag
      const tags = Array.isArray(artwork.tags) ? artwork.tags : [];
      const isPlaceholder = tags.includes('_placeholder');
      
      // Placeholders always get a score of 0
      if (isPlaceholder) {
        return {
          ...artwork,
          engagementScore: 0,
          finalScore: 0,
        };
      }

      const engagement = engagements.get(artwork.id) || {
        artworkId: artwork.id,
        totalViewTime: 0,
        totalViews: 0,
        totalLikes: artwork.likes || 0,
        totalClicks: 0,
        engagementScore: 0,
        lastUpdated: new Date(),
        createdAt: new Date(),
      };

      // Normalize engagement score (0-100 scale)
      const normalizedEngagement = Math.min(engagement.engagementScore, 100) / 100;

      // Calculate recency score
      const artworkAge = now - artwork.createdAt.getTime();
      const ageInDays = artworkAge / oneDayMs;
      
      // Exponential decay for recency
      // Newer content gets a boost, but it decays over time
      const recencyScore = this.calculateRecencyScore(ageInDays);

      // Combine scores
      let finalScore =
        normalizedEngagement * this.ENGAGEMENT_WEIGHT +
        recencyScore * this.RECENCY_WEIGHT;
      
      // Boost score for followed artists (prioritize content from artists user follows)
      if (followedArtistIds && followedArtistIds.has(artwork.artist.id)) {
        finalScore = finalScore * 1.5; // 50% boost for followed artists
      }
      
      // ADD VARIETY: Random factor (±10%) to prevent same content every time
      // High-quality content still appears more, but order varies on each load
      // This is how Instagram/TikTok work - deterministic + small random factor
      const randomFactor = 0.9 + (Math.random() * 0.2); // 0.9 to 1.1 (±10%)
      finalScore = finalScore * randomFactor;
      
      // Ensure legitimate accounts get a minimum score of 1
      // This ensures they always rank above placeholders (which have score 0)
      if (finalScore < 1.0) {
        finalScore = 1.0;
      }

      return {
        ...artwork,
        engagementScore: engagement.engagementScore,
        finalScore: Math.round(finalScore * 1000) / 1000, // Round to 3 decimals
      };
    });
  }

  /**
   * Calculate recency score using exponential decay
   * Newer content gets higher scores, but the boost decays over time
   */
  private calculateRecencyScore(ageInDays: number): number {
    // Exponential decay: score = max * e^(-λ * age)
    // where λ = ln(2) / halfLife
    const lambda = Math.log(2) / this.RECENCY_HALF_LIFE_DAYS;
    const recencyScore = this.MAX_RECENCY_BOOST * Math.exp(-lambda * ageInDays);
    
    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, recencyScore));
  }

  /**
   * Sort artworks by final score (highest first)
   * Always prioritizes real artworks over placeholders
   */
  sortByScore(scoredArtworks: ScoredArtwork[]): ScoredArtwork[] {
    return [...scoredArtworks].sort((a, b) => {
      // Check for hidden _placeholder tag
      const aTags = Array.isArray(a.tags) ? a.tags : [];
      const bTags = Array.isArray(b.tags) ? b.tags : [];
      const aIsPlaceholder = aTags.includes('_placeholder');
      const bIsPlaceholder = bTags.includes('_placeholder');
      
      // First, separate real artworks from placeholders
      
      // Real artworks always come before placeholders
      if (aIsPlaceholder && !bIsPlaceholder) return 1;
      if (!aIsPlaceholder && bIsPlaceholder) return -1;
      
      // If both are placeholders or both are real, sort by score
      // Primary sort: final score (descending)
      if (b.finalScore !== a.finalScore) {
        return b.finalScore - a.finalScore;
      }
      
      // Secondary sort: engagement score (descending)
      if (b.engagementScore !== a.engagementScore) {
        return b.engagementScore - a.engagementScore;
      }
      
      // Tertiary sort: recency (newest first)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  /**
   * Apply diversity boost to prevent clustering
   * Ensures variety in the feed by slightly penalizing consecutive items from same artist
   */
  applyDiversityBoost(
    scoredArtworks: ScoredArtwork[],
    diversityPenalty: number = 0.1
  ): ScoredArtwork[] {
    const result: ScoredArtwork[] = [];
    const artistCounts = new Map<string, number>();

    for (let i = 0; i < scoredArtworks.length; i++) {
      const artwork = scoredArtworks[i];
      const artistId = artwork.artist.id;
      
      // Check if previous items were from same artist
      const recentCount = artistCounts.get(artistId) || 0;
      
      // Apply penalty if too many consecutive items from same artist
      if (recentCount >= 2) {
        artwork.finalScore = Math.max(0, artwork.finalScore - diversityPenalty);
      }

      result.push(artwork);
      
      // Update count
      artistCounts.set(artistId, recentCount + 1);
      
      // Reset count after 5 items (allow some clustering)
      if (i > 0 && i % 5 === 0) {
        artistCounts.clear();
      }
    }

    return result;
  }
}

// Singleton instance
export const engagementScorer = new EngagementScorer();
