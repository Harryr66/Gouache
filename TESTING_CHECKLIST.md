# Portfolio Migration Testing Checklist

## Pre-Testing Setup
- [ ] Wait for deployment to complete
- [ ] Clear browser cache or use incognito mode
- [ ] Open browser console (F12) to monitor logs

---

## 1. Migration Verification

### 1.1 Check Migration Status
- [ ] Navigate to `/admin` → "Database Tools" → "Portfolio Migration"
- [ ] Click "Check Status"
- [ ] Verify it shows:
  - Total users
  - Users with portfolios
  - Users migrated (should be > 0)
  - Total portfolio items
  - Items in portfolioItems collection (should match migrated count)

### 1.2 Verify Firestore Console
- [ ] Go to Firebase Console → Firestore Database
- [ ] Check `portfolioItems` collection exists
- [ ] Verify documents exist in `portfolioItems` collection
- [ ] Check a few documents to ensure:
  - `videoUrl` is either a string or `null` (never `undefined`)
  - All required fields are present
  - `userId` matches the original user

---

## 2. Discover Feed Testing

### 2.1 Basic Display
- [ ] Navigate to `/discover`
- [ ] Verify portfolio items are displaying
- [ ] Check browser console for:
  - `📦 Discover: Found X portfolio items from portfolioItems collection`
  - Should NOT see fallback messages (unless collection is empty)

### 2.2 Content Loading
- [ ] Verify images load correctly
- [ ] Verify videos load and play correctly
- [ ] Check that loading screen works properly
- [ ] Verify tiles are clickable and expand

### 2.3 Filtering & Search
- [ ] Test search functionality
- [ ] Test AI content filtering (if applicable)
- [ ] Verify pagination/infinite scroll works

---

## 3. Profile Portfolio Tab Testing

### 3.1 Own Profile
- [ ] Navigate to your profile
- [ ] Click "Portfolio" tab
- [ ] Verify all portfolio items display
- [ ] Check browser console for:
  - `📋 PortfolioManager: Loaded portfolio from portfolioItems collection`
  - Should NOT see fallback messages

### 3.2 Other User Profiles
- [ ] Navigate to another user's profile
- [ ] Click "Portfolio" tab
- [ ] Verify their portfolio items display correctly
- [ ] Check that items match what's in Firestore

### 3.3 Portfolio Manager (Own Profile)
- [ ] Navigate to your profile → Portfolio tab
- [ ] Verify you can see the portfolio manager
- [ ] Test editing an item
- [ ] Test deleting an item
- [ ] Verify changes reflect immediately

---

## 4. Shop Display Testing

### 4.1 Shop Items Display
- [ ] Navigate to a user's profile
- [ ] Click "Shop" tab (if available)
- [ ] Verify items marked "for sale" display
- [ ] Check browser console for:
  - `Shop Display - Found X portfolio items for shop from portfolioItems collection`

### 4.2 Shop Categories
- [ ] Verify "Original Artworks" category works
- [ ] Verify "Prints" category works
- [ ] Verify "Merchandise" category works
- [ ] Check items are correctly categorized

---

## 5. Upload Functionality Testing

### 5.1 New Artwork Upload
- [ ] Navigate to upload page
- [ ] Upload a new artwork/image
- [ ] Fill in required fields:
  - Title
  - Is this item for sale? (checkbox)
  - Identify item: Original/Print/Merchandise
  - Appear under my portfolio (checkbox)
  - Appear in my shop (checkbox)
- [ ] Submit upload
- [ ] Verify item appears in:
  - Your portfolio tab
  - Discover feed (if "appear under portfolio" is checked)
  - Shop (if "appear in shop" and "for sale" are checked)

### 5.2 Verify New Item in Firestore
- [ ] Go to Firebase Console → Firestore
- [ ] Check `portfolioItems` collection
- [ ] Find the newly uploaded item
- [ ] Verify it has:
  - Correct `userId`
  - Correct `showInPortfolio` value
  - Correct `showInShop` value
  - Correct `isForSale` value
  - Correct `artworkType` (original/print/merchandise)

### 5.3 Edit Existing Item
- [ ] Go to Portfolio Manager
- [ ] Edit an existing item
- [ ] Change "for sale" status
- [ ] Save changes
- [ ] Verify changes reflect in:
  - Portfolio tab
  - Shop (if applicable)
  - Discover feed

### 5.4 Mark Item as Sold
- [ ] Edit an item that's "for sale"
- [ ] Mark it as "sold"
- [ ] Verify "for sale" tag is removed
- [ ] Verify item no longer appears in shop

---

## 6. Backward Compatibility Testing

### 6.1 Fallback Mechanism (if needed)
- [ ] If `portfolioItems` collection is empty, app should:
  - Still display content from `userProfiles.portfolio`
  - Show fallback messages in console
  - Function normally

### 6.2 Mixed Data Scenario
- [ ] Test with users who have:
  - Items only in old format
  - Items only in new format
  - Items in both formats
- [ ] Verify app handles all scenarios correctly

---

## 7. Performance Testing

### 7.1 Load Times
- [ ] Check Discover feed load time
- [ ] Check Profile portfolio load time
- [ ] Verify no significant performance degradation

### 7.2 Large Datasets
- [ ] Test with users who have many portfolio items (10+)
- [ ] Verify pagination works correctly
- [ ] Check that queries don't timeout

---

## 8. Error Handling Testing

### 8.1 Missing Data
- [ ] Test with items missing required fields
- [ ] Verify app handles gracefully (doesn't crash)
- [ ] Check error messages are user-friendly

### 8.2 Network Issues
- [ ] Test with slow network connection
- [ ] Verify loading states work correctly
- [ ] Check error recovery

---

## 9. Console Log Verification

### 9.1 Expected Logs (Success)
Look for these in browser console:
- `📦 Discover: Found X portfolio items from portfolioItems collection`
- `📋 PortfolioManager: Loaded portfolio from portfolioItems collection`
- `Shop Display - Found X portfolio items for shop from portfolioItems collection`

### 9.2 Unexpected Logs (Should NOT see)
- `⚠️ Discover: Error querying portfolioItems, falling back...`
- `⚠️ PortfolioManager: Error loading from portfolioItems...`
- `📋 PortfolioManager: No items in portfolioItems, checking userProfiles.portfolio (backward compatibility)`

---

## 10. Final Verification Checklist

- [ ] All portfolio items display correctly
- [ ] Discover feed shows migrated items
- [ ] Profile tabs show correct portfolios
- [ ] Shop displays items correctly
- [ ] New uploads work and appear in correct places
- [ ] Editing items works correctly
- [ ] No console errors
- [ ] No Firestore errors
- [ ] Performance is acceptable
- [ ] All features work as expected

---

## Troubleshooting

### If items don't display:
1. Check browser console for errors
2. Verify `portfolioItems` collection has documents in Firestore
3. Check Firestore indexes are built (Firebase Console → Firestore → Indexes)
4. Verify user has correct permissions

### If migration didn't work:
1. Check migration tool results in admin panel
2. Verify no errors in migration results
3. Check Firestore console for `portfolioItems` collection
4. Try running migration again (it's idempotent)

### If uploads don't work:
1. Check browser console for errors
2. Verify Firestore permissions
3. Check that new items appear in `portfolioItems` collection
4. Verify all required fields are filled

---

## Success Criteria

✅ **Migration is successful if:**
- All portfolio items are in `portfolioItems` collection
- Discover feed displays items from new collection
- Profile tabs display items from new collection
- Shop displays items from new collection
- New uploads write to `portfolioItems` collection
- No console errors
- No fallback messages (unless testing backward compatibility)

✅ **System is ready for production if:**
- All tests pass
- No errors in console
- Performance is acceptable
- All features work correctly

