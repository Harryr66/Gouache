# COMPREHENSIVE EMAIL NOTIFICATIONS FOR ALL PURCHASES

## OVERVIEW

Every purchase should trigger TWO emails:
1. **BUYER CONFIRMATION** - "Your purchase is confirmed, here's your access/receipt"
2. **SELLER NOTIFICATION** - "Congratulations! You made a sale"

## CURRENT STATE (INCOMPLETE)

Currently only courses with `externalUrl` send buyer emails. No seller emails at all.

**Missing notifications:**
- ❌ Artwork (originals/prints) - no buyer email
- ❌ Artwork - no seller email
- ❌ Marketplace products - no buyer email
- ❌ Marketplace products - no seller email
- ❌ Books - no buyer email
- ❌ Books - no seller email
- ⚠️ Courses - buyer email only if `externalUrl` exists
- ❌ Courses - no seller email

## ENVIRONMENT VARIABLES NEEDED

```bash
RESEND_API_KEY=your_resend_api_key
ARTIST_INVITE_FROM_EMAIL=Gouache <noreply@gouache.art>
```

## EMAIL TEMPLATES

### 1. COURSE PURCHASE - BUYER EMAIL

**Subject:** `🎓 Welcome to [Course Title]`

**Template:**
```html
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; max-width: 600px; margin: 0 auto;">
  <div style="background: #111827; padding: 24px; text-align: center;">
    <h1 style="color: #ffffff; font-size: 28px; margin: 0;">Purchase Confirmed</h1>
  </div>
  
  <div style="padding: 32px 24px;">
    <p style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Hi [Buyer Name],</p>
    <p style="font-size: 16px; line-height: 1.6; color: #374151;">
      Thank you for purchasing <strong>[Course Title]</strong>! You now have full access to all course materials.
    </p>
    
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Purchase Details</h3>
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Course:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">[Course Title]</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Instructor:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">[Instructor Name]</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Amount Paid:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">$[Amount]</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Payment ID:</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">[Payment Intent ID]</td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="[Course URL]" style="display: inline-block; background-color: #111827; color: #ffffff; padding: 14px 28px; border-radius: 999px; font-weight: 600; text-decoration: none; font-size: 16px;">
        Start Learning
      </a>
    </div>
    
    <p style="font-size: 14px; line-height: 1.6; color: #6b7280;">
      If the button doesn't work, copy this link into your browser:<br />
      <a href="[Course URL]" style="color: #2563eb; word-break: break-all;">[Course URL]</a>
    </p>
    
    <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 24px;">
      <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 0;">
        Questions? Contact the instructor directly through their profile or email us at <a href="mailto:support@gouache.art" style="color: #2563eb;">support@gouache.art</a>
      </p>
    </div>
  </div>
  
  <div style="background: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 14px; color: #6b7280; margin: 0;">
      Team Gouache<br />
      <a href="https://gouache.art" style="color: #2563eb; text-decoration: none;">gouache.art</a>
    </p>
  </div>
</div>
```

### 2. COURSE SALE - SELLER EMAIL

**Subject:** `🎉 You made a sale! [Course Title]`

**Template:**
```html
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center;">
    <h1 style="color: #ffffff; font-size: 32px; margin: 0 0 8px 0;">🎉 Congratulations!</h1>
    <p style="color: #d1fae5; font-size: 18px; margin: 0;">You made a sale</p>
  </div>
  
  <div style="padding: 32px 24px;">
    <p style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Hi [Instructor Name],</p>
    <p style="font-size: 16px; line-height: 1.6; color: #374151;">
      Great news! Someone just enrolled in <strong>[Course Title]</strong>.
    </p>
    
    <div style="background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #047857;">Sale Details</h3>
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Course:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">[Course Title]</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Sale Amount:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 20px; color: #047857;">$[Amount]</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Your Payout:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #047857;">$[Payout Amount]</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Date:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">[Date]</td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 14px; line-height: 1.6; color: #6b7280; background: #fef3c7; padding: 16px; border-radius: 8px; margin: 24px 0;">
      💰 <strong>Payment Processing:</strong> Your payout will be automatically transferred to your connected Stripe account within 2-7 business days.
    </p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://gouache.art/profile" style="display: inline-block; background-color: #111827; color: #ffffff; padding: 14px 28px; border-radius: 999px; font-weight: 600; text-decoration: none; font-size: 16px;">
        View Your Dashboard
      </a>
    </div>
    
    <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 24px;">
      <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 0;">
        Questions about payouts? Check your <a href="https://dashboard.stripe.com" style="color: #2563eb;">Stripe Dashboard</a> or contact us at <a href="mailto:support@gouache.art" style="color: #2563eb;">support@gouache.art</a>
      </p>
    </div>
  </div>
  
  <div style="background: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 14px; color: #6b7280; margin: 0;">
      Team Gouache<br />
      <a href="https://gouache.art" style="color: #2563eb; text-decoration: none;">gouache.art</a>
    </p>
  </div>
</div>
```

### 3. ARTWORK PURCHASE - BUYER EMAIL

**Subject:** `🎨 Your artwork purchase: [Artwork Title]`

**Template:**
```html
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; max-width: 600px; margin: 0 auto;">
  <div style="background: #111827; padding: 24px; text-align: center;">
    <h1 style="color: #ffffff; font-size: 28px; margin: 0;">Purchase Confirmed</h1>
  </div>
  
  <div style="padding: 32px 24px;">
    <p style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Hi [Buyer Name],</p>
    <p style="font-size: 16px; line-height: 1.6; color: #374151;">
      Thank you for your purchase! We're thrilled you chose <strong>[Artwork Title]</strong> by <strong>[Artist Name]</strong>.
    </p>
    
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Purchase Details</h3>
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Artwork:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">[Artwork Title]</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Artist:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">[Artist Name]</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Type:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">[Original/Print]</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Amount Paid:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">$[Amount]</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Payment ID:</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">[Payment Intent ID]</td>
        </tr>
      </table>
    </div>
    
    <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">📦 Next Steps</h3>
      <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 0;">
        The artist will contact you directly within 24-48 hours to arrange shipping/delivery. If you don't hear from them, you can reach out through their Gouache profile.
      </p>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://gouache.art/profile/[artistId]" style="display: inline-block; background-color: #111827; color: #ffffff; padding: 14px 28px; border-radius: 999px; font-weight: 600; text-decoration: none; font-size: 16px;">
        View Artist Profile
      </a>
    </div>
    
    <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 24px;">
      <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 0;">
        Need help? Contact us at <a href="mailto:support@gouache.art" style="color: #2563eb;">support@gouache.art</a>
      </p>
    </div>
  </div>
  
  <div style="background: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 14px; color: #6b7280; margin: 0;">
      Team Gouache<br />
      <a href="https://gouache.art" style="color: #2563eb; text-decoration: none;">gouache.art</a>
    </p>
  </div>
</div>
```

### 4. ARTWORK SALE - SELLER EMAIL

**Subject:** `🎉 You sold [Artwork Title]!`

**Template:**
```html
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center;">
    <h1 style="color: #ffffff; font-size: 32px; margin: 0 0 8px 0;">🎉 Congratulations!</h1>
    <p style="color: #d1fae5; font-size: 18px; margin: 0;">Your artwork sold</p>
  </div>
  
  <div style="padding: 32px 24px;">
    <p style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Hi [Artist Name],</p>
    <p style="font-size: 16px; line-height: 1.6; color: #374151;">
      Exciting news! Your artwork <strong>[Artwork Title]</strong> has been purchased.
    </p>
    
    <div style="background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #047857;">Sale Details</h3>
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Artwork:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">[Artwork Title]</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Type:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">[Original/Print]</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Sale Amount:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 20px; color: #047857;">$[Amount]</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Your Payout:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #047857;">$[Payout Amount]</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Buyer:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">[Buyer Name]</td>
        </tr>
      </table>
    </div>
    
    <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">📦 Action Required</h3>
      <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 0 0 12px 0;">
        Please contact the buyer within 24-48 hours to arrange shipping or delivery:
      </p>
      <ul style="font-size: 14px; line-height: 1.8; color: #374151; margin: 0; padding-left: 20px;">
        <li>Buyer Email: <strong>[Buyer Email]</strong></li>
        <li>View their profile: <a href="https://gouache.art/profile/[buyerId]" style="color: #2563eb;">Buyer Profile</a></li>
      </ul>
    </div>
    
    <p style="font-size: 14px; line-height: 1.6; color: #6b7280; background: #f9fafb; padding: 16px; border-radius: 8px; margin: 24px 0;">
      💰 <strong>Payment Processing:</strong> Your payout will be automatically transferred to your connected Stripe account within 2-7 business days.
    </p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://gouache.art/profile" style="display: inline-block; background-color: #111827; color: #ffffff; padding: 14px 28px; border-radius: 999px; font-weight: 600; text-decoration: none; font-size: 16px;">
        View Your Dashboard
      </a>
    </div>
  </div>
  
  <div style="background: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 14px; color: #6b7280; margin: 0;">
      Team Gouache<br />
      <a href="https://gouache.art" style="color: #2563eb; text-decoration: none;">gouache.art</a>
    </p>
  </div>
</div>
```

### 5. MARKETPLACE PRODUCT - BUYER EMAIL

**Subject:** `📦 Your order confirmation: [Product Title]`

*Similar structure to artwork buyer email, with "Estimated delivery: X days" added*

### 6. MARKETPLACE PRODUCT - SELLER EMAIL

**Subject:** `🎉 New order: [Product Title]`

*Similar structure to artwork seller email, with stock/inventory info*

## IMPLEMENTATION

### Location: `src/app/api/stripe/webhook/route.ts`

**Function:** `handlePaymentSuccess()`

Add comprehensive email sending for ALL item types:

```typescript
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { itemId, itemType, userId, artistId, itemTitle } = paymentIntent.metadata;
  
  // ... existing sale recording code ...
  
  // =====================
  // EMAIL NOTIFICATIONS
  // =====================
  
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // Get buyer data
    const buyerDoc = await getDoc(doc(db, 'userProfiles', userId));
    const buyerData = buyerDoc.data();
    const buyerEmail = buyerData?.email;
    const buyerName = buyerData?.displayName || buyerData?.name || 'there';
    
    // Get seller data
    const sellerDoc = await getDoc(doc(db, 'userProfiles', artistId));
    const sellerData = sellerDoc.data();
    const sellerEmail = sellerData?.email;
    const sellerName = sellerData?.displayName || sellerData?.name || 'Artist';
    
    // Format amount
    const amountFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: paymentIntent.currency.toUpperCase(),
    }).format(paymentIntent.amount / 100);
    
    const payoutAmount = Math.round(paymentIntent.amount * 0.97); // After Stripe fees
    const payoutFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: paymentIntent.currency.toUpperCase(),
    }).format(payoutAmount / 100);
    
    const today = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    
    // SEND EMAILS BASED ON ITEM TYPE
    
    if (itemType === 'course') {
      // ... existing course email code ...
      
      // ADD SELLER EMAIL
      if (sellerEmail) {
        await resend.emails.send({
          from: process.env.ARTIST_INVITE_FROM_EMAIL || 'Gouache <noreply@gouache.art>',
          to: sellerEmail,
          subject: `🎉 You made a sale! ${itemTitle}`,
          html: // ... seller template ...
        });
      }
    }
    
    else if (itemType === 'original' || itemType === 'print') {
      // BUYER EMAIL
      if (buyerEmail) {
        await resend.emails.send({
          from: process.env.ARTIST_INVITE_FROM_EMAIL || 'Gouache <noreply@gouache.art>',
          to: buyerEmail,
          subject: `🎨 Your artwork purchase: ${itemTitle}`,
          html: // ... buyer template ...
        });
      }
      
      // SELLER EMAIL
      if (sellerEmail) {
        await resend.emails.send({
          from: process.env.ARTIST_INVITE_FROM_EMAIL || 'Gouache <noreply@gouache.art>',
          to: sellerEmail,
          subject: `🎉 You sold ${itemTitle}!`,
          html: // ... seller template ...
        });
      }
    }
    
    else if (itemType === 'merchandise' || itemType === 'product') {
      // Similar structure for marketplace products
      // ...
    }
    
    console.log(`✅ Emails sent for ${itemType} ${itemId}`);
  } catch (emailError) {
    console.error('Error sending emails:', emailError);
    // Don't throw - email failure shouldn't break payment flow
  }
}
```

## TESTING CHECKLIST

For each item type (course, artwork, marketplace product):

### Buyer Email Test
- [ ] Email received within 1 minute of purchase
- [ ] All variables correctly populated (name, title, amount, etc.)
- [ ] Links work (course URL, artist profile, etc.)
- [ ] Mobile responsive design
- [ ] Professional appearance

### Seller Email Test
- [ ] Email received within 1 minute of sale
- [ ] Correct payout amount calculated
- [ ] Buyer contact info included
- [ ] Links to dashboard work
- [ ] Congratulatory tone

### Edge Cases
- [ ] Email fails gracefully (payment still completes)
- [ ] Missing buyer/seller email doesn't crash webhook
- [ ] Special characters in names/titles handled correctly
- [ ] Multiple rapid purchases don't cause duplicate emails

## ENVIRONMENT SETUP

Add to Vercel environment variables:
```bash
RESEND_API_KEY=[your_resend_key]
ARTIST_INVITE_FROM_EMAIL=Gouache <noreply@gouache.art>
```

## SUCCESS CRITERIA

✅ **Every purchase triggers TWO emails** (buyer + seller)
✅ **Emails arrive within 1 minute** of payment
✅ **All item types covered** (course, artwork, marketplace)
✅ **Professional, branded templates**
✅ **Clear call-to-action buttons**
✅ **Mobile responsive**
✅ **Fail-safe** (email errors don't break payments)
✅ **User satisfaction** (buyers know what they bought, sellers know they sold)

