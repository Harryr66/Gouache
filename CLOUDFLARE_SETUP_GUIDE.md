# Cloudflare Setup Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Cloudflare Account
1. Go to [cloudflare.com](https://cloudflare.com) and sign up
2. Add your domain (or use a subdomain for testing)

### Step 2: Enable Cloudflare Stream
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Stream** in the sidebar
3. Click **Get Started** or **Create Stream**
4. Get your **Account ID** (shown in Stream dashboard)
5. Create an **API Token**:
   - Go to **My Profile** → **API Tokens**
   - Click **Create Token**
   - Use **Edit Cloudflare Stream** template
   - Copy the token (you won't see it again!)

### Step 3: Enable Cloudflare Images
1. In Cloudflare Dashboard, navigate to **Images** in the sidebar
2. Click **Get Started** or **Create Images**
3. Get your **Account Hash** (shown in Images dashboard)
4. Create an **API Token**:
   - Go to **My Profile** → **API Tokens**
   - Click **Create Token**
   - Use **Edit Cloudflare Images** template
   - Copy the token

### Step 4: Add Environment Variables

Add these to your `.env.local` file:

```env
# Cloudflare Stream (Videos)
NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID=your_account_id_here
NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN=your_stream_token_here

# Cloudflare Images
NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH=your_account_hash_here
NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN=your_images_token_here
```

**Important:** These are `NEXT_PUBLIC_` because they're used in client-side code. For production, consider using server-side API routes for security.

### Step 5: Install Dependencies

The implementation uses native `fetch` API, so no additional packages needed! ✅

### Step 6: Test Upload

1. Start your dev server: `npm run dev`
2. Upload an image or video through the upload form
3. Check the console for upload logs
4. Verify the URL is a Cloudflare URL (not Firebase)

---

## 🔍 Finding Your Credentials

### Account ID (Stream)
- Location: Stream Dashboard → Top right corner
- Format: 32-character alphanumeric string
- Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### Account Hash (Images)
- Location: Images Dashboard → Top right corner
- Format: 32-character alphanumeric string
- Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### API Tokens
- Location: My Profile → API Tokens → Create Token
- **Stream Token Permissions:**
  - Account → Cloudflare Stream → Edit
- **Images Token Permissions:**
  - Account → Cloudflare Images → Edit

---

## 🧪 Testing

### Test Image Upload
```typescript
import { uploadImageToCloudflare } from '@/lib/cloudflare-images';

const file = new File(['...'], 'test.jpg', { type: 'image/jpeg' });
const result = await uploadImageToCloudflare(file);
console.log('Image URL:', result.imageUrl);
console.log('Variants:', result.variants);
```

### Test Video Upload
```typescript
import { uploadVideoToCloudflare } from '@/lib/cloudflare-stream';

const file = new File(['...'], 'test.mp4', { type: 'video/mp4' });
const result = await uploadVideoToCloudflare(file);
console.log('Video URL:', result.playbackUrl);
console.log('Thumbnail:', result.thumbnailUrl);
```

---

## ⚠️ Troubleshooting

### "Cloudflare credentials not configured"
- Check that all 4 environment variables are set
- Restart your dev server after adding env vars
- Verify variable names match exactly (case-sensitive)

### "Failed to upload"
- Check API token permissions
- Verify account ID/hash are correct
- Check Cloudflare dashboard for errors
- Ensure you have sufficient quota

### Videos not processing
- Cloudflare Stream processing can take 30-60 seconds
- Check video format (MP4, WebM supported)
- Verify file size (max 5GB per video)
- Check Stream dashboard for processing status

### Images not loading
- Verify image URL format
- Check variant name (thumbnail, small, medium, large, full)
- Ensure account hash is correct in URL

---

## 📊 Pricing & Limits

### Cloudflare Stream
- **Storage:** $1 per 1,000 minutes stored
- **Delivery:** $1 per 1,000 minutes streamed
- **Free Tier:** 100 minutes/month
- **Max File Size:** 5GB per video

### Cloudflare Images
- **Base:** $5/month (includes 100k images)
- **Storage:** $1 per 100k images
- **Delivery:** $1 per 100k images delivered
- **Free Tier:** 100k images/month

---

## 🔒 Security Best Practices

1. **Don't commit `.env.local`** - Add to `.gitignore`
2. **Use server-side API routes** for production (more secure)
3. **Rotate API tokens** regularly
4. **Use least-privilege tokens** (only Stream or Images, not both)
5. **Monitor usage** in Cloudflare dashboard

---

## ✅ Verification Checklist

- [ ] Cloudflare account created
- [ ] Stream enabled and Account ID obtained
- [ ] Stream API token created
- [ ] Images enabled and Account Hash obtained
- [ ] Images API token created
- [ ] Environment variables added to `.env.local`
- [ ] Dev server restarted
- [ ] Test upload successful
- [ ] URLs are Cloudflare URLs (not Firebase)

---

## 🎉 You're Ready!

Once setup is complete, all new uploads will automatically use Cloudflare:
- **Videos** → Cloudflare Stream (optimized, fast delivery)
- **Images** → Cloudflare Images (optimized, multiple variants)

Existing Firebase content will continue to work (gradual migration).

