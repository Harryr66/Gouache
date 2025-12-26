# HLS (HTTP Live Streaming) Implementation Guide
## For Gouache Web & iOS App at Scale

---

## 📊 Executive Summary

**HLS (HTTP Live Streaming)** is Apple's adaptive streaming protocol that segments videos into small chunks, allowing quality adjustment based on network conditions. For a scaled-up platform with web and iOS apps, HLS offers significant benefits but requires substantial infrastructure investment.

**Quick Answer:**
- **Timeline**: 4-8 weeks for full implementation
- **Cost**: $500-$2,000/month for transcoding + CDN (scales with usage)
- **Complexity**: High (requires transcoding pipeline, storage changes, player updates)
- **ROI**: Best for 100K+ users, longer videos (>2min), or mobile-heavy traffic

---

## ✅ Benefits at Scale

### 1. **Adaptive Bitrate Streaming**
- **What it does**: Automatically adjusts video quality based on user's network speed
- **Benefit**: Users on slow connections get lower quality (no buffering), fast connections get HD
- **Impact**: Reduces abandonment by 40-60% on mobile networks
- **Example**: User on 3G gets 360p, user on WiFi gets 1080p - both watch smoothly

### 2. **Faster Initial Playback**
- **What it does**: Starts playing after downloading first 2-4 second segment
- **Benefit**: Videos start in 1-2 seconds vs 5-10 seconds for full MP4
- **Impact**: Critical for discovery feed where users scroll quickly
- **Example**: Pinterest-style feed - users see video playing immediately

### 3. **Bandwidth Optimization**
- **What it does**: Only downloads segments needed, not entire video
- **Benefit**: Users who skip videos don't waste bandwidth
- **Impact**: 30-50% bandwidth savings for users, lower CDN costs
- **Example**: User scrolls past video after 5 seconds - only 5 seconds downloaded

### 4. **Mobile Network Resilience**
- **What it does**: Handles network switching (WiFi to cellular) seamlessly
- **Benefit**: No buffering when user moves or network changes
- **Impact**: Essential for mobile-first platforms
- **Example**: User starts on WiFi, switches to cellular - video continues smoothly

### 5. **iOS Native Support**
- **What it does**: iOS Safari and native apps support HLS natively
- **Benefit**: No additional libraries needed, better battery life
- **Impact**: Better performance on iOS devices (your target platform)
- **Example**: Native iOS video player handles HLS automatically

### 6. **Scalability**
- **What it does**: CDN can cache segments efficiently
- **Benefit**: Popular videos served from edge locations worldwide
- **Impact**: Lower latency, better global performance
- **Example**: Video cached in 200+ locations, served from nearest to user

---

## ❌ Drawbacks & Challenges

### 1. **Transcoding Infrastructure Required**
- **Challenge**: Must convert every uploaded MP4 to HLS format
- **Cost**: $0.01-$0.06 per minute of video transcoded
- **Complexity**: Need encoding pipeline (AWS MediaConvert, Cloudinary, Mux, etc.)
- **Time**: 2-5 minutes per video to transcode (60-second video = 2-5 min processing)

### 2. **Increased Storage Costs**
- **Challenge**: HLS creates multiple quality variants (240p, 360p, 720p, 1080p)
- **Cost**: 3-4x storage compared to single MP4 file
- **Example**: 10MB MP4 becomes 30-40MB of HLS segments (multiple qualities)
- **Impact**: Storage costs increase significantly

### 3. **More Complex Architecture**
- **Challenge**: Need to manage:
  - Transcoding jobs
  - Multiple quality variants
  - Segment storage
  - Manifest files (m3u8)
  - CDN configuration
- **Complexity**: 5-10x more complex than simple MP4 storage

### 4. **Development Time**
- **Challenge**: Requires:
  - Backend transcoding pipeline
  - Storage structure changes
  - Player updates (hls.js for web)
  - Testing across devices
- **Time**: 4-8 weeks of development

### 5. **Ongoing Maintenance**
- **Challenge**: Monitor transcoding jobs, handle failures, optimize costs
- **Cost**: $200-$500/month for monitoring/maintenance tools
- **Complexity**: Need alerts, retry logic, error handling

### 6. **Not Ideal for Very Short Videos**
- **Challenge**: Overhead of segmenting 10-30 second videos may not be worth it
- **Impact**: For 60-second videos, benefits are marginal
- **Recommendation**: Best for videos 2+ minutes

---

## 🏗️ Implementation Architecture

### Current Architecture (MP4)
```
User Upload → Firebase Storage (MP4) → CDN → Player
```

### HLS Architecture
```
User Upload → Firebase Storage (MP4) 
           ↓
    Transcoding Service (AWS MediaConvert/Cloudinary/Mux)
           ↓
    Generate HLS (m3u8 + .ts segments, multiple qualities)
           ↓
    Firebase Storage (HLS files)
           ↓
    CDN (CloudFront/Cloudflare)
           ↓
    Player (hls.js for web, native for iOS)
```

### Components Needed:

1. **Transcoding Service**
   - AWS MediaConvert (most flexible, complex setup)
   - Cloudinary (easiest, higher cost)
   - Mux (best for video-first apps, good pricing)
   - Google Cloud Transcoder (good pricing, Google ecosystem)

2. **Storage Structure**
   ```
   videos/
     {videoId}/
       master.m3u8 (playlist with quality options)
       240p/
         segment_000.ts
         segment_001.ts
         ...
       360p/
         segment_000.ts
         ...
       720p/
         segment_000.ts
         ...
       1080p/
         segment_000.ts
         ...
   ```

3. **Player Libraries**
   - **Web**: hls.js (required for browsers that don't support HLS natively)
   - **iOS**: Native AVPlayer (built-in, no library needed)
   - **Android**: ExoPlayer (if you add Android later)

4. **CDN Configuration**
   - CORS headers for cross-origin requests
   - Cache headers for segments
   - Range request support

---

## 📋 Step-by-Step Implementation Plan

### Phase 1: Research & Setup (Week 1)

**Tasks:**
1. Choose transcoding service (recommend Mux or Cloudinary for simplicity)
2. Set up transcoding service account
3. Create test HLS files manually
4. Test playback with hls.js on web
5. Test playback on iOS native player

**Deliverables:**
- Transcoding service account configured
- Test HLS video playing on web and iOS
- Cost estimates for transcoding

**Time**: 1 week

---

### Phase 2: Backend Transcoding Pipeline (Week 2-3)

**Tasks:**
1. Create API endpoint for video upload
2. Upload original MP4 to Firebase Storage
3. Trigger transcoding job after upload
4. Store transcoding job ID in Firestore
5. Set up webhook to receive transcoding completion
6. Store HLS URLs in Firestore when complete
7. Handle transcoding failures (retry logic)

**Code Structure:**
```typescript
// src/app/api/videos/upload/route.ts
export async function POST(request: Request) {
  // 1. Upload MP4 to Firebase Storage
  // 2. Trigger transcoding job
  // 3. Return job ID
}

// src/app/api/videos/transcode-webhook/route.ts
export async function POST(request: Request) {
  // 1. Receive transcoding completion
  // 2. Store HLS URLs in Firestore
  // 3. Update video status
}
```

**Deliverables:**
- Upload endpoint that triggers transcoding
- Webhook handler for transcoding completion
- Firestore schema for HLS URLs
- Error handling and retry logic

**Time**: 2 weeks

---

### Phase 3: Storage & CDN Setup (Week 3-4)

**Tasks:**
1. Configure Firebase Storage for HLS files
2. Set up CDN (CloudFront or Cloudflare)
3. Configure CORS headers
4. Set cache headers for segments
5. Test CDN delivery

**Storage Rules:**
```javascript
// firestore.rules
match /videos/{videoId}/{allPaths=**} {
  allow read: if true; // Public read for HLS segments
  allow write: if request.auth != null;
}
```

**Deliverables:**
- HLS files stored in Firebase Storage
- CDN configured and tested
- CORS and cache headers set

**Time**: 1 week

---

### Phase 4: Web Player Integration (Week 4-5)

**Tasks:**
1. Install hls.js: `npm install hls.js`
2. Create HLS video player component
3. Update artwork-tile.tsx to use HLS player
4. Add fallback to MP4 if HLS not available
5. Test on all browsers

**Code Example:**
```typescript
// src/components/hls-video-player.tsx
'use client';
import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

export function HLSVideoPlayer({ src, poster, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (Hls.isSupported()) {
      // Use hls.js for browsers that need it
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = src;
    } else {
      // Fallback to MP4
      video.src = src.replace('.m3u8', '.mp4');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      poster={poster}
      className={className}
      playsInline
      muted
      loop
    />
  );
}
```

**Deliverables:**
- hls.js integrated
- HLS player component
- Updated artwork tiles
- Browser compatibility tested

**Time**: 1-2 weeks

---

### Phase 5: iOS Native Integration (Week 5-6)

**Tasks:**
1. iOS natively supports HLS - no library needed!
2. Update Capacitor video player to use HLS URLs
3. Test on iOS Simulator
4. Test on physical iOS device
5. Handle network switching

**Code Example:**
```swift
// iOS native (if needed)
import AVFoundation

let player = AVPlayer(url: URL(string: hlsUrl)!)
let playerViewController = AVPlayerViewController()
playerViewController.player = player
```

**For Capacitor (React):**
```typescript
// iOS automatically handles HLS
<video src={hlsUrl} playsInline />
```

**Deliverables:**
- iOS app updated to use HLS URLs
- Tested on iOS devices
- Network switching handled

**Time**: 1 week

---

### Phase 6: Migration & Testing (Week 6-8)

**Tasks:**
1. Create migration script for existing videos
2. Batch transcode existing MP4s to HLS
3. Update all video references to use HLS
4. A/B test: HLS vs MP4 performance
5. Monitor transcoding costs
6. Optimize quality profiles
7. Load testing

**Migration Script:**
```typescript
// scripts/migrate-videos-to-hls.ts
async function migrateVideos() {
  const videos = await getVideosWithoutHLS();
  for (const video of videos) {
    await transcodeToHLS(video.id);
  }
}
```

**Deliverables:**
- Existing videos migrated to HLS
- Performance metrics collected
- Cost monitoring in place
- Production-ready system

**Time**: 2 weeks

---

## 💰 Cost Analysis

### Transcoding Costs

**Scenario: 1,000 videos/month, average 60 seconds each**

| Service | Cost per Minute | Monthly Cost |
|---------|----------------|--------------|
| **Mux** | $0.04 | $2,400 |
| **Cloudinary** | $0.05 | $3,000 |
| **AWS MediaConvert** | $0.03 | $1,800 |
| **Google Cloud** | $0.03 | $1,800 |

**Note**: These are for HD transcoding. SD is cheaper, 4K is more expensive.

### Storage Costs

**Current (MP4):**
- 1,000 videos × 10MB = 10GB
- Firebase Storage: ~$0.26/month

**With HLS (4 quality variants):**
- 1,000 videos × 40MB = 40GB
- Firebase Storage: ~$1.04/month

**Storage increase: 4x**

### CDN Costs

**Bandwidth:**
- 1,000 videos × 100 views × 10MB = 1TB
- CloudFront: ~$85/month
- Cloudflare: ~$20/month (if on Pro plan)

### Total Monthly Costs (1,000 videos/month)

| Component | Cost |
|-----------|------|
| Transcoding | $1,800-$3,000 |
| Storage | $1 |
| CDN | $20-$85 |
| **Total** | **$1,821-$3,086/month** |

**At scale (10,000 videos/month):**
- Transcoding: $18,000-$30,000/month
- Storage: $10/month
- CDN: $200-$850/month
- **Total: $18,210-$30,860/month**

---

## ⏱️ Timeline Estimate

### Full Implementation: **6-8 weeks**

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Research & Setup | 1 week | None |
| Backend Pipeline | 2 weeks | Transcoding service chosen |
| Storage & CDN | 1 week | Backend pipeline |
| Web Player | 1-2 weeks | Storage ready |
| iOS Integration | 1 week | Web player working |
| Migration & Testing | 2 weeks | All components ready |

### Minimum Viable Implementation: **3-4 weeks**
- Skip migration of existing videos
- Use Cloudinary (easiest setup)
- Basic quality profiles only
- Limited testing

---

## 🎯 When HLS Makes Sense

### ✅ Implement HLS if:
- **100K+ monthly active users**
- **Videos longer than 2 minutes**
- **Mobile traffic > 60%**
- **Global audience** (need CDN)
- **High abandonment rate** on videos
- **Budget for transcoding** ($2K+/month)

### ❌ Skip HLS if:
- **< 10K monthly active users**
- **Videos < 60 seconds**
- **Desktop-heavy traffic**
- **Limited budget** (< $500/month)
- **Simple use case** (just need videos to play)

---

## 🚀 Recommended Approach for Gouache

### Current State:
- 60-second max videos
- MP4 format
- Lazy loading implemented
- iOS app in development

### Recommendation: **Hybrid Approach**

**Phase 1 (Now):** Optimize current MP4 setup
- ✅ Already done: Lazy loading, viewport-based loading
- Add: Better MP4 encoding (H.264, optimized bitrates)
- Add: CDN if not already using one
- **Cost**: $0-50/month
- **Time**: Already done

**Phase 2 (6-12 months):** Evaluate HLS
- Monitor user metrics:
  - Video abandonment rate
  - Mobile vs desktop usage
  - Average video watch time
  - Bandwidth costs
- If metrics show need (high abandonment, mobile-heavy), implement HLS
- **Cost**: $2K-3K/month
- **Time**: 6-8 weeks

**Phase 3 (If scaling):** Full HLS implementation
- When you hit 100K+ users
- Or if videos get longer (>2 min)
- Or if mobile traffic > 60%

---

## 📚 Resources & Next Steps

### Transcoding Services:
1. **Mux** (Recommended): https://mux.com
   - Best for video-first apps
   - Good documentation
   - $0.04/min HD

2. **Cloudinary**: https://cloudinary.com
   - Easiest to set up
   - Good for images + videos
   - $0.05/min HD

3. **AWS MediaConvert**: https://aws.amazon.com/mediaconvert/
   - Most flexible
   - Complex setup
   - $0.03/min HD

### Libraries:
- **hls.js**: https://github.com/video-dev/hls.js
- **iOS AVPlayer**: Native (no library needed)

### Documentation:
- Apple HLS Spec: https://developer.apple.com/streaming/
- hls.js Docs: https://github.com/video-dev/hls.js/blob/master/docs/API.md

### Next Steps:
1. **Monitor current metrics** (abandonment, mobile usage)
2. **Set up cost tracking** for potential HLS implementation
3. **Optimize current MP4 setup** (encoding, CDN)
4. **Re-evaluate in 6 months** based on growth

---

## 💡 Conclusion

HLS is powerful but complex. For Gouache's current scale (60-second videos, discovery feed), the **current MP4 + lazy loading approach is optimal**. 

**Consider HLS when:**
- You have 100K+ users
- Videos get longer (>2 min)
- Mobile traffic dominates
- You have budget ($2K+/month)

**For now, focus on:**
- Optimizing MP4 encoding
- CDN setup (if not done)
- Monitoring user metrics
- Growing user base

The infrastructure investment in HLS will pay off at scale, but premature optimization can be costly.

---

*Last updated: December 2024*
