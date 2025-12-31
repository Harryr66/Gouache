# Newsletter Integration Architecture for Artists

## Current State

**Existing Functionality:**
- Artists can add a `newsletterLink` (simple URL) to their profile
- Platform has basic ConvertKit integration for site-wide newsletter
- Newsletter link displays as a gradient button on artist profiles
- No per-artist newsletter provider integration

**Limitations:**
- Artists must manage subscriptions externally
- No direct integration with their newsletter provider
- No way to capture signups directly on Gouache
- No analytics or subscriber management

---

## Proposed Architecture

### Goal
Enable artists to integrate with their preferred newsletter provider, allowing visitors to subscribe directly from the artist's profile without leaving Gouache.

### Core Principles
1. **Flexibility**: Support multiple providers (ConvertKit, Mailchimp, Substack, Beehiiv, etc.)
2. **Security**: Never expose API keys to client-side code
3. **User Experience**: Seamless subscription flow, no redirects when possible
4. **Progressive Enhancement**: Start simple, add advanced features incrementally
5. **Artist Control**: Artists choose their provider and manage their own lists

---

## Integration Approaches

### Approach 1: Direct API Integration (Recommended for most providers)
**Best for:** ConvertKit, Mailchimp, Substack API, Beehiiv API

**How it works:**
- Artist connects their account via OAuth or API key
- Subscriptions happen server-side via API
- Subscriber data synced to provider in real-time
- Artist manages everything in their provider dashboard

**Pros:**
- Seamless UX (no redirects)
- Real-time sync
- Can show subscription status
- Better analytics

**Cons:**
- Requires API access from provider
- More complex implementation
- Need to handle OAuth flows

---

### Approach 2: Embedded Forms/Widgets
**Best for:** Mailchimp, ConvertKit, Substack (when API not available)

**How it works:**
- Artist provides form embed code or form ID
- We render provider's embed widget
- Subscriptions handled by provider's widget
- No API keys needed

**Pros:**
- Simple implementation
- Provider handles all logic
- No security concerns with keys
- Works with free provider plans

**Cons:**
- Less control over styling
- May redirect to provider
- Harder to customize UX

---

### Approach 3: Hybrid (API + Fallback URL)
**Best for:** Maximum compatibility

**How it works:**
- Try API integration first
- Fall back to URL redirect if API fails/unavailable
- Artist can choose preferred method

**Pros:**
- Works for all providers
- Graceful degradation
- Future-proof

**Cons:**
- More complex code paths
- Need to handle both flows

---

## Supported Providers (Priority Order)

### Phase 1: High Priority
1. **ConvertKit** ✅ (Already have platform integration)
   - API integration via form API keys
   - OAuth support for advanced features
   - Good API documentation

2. **Mailchimp**
   - API integration via API keys
   - Form embed option available
   - Widely used

3. **Substack**
   - API available for publications
   - Simple URL redirect option
   - Growing platform

### Phase 2: Medium Priority
4. **Beehiiv**
   - API available
   - Modern platform
   - Good for creators

5. **Ghost**
   - API available
   - Self-hosted option
   - Popular with artists

### Phase 3: Lower Priority
6. **TinyLetter** (Legacy, but still used)
7. **Buttondown**
8. **Revue** (Twitter-owned, may sunset)
9. **Custom/Generic** (URL redirect fallback)

---

## Data Model

### User Profile Extension
```typescript
interface NewsletterIntegration {
  enabled: boolean;
  provider: 'convertkit' | 'mailchimp' | 'substack' | 'beehiiv' | 'ghost' | 'custom' | null;
  
  // For API integrations
  apiCredentials?: {
    // Encrypted server-side, never exposed to client
    apiKey?: string;
    apiSecret?: string;
    formId?: string;
    listId?: string;
    publicationId?: string;
  };
  
  // For embedded forms
  embedConfig?: {
    formId?: string;
    embedCode?: string; // Sanitized HTML
  };
  
  // Fallback URL (current approach)
  newsletterLink?: string;
  
  // Display settings
  displaySettings?: {
    showOnProfile: boolean;
    buttonText?: string; // Customize button text
    showSubscriberCount?: boolean; // If provider supports it
  };
  
  // Metadata
  connectedAt?: Date;
  lastSyncedAt?: Date;
  subscriberCount?: number; // Cached count
}
```

### Database Structure
- Store encrypted credentials in Firestore (server-side encryption)
- Or use environment variables per artist (scalable but complex)
- Or use a secure secrets service (AWS Secrets Manager, etc.)

---

## User Experience Flow

### Artist Setup Flow (Similar to Stripe Integration Wizard)

1. **Provider Selection**
   - Show cards for each provider with logos
   - Brief description of each
   - "Connect" button for each

2. **Connection Process**
   - **API-based**: OAuth flow or API key entry
   - **Embed-based**: Form ID or embed code entry
   - **URL-based**: Simple URL entry (current approach)

3. **Configuration**
   - Select form/list/publication
   - Customize button text
   - Choose display options
   - Test subscription

4. **Verification**
   - Test subscription with artist's email
   - Verify connection status
   - Show success/error states

### Visitor Subscription Flow

1. **On Profile Page**
   - Gradient button: "Subscribe to Newsletter"
   - Click opens modal or inline form

2. **Subscription Modal/Form**
   - Email input field
   - Optional: Name field (if provider supports)
   - Optional: Custom fields (provider-specific)
   - Submit button

3. **Processing**
   - Show loading state
   - Server-side API call to provider
   - Handle success/error

4. **Confirmation**
   - Success message
   - Optional: Redirect to provider confirmation page
   - Close modal

---

## Technical Implementation Plan

### Phase 1: Foundation (Week 1-2)
1. **Data Model**
   - Extend User type with `newsletterIntegration`
   - Create TypeScript interfaces
   - Update Firestore schema

2. **UI Components**
   - Newsletter integration wizard component
   - Subscription modal/form component
   - Provider selection cards

3. **API Routes**
   - `/api/newsletter/integrations/connect` - Connect provider
   - `/api/newsletter/integrations/status` - Check connection status
   - `/api/newsletter/integrations/disconnect` - Disconnect provider
   - `/api/newsletter/subscribe/[artistId]` - Subscribe to artist's newsletter

### Phase 2: ConvertKit Integration (Week 3)
1. **ConvertKit API Client**
   - Server-side API wrapper
   - Form subscription endpoint
   - Error handling

2. **OAuth Flow** (Optional, advanced)
   - OAuth connection flow
   - Token storage

3. **Testing**
   - Test subscription flow
   - Verify data sync
   - Error scenarios

### Phase 3: Additional Providers (Week 4+)
1. **Mailchimp Integration**
2. **Substack Integration**
3. **Generic URL Fallback** (enhance current approach)

### Phase 4: Advanced Features (Future)
1. **Analytics Dashboard**
   - Subscriber count display
   - Growth metrics
   - Recent subscribers

2. **Custom Fields**
   - Support provider-specific fields
   - Conditional fields based on provider

3. **Batch Operations**
   - Bulk subscriber import
   - Sync existing subscribers

---

## Security Considerations

### API Key Storage
**Option 1: Encrypted in Firestore** (Recommended for MVP)
- Encrypt keys before storing
- Decrypt server-side only
- Use environment variable for encryption key

**Option 2: Per-Artist Environment Variables** (Not scalable)
- Store in `.env` per artist
- Requires deployment per artist

**Option 3: Secrets Management Service** (Best for scale)
- AWS Secrets Manager
- Google Secret Manager
- HashiCorp Vault

### OAuth Flow
- Server-side OAuth flow only
- Store refresh tokens securely
- Handle token refresh automatically

### Input Validation
- Sanitize all user inputs
- Validate email formats
- Rate limit subscription endpoints
- Prevent spam/abuse

---

## API Design

### Connect Provider
```typescript
POST /api/newsletter/integrations/connect
Body: {
  provider: 'convertkit' | 'mailchimp' | ...
  credentials: {
    apiKey?: string;
    formId?: string;
    // provider-specific fields
  }
}
Response: {
  success: boolean;
  integrationId?: string;
  error?: string;
}
```

### Subscribe to Artist's Newsletter
```typescript
POST /api/newsletter/subscribe/[artistId]
Body: {
  email: string;
  name?: string;
  customFields?: Record<string, any>;
}
Response: {
  success: boolean;
  subscriberId?: string;
  message?: string;
  error?: string;
}
```

### Get Integration Status
```typescript
GET /api/newsletter/integrations/status
Response: {
  connected: boolean;
  provider?: string;
  formId?: string;
  subscriberCount?: number;
  lastSyncedAt?: Date;
}
```

---

## UI/UX Considerations

### Profile Display
- **Gradient button** (current style) for newsletter signup
- Show subscriber count if available and enabled
- Optional: Show recent subscriber activity

### Subscription Modal
- Clean, minimal design
- Match Gouache design system
- Loading states
- Success/error feedback
- Mobile-responsive

### Settings Page
- Integration wizard (similar to Stripe)
- Connection status indicator
- Test subscription button
- Disconnect option
- Provider-specific settings

---

## Migration Path

### For Existing Artists
1. **Backward Compatibility**
   - Keep `newsletterLink` field
   - If `newsletterIntegration` not set, use `newsletterLink`
   - Show migration prompt in settings

2. **Migration Wizard**
   - Detect existing `newsletterLink`
   - Offer to convert to integration
   - Guide through setup

### For New Artists
- Start with integration wizard
- URL fallback as last option
- Encourage API integrations for better UX

---

## Success Metrics

1. **Adoption Rate**
   - % of artists with newsletter integration
   - % using API vs URL fallback

2. **Engagement**
   - Subscription conversion rate
   - Average subscribers per artist

3. **Technical**
   - API success rate
   - Error rate by provider
   - Average subscription time

---

## Open Questions / Decisions Needed

1. **API Key Storage**: Which approach? (Encrypted Firestore vs Secrets Manager)
2. **OAuth vs API Keys**: Support both or start with API keys?
3. **Subscriber Data**: Store subscriber data locally or only sync to provider?
4. **Rate Limiting**: How to prevent abuse?
5. **Free vs Paid**: Any restrictions for free accounts?
6. **Provider Priority**: Which providers to build first?
7. **Custom Fields**: Support provider-specific fields from day 1?
8. **Analytics**: Show subscriber counts/metrics to artists?

---

## Next Steps

1. **Review & Approve Architecture** ✅
2. **Decide on API Key Storage Approach**
3. **Choose Initial Providers** (Recommend: ConvertKit + Mailchimp)
4. **Design UI/UX Mockups**
5. **Create Implementation Plan with Timeline**
6. **Begin Phase 1 Implementation**

---

## References

- [ConvertKit API Docs](https://developers.convertkit.com/)
- [Mailchimp API Docs](https://mailchimp.com/developer/)
- [Substack API Docs](https://substack.com/api-docs)
- [Beehiiv API Docs](https://www.beehiiv.com/support/using-the-api)
- Existing Stripe Integration (reference implementation)


