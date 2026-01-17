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
      
      // ADD VARIETY: Use artwork ID hash for deterministic randomness
      // This ensures same order on re-renders but different order across sessions
      // Prevents INP issues from random values causing different sort orders
      const hashValue = artwork.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const deterministicRandom = ((hashValue % 200) - 100) / 1000; // -0.1 to +0.1
      finalScore = finalScore * (1 + deterministicRandom);
      
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
   * Spreads out items from the same artist AND items with the same image
   * Uses interleaving to ensure variety in the feed
   */
  applyDiversityBoost(
    scoredArtworks: ScoredArtwork[],
    diversityPenalty: number = 0.15
  ): ScoredArtwork[] {
    if (scoredArtworks.length <= 1) return scoredArtworks;
    
    // Group artworks by image URL to detect duplicates
    const imageGroups = new Map<string, ScoredArtwork[]>();
    const noImageArtworks: ScoredArtwork[] = [];
    
    for (const artwork of scoredArtworks) {
      const imageUrl = artwork.imageUrl || '';
      if (!imageUrl) {
        noImageArtworks.push(artwork);
        continue;
      }
      
      // Use first 100 chars of URL as key (handles variant suffixes)
      const imageKey = imageUrl.substring(0, 100);
      const group = imageGroups.get(imageKey) || [];
      group.push(artwork);
      imageGroups.set(imageKey, group);
    }
    
    // Interleave items to spread duplicates apart
    const result: ScoredArtwork[] = [];
    const artistLastPosition = new Map<string, number>();
    const imageLastPosition = new Map<string, number>();
    
    // Sort artworks by score first
    const sortedArtworks = [...scoredArtworks].sort((a, b) => b.finalScore - a.finalScore);
    
    for (const artwork of sortedArtworks) {
      const artistId = artwork.artist.id;
      const imageKey = (artwork.imageUrl || '').substring(0, 100);
      
      // Calculate position penalty based on how recently we saw same artist/image
      const artistLastPos = artistLastPosition.get(artistId) ?? -10;
      const imageLastPos = imageLastPosition.get(imageKey) ?? -10;
      const currentPos = result.length;
      
      const artistDistance = currentPos - artistLastPos;
      const imageDistance = currentPos - imageLastPos;
      
      // Apply penalty if same artist/image appeared too recently
      let adjustedScore = artwork.finalScore;
      
      // Penalty for same artist within last 3 positions
      if (artistDistance < 3) {
        adjustedScore -= diversityPenalty * (3 - artistDistance);
      }
      
      // Stronger penalty for same image within last 5 positions
      if (imageDistance < 5 && imageKey) {
        adjustedScore -= diversityPenalty * 2 * (5 - imageDistance);
      }
      
      result.push({
        ...artwork,
        finalScore: Math.max(0.01, adjustedScore)
      });
      
      // Track positions
      artistLastPosition.set(artistId, currentPos);
      if (imageKey) {
        imageLastPosition.set(imageKey, currentPos);
      }
    }

    return result;
  }
}

// Singleton instance
export const engagementScorer = new EngagementScorer();
