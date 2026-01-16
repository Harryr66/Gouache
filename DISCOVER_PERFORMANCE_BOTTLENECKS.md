# Discover Page Performance Bottlenecks Analysis

## 🔴 CRITICAL BOTTLENECKS (High Impact)

### 1. **Excessive Console Logging (112 console.log/warn/error calls)**
**Impact:** HIGH - Blocks main thread, slows down execution
- **Location:** Throughout `discover/page.tsx`
- **Problem:** 112 console statements running in production
- **Cost:** Each console.log blocks the main thread for ~1-5ms
- **Total Cost:** 112-560ms of blocked execution
- **Fix:** Remove all console.log in production, use conditional logging
- **Priority:** 🔴 CRITICAL

### 2. **Masonry Grid Recalculations on Every Image Load**
**Impact:** HIGH - Causes layout shifts and jank
- **Location:** Lines 214-368 in `discover/page.tsx`
- **Problem:** `getBoundingClientRect()` called for EVERY item on EVERY image load
- **Cost:** ~0.5-2ms per item × 20-30 items = 10-60ms per image load
- **Issue:** Multiple images loading simultaneously = multiple recalculations
- **Fix:** Batch position calculations, use ResizeObserver instead of load events
- **Priority:** 🔴 CRITICAL

### 3. **Excessive Event Listeners (Load/Resize)**
**Impact:** HIGH - Memory leaks and performance degradation
- **Location:** Lines 312-341, 1162, 2372, 2424, 2793
- **Problem:** 
  - Event listeners added to EVERY image/video element
  - Multiple resize listeners
  - Multiple scroll listeners (fallback + IntersectionObserver)
- **Cost:** Memory overhead + event handler execution
- **Fix:** Use single delegated event listener, remove duplicate listeners
- **Priority:** 🔴 CRITICAL

### 4. **Heavy Filtering/Sorting Operations (71 array operations)**
**Impact:** MEDIUM-HIGH - Blocks main thread during filtering
- **Location:** `filteredAndSortedArtworks` useMemo (line 2494)
- **Problem:** 
  - Multiple `.filter()`, `.map()`, `.sort()` operations
  - Runs on EVERY state change
  - No memoization of intermediate results
- **Cost:** 5-20ms per filter operation × multiple operations
- **Fix:** Optimize filter chain, cache intermediate results
- **Priority:** 🟠 HIGH

### 5. **Multiple IntersectionObservers**
**Impact:** MEDIUM - Unnecessary overhead
- **Location:** Lines 2433, 2799
- **Problem:** 
  - Grid view has IntersectionObserver
  - List view has IntersectionObserver
  - Fallback scroll listener ALSO running
  - All checking same conditions
- **Cost:** Multiple observers checking same elements
- **Fix:** Single observer, conditionally handle different views
- **Priority:** 🟠 HIGH

### 6. **DOM Manipulation in Preload Effect**
**Impact:** MEDIUM - Creates DOM elements on every render
- **Location:** Lines 2851-2905
- **Problem:** 
  - Creates `<link>` elements in `document.head` for preloading
  - Runs on EVERY `filteredAndSortedArtworks` change
  - Never cleans up old preload links
  - Can accumulate 100+ link elements
- **Cost:** DOM manipulation + memory leak
- **Fix:** Clean up old preload links, debounce preload effect
- **Priority:** 🟠 HIGH

## 🟠 HIGH IMPACT BOTTLENECKS

### 7. **Masonry Position Calculation Uses getBoundingClientRect()**
**Impact:** MEDIUM-HIGH - Forces layout recalculation
- **Location:** Line 253 in `calculatePositions()`
- **Problem:** `getBoundingClientRect()` forces synchronous layout calculation
- **Cost:** ~0.5-2ms per item, called for all items
- **Fix:** Cache heights, use ResizeObserver for dynamic heights
- **Priority:** 🟠 HIGH

### 8. **Container Height Calculation on Every Render**
**Impact:** MEDIUM - Unnecessary computation
- **Location:** Lines 370-380
- **Problem:** Calculates container height on every render
- **Cost:** ~1-5ms per render
- **Fix:** Memoize, only recalculate when positions change
- **Priority:** 🟠 MEDIUM

### 9. **Multiple useEffect Dependencies Causing Re-renders**
**Impact:** MEDIUM - Cascading re-renders
- **Location:** Throughout file (215 useEffect/useMemo/useCallback)
- **Problem:** 
  - Dependencies include entire arrays/objects
  - Changes trigger multiple effects
  - No dependency optimization
- **Cost:** Multiple re-renders per state change
- **Fix:** Optimize dependencies, use refs for stable values
- **Priority:** 🟠 MEDIUM

### 10. **Image Preloading Creates DOM Elements**
**Impact:** MEDIUM - DOM pollution
- **Location:** Lines 2895-2901
- **Problem:** 
  - Creates `<link>` elements for preloading
  - Never removes them
  - Accumulates over time
- **Cost:** DOM bloat, memory usage
- **Fix:** Clean up preload links, use Resource Hints API properly
- **Priority:** 🟠 MEDIUM

## 🟡 MEDIUM IMPACT BOTTLENECKS

### 11. **Excessive State Updates**
**Impact:** MEDIUM - Causes re-renders
- **Problem:** 
  - Multiple `setState` calls in sequence
  - Not batched properly
  - Triggers multiple renders
- **Fix:** Batch state updates, use `startTransition` more
- **Priority:** 🟡 MEDIUM

### 12. **No Virtualization for Large Lists**
**Impact:** MEDIUM - Renders all items even if not visible
- **Problem:** 
  - Renders 20-50 items at once
  - All in DOM even if scrolled out of view
- **Cost:** Memory + render cost for off-screen items
- **Fix:** Implement virtual scrolling (react-window/react-virtuoso)
- **Priority:** 🟡 MEDIUM

### 13. **Heavy Sorting with Engagement Calculations**
**Impact:** MEDIUM - Expensive computation
- **Location:** Lines 2544-2670
- **Problem:** 
  - Calculates engagement scores for sorting
  - Runs on every filter change
  - No caching of scores
- **Cost:** 10-50ms per sort operation
- **Fix:** Cache engagement scores, only recalculate when needed
- **Priority:** 🟡 MEDIUM

### 14. **Multiple Resize Listeners**
**Impact:** LOW-MEDIUM - Unnecessary overhead
- **Location:** Lines 1162, 2793
- **Problem:** 
  - Mobile detection resize listener
  - Items per row resize listener
  - Both listening to same event
- **Fix:** Single resize listener, delegate to handlers
- **Priority:** 🟡 LOW-MEDIUM

### 15. **No Debouncing on Filter Changes**
**Impact:** LOW-MEDIUM - Multiple filter operations
- **Problem:** 
  - Filter changes trigger immediate recalculation
  - User typing in search = multiple filters
- **Fix:** Debounce filter operations (already using `useDeferredValue` but could be better)
- **Priority:** 🟡 LOW-MEDIUM

## 🔵 LOW IMPACT (But Still Worth Fixing)

### 16. **No Image Lazy Loading Optimization**
**Impact:** LOW - Could be better
- **Problem:** 
  - Uses Next.js Image but no intersection-based loading
  - All images in viewport load at once
- **Fix:** Implement proper lazy loading with IntersectionObserver
- **Priority:** 🔵 LOW

### 17. **Video Metadata Loading**
**Impact:** LOW - Network overhead
- **Problem:** 
  - Loads video metadata even if video won't play
  - Multiple video elements in DOM
- **Fix:** Only load metadata for visible videos
- **Priority:** 🔵 LOW

### 18. **No Request Deduplication**
**Impact:** LOW - Could cause duplicate requests
- **Problem:** 
  - Multiple components might request same image
  - No request caching/deduplication
- **Fix:** Implement request deduplication
- **Priority:** 🔵 LOW

## 📊 SUMMARY BY IMPACT

### 🔴 CRITICAL (Fix Immediately)
1. Remove console.log statements (112 calls)
2. Optimize masonry recalculations
3. Fix event listener leaks
4. Optimize filtering/sorting (71 operations)

### 🟠 HIGH (Fix Soon)
5. Multiple IntersectionObservers
6. DOM manipulation in preload
7. getBoundingClientRect() usage
8. Container height calculations

### 🟡 MEDIUM (Fix When Possible)
9. State update batching
10. Virtualization
11. Engagement score caching
12. Resize listener consolidation

### 🔵 LOW (Nice to Have)
13. Image lazy loading optimization
14. Video metadata optimization
15. Request deduplication

## 🎯 QUICK WINS (Easiest Fixes with Big Impact)

1. **Remove console.log** - 5 minutes, saves 100-500ms
2. **Clean up preload links** - 10 minutes, prevents memory leak
3. **Consolidate event listeners** - 15 minutes, reduces overhead
4. **Optimize masonry calculations** - 30 minutes, eliminates jank
5. **Fix IntersectionObserver duplication** - 20 minutes, reduces overhead

## 💡 ESTIMATED PERFORMANCE GAINS

- **Remove console.log:** +100-500ms faster
- **Optimize masonry:** Eliminates layout jank, +50-200ms faster
- **Fix event listeners:** Prevents memory leaks, smoother scrolling
- **Optimize filtering:** +50-100ms faster filtering
- **Total potential gain:** 200-800ms faster initial load, smoother scrolling
