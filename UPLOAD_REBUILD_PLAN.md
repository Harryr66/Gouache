# Upload Components Rebuild Plan

## ⚠️ CURRENT STATUS: REMOVED - REBUILDING FROM SCRATCH

**Artwork and Product upload portals have been COMPLETELY REMOVED from the upload page.**
**All functionality is documented below for complete rebuild from scratch.**

### Why Removed?
- React error #300 persisted even with bare bones implementation
- Issue appears to be fundamental - likely in upload page component or providers
- Clean slate needed to identify root cause

### Next Steps:
1. Create new artwork upload component from scratch
2. Create new product upload component from scratch
3. Build incrementally, testing each stage
4. Reference functionality documentation below

---

## DOCUMENTED FUNCTIONALITY TO REBUILD

### ARTWORK UPLOAD (`UploadForm` - Original)

#### File Upload Features:
1. **File Selection**
   - Multiple file support (images and videos)
   - Accept: `image/*,video/*`
   - File preview generation (FileReader API)
   - Preview display (single image/video or carousel for multiple)
   - File removal functionality
   - Current preview index tracking
   - Carousel navigation for multiple files

2. **Form Fields:**
   - **Title** (required input field)
   - **Description** (textarea)
   - **Discovery Tags** (chip-based tag system)
     - Tag input with keyboard shortcuts (space/enter/comma to add)
     - Backspace to remove last tag
     - Visual tag chips with remove buttons
   - **Dimensions** (width, height, unit selector: cm/in/px)
   - **Mark for Sale** toggle switch

3. **Sale Features** (only if "Mark for Sale" is enabled):
   - **Pricing Type** selector (fixed price or "contact artist")
   - **Fixed Price** fields:
     - Price input (number)
     - Currency selector (USD, GBP, EUR, CAD, AUD)
   - **Delivery Scope**:
     - Worldwide option
     - Specific countries option
     - Country selector with search (large list of countries)
     - Selected countries display as badges with remove option

4. **Terms Agreement:**
   - Checkbox: "I confirm that this artwork is not AI-generated and is my own original creative work" (required)

5. **Upload Process:**
   - Upload all files to Firebase Storage (`portfolio/${userId}/${timestamp}_${index}_${filename}`)
   - Create artwork object with:
     - ID generation (`artwork-${Date.now()}`)
     - Artist info (from user object)
     - Title, description, imageUrl (first file)
     - Supporting images array (additional files)
     - Tags array
     - Dimensions object
     - Sale info (if for sale): price (in cents), currency, priceType, deliveryScope, deliveryCountries
     - Type: 'artwork'
     - showInPortfolio: true
     - showInShop: based on isForSale flag
     - Created/updated timestamps
     - Views: 0, likes: 0
     - isAI: false, aiAssistance: 'none'
   
   - Create post object with:
     - ID generation (`post-${Date.now()}`)
     - artworkId reference
     - Artist info
     - imageUrl, caption, tags
     - likes: 0, commentsCount: 0
     - timestamp, createdAt
   
   - Call `addContent(post, artwork)` from ContentProvider
     - Creates discussion document
     - Adds artwork to 'artworks' collection
     - Adds post to 'posts' collection
     - Uses Firestore batch writes
   
   - Update user's portfolio in Firestore:
     - Get current portfolio from userProfiles document
     - Add new portfolio item with:
       - ID, imageUrl, supportingImages
       - Title, description, type: 'artwork'
       - showInPortfolio: true, showInShop: based on isForSale
       - Dimensions string format
       - Tags, createdAt
       - Sale info if applicable
     - Update userProfiles document with new portfolio array

6. **Success Handling:**
   - Toast notification
   - Navigate to `/profile?tab=portfolio`
   - Form reset

---

### PRODUCT UPLOAD (`handleProductSubmit` - Original)

#### Form Fields:
1. **Product Title** (required)
2. **Description** (textarea)
3. **Price** (USD, required, number input)
4. **Original Price** (optional, for sale display)
5. **Category** (select: art-prints, books, supplies, merchandise)
6. **Subcategory** (select: fine-art-prints, etc.)
7. **Stock Quantity** (number input, default: 1)
8. **Tags** (array of strings, tag input system)
9. **Product Images** (multiple image files, required)

#### Upload Process:
1. Upload images to Firebase Storage (`marketplaceProducts/${userId}/${timestamp}-${filename}`)
2. Create product document in 'marketplaceProducts' collection:
   - Title, description
   - Price (number), originalPrice (optional)
   - Currency: 'USD'
   - Category, subcategory
   - Images array (uploaded URLs)
   - sellerId, sellerName
   - isAffiliate: false
   - isActive: true
   - Stock, rating: 0, reviewCount: 0
   - Tags array
   - salesCount: 0, isOnSale: false
   - isApproved: true, status: 'approved'
   - createdAt, updatedAt

#### Success Handling:
- Toast notification
- Form reset
- Return to upload options (setSelectedType(null))

---

### EVENT UPLOAD (`handleEventSubmit` - Original)

#### Form Fields:
1. **Event Title** (required)
2. **Start Date** (date input, required)
3. **End Date** (date input, optional)
4. **Time** (time input, optional)
5. **Location Tag** (select dropdown with predefined locations, required)
6. **Location Details** (text input, optional)
7. **Venue** (text input, optional)
8. **Description** (textarea, optional)
9. **Price** (text input, optional, e.g., "Free" or "25")
10. **Booking URL** (text input, optional)
11. **Event Image** (single file, required)

#### Upload Process:
1. Upload image to Firebase Storage (`events/${userId}/${timestamp}-${filename}`)
2. Create event document in 'events' collection:
   - Title, description
   - Location, locationTag, venue
   - Tags: [locationTag] (for search)
   - Date (startDateTime as ISO string)
   - endDate (endDateTime as ISO string, optional)
   - Price, bookingUrl
   - Type: 'Event'
   - imageUrl
   - artistId, artistName
   - createdAt, updatedAt
   - status: 'active'

#### Success Handling:
- Toast notification
- Form reset
- Return to upload options

---

## REBUILD STAGES (Ordered by Complexity)

### STAGE 1: BARE BONES (CURRENT)
- ✅ File input
- ✅ Button
- ✅ Console.log on click
- ❌ NO state updates
- ❌ NO Firebase
- ❌ NO forms

### STAGE 2: Add Basic State
- Add useState for files
- Add useState for loading
- Display selected file count
- NO Firebase upload yet

### STAGE 3: Add Firebase Storage Upload
- Upload to Firebase Storage
- Get download URLs
- Console.log URLs
- NO Firestore writes

### STAGE 4: Add Minimal Firestore Write
- Write minimal document (just URLs and user ID)
- NO form fields yet

### STAGE 5: Add Title Input
- Single text input
- Add to document

### STAGE 6: Add Description
- Textarea
- Add to document

### STAGE 7: Add Tags
- Tag input system
- Array storage

### STAGE 8: Add Sale Toggle
- Switch component
- Conditional rendering

### STAGE 9: Add Pricing Fields
- Price type selector
- Price input
- Currency selector

### STAGE 10: Add Dimensions
- Width, height inputs
- Unit selector

### STAGE 11: Add Delivery Options
- Worldwide/specific toggle
- Country selector

### STAGE 12: Add Portfolio Update
- Update user profile portfolio array

### STAGE 13: Add Content Provider Integration
- Call addContent for posts/artworks/discussions

### STAGE 14: Add Navigation
- Navigate after success

### STAGE 15: Add Toast Notifications
- Replace alerts with toast

### STAGE 16: Add File Previews
- Image/video preview
- Carousel for multiple

### STAGE 17: Add Validation
- Required field checks
- Error messages

### STAGE 18: Add Terms Agreement
- Checkbox
- Validation

---

## NOTES

- Each stage should be tested before moving to the next
- If React error #300 appears, stop and investigate that stage
- Keep components simple - avoid complex state management patterns
- Use setTimeout for any state updates that might conflict with render cycle
- Document any issues encountered at each stage
