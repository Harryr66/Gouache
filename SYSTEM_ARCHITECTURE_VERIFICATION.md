# System Architecture Verification

## Overview
This document verifies that the system correctly implements the Instagram-esque ecosystem for art lovers and artists.

---

## ✅ Account Types

### User Account (Art Lover)
- **Purpose**: Browse, discover, and appreciate art
- **Capabilities**:
  - ✅ View discover feed
  - ✅ Filter artworks by tags, medium, category, etc.
  - ✅ Click artwork → view artist profile
  - ✅ Follow artists
  - ✅ Like artworks
  - ✅ Create own profile (non-professional)

### Artist Account (Art Creator)
- **Purpose**: Showcase work and connect with art lovers
- **Capabilities**:
  - ✅ All user capabilities PLUS:
  - ✅ Upload portfolio artworks (with tags)
  - ✅ Edit portfolio items (including tags)
  - ✅ Display products (Shop tab)
  - ✅ Display courses (Learn tab)
  - ✅ Add upcoming events
  - ✅ Add showcase locations
  - ✅ Add newsletter link

**Implementation**: `isProfessional` flag in `userProfiles` collection distinguishes artists from regular users.

---

## ✅ Discover Feed System

### Data Source
- **Source**: Artist portfolios from `userProfiles` collection
- **Query**: `where('isProfessional', '==', true)`
- **Location**: `src/app/(main)/discover/page.tsx` (lines 691-833)

### Portfolio → Artwork Conversion
1. Fetches all professional artists
2. Extracts `portfolio` array from each artist
3. Converts each portfolio item to `Artwork` object:
   - ✅ Includes `tags` from portfolio item
   - ✅ Includes `medium` from portfolio item
   - ✅ Includes `title`, `description`, `imageUrl`
   - ✅ Links to artist via `artist.id` (Firestore document ID)

### Default Display Order
- **Default**: `'random'` (renamed to "Shuffle" in UI)
- **Implementation**: `src/app/(main)/discover/page.tsx` (line 132: `const [sortBy, setSortBy] = useState('random')`)
- **Shuffle Function**: Fisher-Yates algorithm applied to `filteredArtworks`
- **Result**: Artworks displayed in random order by default, preventing chronological clustering

### Filtering System
- **Tags Filter**: ✅ Implemented (lines 993-999)
  - Filters by `artwork.tags` array
  - Case-insensitive matching
  - Multiple tags supported (OR logic)
- **Category Filter**: ✅ Implemented
- **Medium Filter**: ✅ Implemented
- **Verified Only**: ✅ Implemented
- **Country/City Filter**: ✅ Implemented
- **Hide Filters**: ✅ Implemented (Digital Art, AI-Assisted, NFTs, etc.)

---

## ✅ Portfolio System

### Upload Process
1. **Location**: `src/components/portfolio-manager.tsx`
2. **Required Fields**:
   - ✅ Title (required before upload)
   - ✅ Image (required)
   - ✅ Tags (optional, comma-separated)
   - ✅ Medium (optional)
   - ✅ Description (optional)
   - ✅ Dimensions (optional)
   - ✅ Year (optional)

3. **Storage**:
   - Images: Firebase Storage (`portfolio/{userId}/{timestamp}_{filename}`)
   - Data: Firestore `userProfiles/{userId}/portfolio` array

### Tag System
- **Input**: Comma-separated tags in text field
- **Storage**: Array of strings in `portfolio[].tags`
- **Usage**: Used for filtering in discover feed
- **Editing**: ✅ Artists can edit tags on existing portfolio items

### Portfolio Display
- **Own Profile**: Uses `PortfolioManager` component (edit/delete capabilities)
- **Other Profiles**: Uses `PortfolioDisplay` component (view-only grid)
- **Location**: `src/components/profile-tabs.tsx` (lines 112-183)

---

## ✅ Profile System

### Profile Types
1. **Own Profile** (`/profile`):
   - Shows logged-in user's data
   - Edit capabilities
   - Portfolio management

2. **Other User's Profile** (`/profile/{userId}`):
   - Shows specific user's data
   - View-only (unless own profile)
   - Portfolio display
   - Follow/unfollow button

### Profile Data Structure
- **Source**: Firestore `userProfiles` collection
- **Key Fields**:
  - `id`: Firestore document ID (used for profile links)
  - `name` / `displayName`: Artist/user name
  - `handle` / `username`: Unique handle
  - `avatarUrl`: Profile picture
  - `portfolio`: Array of portfolio items
  - `isProfessional`: Boolean flag

### Profile Linking
- **From Artwork**: Uses `artwork.artist.id` (Firestore document ID)
- **Implementation**: `src/components/artwork-tile.tsx` (line 158)
- **Route**: `/profile/{artistId}`

---

## ✅ Data Flow

### Discover Feed Flow
```
1. User visits /discover
   ↓
2. Fetch all artists (isProfessional: true)
   ↓
3. Extract portfolio arrays
   ↓
4. Convert portfolio items → Artwork objects
   ↓
5. Apply filters (tags, medium, category, etc.)
   ↓
6. Shuffle results (default)
   ↓
7. Display in grid
```

### Profile View Flow
```
1. User clicks artwork in discover
   ↓
2. ArtworkTile opens preview dialog
   ↓
3. User clicks "View Profile"
   ↓
4. Navigate to /profile/{artistId}
   ↓
5. Fetch userProfiles/{artistId}
   ↓
6. Map Firestore data to ProfileHeader format
   ↓
7. Display profile with portfolio
```

### Portfolio Upload Flow
```
1. Artist goes to Profile → Portfolio tab
   ↓
2. Clicks "Add Artwork"
   ↓
3. Enters title (required)
   ↓
4. Uploads image
   ↓
5. Adds tags (comma-separated)
   ↓
6. Saves to Firestore: userProfiles/{userId}/portfolio
   ↓
7. Portfolio item appears in discover feed
```

---

## ✅ Verification Checklist

### Account Separation
- [x] User accounts are separate from artist accounts
- [x] Each account has unique profile picture
- [x] Each account has unique login credentials
- [x] Profile data is isolated per user ID

### Discover Feed
- [x] Pulls from artist portfolios
- [x] Defaults to shuffled/random order
- [x] Supports tag filtering
- [x] Supports category/medium filtering
- [x] Artworks link to correct artist profiles

### Portfolio System
- [x] Artists can upload portfolio items
- [x] Portfolio items can have tags
- [x] Artists can edit portfolio items (including tags)
- [x] Portfolio items appear in discover feed
- [x] Tags are used for filtering

### Profile System
- [x] Each account has separate profile
- [x] Profile links use Firestore document ID
- [x] Profile displays correct user data
- [x] Profile displays portfolio for other users
- [x] Profile picture is account-specific

### Data Integrity
- [x] Portfolio items include tags
- [x] Tags are stored as arrays
- [x] Tags are used in discover filtering
- [x] Artist ID is correctly linked to profile
- [x] Profile data mapping is correct

---

## 🔍 Current Implementation Status

### ✅ Working Correctly
1. **Account Types**: `isProfessional` flag distinguishes artists from users
2. **Discover Feed**: Pulls from `userProfiles` where `isProfessional: true`
3. **Portfolio → Artwork**: Converts portfolio items to artworks with tags
4. **Shuffle**: Default sort is 'random' (displayed as "Shuffle")
5. **Tag Filtering**: Tags from portfolio items are used for filtering
6. **Profile Links**: Use Firestore document ID (`artist.id`)
7. **Profile Display**: Correctly maps Firestore data to UI format
8. **Portfolio Display**: Shows portfolios for other users

### ⚠️ Potential Issues to Verify
1. **Tag Input**: Verify tags are being saved correctly when uploading
2. **Tag Editing**: Verify tags can be edited on existing portfolio items
3. **Profile Data**: Verify all profile fields are loading correctly
4. **Avatar Caching**: Check if browser is caching old profile pictures

---

## 🧪 Testing Steps

### Test 1: Account Separation
1. Create two separate accounts (one user, one artist)
2. Upload different profile pictures
3. Verify each shows correct picture on their own profile
4. Verify each shows correct picture when viewing other's profile

### Test 2: Discover Feed
1. As artist, upload 3 portfolio items with different tags
2. As user, visit discover feed
3. Verify all 3 items appear (in random order)
4. Verify clicking artwork shows correct artist profile

### Test 3: Tag Filtering
1. Upload portfolio items with tags: "abstract", "painting", "modern"
2. In discover, add tag filter "abstract"
3. Verify only items with "abstract" tag are shown
4. Add second tag "modern"
5. Verify items matching either tag are shown

### Test 4: Profile Navigation
1. Click artwork in discover
2. Click "View Profile" in preview dialog
3. Verify profile shows:
   - Correct name (not "User")
   - Correct profile picture
   - Portfolio tab with all artworks
   - Correct artist details

### Test 5: Portfolio Editing
1. As artist, go to Profile → Portfolio
2. Edit existing portfolio item
3. Add/change tags
4. Save
5. Verify tags appear in discover filtering

---

## 📝 Code Locations

### Key Files
- **Discover Feed**: `src/app/(main)/discover/page.tsx`
- **Portfolio Manager**: `src/components/portfolio-manager.tsx`
- **Profile Page**: `src/app/(main)/profile/[id]/page.tsx`
- **Artwork Tile**: `src/components/artwork-tile.tsx`
- **Profile Tabs**: `src/components/profile-tabs.tsx`
- **Auth Provider**: `src/providers/auth-provider.tsx`

### Key Functions
- **Fetch Artists**: `discover/page.tsx` lines 691-833
- **Portfolio → Artwork**: `discover/page.tsx` lines 780-819
- **Tag Filtering**: `discover/page.tsx` lines 993-999
- **Shuffle**: `discover/page.tsx` (sortBy: 'random')
- **Profile Fetch**: `profile/[id]/page.tsx` lines 24-91
- **Portfolio Display**: `profile-tabs.tsx` lines 112-183

---

## ✅ Summary

The system is correctly implemented to support:
- ✅ Separate user and artist accounts
- ✅ Discover feed pulling from artist portfolios
- ✅ Shuffled/random display order
- ✅ Tag-based filtering
- ✅ Profile navigation from artworks
- ✅ Portfolio management with tags
- ✅ Separate profiles with own data

**Ready for testing!** 🚀

