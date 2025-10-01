# Admin Panel Application Flow - Testing Guide

This document outlines how applications flow from submission to the admin panel for review.

## 🔄 Application Flow Overview

### 1️⃣ Artist Account Requests
**Submission Location:** `/profile/edit` (Profile Edit Page)
**Collection:** `artistRequests`
**Admin Panel View:** Artist Account → Pending

#### How to Submit:
1. Log in to your account
2. Navigate to Profile Edit (`/profile/edit`)
3. Scroll to "Artist Account Request" section
4. Fill in:
   - Artist Statement (required)
   - Experience/Background (required)
   - Upload portfolio images (at least 1 required)
   - Social media links (optional)
5. Click "Submit Artist Request"
6. Check browser console for: `✅ Artist request submitted successfully:`

#### What Gets Stored:
```javascript
{
  userId: user.id,
  user: {user object},
  portfolioImages: [...],
  artistStatement: "...",
  experience: "...",
  socialLinks: {...},
  status: 'pending',
  submittedAt: Date
}
```

#### How to View in Admin Panel:
1. Navigate to `/admin`
2. Click "Pending" under "Artist Account" overview card
3. Should see list of pending artist requests
4. Each request shows:
   - Artist name & avatar
   - Email & experience
   - Submission date
   - Portfolio image count
   - Artist statement preview
   - Actions: View, Approve, Reject

---

### 2️⃣ Advertising Applications
**Submission Location:** `/advertise` (Advertise with SOMA page)
**Collection:** `advertisingApplications`
**Admin Panel View:** Advertising → Requests

#### How to Submit:
1. Navigate to `/advertise`
2. Select "Advertising Only" or "Both Options"
3. Fill in Company Information:
   - Company Name (required)
   - Contact Name (required)
   - Email (required)
   - Phone (optional)
   - Website (optional)
4. Fill in Campaign Details:
   - Advertising Type (required)
   - Budget Range (optional)
   - Target Audience
   - Campaign Goals
   - Timeline
   - Additional Message
5. Click "Submit Application"
6. Check browser console for: `✅ Advertising application submitted successfully:`

#### What Gets Stored:
```javascript
{
  companyName: "...",
  contactName: "...",
  email: "...",
  phone: "...",
  website: "...",
  advertisingType: "...",
  budget: "...",
  targetAudience: "...",
  campaignGoals: "...",
  message: "...",
  timeline: "...",
  status: 'pending',
  submittedAt: serverTimestamp(),
  createdAt: Date,
  updatedAt: Date
}
```

#### How to View in Admin Panel:
1. Navigate to `/admin`
2. Click "Requests" under "Advertising" overview card
3. Should see list of pending advertising applications
4. Each application shows:
   - Company name
   - Contact name & email
   - Advertising type
   - Budget
   - Actions: View, Approve, Reject

---

### 3️⃣ Affiliate/Marketplace Product Requests
**Submission Location:** `/advertise` (Advertise with SOMA page)
**Collection:** `affiliateRequests`
**Admin Panel View:** Marketplace → Requests

#### How to Submit:
1. Navigate to `/advertise`
2. Select "Marketplace Partnership" or "Both Options"
3. Fill in Company Information (same as advertising)
4. Fill in Product Information:
   - Product Category (required) - Art Prints or Art Books
   - Product Subcategory (required)
   - Product Title (required)
   - Product Description (required)
   - Product Price (required)
   - Currency
   - Affiliate Link (required)
   - Commission Rate (optional)
   - Marketing Goals (optional)
5. Click "Submit Application"
6. Check browser console for: `✅ Affiliate request submitted successfully:`

#### What Gets Stored:
```javascript
{
  companyName: "...",
  contactName: "...",
  email: "...",
  phone: "...",
  website: "...",
  productCategory: "...",
  productSubcategory: "...",
  productTitle: "...",
  productDescription: "...",
  productPrice: Number,
  productCurrency: "USD",
  productImages: [],
  affiliateLink: "...",
  commissionRate: "...",
  targetAudience: "...",
  marketingGoals: "...",
  message: "...",
  status: 'pending',
  submittedAt: serverTimestamp()
}
```

#### How to View in Admin Panel:
1. Navigate to `/admin`
2. Click "Requests" under "Marketplace" overview card
3. Should see list of pending affiliate requests
4. Each request shows:
   - Product title & image (if uploaded)
   - Company name & email
   - Price & category
   - Actions: View, Approve, Reject

---

## 🔍 Admin Panel Testing Checklist

### Setup
- [ ] Navigate to `/admin`
- [ ] Check browser console for: `🔄 Admin Panel: Fetching all data...`
- [ ] Verify console shows counts for each collection:
  - `✅ Loaded X artist requests:`
  - `✅ Loaded X advertising applications:`
  - `✅ Loaded X episodes:`
  - `✅ Loaded X marketplace products:`
  - `✅ Loaded X affiliate requests:`
- [ ] Verify console ends with: `✅ Admin Panel: All data loaded successfully`

### Artist Account Testing
- [ ] Click "Pending" under Artist Account card
- [ ] Verify pending requests display or "No pending requests" message shows
- [ ] Click on a request to view full details
- [ ] Test "Approve" button - should update status
- [ ] Test "Reject" button - should allow rejection reason input
- [ ] Click "Approved" - should show approved artists
- [ ] Click "Rejected" - should show rejected requests with reasons

### Advertising Testing
- [ ] Click "Requests" under Advertising card
- [ ] Verify pending applications display or "No advertising requests" message shows
- [ ] Click "View" to see full application details
- [ ] Test "Approve" button functionality
- [ ] Test "Reject" button functionality

### Marketplace Testing
- [ ] Click "Requests" under Marketplace card
- [ ] Verify pending affiliate requests display or "No affiliate requests" message shows
- [ ] Click "View" to see full product request details
- [ ] Test "Approve" button - should create marketplace product
- [ ] Test "Reject" button functionality
- [ ] Click "Products" - should show approved marketplace products

### Episodes Testing
- [ ] Click "Episodes" under Episodes card
- [ ] Verify uploaded episodes display or "No episodes" message shows
- [ ] Test episode management functions (View, Delete)

---

## 🐛 Troubleshooting

### Applications Not Showing in Admin Panel

1. **Check Browser Console**
   - Look for `✅ Loaded X [type] requests:` messages
   - If count is 0, no applications exist in database

2. **Check Firestore Database**
   - Navigate to Firebase Console
   - Check collections: `artistRequests`, `advertisingApplications`, `affiliateRequests`
   - Verify documents exist with correct structure

3. **Check Firestore Rules**
   - Ensure admin users have read access to all collections
   - Verify security rules allow querying with `orderBy`

4. **Common Issues**
   - **No Index Error**: Create composite index for `orderBy('submittedAt', 'desc')`
   - **Permission Denied**: Check Firestore security rules
   - **Empty Results**: Verify documents were actually created during submission

### Submission Errors

1. **Check Form Validation**
   - Ensure all required fields are filled
   - Check console for validation error messages

2. **Check Network Tab**
   - Look for failed Firestore API calls
   - Check for CORS or authentication errors

3. **Check Console Logs**
   - Submission should show: `✅ [Type] submitted successfully:`
   - Errors should show: `❌ Error submitting [type]:`

---

## 📊 Database Structure

### Collections Used
1. `artistRequests` - Artist account applications from profile edit
2. `advertisingApplications` - Advertising applications from /advertise
3. `affiliateRequests` - Marketplace partnership requests from /advertise
4. `episodes` - Uploaded video content
5. `marketplaceProducts` - Approved marketplace products

### Required Firestore Indexes
All collections need a composite index for:
- Field: `submittedAt` (or `createdAt` for products/episodes)
- Order: Descending

---

## ✅ Success Indicators

### When Everything is Working:

1. **Submission Side:**
   - Form submits without errors
   - Success toast notification appears
   - Console shows: `✅ [Type] submitted successfully: [docId]`
   - Form resets after submission

2. **Admin Panel Side:**
   - Console shows all collections loading
   - Correct counts display in overview cards
   - Clicking subcategories shows relevant content
   - Applications display with all required information
   - Actions (Approve/Reject/View) work correctly
   - Status updates reflect in real-time

3. **Data Flow:**
   - Submit application → See in console → Appears in admin panel
   - Approve in admin → Status updates → Shows in "Approved" section
   - Reject in admin → Status updates → Shows in "Rejected" section

---

## 🔗 Quick Links

- Artist Request Form: `/profile/edit` (scroll to bottom)
- Advertising/Marketplace Form: `/advertise`
- Admin Panel: `/admin`
- Firebase Console: [Your Firebase Project URL]

