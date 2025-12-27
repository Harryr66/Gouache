# Upload Performance Optimization Strategy

## Current Bottlenecks

### 1. **Sequential File Uploads** ⚠️ **CRITICAL**
**Problem:**
- Files upload one by one using `await` in a `for` loop
- If uploading 5 files, total time = sum of all upload times
- Example: 5 files × 2 seconds each = 10 seconds total

**Current Code:**
```typescript
for (let i = 0; i < files.length; i++) {
  await uploadBytes(fileRef, file); // Waits for each file
  const fileUrl = await getDownloadURL(fileRef);
}
```

**Impact:** 5x slower than parallel uploads for 5 files

---

### 2. **No Image Compression Before Upload** ⚠️ **HIGH**
**Problem:**
- Raw image files uploaded without compression
- Large photos (10MB+) uploaded at full size
- Wastes bandwidth and storage

**Impact:** 5-10x larger file sizes than necessary for images

---

### 3. **Video Compression Not Implemented** ⚠️ **HIGH**
**Problem:**
- Videos uploaded raw (no 240p/720p compression yet)
- Large video files (100MB+) uploaded as-is
- Massive bandwidth waste

**Impact:** 10-50x larger uploads than needed

---

### 4. **Synchronous URL Fetching** ⚠️ **MEDIUM**
**Problem:**
- `getDownloadURL()` called sequentially after each upload
- Could be parallelized

**Impact:** Adds ~100-500ms per file

---

### 5. **No Upload Queue/Pool Management** ⚠️ **MEDIUM**
**Problem:**
- All files attempt to upload simultaneously (if parallelized)
- Could overwhelm browser/network connection
- No smart queuing

---

## Optimization Strategies

### ✅ **1. Parallel File Uploads** (Easiest, Biggest Impact)

**Implementation:**
```typescript
// Instead of sequential:
for (let i = 0; i < files.length; i++) {
  await uploadBytes(fileRef, file);
}

// Use Promise.all for parallel:
const uploadPromises = files.map(async (file, i) => {
  const fileRef = ref(storage, `${folder}/${user.id}/${Date.now()}_${i}_${file.name}`);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
});

const uploadedUrls = await Promise.all(uploadPromises);
```

**Expected Improvement:**
- **5 files:** 10 seconds → 2 seconds (5x faster)
- **10 files:** 20 seconds → 2 seconds (10x faster)

**Caveats:**
- May overwhelm network with too many simultaneous uploads
- Consider limiting to 3-5 concurrent uploads for better stability

---

### ✅ **2. Image Compression Before Upload** (High Impact)

**Implementation:**
```typescript
async function compressImage(file: File, maxWidth: number = 1920, quality: number = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Resize if larger than maxWidth
        if (width > maxWidth) {
          height = (height / width) * maxWidth;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
          file.type,
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Use before upload:
const compressedFile = await compressImage(file);
await uploadBytes(fileRef, compressedFile);
```

**Expected Improvement:**
- **10MB photo → 500KB-2MB** (5-20x smaller)
- **Upload time:** 10 seconds → 1-2 seconds (5-10x faster)
- **Storage costs:** Reduced by 80-90%

**Quality Considerations:**
- `quality: 0.85` = very good quality, barely noticeable compression
- `quality: 0.75` = good quality, noticeable but acceptable
- `maxWidth: 1920` = suitable for most displays (4K monitors get 1920px anyway)

---

### ✅ **3. Implement Video Compression** (High Impact)

**Implementation:**
- Use the existing `compressVideo()` function from `video-compression.ts`
- Compress to 240p for tiles and 720p for full quality
- Upload compressed versions instead of raw videos

**Expected Improvement:**
- **100MB video → 5-10MB** (10-20x smaller)
- **Upload time:** 100 seconds → 5-10 seconds (10-20x faster)
- **Storage costs:** Reduced by 90-95%

---

### ✅ **4. Concurrent Upload Limiting** (Better Stability)

**Implementation:**
```typescript
async function uploadFilesWithConcurrencyLimit(
  files: File[],
  maxConcurrent: number = 3
): Promise<string[]> {
  const results: string[] = [];
  
  for (let i = 0; i < files.length; i += maxConcurrent) {
    const batch = files.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(async (file) => {
        const fileRef = ref(storage, `${folder}/${user.id}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        return await getDownloadURL(fileRef);
      })
    );
    results.push(...batchResults);
  }
  
  return results;
}
```

**Expected Improvement:**
- Upload 3-5 files simultaneously (good balance)
- Prevents network overload
- Still 3-5x faster than sequential

---

### ✅ **5. Progress Tracking for Parallel Uploads**

**Implementation:**
```typescript
const uploadPromises = files.map(async (file, i) => {
  const uploadTask = uploadBytesResumable(fileRef, file);
  
  return new Promise<string>((resolve, reject) => {
    uploadTask.on('state_changed',
      (snapshot) => {
        // Calculate progress per file
        const fileProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        const totalProgress = ((i * 100 + fileProgress) / files.length);
        setUploadProgress(totalProgress);
      },
      reject,
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });
});
```

---

### ✅ **6. Client-Side Image Resizing (Mobile-Friendly)**

**Implementation:**
```typescript
async function resizeImageForUpload(file: File): Promise<Blob> {
  // Detect if mobile device
  const isMobile = window.innerWidth < 768;
  const maxWidth = isMobile ? 1280 : 1920; // Smaller for mobile
  
  return compressImage(file, maxWidth, 0.85);
}
```

---

### ✅ **7. Pre-Compress Images in Background**

**Implementation:**
```typescript
// When files are selected, start compressing immediately
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const selectedFiles = Array.from(e.target.files || []);
  
  // Compress images in background while user fills form
  const compressedFiles = await Promise.all(
    selectedFiles.map(async (file) => {
      if (file.type.startsWith('image/')) {
        return await compressImage(file);
      }
      return file; // Videos handled separately
    })
  );
  
  setFiles(compressedFiles);
};
```

**Benefit:** Compression happens while user is typing title/description

---

## Recommended Implementation Order

### Phase 1: Quick Wins (1-2 hours)
1. ✅ **Parallel Uploads** - Biggest immediate impact
2. ✅ **Image Compression** - Huge file size reduction

### Phase 2: Medium Impact (2-4 hours)
3. ✅ **Concurrent Upload Limiting** - Better stability
4. ✅ **Progress Tracking for Parallel** - Better UX

### Phase 3: Advanced (4-8 hours)
5. ✅ **Video Compression** - Requires upload flow integration
6. ✅ **Pre-compression** - Nice UX improvement
7. ✅ **Smart resizing** - Mobile optimization

---

## Expected Overall Improvement

### Before Optimizations:
- **5 images (10MB each):** ~50 seconds
- **1 video (100MB):** ~100 seconds
- **Total:** 150 seconds

### After Phase 1 (Parallel + Image Compression):
- **5 images (compressed to 1MB each):** ~5 seconds (parallel)
- **1 video (100MB):** ~100 seconds (unchanged)
- **Total:** 105 seconds (**30% faster**)

### After Phase 3 (All Optimizations):
- **5 images (compressed to 1MB each):** ~5 seconds (parallel)
- **1 video (compressed to 5MB):** ~5 seconds
- **Total:** 10 seconds (**93% faster!**)

---

## Code Examples

### Optimized Upload Function

```typescript
async function uploadFilesOptimized(
  files: File[],
  userId: string,
  folder: string,
  maxConcurrent: number = 3
): Promise<string[]> {
  // Step 1: Compress images in parallel
  const processedFiles = await Promise.all(
    files.map(async (file) => {
      if (file.type.startsWith('image/')) {
        return await compressImage(file, 1920, 0.85);
      }
      // Videos: compress to 240p/720p (when implemented)
      return file;
    })
  );
  
  // Step 2: Upload with concurrency limit
  const results: string[] = [];
  
  for (let i = 0; i < processedFiles.length; i += maxConcurrent) {
    const batch = processedFiles.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(async (file, batchIndex) => {
        const globalIndex = i + batchIndex;
        const fileRef = ref(storage, `${folder}/${userId}/${Date.now()}_${globalIndex}_${file.name}`);
        await uploadBytes(fileRef, file);
        return await getDownloadURL(fileRef);
      })
    );
    results.push(...batchResults);
  }
  
  return results;
}
```

---

## Additional Considerations

### 1. **Browser Limits**
- Chrome/Firefox: ~6 concurrent connections per domain
- Consider limiting to 3-5 concurrent uploads for stability

### 2. **Network Speed Detection**
- Fast connection: 5 concurrent uploads
- Slow connection: 2-3 concurrent uploads
- Use `navigator.connection` API

### 3. **Error Handling**
- If one file fails in parallel batch, others continue
- Provide clear error messages per file
- Allow retry for failed files

### 4. **User Feedback**
- Show progress per file
- Show which files are uploading
- Show estimated time remaining

---

## Priority Recommendations

**Start with these two for immediate 5-10x speedup:**

1. **Parallel Uploads** (30 minutes)
   - Change `for` loop to `Promise.all`
   - Biggest impact, easiest to implement

2. **Image Compression** (1-2 hours)
   - Add `compressImage()` function
   - Integrate before upload
   - Reduces file sizes by 80-90%

These two alone will make uploads **5-10x faster** with minimal code changes!