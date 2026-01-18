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
   * Uses greedy selection with penalties to ensure variety in the feed
   * 
   * @param columnCount - Number of columns in CSS grid (default 5). Used to prevent
   *                      same images appearing vertically adjacent in CSS columns layout.
   */
  applyDiversityBoost(
    scoredArtworks: ScoredArtwork[],
    diversityPenalty: number = 0.25,
    columnCount: number = 5
  ): ScoredArtwork[] {
    if (scoredArtworks.length <= 1) return scoredArtworks;
    
    // GREEDY SELECTION: Pick highest scoring item, apply penalties, repeat
    // This actually reorders items instead of just adjusting scores
    const result: ScoredArtwork[] = [];
    const remaining = [...scoredArtworks];
    const artistPositions = new Map<string, number[]>(); // Track ALL positions
    const imagePositions = new Map<string, number[]>(); // Track ALL positions
    
    // Extract Cloudflare image ID from URL for better grouping
    const getImageKey = (url: string): string => {
      if (!url) return '';
      const match = url.match(/imagedelivery\.net\/[^/]+\/([^/]+)/);
      return match ? match[1] : url.substring(0, 80);
    };
    
    // CSS columns fill top-to-bottom. For N columns:
    // - Vertical neighbors differ by exactly N positions
    // - Horizontal neighbors differ by 1 position
    // Minimum safe distance to avoid ANY adjacency = columnCount + 1
    const MIN_IMAGE_DISTANCE = columnCount * 4; // 4 rows minimum between same images
    const MIN_ARTIST_DISTANCE = columnCount * 2; // 2 rows minimum between same artist
    
    while (remaining.length > 0) {
      const currentPos = result.length;
      let bestIdx = 0;
      let bestAdjustedScore = -Infinity;
      
      // Find the item with highest adjusted score considering diversity penalties
      for (let i = 0; i < remaining.length; i++) {
        const artwork = remaining[i];
        const artistId = artwork.artist?.id || '';
        const imageKey = getImageKey(artwork.imageUrl || '');
        
        let adjustedScore = artwork.finalScore;
        
        // Apply penalty if same artist appeared recently (check ALL previous positions)
        const artistPrevPositions = artistPositions.get(artistId) || [];
        for (const prevPos of artistPrevPositions) {
          const distance = currentPos - prevPos;
          if (distance < MIN_ARTIST_DISTANCE) {
            // Penalty increases as distance decreases
            const penalty = diversityPenalty * (MIN_ARTIST_DISTANCE - distance) * 0.3;
            adjustedScore -= penalty;
          }
          // Extra penalty for exact vertical adjacency (same column)
          if (distance % columnCount === 0 && distance <= columnCount * 2) {
            adjustedScore -= 10; // Very heavy penalty for vertical adjacency
          }
        }
        
        // Apply stronger penalty if same image appeared recently
        if (imageKey) {
          const imagePrevPositions = imagePositions.get(imageKey) || [];
          for (const prevPos of imagePrevPositions) {
            const distance = currentPos - prevPos;
            if (distance < MIN_IMAGE_DISTANCE) {
              // Heavy penalty - same image should be very spread out
              const penalty = diversityPenalty * (MIN_IMAGE_DISTANCE - distance) * 0.5;
              adjustedScore -= penalty;
            }
            // CRITICAL: Massive penalty for exact vertical adjacency (same column)
            if (distance % columnCount === 0 && distance <= columnCount * 3) {
              adjustedScore -= 100; // Essentially forbid vertical adjacency for same image
            }
            // Also penalize horizontal adjacency (1 position apart)
            if (distance === 1) {
              adjustedScore -= 100; // Forbid horizontal adjacency
            }
          }
        }
        
        if (adjustedScore > bestAdjustedScore) {
          bestAdjustedScore = adjustedScore;
          bestIdx = i;
        }
      }
      
      // Pick the best item
      const selected = remaining.splice(bestIdx, 1)[0];
      const artistId = selected.artist?.id || '';
      const imageKey = getImageKey(selected.imageUrl || '');
      
      result.push({
        ...selected,
        finalScore: Math.max(0.01, bestAdjustedScore)
      });
      
      // Track ALL positions for proper distance checking
      if (artistId) {
        const positions = artistPositions.get(artistId) || [];
        positions.push(currentPos);
        artistPositions.set(artistId, positions);
      }
      if (imageKey) {
        const positions = imagePositions.get(imageKey) || [];
        positions.push(currentPos);
        imagePositions.set(imageKey, positions);
      }
    }

    return result;
  }
}

// Singleton instance
export const engagementScorer = new EngagementScorer();
