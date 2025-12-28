# Cloudflare Quick Start - You're Almost There! 🚀

## ✅ What You Have Now

From your dashboard, I can see:
- **Account ID:** `0decd87b85b00bfc12b56df1e88a7528` ✅
- **Customer Subdomain:** `customer-bwnpw4q4ti9dshwh.cloudflare` ✅
- **Stream is enabled** ✅

## 🔑 What You Need Next

### Step 1: Get Stream API Token (2 minutes)

1. **Click "Get an API token"** link (next to the API token field on the page you're viewing)
   - OR go to: **My Profile** → **API Tokens** (top right corner)
   
2. **Click "Create Token"**

3. **Use "Edit Cloudflare Stream" template:**
   - Click "Get started" on the template
   - Or manually set permissions:
     - **Account** → **Cloudflare Stream** → **Edit**
   
4. **Click "Continue to summary"** → **Create Token**

5. **Copy the token immediately** (you won't see it again!)
   - It looks like: `abc123def456ghi789...`

---

### Step 2: Set Up Cloudflare Images (5 minutes)

1. **In the left sidebar**, click **"Images"** (under "Media")

2. **Get your Account Hash:**
   - It's shown at the top of the Images dashboard
   - Format: 32-character string (similar to your Account ID)

3. **Get Images API Token:**
   - Go to **My Profile** → **API Tokens** → **Create Token**
   - Use **"Edit Cloudflare Images"** template
   - Or set: **Account** → **Cloudflare Images** → **Edit**
   - Copy the token

---

### Step 3: Add to Environment Variables (1 minute)

Add these to your `.env.local` file:

```env
# Cloudflare Stream (Videos)
NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID=0decd87b85b00bfc12b56df1e88a7528
NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN=your_stream_token_here

# Cloudflare Images
NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH=your_images_account_hash_here
NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN=your_images_token_here
```

**Replace:**
- `your_stream_token_here` → Your Stream API token from Step 1
- `your_images_account_hash_here` → Account hash from Images dashboard
- `your_images_token_here` → Images API token from Step 2

---

### Step 4: Restart Dev Server

```bash
# Stop your dev server (Ctrl+C)
# Then restart:
npm run dev
```

---

### Step 5: Test Upload! 🎉

1. Go to your upload page
2. Upload an image or video
3. Check the console - you should see:
   - `✅ UploadForm: File uploaded to cloudflare: ...`
   - URL should contain `imagedelivery.net` or `cloudflarestream.com`

---

## 📋 Quick Checklist

- [ ] Stream API token created and copied
- [ ] Images account hash found
- [ ] Images API token created and copied
- [ ] All 4 values added to `.env.local`
- [ ] Dev server restarted
- [ ] Test upload successful

---

## 🎯 You're Ready!

Once you have:
1. ✅ Account ID (you have it: `0decd87b85b00bfc12b56df1e88a7528`)
2. ✅ Stream API token (get it now)
3. ✅ Images account hash (get from Images dashboard)
4. ✅ Images API token (create it)

Just add them to `.env.local` and restart your server. That's it! 🚀

---

## 💡 Pro Tips

1. **API tokens are sensitive** - Don't commit `.env.local` to git
2. **Tokens can be regenerated** - If you lose one, just create a new one
3. **Test with one upload first** - Verify it works before bulk uploads
4. **Check the dashboard** - You'll see your uploads appear in Stream/Images dashboards

---

## 🆘 Need Help?

- **Can't find API tokens?** → My Profile (top right) → API Tokens
- **Can't find Images?** → Left sidebar → Media → Images
- **Token not working?** → Make sure permissions are "Edit" not "Read"
- **Still using Firebase?** → Check that env vars are set correctly and server restarted

---

**You're literally 2 API tokens away from 85-90% faster performance!** 🎉

