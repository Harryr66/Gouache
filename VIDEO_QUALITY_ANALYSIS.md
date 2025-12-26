# Video Quality Analysis for Discover Tiles

## Current Setup

**Discover Tiles (thumbnail variant):**
- **Resolution:** 360p (640x360 or similar, maintaining aspect ratio)
- **Bitrate:** ~500 kbps (kilobits per second)
- **File Size:** ~5-7.5 MB per minute of video
- **Bandwidth Required:** ~1.0 Mbps for smooth playback

**Expanded View (full variant):**
- **Resolution:** 1080p (1920x1080)
- **Bitrate:** 2000-5000 kbps
- **File Size:** ~15-37.5 MB per minute of video
- **Bandwidth Required:** ~5 Mbps for smooth playback

## Next Step Down: 240p

If we reduce tile quality further, we'd go to **240p**:

**240p Option:**
- **Resolution:** 240p (426x240 or similar)
- **Bitrate:** ~300-400 kbps (could go as low as 300 kbps for faster loading)
- **File Size:** ~2.25-3 MB per minute (40-50% smaller than 360p)
- **Bandwidth Required:** ~0.5 Mbps for smooth playback (half of 360p)

## Comparison

| Quality | Resolution | Bitrate | File Size (1 min) | Bandwidth | Loading Speed |
|---------|------------|---------|-------------------|-----------|---------------|
| **Current (360p)** | 640x360 | 500 kbps | 5-7.5 MB | 1.0 Mbps | Moderate |
| **240p (proposed)** | 426x240 | 300 kbps | 2.25-3 MB | 0.5 Mbps | **2x faster** |
| **180p (very low)** | 320x180 | 200 kbps | 1.5 MB | 0.3 Mbps | **3x faster** |

## Would 240p Load Better?

**Yes, significantly:**

1. **File Size Reduction:** 40-50% smaller files
   - Example: 10-second video clip
     - 360p: ~0.8-1.25 MB
     - 240p: ~0.4-0.5 MB
   - **Faster download times**

2. **Lower Bandwidth:** Only needs 0.5 Mbps vs 1.0 Mbps
   - Works better on:
     - Slow mobile connections (3G/4G)
     - Weak Wi-Fi signals
     - Bandwidth-constrained networks

3. **Faster Initial Playback:**
   - Smaller files buffer faster
   - Less initial buffering time
   - Smoother autoplay experience

4. **Better for Multiple Videos:**
   - Concurrent video playback (your limit is 3)
   - Less bandwidth per video = more reliable playback
   - Better performance with your concurrent video limiting

## Tradeoffs

**Cons of 240p:**
1. **Visual Quality:** Slightly lower quality, but for small tiles (typically 200-300px wide), the difference is minimal
2. **Pixelation:** Might be noticeable on high-DPI displays (Retina, etc.) when viewing at larger sizes
3. **Art Detail:** Fine details in artwork might be less visible

**Pros of 240p:**
1. **Much faster loading** (primary benefit)
2. **Better mobile experience** (where most users are)
3. **Lower storage costs** (if you're paying for storage)
4. **Lower bandwidth costs** (if you're paying for egress)
5. **Better performance** overall

## Recommendation

**For Discover tiles specifically, 240p at ~300 kbps would be ideal:**

1. **Tiles are small** - Usually displayed at 200-400px width
2. **Poster images cover initial load** - Video loads in background
3. **Users expect fast loading** - Priority is speed over quality for previews
4. **Full quality available** - 1080p still loads when they click to expand

## Implementation

To implement 240p, you would:

1. **Update types:**
```typescript
videoVariants?: {
  thumbnail: string; // 240p for tiles
  full: string; // 1080p for expanded view
  thumbnailQuality?: '240p';
  fullQuality?: '1080p';
  thumbnailBitrate?: number; // 300 kbps target (reduced from 500)
  fullBitrate?: number; // 2000-5000 kbps
};
```

2. **Update compression:**
```typescript
// In video-compression.ts
if (targetQuality === '240p') {
  const maxDimension = 426;
  // ... resize logic
  targetBitrate = 300; // Reduced from 500
}
```

3. **Storage structure:**
```
artworks/videos/{userId}/{timestamp}_video_240p.mp4  // For tiles
artworks/videos/{userId}/{timestamp}_video_1080p.mp4 // For expanded
```

## Even Lower: 180p?

**180p (320x180) at 200 kbps:**
- Extremely small files (~1.5 MB/min)
- Very fast loading
- **But quality loss becomes noticeable even in small tiles**
- **Not recommended** unless you're targeting very slow connections exclusively

## Conclusion

**240p at 300 kbps** strikes the best balance:
- ✅ 2x faster loading than current 360p
- ✅ 40-50% smaller files
- ✅ Still acceptable quality for small tile previews
- ✅ Full quality (1080p) available on click
- ✅ Better mobile/slow connection experience

The loading improvement would be **significant**, especially for users on slower connections or when multiple videos are loading concurrently.
