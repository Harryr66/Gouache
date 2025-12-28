# Cloudflare Stream + Images Implementation Plan

## 🎯 Goal
Implement both Cloudflare Stream (videos) and Cloudflare Images (images) to achieve:
- **85-90% faster load times** (10-20s → 0.7-3.5s)
- **66% cost savings** ($53/month → $18/month)
- **Pinterest/Instagram-level performance**

---

## 📋 Implementation Phases

### Phase 1: Setup & Configuration (30 min)

#### 1.1 Cloudflare Account Setup
- [ ] Sign up for Cloudflare account (if not already)
- [ ] Enable Cloudflare Stream
- [ ] Enable Cloudflare Images
- [ ] Get API tokens:
  - Stream API token
  - Images API token
  - Account ID

#### 1.2 Environment Variables
Add to `.env.local`:
```env
# Cloudflare Stream
CLOUDFLARE_STREAM_API_TOKEN=your_stream_token
CLOUDFLARE_ACCOUNT_ID=your_account_id

# Cloudflare Images
CLOUDFLARE_IMAGES_API_TOKEN=your_images_token
CLOUDFLARE_IMAGES_ACCOUNT_HASH=your_account_hash
```

#### 1.3 Install Dependencies
```bash
npm install @cloudflare/stream @cloudflare/images
```

---

### Phase 2: Create Upload Utilities (1-2 hours)

#### 2.1 Create `src/lib/cloudflare-stream.ts`
```typescript
import Stream from '@cloudflare/stream';

const stream = new Stream({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  apiToken: process.env.CLOUDFLARE_STREAM_API_TOKEN!,
});

export async function uploadVideoToCloudflare(file: File): Promise<{
  videoId: string;
  playbackUrl: string;
  thumbnailUrl: string;
}> {
  // Upload video to Cloudflare Stream
  // Returns video ID, playback URL, and thumbnail URL
}

export async function getVideoThumbnail(videoId: string): Promise<string> {
  // Get thumbnail URL for a video
}
```

#### 2.2 Create `src/lib/cloudflare-images.ts`
```typescript
import { CloudflareImages } from '@cloudflare/images';

const images = new CloudflareImages({
  accountHash: process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH!,
  apiToken: process.env.CLOUDFLARE_IMAGES_API_TOKEN!,
});

export async function uploadImageToCloudflare(file: File): Promise<{
  imageId: string;
  imageUrl: string;
  variants: {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
  };
}> {
  // Upload image to Cloudflare Images
  // Returns image ID, base URL, and variant URLs
}

export function getOptimizedImageUrl(imageId: string, variant: 'thumbnail' | 'small' | 'medium' | 'large'): string {
  // Generate optimized image URL with variant
}
```

#### 2.3 Create `src/lib/media-upload.ts` (Unified Interface)
```typescript
// Unified interface that handles both Firebase (legacy) and Cloudflare (new)
export async function uploadMedia(file: File, type: 'image' | 'video'): Promise<{
  url: string;
  thumbnailUrl?: string;
  provider: 'cloudflare' | 'firebase';
  // ... other metadata
}> {
  // Check if Cloudflare is enabled
  // Upload to Cloudflare if enabled, otherwise fallback to Firebase
}
```

---

### Phase 3: Update Upload Components (2-3 hours)

#### 3.1 Update Upload Forms
Files to update:
- `src/components/upload-form.tsx`
- `src/components/upload-artwork-basic.tsx`
- `src/components/upload-artwork-new.tsx`
- `src/components/upload-artwork-simple.tsx`
- `src/components/portfolio-manager.tsx`
- `src/components/partner/partner-campaign-form.tsx`
- `src/app/(main)/learn/submit/page.tsx` (videos)

**Changes:**
```typescript
// OLD:
const fileRef = ref(storage, `portfolio/${user.id}/${timestamp}_${file.name}`);
await uploadBytes(fileRef, file);
const fileUrl = await getDownloadURL(fileRef);

// NEW:
const result = await uploadMedia(file, file.type.startsWith('video/') ? 'video' : 'image');
const fileUrl = result.url;
const thumbnailUrl = result.thumbnailUrl; // For videos
```

#### 3.2 Store Provider Metadata
Update Firestore schema to store:
```typescript
interface Artwork {
  imageUrl: string;
  imageProvider?: 'cloudflare' | 'firebase'; // NEW
  imageId?: string; // NEW: Cloudflare image ID
  
  videoUrl?: string;
  videoProvider?: 'cloudflare' | 'firebase'; // NEW
  videoId?: string; // NEW: Cloudflare Stream video ID
  videoThumbnailUrl?: string; // NEW: Cloudflare Stream thumbnail
}
```

---

### Phase 4: Update Display Components (1-2 hours)

#### 4.1 Update `src/components/artwork-tile.tsx`
```typescript
// Detect provider and use appropriate URL
const imageUrl = artwork.imageProvider === 'cloudflare' 
  ? getOptimizedImageUrl(artwork.imageId!, 'medium')
  : artwork.imageUrl;

const videoUrl = artwork.videoProvider === 'cloudflare'
  ? getCloudflareStreamUrl(artwork.videoId!)
  : artwork.videoUrl;
```

#### 4.2 Update `src/app/(main)/discover/page.tsx`
- Use Cloudflare URLs when available
- Fallback to Firebase URLs for legacy content

#### 4.3 Update `src/lib/image-optimizer.ts`
```typescript
export function getOptimizedImageUrl(url: string, size: ImageSize): string {
  // If Cloudflare image, use variant URL
  if (url.includes('cloudflare') || url.includes('imagedelivery.net')) {
    return url; // Already optimized
  }
  
  // If Firebase, use Next.js Image Optimization
  return url; // Next.js handles it
}
```

---

### Phase 5: Migration Strategy (Optional - for existing content)

#### 5.1 Gradual Migration Script
Create `scripts/migrate-to-cloudflare.ts`:
- Migrate videos first (biggest impact)
- Then migrate images
- Update Firestore documents with new URLs
- Keep Firebase URLs as fallback

#### 5.2 Dual-Provider Support
- New uploads → Cloudflare
- Existing content → Keep Firebase (gradually migrate)
- Display logic handles both

---

### Phase 6: Testing & Optimization (1-2 hours)

#### 6.1 Test Uploads
- [ ] Test image uploads
- [ ] Test video uploads
- [ ] Verify URLs are stored correctly
- [ ] Test display in discover feed

#### 6.2 Performance Testing
- [ ] Measure load times before/after
- [ ] Verify 85-90% improvement
- [ ] Test on mobile devices

#### 6.3 Fallback Testing
- [ ] Test Firebase fallback for legacy content
- [ ] Test error handling

---

## 🚀 Quick Start Implementation

### Step 1: Create Upload Utilities (Start Here)

I'll create:
1. `src/lib/cloudflare-stream.ts` - Video uploads
2. `src/lib/cloudflare-images.ts` - Image uploads
3. `src/lib/media-upload.ts` - Unified interface

### Step 2: Update One Upload Component

Start with `src/components/upload-form.tsx` as a test:
- Replace Firebase upload with Cloudflare
- Test upload flow
- Verify URLs are stored correctly

### Step 3: Update Display Components

Update `src/components/artwork-tile.tsx` to:
- Detect Cloudflare URLs
- Use optimized variants
- Fallback to Firebase

### Step 4: Roll Out to All Upload Components

Once tested, update all upload components.

---

## 📊 Expected Results

### Performance
- **Before:** 10-20 seconds load time
- **After:** 0.7-3.5 seconds load time
- **Improvement:** 85-90% faster

### Cost
- **Before:** $53/month (Firebase)
- **After:** $18/month (Cloudflare)
- **Savings:** $35/month (66% cheaper)

### User Experience
- Instant image loading (30KB vs 800KB)
- Fast video playback (4MB vs 20MB)
- No more "Failed to load thumbnail" errors
- Pinterest/Instagram-level performance

---

## 🔧 Configuration Details

### Cloudflare Stream Pricing
- Storage: $1 per 1,000 minutes stored
- Delivery: $1 per 1,000 minutes streamed
- **Example:** 100 videos × 1 min = $0.10/month storage
- **Example:** 10k views × 1 min = $10/month delivery

### Cloudflare Images Pricing
- Base: $5/month (includes 100k images)
- Storage: $1 per 100k images
- Delivery: $1 per 100k images delivered
- **Example:** 30k images = $0.30/month storage
- **Example:** 300k images delivered = $3/month

---

## ✅ Ready to Implement?

**Next Steps:**
1. Set up Cloudflare accounts and get API tokens
2. I'll create the upload utilities
3. Update upload components one by one
4. Test and verify performance improvements

**Want me to start implementing?** I can create the upload utilities and update the first upload component as a proof of concept.

