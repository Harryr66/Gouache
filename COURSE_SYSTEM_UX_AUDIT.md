# COURSE SYSTEM - COMPREHENSIVE UX AUDIT
**Date:** January 2, 2026  
**Auditor:** AI Assistant  
**Status:** Pre-Implementation Analysis

---

## EXECUTIVE SUMMARY

### Critical Issues Found:
1. **BROKEN:** Learn marketplace redirects to `/news` - users cannot discover courses
2. **BUG:** Course edits not persisting (partially fixed, needs verification)
3. **UX:** No draft auto-save - users lose work if browser closes
4. **UX:** No "Save Draft" button visible until final "Publish" step
5. **UX:** Confusing navigation - must go through all 6 steps to publish
6. **UX:** No course deletion UI exists
7. **UX:** No way to unpublish a course once published
8. **UX:** Step validation blocks navigation but doesn't show inline errors

---

## PART 1: CURRENT USER JOURNEY MAPPING

### Journey 1: Creating a New Course

**Entry Point:** User clicks "Create Course" button

**Step-by-Step Experience:**

1. **Landing:** User arrives at `/learn/submit`
   - **Good:** Draft courses displayed at top
   - **Issue:** No explanation of the process
   - **Issue:** No progress indicator

2. **Step 1 - Basics:**
   - Fields: Title, Description, Course Type, Category, Subcategory, Difficulty, Duration, Instructor Bio
   - **Good:** Clean form layout
   - **Issue:** No auto-save - if browser crashes, all work lost
   - **Issue:** Can't save draft yet (no button visible)
   - **Issue:** Long instructor bio field with no character count
   - **Issue:** No preview of how course will look

3. **Step 2 - Curriculum:**
   - **For Hosted Courses:** Upload lessons with videos
   - **For Course Links:** Skip this step
   - **Issue:** No way to reorder lessons after creation
   - **Issue:** No way to edit lesson after adding
   - **Issue:** Video upload has no progress indicator
   - **Issue:** Can't save work-in-progress here either

4. **Step 3 - Media:**
   - Upload thumbnail (required) and trailer (optional)
   - **Issue:** No image size/format guidance
   - **Issue:** No way to replace thumbnail once uploaded
   - **Issue:** Still can't save draft

5. **Step 4 - Pricing:**
   - Set price and currency
   - **Issue:** No guidance on pricing strategy
   - **Issue:** Can't set "Pay What You Want"
   - **Issue:** Still no draft save option

6. **Step 5 - Discoverability:**
   - Tags, SEO, Slug
   - **Issue:** AI tag generation exists but unclear
   - **Issue:** Slug validation happens on blur, not real-time
   - **Issue:** STILL no way to save draft

7. **Step 6 - Publish:**
   - Final confirmation
   - **Issue:** Originality disclaimer checkbox (confusing placement)
   - **Issue:** "Submit Course" vs "Save Draft" - both buttons here but unclear difference
   - **BLOCKER:** Requires Stripe connection (good) but error message only appears HERE after going through all 6 steps

**Exit Points:**
- ✅ Success: Course published, redirected to course detail page
- ❌ Browser crash: ALL WORK LOST (no auto-save)
- ❌ Stripe not connected: Wasted time going through all steps
- ❌ Missing required field: Blocked at final step

---

### Journey 2: Editing an Existing Course

**Entry Point:** User clicks edit button on draft or published course

**Step-by-Step Experience:**

1. **Loading:**
   - Course data fetched from Firestore
   - Form populated with existing values
   - **Good:** Data loads correctly (after recent fixes)
   - **Issue:** No loading state indicator

2. **Editing Fields:**
   - User navigates between steps to make changes
   - **Critical Bug (Recently Fixed):** Changes were being overwritten on save
   - **Issue:** "Save Changes" button only appears on non-publish steps
   - **Issue:** No confirmation before navigating away with unsaved changes
   - **Issue:** No visual indicator of unsaved changes

3. **Saving Changes:**
   - Click "Save Changes" button
   - **Issue:** Confusing toast messages (recently improved)
   - **Issue:** No real-time update in UI - must reload to see changes
   - **Issue:** Unclear if changes are published immediately or saved as draft

**Exit Points:**
- ✅ Save successful: Toast appears, but no visual confirmation in UI
- ❌ Network error: Changes lost, no retry mechanism
- ❌ User navigates away: No warning, changes lost

---

### Journey 3: Publishing a Draft Course

**Entry Point:** User wants to publish a draft

**Current Experience:**
1. Click edit on draft
2. Navigate through ALL 6 steps (even if everything is filled)
3. Reach final "Publish" step
4. Click "Submit Course"
5. Course becomes published

**Issues:**
- **Major UX Problem:** Must go through entire 6-step flow even if course is complete
- **Better UX:** Should have "Publish Now" button directly on draft card
- **Missing:** No way to schedule publishing for a future date

---

### Journey 4: Discovering Courses (BROKEN)

**Entry Point:** User navigates to Learn marketplace

**Current Experience:**
1. User clicks "Learn" in navigation
2. **BROKEN:** Immediately redirected to `/news` page
3. **Result:** Users CANNOT discover any courses

**Expected Experience:**
- Browse all published courses
- Filter by category, price, difficulty
- Search by keywords
- See featured courses
- See instructor profiles

**Status:** **COMPLETELY NON-FUNCTIONAL**

---

### Journey 5: Viewing Courses on Profile (PARTIALLY WORKING)

**Entry Point:** User views an instructor's profile

**Current Experience:**
1. User navigates to profile
2. Clicks "Learn" tab
3. Sees grid of published courses (3 per row mobile, 4 per row desktop)
4. **Good:** Courses display correctly
5. **Issue:** Only shows published courses, no indication of drafts for own profile
6. **Issue:** No "Create Course" button if no courses exist (relies on hidden button elsewhere)

---

### Journey 6: Deleting a Course (MISSING)

**Entry Point:** User wants to delete a course

**Current Experience:**
- **NO UI EXISTS** for course deletion
- User is stuck with courses they don't want

**Expected Experience:**
- Delete button on course card (with confirmation)
- Soft delete (recoverable for 30 days)
- Option to permanently delete

**Status:** **COMPLETELY MISSING**

---

### Journey 7: Unpublishing a Course (MISSING)

**Entry Point:** User wants to temporarily hide a published course

**Current Experience:**
- **NO UI EXISTS** for unpublishing
- Once published, always published

**Expected Experience:**
- "Unpublish" button to change `isPublished: false`
- Course moves back to drafts
- Can re-publish later

**Status:** **COMPLETELY MISSING**

---

## PART 2: CRITICAL BUGS & ISSUES

### HIGH PRIORITY (Blocks core functionality)

1. **Learn Marketplace Redirects to /news**
   - **Impact:** Users cannot discover ANY courses
   - **Severity:** CRITICAL
   - **Location:** `src/app/(main)/learn/page.tsx` line 13
   - **Fix:** Remove redirect, implement marketplace UI

2. **Course Edit Data Loss (Partially Fixed)**
   - **Impact:** Changes don't persist
   - **Severity:** CRITICAL
   - **Status:** Recent fix applied, needs testing
   - **Location:** `src/app/(main)/learn/submit/page.tsx` lines 167-170

3. **No Draft Auto-Save**
   - **Impact:** Users lose hours of work if browser crashes
   - **Severity:** HIGH
   - **Solution:** Implement auto-save every 30 seconds to Firestore

4. **No Course Deletion**
   - **Impact:** Users cannot remove unwanted courses
   - **Severity:** HIGH
   - **Solution:** Add delete functionality with confirmation

### MEDIUM PRIORITY (Degrades UX significantly)

5. **Stripe Check Only at Final Step**
   - **Impact:** Users waste time filling entire form before learning they can't submit
   - **Severity:** MEDIUM
   - **Solution:** Check Stripe status immediately when loading page

6. **No "Save Draft" Button Until Final Step**
   - **Impact:** Users can't save work-in-progress
   - **Severity:** MEDIUM
   - **Solution:** Add "Save Draft" button to every step

7. **Confusing Multi-Step Navigation**
   - **Impact:** Users frustrated by mandatory 6-step flow even when editing one field
   - **Severity:** MEDIUM
   - **Solution:** Allow direct saving from any step when editing

8. **No Unsaved Changes Warning**
   - **Impact:** Users accidentally lose changes when navigating away
   - **Severity:** MEDIUM
   - **Solution:** Add `beforeunload` event listener

### LOW PRIORITY (Minor annoyances)

9. **No Progress Indicator**
   - **Impact:** Users don't know how far through process they are
   - **Solution:** Add progress bar showing "Step 3 of 6"

10. **No Inline Validation**
    - **Impact:** Users only see errors in toast messages
    - **Solution:** Add red error text under invalid fields

11. **No Upload Progress**
    - **Impact:** Users don't know if large video uploads are working
    - **Solution:** Add progress bar for media uploads

---

## PART 3: UX OPTIMIZATION RECOMMENDATIONS

### Recommendation 1: Implement Auto-Save
**Current:** Manual save only
**Proposed:** Auto-save every 30 seconds when fields change
**Benefit:** Zero data loss, peace of mind
**Implementation:**
- Debounced save function
- Visual indicator "Saving..." / "All changes saved"
- Save to Firestore with `isPublished: false`

### Recommendation 2: Conditional Step Flow
**Current:** Must go through all 6 steps sequentially
**Proposed:** Smart navigation based on context
- **New Course:** Full 6-step wizard
- **Editing:** Direct to specific step via step indicator
- **Quick Edit:** Modal overlay for simple changes (title, price)
**Benefit:** 80% faster editing experience

### Recommendation 3: Progressive Disclosure
**Current:** All fields shown at once in each step
**Proposed:** Show required fields first, "Advanced Options" collapsed
**Example - Basics Step:**
- Title (required) ⭐
- Description (required) ⭐
- Category (required) ⭐
- **[Advanced Options ▼]**
  - SEO Title
  - Meta Description
  - Custom Slug
**Benefit:** Less overwhelming for new users

### Recommendation 4: Instant Feedback
**Current:** Toast messages only
**Proposed:** Multi-channel feedback
- Inline validation (red text under fields)
- Success checkmarks next to completed fields
- Real-time slug availability check
- Character counters on text areas
**Benefit:** Clearer communication of system state

### Recommendation 5: Draft Management Dashboard
**Current:** Drafts shown above form
**Proposed:** Dedicated `/learn/drafts` page
- Grid view of all drafts
- Quick actions: Edit, Publish, Delete
- Sort by: Last edited, Created date, Title
- Bulk actions: Publish multiple, Delete multiple
**Benefit:** Better organization for instructors with many courses

### Recommendation 6: One-Click Publish
**Current:** Must navigate to final step
**Proposed:** "Publish Now" button on draft cards
- Validates all required fields
- Shows checklist of missing requirements
- One-click publish if everything is ready
**Benefit:** 90% time savings for publishing ready drafts

---

## PART 4: DATA FLOW ANALYSIS

### Current Data Storage Pattern

```
courses/
  {courseId}/
    title: string
    description: string
    category: string
    subcategory: string
    difficulty: string
    duration: string
    price: number
    currency: string
    tags: string[]
    instructor: {
      userId: string
      name: string
      bio: string
      avatar: string
      ...
    }
    thumbnail: string (Cloudflare Images URL)
    previewVideoUrl?: string (Cloudflare Stream URL)
    curriculum: [{
      week: number
      title: string
      lessons: [{
        id: string
        title: string
        videoUrl: string (Cloudflare Stream URL)
        duration: string
        type: 'video' | 'reading' | 'assignment'
        ...
      }]
    }]
    courseType: 'hosted' | 'affiliate'
    externalUrl?: string
    hostingPlatform?: string
    supplyList: [{
      item: string
      brand: string
      affiliateLink?: string
    }]
    isPublished: boolean
    status: 'approved' | 'pending' (currently auto-approved)
    createdAt: timestamp
    updatedAt: timestamp
    publishedAt?: timestamp
```

### Issues with Current Data Model:
1. **No version history:** Can't undo changes
2. **No draft/published separation:** Published courses can't have unpublished changes
3. **Instructor data duplicated:** Should reference userProfiles collection
4. **No soft delete flag:** `deleted: boolean` field missing

---

## PART 5: PROPOSED IMPROVEMENTS

### Improvement 1: Two-Document System
**Problem:** Can't edit published course without affecting live version
**Solution:** Separate draft and live documents
```
courses/{courseId}/                 ← Live published version
courses-drafts/{courseId}/          ← Draft/unpublished version
```
**Workflow:**
1. User edits course → saves to `courses-drafts/`
2. User clicks "Publish" → copies to `courses/`
3. Users see live version, instructor sees draft preview

### Improvement 2: Auto-Save Implementation
```typescript
// Debounced auto-save
const autoSave = useMemo(
  () => debounce(async (data) => {
    await updateDoc(doc(db, 'courses-drafts', courseId), {
      ...data,
      lastAutoSave: serverTimestamp()
    });
    setLastSaved(new Date());
  }, 3000),
  [courseId]
);

// Trigger on form changes
useEffect(() => {
  if (formData && !isLoadingCourse) {
    autoSave(formData);
  }
}, [formData, autoSave]);
```

### Improvement 3: Smart Validation
```typescript
// Per-step validation schema
const stepValidation = {
  basics: ['title', 'description', 'category', 'subcategory', 'difficulty', 'duration', 'instructorBio'],
  curriculum: (data) => data.courseType === 'hosted' ? ['curriculum.length > 0'] : [],
  media: ['thumbnail'],
  pricing: ['price'],
  discoverability: (data) => data.courseType === 'affiliate' ? ['externalUrl', 'hostingPlatform'] : [],
  publish: ['originalityDisclaimer']
};

// Real-time validation
const validateStep = (step: StepId) => {
  const required = stepValidation[step];
  const errors = {};
  required.forEach(field => {
    if (!formData[field]) {
      errors[field] = 'This field is required';
    }
  });
  return errors;
};
```

### Improvement 4: Restore Learn Marketplace
```typescript
// src/app/(main)/learn/page.tsx
export default function LearnMarketplacePage() {
  const { courses } = useCourses();
  const publishedCourses = courses.filter(c => c.isPublished === true);
  
  return (
    <div>
      <h1>Learn from Artists</h1>
      <CourseGrid courses={publishedCourses} />
    </div>
  );
}
```

---

## PART 6: IMPLEMENTATION ROADMAP

### Phase 1: Critical Fixes (Week 1)
1. ✅ Fix course edit data loss (DONE - needs verification)
2. 🔴 Restore Learn marketplace (remove redirect)
3. 🔴 Add course deletion with confirmation
4. 🔴 Add Stripe status check on page load
5. 🔴 Add "Save Draft" button to all steps

### Phase 2: Auto-Save & Validation (Week 2)
6. 🔴 Implement auto-save every 30 seconds
7. 🔴 Add unsaved changes warning
8. 🔴 Add inline field validation with error messages
9. 🔴 Add upload progress indicators
10. 🔴 Add character counters to text fields

### Phase 3: UX Enhancements (Week 3)
11. 🔴 Add progress indicator (Step X of 6)
12. 🔴 Implement one-click publish for ready drafts
13. 🔴 Add course unpublish functionality
14. 🔴 Create dedicated drafts management page
15. 🔴 Add course preview mode

### Phase 4: Advanced Features (Week 4)
16. 🔴 Implement two-document draft/live system
17. 🔴 Add version history (undo changes)
18. 🔴 Add bulk operations for drafts
19. 🔴 Add scheduled publishing
20. 🔴 Add course analytics dashboard

---

## QUESTIONS FOR USER

Before implementing these changes, please answer:

### Question 1: Auto-Save Behavior
- Should auto-save happen silently or show "Saving..." indicator?
- Should there be a manual "Save" button as well, or auto-save only?
- How often should auto-save trigger? (I recommend 30 seconds)

### Question 2: Draft vs Published
- When editing a published course, should changes be:
  a) **Live immediately** (current behavior)
  b) **Saved as draft** until you click "Publish Changes"
- Do you want the ability to preview changes before publishing?

### Question 3: Learn Marketplace
- Should marketplace show ALL published courses from all instructors?
- Should there be featured/promoted course slots?
- Should marketplace have filters (category, price range, difficulty)?

### Question 4: Course Deletion
- **Soft delete** (hide from UI but keep in database for 30 days)?
- **Hard delete** (permanently remove immediately)?
- Should deleted courses be recoverable?

### Question 5: Navigation Flow
- Should instructors be able to skip directly to any step when editing?
- Should "Save & Exit" button exist on every step?
- Should there be keyboard shortcuts (Ctrl+S to save)?

### Question 6: Validation Approach
- Block navigation until step is valid (current)?
- Allow navigation but show warnings?
- Inline errors vs toast messages?

---

## CONCLUSION

**Current State:** The course system has fundamental functionality but multiple critical UX issues and missing features prevent it from providing an excellent user experience.

**Recommended Priority:**
1. **Immediate:** Fix Learn marketplace redirect (1 hour)
2. **Immediate:** Verify course edit fix works (30 mins testing)
3. **This Week:** Add auto-save, Stripe check, Save Draft button
4. **Next Week:** Implement inline validation, progress indicators
5. **Future:** Advanced features like version history, scheduling

**Estimated Total Implementation Time:** 3-4 weeks for all improvements

**Next Steps:**
1. User answers questions above
2. Prioritize implementation order
3. Begin systematic implementation with testing
4. Deploy incrementally (not all at once)

