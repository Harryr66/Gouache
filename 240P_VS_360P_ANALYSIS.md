# 240p vs 360p for Discover Tile Thumbnails

## Performance Impact: **SIGNIFICANT ✅**

### File Size Reduction
- **360p (current):** ~0.8-1.25 MB per 10-second clip
- **240p (proposed):** ~0.4-0.5 MB per 10-second clip
- **Savings: 50-60% smaller files**

### Bandwidth Requirements
- **360p:** ~1.0 Mbps per video
- **240p:** ~0.5 Mbps per video
- **Savings: 50% less bandwidth**

### Load Speed Impact
- **2x faster downloads** (roughly half the file size)
- **Faster initial buffering** for autoplay
- **Better performance on slow connections** (3G, weak Wi-Fi)
- **More reliable concurrent playback** (you limit to 3 videos at once)

### Stability Improvements
- Less network congestion
- Better mobile performance
- Reduced buffering issues
- Lower memory usage

## Visual Quality: **ACCEPTABLE ✅**

### Tile Display Context
Your Discover grid uses:
- **Mobile:** 2 columns (~150-200px wide tiles)
- **Tablet:** 3-4 columns (~200-300px wide tiles)  
- **Desktop:** 5 columns (~250-350px wide tiles)

### Visual Assessment

**At typical tile sizes (200-350px wide):**

✅ **240p (426×240) would look fine because:**
- Tiles are displayed smaller than the native 240p resolution
- Viewers typically see tiles at 200-350px width (not full 426px)
- Video is scaled down in the browser anyway
- Fine details aren't critical for preview thumbnails
- Poster images provide initial visual context

⚠️ **Potential concerns:**
- Slight pixelation on high-DPI displays (Retina screens) when viewed at larger sizes
- Fine text or very detailed artwork might be slightly less sharp
- But since these are **previews only**, users can click for full 1080p quality

### Real-World Comparison

**Similar platforms use:**
- **Pinterest:** ~240-360p for video pins (thumbnails)
- **Instagram:** ~360p for feed videos
- **TikTok:** ~360p for feed previews
- **Twitter:** ~360p for video thumbnails

## Recommendation: **YES, USE 240p** ✅

### Why 240p is Better for Your Use Case:

1. **Speed is Critical**
   - Users expect instant loading in Discover feed
   - Faster = better user experience
   - Reduces abandonment from slow loading

2. **Mobile-First**
   - Most users are on mobile
   - 240p is perfectly adequate for mobile screens
   - Better performance = happier users

3. **Preview Context**
   - These are preview thumbnails, not the final viewing experience
   - Users click through to see full 1080p quality
   - Poster images provide immediate visual feedback

4. **Grid Layout**
   - Tiles are small in the grid (200-350px)
   - 240p (426px) provides adequate detail for preview
   - Quality loss is barely noticeable at these sizes

5. **Performance Benefits Outweigh Quality Loss**
   - 50% faster loading
   - Better stability
   - Lower costs (bandwidth/storage)
   - More reliable playback

## Suggested Implementation

```typescript
// Update types
videoVariants?: {
  thumbnail: string; // 240p for tiles
  full: string; // 1080p for expanded view
  thumbnailQuality?: '240p';
  fullQuality?: '1080p';
  thumbnailBitrate?: number; // 300 kbps (down from 500)
  fullBitrate?: number; // 2000-5000 kbps
};
```

**Target Settings:**
- **Resolution:** 426×240 (or maintain aspect ratio, max 426px width/height)
- **Bitrate:** 300 kbps (down from 500 kbps)
- **Codec:** H.264 (current)
- **Format:** MP4 (current)

## Alternative: Adaptive Quality

If you want to be even smarter, consider:
- **240p default** for all tiles
- **360p for initial viewport** (first 12 tiles that load immediately)
- Still gives fast loading while prioritizing visible content

But for simplicity, **240p across the board is recommended**.

## Bottom Line

**Yes, switch to 240p.** The performance gains (2x faster, 50% less bandwidth) significantly outweigh the minimal visual quality loss at thumbnail sizes. Your users will appreciate the faster loading, and the visual difference will be barely noticeable in a grid of small preview tiles.



