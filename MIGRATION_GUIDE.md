# Media Storage Migration Guide

## Current State

Your application currently stores all media (images, videos) in **Firebase Storage**. Download URLs are stored in Firestore documents in fields like:
- `imageUrl`
- `videoUrl`
- `videoVariants.thumbnail` / `videoVariants.full`
- `supportingImages[]`
- `mediaUrls[]`

## Migration Difficulty: **Moderate to Challenging**

### Why It's Moderate:
1. ✅ **Clean URL Storage**: URLs are stored in predictable Firestore fields
2. ✅ **Organized Paths**: Files follow consistent naming patterns (`portfolio/${userId}/...`)
3. ✅ **TypeScript Types**: Clear interfaces make field identification easier

### Challenges:
1. ❌ **No Storage Path Reference**: Only download URLs stored (need to extract paths)
2. ❌ **Bulk Migration**: Large datasets require careful batch processing
3. ❌ **Dual System**: Need to update all references in codebase
4. ❌ **Zero Downtime**: Requires gradual migration strategy

## Recommended Migration Strategy

### Phase 1: Prepare for Migration (Before Migration)

**Option A: Store Storage Paths (Recommended)**
```typescript
// Add storagePath field alongside URLs
interface Artwork {
  imageUrl: string;
  imageStoragePath?: string; // NEW: Store the path for easier migration
  videoUrl?: string;
  videoStoragePath?: string; // NEW
  videoVariants?: {
    thumbnail: string;
    thumbnailStoragePath?: string; // NEW
    full: string;
    fullStoragePath?: string; // NEW
  };
}
```

**Benefits:**
- Makes migration script simpler
- No URL parsing needed
- Easier rollback capability

**Implementation:**
When uploading, store both URL and path:
```typescript
const storagePath = `portfolio/${user.id}/${Date.now()}_${file.name}`;
const fileRef = ref(storage, storagePath);
await uploadBytes(fileRef, file);
const downloadURL = await getDownloadURL(fileRef);

// Store both
newArtwork.imageUrl = downloadURL;
newArtwork.imageStoragePath = storagePath; // NEW
```

### Phase 2: Choose New Provider

**Video-Optimized Providers:**
1. **Cloudflare Stream** ⭐ Recommended for videos
   - Automatic transcoding
   - Adaptive bitrate streaming
   - Global CDN
   - ~$1 per 1,000 minutes stored, $1 per 1,000 minutes streamed

2. **Mux** ⭐ Also excellent
   - Video API with automatic transcoding
   - Analytics built-in
   - ~$0.015 per minute stored, $0.01 per minute delivered

3. **Bunny.net Stream**
   - Cost-effective
   - Good performance
   - ~$0.01/GB storage, $0.005/GB bandwidth

**General Storage Providers:**
- **AWS S3 + CloudFront**: Industry standard, flexible
- **Google Cloud Storage**: Easy if staying in Google ecosystem
- **Azure Blob Storage**: Good for Microsoft stack
- **Cloudflare R2**: S3-compatible, zero egress fees

### Phase 3: Migration Script

```typescript
// Example migration script (run server-side or as Cloud Function)
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { ref, getDownloadURL, getMetadata } from 'firebase/storage';
import { storage, db } from '@/lib/firebase';
import { newStorageProvider } from '@/lib/new-storage'; // Your new provider

async function migrateArtwork(artworkId: string, artworkData: any) {
  const updates: any = {};
  
  // Migrate main image
  if (artworkData.imageUrl) {
    const newUrl = await migrateFile(artworkData.imageUrl);
    if (newUrl) updates.imageUrl = newUrl;
  }
  
  // Migrate video
  if (artworkData.videoUrl) {
    const newUrl = await migrateFile(artworkData.videoUrl);
    if (newUrl) updates.videoUrl = newUrl;
  }
  
  // Migrate video variants
  if (artworkData.videoVariants) {
    if (artworkData.videoVariants.thumbnail) {
      const newUrl = await migrateFile(artworkData.videoVariants.thumbnail);
      if (newUrl) updates['videoVariants.thumbnail'] = newUrl;
    }
    if (artworkData.videoVariants.full) {
      const newUrl = await migrateFile(artworkData.videoVariants.full);
      if (newUrl) updates['videoVariants.full'] = newUrl;
    }
  }
  
  // Migrate supporting images
  if (artworkData.supportingImages?.length) {
    const migratedUrls = await Promise.all(
      artworkData.supportingImages.map((url: string) => migrateFile(url))
    );
    updates.supportingImages = migratedUrls.filter(Boolean);
  }
  
  // Update Firestore
  if (Object.keys(updates).length > 0) {
    await updateDoc(doc(db, 'artworks', artworkId), updates);
    console.log(`✅ Migrated artwork ${artworkId}`);
  }
}

async function migrateFile(oldUrl: string): Promise<string | null> {
  try {
    // Extract storage path from Firebase Storage URL
    const storagePath = extractStoragePath(oldUrl);
    if (!storagePath) return null;
    
    // Download from Firebase Storage
    const fileRef = ref(storage, storagePath);
    const [downloadURL, metadata] = await Promise.all([
      getDownloadURL(fileRef),
      getMetadata(fileRef)
    ]);
    
    const response = await fetch(downloadURL);
    const blob = await response.blob();
    
    // Upload to new provider
    const newUrl = await newStorageProvider.upload(blob, {
      path: storagePath, // Keep same path structure
      contentType: metadata.contentType,
    });
    
    return newUrl;
  } catch (error) {
    console.error(`❌ Failed to migrate ${oldUrl}:`, error);
    return null;
  }
}

function extractStoragePath(url: string): string | null {
  // Use the same logic from profile-tabs.tsx deletion code
  if (url.includes('firebasestorage.googleapis.com')) {
    const urlParts = url.split('/o/');
    if (urlParts.length > 1) {
      const pathParts = urlParts[1].split('?');
      return decodeURIComponent(pathParts[0]);
    }
  }
  return null;
}

// Run migration
async function runMigration() {
  const artworksSnapshot = await getDocs(collection(db, 'artworks'));
  const artworks = artworksSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  console.log(`Starting migration of ${artworks.length} artworks...`);
  
  // Process in batches to avoid overwhelming
  const batchSize = 10;
  for (let i = 0; i < artworks.length; i += batchSize) {
    const batch = artworks.slice(i, i + batchSize);
    await Promise.all(batch.map(artwork => migrateArtwork(artwork.id, artwork)));
    console.log(`Progress: ${Math.min(i + batchSize, artworks.length)}/${artworks.length}`);
  }
  
  console.log('✅ Migration complete!');
}
```

### Phase 4: Dual-Write Period (Gradual Migration)

**Strategy:**
1. Upload to both providers initially
2. Serve from new provider once migrated
3. Gradually migrate existing files
4. Once complete, remove old provider

**Code Changes:**
```typescript
// src/lib/storage.ts
interface StorageProvider {
  upload(file: Blob, path: string): Promise<string>;
  getUrl(path: string): Promise<string>;
  delete(path: string): Promise<void>;
}

class FirebaseStorageProvider implements StorageProvider { /* ... */ }
class NewStorageProvider implements StorageProvider { /* ... */ }

class HybridStorageProvider implements StorageProvider {
  constructor(
    private old: StorageProvider,
    private new: StorageProvider,
    private useNew: boolean = false // Toggle
  ) {}
  
  async upload(file: Blob, path: string): Promise<string> {
    // Upload to both during migration
    const [oldUrl, newUrl] = await Promise.all([
      this.old.upload(file, path),
      this.new.upload(file, path)
    ]);
    
    // Return appropriate URL based on migration status
    return this.useNew ? newUrl : oldUrl;
  }
}
```

## Estimated Timeline

- **Small scale** (< 1,000 files): 1-2 days
- **Medium scale** (1,000-10,000 files): 1 week
- **Large scale** (10,000+ files): 2-4 weeks

**Factors:**
- File sizes (videos take longer)
- Network bandwidth
- New provider's upload speed
- Validation and testing time

## Cost Considerations

**Firebase Storage:**
- Storage: $0.026/GB/month
- Bandwidth: $0.12/GB (first 10GB free)

**Cloudflare Stream (example):**
- Storage: ~$1 per 1,000 minutes stored
- Streaming: ~$1 per 1,000 minutes streamed

**Migration costs:**
- Download from Firebase: Egress fees ($0.12/GB)
- Upload to new provider: Usually free
- Dual storage during migration: 2x storage costs temporarily

## Best Practices

1. ✅ **Test with small batch first** (10-20 files)
2. ✅ **Monitor for errors** and have rollback plan
3. ✅ **Keep old files** until migration verified
4. ✅ **Update all code references** to use new URLs
5. ✅ **Add storage path fields** for future migrations
6. ✅ **Use incremental migration** (not all at once)
7. ✅ **Validate migrated files** (checksums, sizes)

## Rollback Plan

If migration fails:
1. Keep old Firebase Storage files active
2. Revert code changes to use old URLs
3. Document what failed for retry
4. Old URLs should still work

## Questions to Consider

1. **Do you need video-specific features?** (transcoding, adaptive streaming)
   - Yes → Use Cloudflare Stream, Mux, or Bunny.net Stream
   - No → Any storage provider works

2. **What's your priority?**
   - Cost → Cloudflare R2, Bunny.net
   - Features → Cloudflare Stream, Mux
   - Simplicity → Stay with Firebase or move to Google Cloud Storage

3. **Do you need to keep same URLs?**
   - If yes, use URL rewriting/CDN in front
   - If no, direct migration is simpler
