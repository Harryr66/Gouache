# Discover Content Ranking System

## Overview

Your Discover feed uses a **two-stage engagement-based ranking system** similar to Instagram and TikTok algorithms. It combines real-time user engagement metrics with recency to promote high-quality content while maintaining freshness.

---

## How It Works

### Stage 1: Engagement Tracking (`engagement-tracker.ts`)

**What Gets Tracked:**
- **View Time**: How long users spend viewing each artwork (minimum 1 second to count)
- **Total Views**: Number of unique views
- **Likes**: User likes/hearts
- **Clicks**: User interactions (clicking to view details)

**Engagement Score Calculation:**
```
Engagement Score = 
  (Average View Time × 0.3) +      // 30% weight - quality indicator
  (Likes × 0.4) +                  // 40% weight - highest value
  (Clicks × 0.2) +                 // 20% weight - interest indicator
  (Views × 0.1)                    // 10% weight - reach indicator
```

**Key Features:**
- Uses **logarithmic scaling** to prevent outliers from dominating
- Scores are normalized to 0-100 scale
- Updates happen in real-time (batched every 5 seconds)
- Stored in `artworkEngagementAggregate` collection in Firestore

---

### Stage 2: Final Ranking Score (`engagement-scorer.ts`)

**Final Score Formula:**
```
Final Score = 
  (Engagement Score × 0.7) +       // 70% engagement metrics
  (Recency Score × 0.3)            // 30% recency boost
```

**Recency Boost:**
- Newer content gets a boost that **decays exponentially**
- Half-life: 7 days (score halves every week)
- Ensures fresh content appears while still rewarding quality

**Additional Boosts:**
- **Followed Artists**: +50% boost (1.5x multiplier)
- **Minimum Score**: All real artworks get at least 1.0 (always above placeholders)

**Diversity Algorithm:**
- Prevents clustering: After 2+ consecutive items from same artist, applies -0.1 penalty
- Resets every 5 items to allow some natural clustering
- Ensures variety in the feed

---

## Current Ranking Behavior

### When "Popular" Sort is Selected:
1. Artworks are scored using engagement + recency
2. Diversity boost is applied
3. Sorted by final score (highest first)

### When Other Sorts are Selected:
- Still prioritizes followed artists first
- Then applies the selected sort (newest, oldest, likes, recent)
- Falls back to engagement-based ranking if engagement data exists

### Default Behavior:
- Uses engagement-based ranking if engagement data is available
- Falls back to "newest" if no engagement data

---

## How to Ensure High-Quality Content is Promoted

### ✅ Current Strengths:

1. **View Time Weight (30%)**: Rewards content that keeps users engaged
2. **Likes Weight (40%)**: Highest weight - directly measures user satisfaction
3. **Logarithmic Scaling**: Prevents viral outliers from dominating
4. **Recency Balance**: 30% ensures fresh content while 70% rewards quality
5. **Follow Boost**: Prioritizes content from artists users follow

### 🚀 Recommendations for Improvement:

#### 1. **Increase View Time Weight** (Quality Indicator)
```typescript
// Current: VIEW_TIME_WEIGHT = 0.3
// Recommended: VIEW_TIME_WEIGHT = 0.4 or 0.45
```
**Why**: View time is the strongest indicator of quality. Users spend more time on content they find valuable.

#### 2. **Add Engagement Rate Metric**
```typescript
// Calculate: (likes + clicks) / views
// High engagement rate = quality content
const engagementRate = (totalLikes + totalClicks) / totalViews;
```
**Why**: A piece with 10 likes from 10 views is better than 100 likes from 10,000 views.

#### 3. **Add Negative Signals** (Penalize Low Quality)
```typescript
// Track: quick exits, scroll pasts, reports
// Apply penalty to artworks with:
// - Average view time < 2 seconds
// - Engagement rate < 1%
// - High report rate
```
**Why**: Actively demote content users ignore or report.

#### 4. **Add Recency Decay for Engagement**
```typescript
// Weight recent engagement more heavily
// Engagement from last 24 hours = 100% weight
// Engagement from last week = 75% weight
// Engagement from last month = 50% weight
```
**Why**: Recent engagement is more relevant than old engagement.

#### 5. **Add Quality Thresholds**
```typescript
// Minimum requirements to appear in "Popular" feed:
// - At least 5 views
// - At least 1 like OR average view time > 3 seconds
// - Engagement rate > 0.5%
```
**Why**: Prevents low-quality or spam content from appearing in top rankings.

#### 6. **Add Artist Reputation Boost**
```typescript
// Boost for verified artists
// Boost for artists with high follower counts
// Boost for artists with consistent high engagement
```
**Why**: Rewards established, quality artists.

#### 7. **Add Completion Rate** (For Videos)
```typescript
// Track: video watch completion percentage
// High completion = high quality
const completionRate = totalWatchTime / (videoDuration * totalViews);
```
**Why**: Videos that users watch fully are higher quality.

#### 8. **Add Share/Save Metrics**
```typescript
// Track: shares, saves, bookmarks
// These are strong quality signals
const SHARES_WEIGHT = 0.3;
const SAVES_WEIGHT = 0.2;
```
**Why**: Users only share/save content they truly value.

---

## Implementation Priority

### High Priority (Immediate Impact):
1. ✅ Increase view time weight to 0.4-0.45
2. ✅ Add engagement rate calculation
3. ✅ Add quality thresholds for "Popular" feed

### Medium Priority (Better Quality Control):
4. ✅ Add negative signals (quick exits, low engagement)
5. ✅ Add recency decay for engagement metrics
6. ✅ Add completion rate for videos

### Low Priority (Nice to Have):
7. ✅ Add share/save tracking
8. ✅ Add artist reputation boost

---

## Current System Strengths

✅ **Real-time tracking** - Engagement updates every 5 seconds  
✅ **Balanced algorithm** - 70% engagement, 30% recency  
✅ **Diversity protection** - Prevents artist clustering  
✅ **Follow boost** - Prioritizes followed artists  
✅ **Logarithmic scaling** - Prevents outlier domination  
✅ **Continuous scroll** - Content recycles for infinite feed  

---

## Monitoring & Optimization

### Key Metrics to Track:
1. **Average engagement score** by artwork category
2. **Time to first engagement** (how quickly content gets likes/views)
3. **Engagement rate distribution** (identify quality thresholds)
4. **View time distribution** (identify optimal view times)
5. **Recency vs. engagement correlation** (balance effectiveness)

### A/B Testing Opportunities:
- Test different weight combinations
- Test quality thresholds
- Test diversity penalty amounts
- Test recency decay rates

---

## Code Locations

- **Engagement Tracking**: `src/lib/engagement-tracker.ts`
- **Scoring Algorithm**: `src/lib/engagement-scorer.ts`
- **Ranking Application**: `src/app/(main)/discover/page.tsx` (lines 2043-2113)
- **Data Storage**: Firestore `artworkEngagementAggregate` collection

---

## Summary

Your current system is **well-designed** and follows industry best practices. The main improvements would be:

1. **Increase view time weight** (strongest quality signal)
2. **Add engagement rate** (better than raw counts)
3. **Add quality thresholds** (filter low-quality content)
4. **Add negative signals** (penalize ignored content)

These changes will ensure high-quality, engaging content rises to the top while inferior content is naturally demoted.
