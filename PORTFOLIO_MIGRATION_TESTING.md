# Portfolio Migration Testing Guide

## ✅ Implementation Complete

All components have been updated to use the new `portfolioItems` collection with full backward compatibility.

---

## 📋 Pre-Deployment Checklist

### Step 1: Deploy Firestore Indexes (CRITICAL - Do this first!)

The new queries require indexes. Deploy them before testing:

```bash
# Option 1: Using Firebase CLI
firebase deploy --only firestore:indexes

# Option 2: If using Vercel/other hosting, indexes will auto-deploy from firestore.indexes.json
```

**Wait for indexes to build** (check Firebase Console → Firestore → Indexes). This can take 5-15 minutes.

**Verify indexes are built:**
- Go to Firebase Console → Firestore → Indexes
- Look for 3 new indexes on `portfolioItems` collection:
  1. `userId + showInPortfolio + deleted + createdAt`
  2. `userId + isForSale + showInShop + deleted + createdAt`
  3. `showInPortfolio + deleted + createdAt`

---

## 🧪 Testing Steps

### Phase 1: Pre-Migration Testing (Current State)

**Goal:** Verify everything works with existing `userProfiles.portfolio` arrays.

#### Test 1.1: Portfolio Manager
1. Navigate to your profile → Portfolio tab
2. **Verify:** Your existing portfolio items load correctly
3. **Action:** Try adding a new portfolio item
4. **Verify:** 
   - Item appears in your portfolio immediately
   - Item is saved to both `portfolioItems` collection AND `userProfiles.portfolio` (backward compatibility)

#### Test 1.2: Discover Feed
1. Navigate to Discover page
2. **Verify:** Feed loads and shows portfolio items from all artists
3. **Check Console:** Look for log messages:
   - `📦 Discover: Found X portfolio items from portfolioItems collection`
   - OR `📋 Discover: No items in portfolioItems, checking userProfiles.portfolio (backward compatibility)`

#### Test 1.3: Shop Display
1. Navigate to a profile with items for sale → Shop tab
2. **Verify:** Shop items load correctly
3. **Check Console:** Should see:
   - `Shop Display - Found X portfolio items for shop from portfolioItems collection`
   - OR fallback to artworks collection

#### Test 1.4: Profile Tabs (Other Users)
1. Navigate to another user's profile → Portfolio tab
2. **Verify:** Their portfolio items display correctly
3. **Check Console:** Should see portfolio loading messages

#### Test 1.5: Upload Components
1. Upload a new artwork using any upload form
2. **Verify:** 
   - Upload succeeds
   - Item appears in your portfolio
   - Item appears in Discover feed (if `showInPortfolio: true`)
   - Item appears in Shop (if `isForSale: true`)

---

### Phase 2: Migration Testing

**Goal:** Migrate existing data and verify migration worked.

#### Step 2.1: Check Migration Status

Create a test page or use browser console:

```javascript
// In browser console on your site
import { checkMigrationStatus } from '@/lib/migrate-portfolio';

const status = await checkMigrationStatus();
console.log('Migration Status:', status);
// Should show: totalUsers, usersWithPortfolios, usersMigrated, etc.
```

#### Step 2.2: Run Migration (DRY RUN FIRST!)

**⚠️ IMPORTANT: Test with dry run first!**

```javascript
// In browser console or create admin page
import { migratePortfoliosToCollection } from '@/lib/migrate-portfolio';

// DRY RUN - No actual migration
const dryRunStats = await migratePortfoliosToCollection(10, true);
console.log('Dry Run Results:', dryRunStats);
// Review: totalItemsMigrated, itemsSkipped, errors

// If dry run looks good, run actual migration
const migrationStats = await migratePortfoliosToCollection(10, false);
console.log('Migration Results:', migrationStats);
```

**Expected Results:**
- `totalItemsMigrated` should match your total portfolio items
- `errors` array should be empty
- Check Firebase Console → Firestore → `portfolioItems` collection to verify items were created

#### Step 2.3: Verify Migration

1. **Check Firestore Console:**
   - Go to Firebase Console → Firestore → `portfolioItems` collection
   - Verify items exist with correct structure
   - Check that `userId` field is set correctly
   - Check that `showInPortfolio`, `isForSale`, etc. are preserved

2. **Verify Data Integrity:**
   - Compare count: `portfolioItems` count should match sum of all `userProfiles.portfolio` arrays
   - Spot check: Pick a few users and verify their portfolio items migrated correctly

---

### Phase 3: Post-Migration Testing

**Goal:** Verify everything works with new `portfolioItems` collection.

#### Test 3.1: Portfolio Manager (After Migration)
1. Navigate to your profile → Portfolio tab
2. **Verify:** Portfolio loads from `portfolioItems` collection (check console logs)
3. **Action:** Edit an existing portfolio item
4. **Verify:** Changes save correctly
5. **Action:** Delete a portfolio item
6. **Verify:** Item is soft-deleted (deleted: true) in `portfolioItems`

#### Test 3.2: Discover Feed (After Migration)
1. Navigate to Discover page
2. **Verify:** Feed loads much faster (no more loading 100 user profiles!)
3. **Check Console:** Should see:
   - `📦 Discover: Found X portfolio items from portfolioItems collection`
   - Should NOT see backward compatibility fallback
4. **Verify:** All portfolio items appear correctly
5. **Test Pagination:** Scroll down, verify infinite scroll works

#### Test 3.3: Shop Display (After Migration)
1. Navigate to a profile with items for sale → Shop tab
2. **Verify:** Shop items load from `portfolioItems` collection
3. **Check Console:** Should see:
   - `Shop Display - Found X portfolio items for shop from portfolioItems collection`
4. **Verify:** All shop items appear with correct prices, images, etc.

#### Test 3.4: Profile Tabs (After Migration)
1. Navigate to another user's profile → Portfolio tab
2. **Verify:** Portfolio loads from `portfolioItems` collection
3. **Check Console:** Should see:
   - `📋 Portfolio loaded from portfolioItems collection for user: X`

#### Test 3.5: Upload Components (After Migration)
1. Upload a new artwork
2. **Verify:** 
   - Item is created in `portfolioItems` collection
   - Item appears in portfolio immediately
   - Item appears in Discover feed
   - Item appears in Shop (if marked for sale)
3. **Check Firestore:** Verify item structure in `portfolioItems` collection

#### Test 3.6: Performance Testing
1. **Before/After Comparison:**
   - Check Discover page load time (should be significantly faster)
   - Check portfolio page load time (should be faster)
   - Check shop page load time (should be faster)

2. **Firestore Console:**
   - Go to Firebase Console → Firestore → Usage
   - Compare read counts (should be lower due to more efficient queries)

---

### Phase 4: Edge Cases & Error Handling

#### Test 4.1: Empty Portfolio
1. Create a test user with no portfolio items
2. **Verify:** No errors, empty state displays correctly

#### Test 4.2: Large Portfolio
1. Test with a user who has 50+ portfolio items
2. **Verify:** All items load correctly
3. **Verify:** Pagination works if implemented

#### Test 4.3: Concurrent Updates
1. Open portfolio manager in two tabs
2. Edit the same item in both tabs
3. **Verify:** Both updates succeed (no conflicts)

#### Test 4.4: Deleted Items
1. Soft-delete a portfolio item
2. **Verify:** Item doesn't appear in portfolio/discover/shop
3. **Verify:** Item still exists in Firestore with `deleted: true`

#### Test 4.5: Missing Artist Data
1. Create a portfolio item with invalid `userId`
2. **Verify:** Discover feed handles gracefully (skips item or shows placeholder)

---

## 🔍 Debugging Tips

### Check Console Logs

All components log their data source. Look for:
- `📋 PortfolioManager: Loaded portfolio from portfolioItems collection` ✅ (new)
- `📋 PortfolioManager: Loaded portfolio from userProfiles.portfolio (legacy)` ⚠️ (fallback)
- `📦 Discover: Found X portfolio items from portfolioItems collection` ✅ (new)
- `Shop Display - Found X portfolio items for shop from portfolioItems collection` ✅ (new)

### Firestore Console Checks

1. **portfolioItems Collection:**
   - Check document structure
   - Verify `userId` field exists
   - Verify `showInPortfolio`, `isForSale`, `deleted` fields are correct
   - Check `createdAt` and `updatedAt` timestamps

2. **Indexes:**
   - Verify all 3 indexes are built (green checkmark)
   - If building, wait for completion before testing queries

3. **Query Performance:**
   - Check Firestore Console → Usage
   - Monitor read/write counts
   - Should see fewer reads after migration

### Common Issues

**Issue:** "Missing index" error
- **Solution:** Deploy indexes and wait for them to build

**Issue:** Portfolio items not appearing
- **Check:** `showInPortfolio` field is `true`
- **Check:** `deleted` field is `false`
- **Check:** Console logs to see which data source is being used

**Issue:** Migration fails
- **Check:** Firestore rules allow writes to `portfolioItems`
- **Check:** User has proper permissions
- **Check:** Batch size isn't too large (try smaller batches)

---

## 📊 Success Criteria

✅ **All tests pass**
✅ **Discover feed loads faster** (no more loading 100 user profiles)
✅ **Portfolio operations work** (create, read, update, delete)
✅ **Shop displays correctly** (items for sale appear)
✅ **No data loss** (all portfolio items migrated)
✅ **Backward compatibility works** (fallback to `userProfiles.portfolio` if needed)
✅ **Performance improved** (fewer Firestore reads)

---

## 🚀 Post-Migration Cleanup (Optional - Future)

Once migration is verified and stable:

1. **Remove backward compatibility code** (after 1-2 weeks of stable operation)
2. **Clean up `userProfiles.portfolio` arrays** (optional - keep for backup)
3. **Monitor performance** (should see 50-70% reduction in Firestore reads)

---

## 📝 Notes

- **Backward compatibility is built-in:** All components check `portfolioItems` first, then fall back to `userProfiles.portfolio` if empty
- **Migration is safe:** Original data in `userProfiles.portfolio` is not deleted
- **Rollback is possible:** If issues occur, components will automatically fall back to `userProfiles.portfolio`
- **Indexes are required:** Queries will fail without proper indexes

---

## 🆘 Support

If you encounter issues:
1. Check console logs for error messages
2. Verify Firestore indexes are built
3. Check Firestore rules allow access to `portfolioItems`
4. Review migration stats for errors
5. Test with a single user first before full migration

