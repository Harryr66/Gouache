# Lower Resolution Analysis for Discover Tile Videos

## Current Setup: 240p

**Current Resolution:** 426×240 pixels (240p)
- **Bitrate:** 300 kbps
- **File Size:** ~0.4-0.5 MB per 10-second clip
- **Bandwidth:** ~0.5 Mbps

## Next Lower Options

### Option 1: 180p (320×180)
**Resolution:** 320×180 pixels
- **Bitrate:** 200-250 kbps
- **File Size:** ~0.25-0.35 MB per 10-second clip (30-40% smaller than 240p)
- **Bandwidth:** ~0.3-0.4 Mbps
- **Improvement:** ~1.3-1.5x faster loading

**Visual Quality:**
- ✅ **Acceptable for small tiles** (200-350px wide)
- ⚠️ **Noticeable quality loss** on larger displays
- ⚠️ **Fine details may blur** slightly
- ✅ **Still readable** for most content

**Tile Display Context:**
- Mobile: 2 columns (~150-200px wide) - **180p is MORE than enough**
- Tablet: 3-4 columns (~200-300px wide) - **180p is adequate**
- Desktop: 5 columns (~250-350px wide) - **180p is borderline but acceptable**

---

### Option 2: 144p (256×144)
**Resolution:** 256×144 pixels
- **Bitrate:** 150-200 kbps
- **File Size:** ~0.15-0.25 MB per 10-second clip (50-60% smaller than 240p)
- **Bandwidth:** ~0.2-0.3 Mbps
- **Improvement:** ~2x faster loading

**Visual Quality:**
- ⚠️ **Noticeable quality loss** even at small sizes
- ⚠️ **Fine details blur** significantly
- ⚠️ **Text may be hard to read** if present
- ⚠️ **Artwork details may be lost**

**Tile Display Context:**
- Mobile: **144p might be acceptable** (very small tiles)
- Tablet: **144p is pushing it** (quality loss noticeable)
- Desktop: **144p is too low** (quality loss too obvious)

---

### Option 3: 120p (160×120)
**Resolution:** 160×120 pixels
- **Bitrate:** 100-150 kbps
- **File Size:** ~0.1-0.15 MB per 10-second clip (70-75% smaller than 240p)
- **Bandwidth:** ~0.15-0.2 Mbps
- **Improvement:** ~3x faster loading

**Visual Quality:**
- ❌ **Significant quality loss** even at small sizes
- ❌ **Very blurry** on any display
- ❌ **Not recommended** for artwork previews

---

## Recommendation: **180p (320×180)**

### Why 180p is the Sweet Spot:

1. **Performance Gains:**
   - 30-40% smaller files than 240p
   - 1.3-1.5x faster loading
   - Better mobile performance
   - Lower bandwidth usage

2. **Visual Quality:**
   - Still acceptable for small tiles (200-350px wide)
   - Fine details preserved enough for previews
   - Users can click through for full 720p quality
   - Better than 144p which starts to look noticeably degraded

3. **Tile Size Context:**
   - Your tiles are typically **200-350px wide**
   - 180p (320px) provides **adequate detail** for these sizes
   - Browser scaling down from 320px to 200-350px looks fine
   - Scaling up from 144px to 350px would look blurry

4. **Real-World Comparison:**
   - **YouTube thumbnails:** ~320×180 (180p) for small previews
   - **Instagram Stories:** ~360p (similar to 180p for small displays)
   - **TikTok feed:** ~360p (but they use aggressive compression)

---

## File Size Comparison (10-second video clip)

| Resolution | Bitrate | File Size | Load Time* | Quality |
|------------|---------|-----------|------------|---------|
| **240p (current)** | 300 kbps | 0.4-0.5 MB | 1.0s | Good |
| **180p (recommended)** | 250 kbps | 0.25-0.35 MB | 0.6-0.7s | Acceptable |
| **144p** | 200 kbps | 0.15-0.25 MB | 0.4-0.5s | Noticeable loss |
| **120p** | 150 kbps | 0.1-0.15 MB | 0.3-0.4s | Poor |

*Load time on 4 Mbps connection

---

## Implementation Details

### Update `video-compression.ts`:

```typescript
export interface VideoQuality {
  url: string;
  quality: '180p' | '240p' | '360p' | '720p' | '1080p'; // Add '180p'
  // ...
}

if (targetQuality === '180p') {
  const maxDimension = 320;
  if (width > height) {
    width = Math.min(width, maxDimension);
    height = Math.round(width / aspectRatio);
  } else {
    height = Math.min(height, maxDimension);
    width = Math.round(height * aspectRatio);
  }
  if (!targetBitrate || targetBitrate >= 300) {
    targetBitrate = 250; // 250 kbps for 180p
  }
}
```

### Update `types.ts`:

```typescript
videoVariants?: {
  thumbnail: string; // 180p for tiles (faster loading)
  full: string; // 720p for expanded view
  thumbnailQuality?: '180p'; // Changed from '240p'
  fullQuality?: '720p';
  thumbnailBitrate?: number; // in kbps (e.g., 250)
  fullBitrate?: number; // in kbps (e.g., 1000-2500)
};
```

---

## Expected Improvements with 180p

### Performance:
- **30-40% smaller files** (0.4MB → 0.25-0.3MB per 10s clip)
- **1.3-1.5x faster loading**
- **Better mobile performance** (especially on slow connections)
- **Lower storage costs** (30-40% reduction)

### Visual Quality:
- **Still acceptable** for 200-350px wide tiles
- **Slight quality loss** but barely noticeable at tile sizes
- **Users can click for 720p** if they want full quality
- **Better than 144p** which would be too blurry

---

## Comparison: 180p vs 240p

### At Tile Sizes (200-350px wide):

**240p:**
- ✅ Excellent quality
- ✅ Sharp details
- ✅ No visible compression artifacts
- ⚠️ Slightly larger files

**180p:**
- ✅ Good quality (acceptable)
- ✅ Details mostly preserved
- ⚠️ Very slight softness (barely noticeable)
- ✅ 30-40% smaller files

**Verdict:** For preview tiles, **180p is sufficient** and provides better performance.

---

## Bottom Line

**Recommendation: Switch to 180p (320×180)**

**Benefits:**
- 30-40% smaller files
- 1.3-1.5x faster loading
- Still acceptable visual quality for small tiles
- Better mobile experience

**Tradeoffs:**
- Very slight quality loss (barely noticeable at tile sizes)
- Users can always click for full 720p quality

**Not Recommended:**
- 144p or lower - quality loss becomes too noticeable
- Would hurt user experience more than it helps

---

## Testing Recommendation

Before fully switching, consider:
1. **A/B test** 180p vs 240p with a small subset of users
2. **Monitor** user engagement (clicks, time on page)
3. **Check** mobile performance improvements
4. **Verify** visual quality is acceptable for your content type

If 180p works well, you could even consider **adaptive quality**:
- 180p for tiles (default)
- 240p for initial viewport (first 12 tiles)
- Best of both worlds: speed + quality where it matters