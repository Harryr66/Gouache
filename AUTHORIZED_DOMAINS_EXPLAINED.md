# Authorized Domains - Explained

## What Are "Authorized Domains"?

**Authorized domains** are **YOUR website domains** (where your app is hosted), NOT your customers' email domains.

## Key Points

### ✅ What It IS:
- **Your website domain**: `gouache.art` (where your app lives)
- **One-time setup**: You only add YOUR domain once
- **Security feature**: Prevents unauthorized redirects

### ❌ What It IS NOT:
- **NOT customer email domains**: Customers can use ANY email (gmail.com, yahoo.com, etc.)
- **NOT per-customer setup**: You don't add domains for each user
- **NOT about email addresses**: It's about website URLs

---

## Why Was This Needed?

### The Problem:
When users click links in authentication emails (password reset, email verification), Firebase needs to know **where to redirect them**.

By default, Firebase only allows redirects to:
- `localhost` (for development)
- `yourproject.firebaseapp.com` (Firebase's default domain)
- `yourproject.web.app` (Firebase's default domain)

### The Solution:
Since you're using a **custom domain** (`gouache.art`), you need to tell Firebase:
> "Hey Firebase, it's safe to redirect users to `gouache.art` - that's MY website!"

This is a **security feature** to prevent malicious redirects.

---

## What You See in the List

Looking at your authorized domains:
- `localhost` - For local development (automatic)
- `soma-social.firebaseapp.com` - Firebase's default domain (automatic)
- `soma-social.web.app` - Firebase's default domain (automatic)
- `gouache.art` - **YOUR custom domain** (you added this)

---

## Customer Email Domains

### Customers Can Use ANY Email:
- ✅ `customer@gmail.com`
- ✅ `user@yahoo.com`
- ✅ `artist@customdomain.com`
- ✅ `anyone@anydomain.com`

**You DON'T need to add these!** Firebase doesn't care what email domain your customers use.

---

## How It Works

### Example: Password Reset Flow

1. **Customer requests password reset**
   - Email: `john@gmail.com` (customer's email - doesn't matter what domain)
   - Firebase sends email to `john@gmail.com`

2. **Customer clicks link in email**
   - Link contains: `https://gouache.art/auth/reset-password?code=...`
   - Firebase checks: "Is `gouache.art` authorized?" ✅ YES
   - Firebase allows the redirect

3. **Customer lands on YOUR site**
   - Opens `gouache.art/auth/reset-password` (your custom page)
   - NOT Firebase's default page

---

## Why Not Automatic?

Firebase **cannot** automatically know your custom domain because:
1. **Security**: Prevents unauthorized domains from being used
2. **Multiple domains**: You might have multiple domains (dev, staging, production)
3. **Verification**: You need to prove you own the domain

---

## Summary

| Question | Answer |
|----------|--------|
| **Is this about customer emails?** | ❌ NO - It's about YOUR website domain |
| **Do I add each customer's email domain?** | ❌ NO - Customers can use any email |
| **Is this a one-time setup?** | ✅ YES - Just add `gouache.art` once |
| **Why was it needed?** | To allow redirects to your custom domain |
| **Will I need to do this again?** | Only if you add another website domain |

---

## Bottom Line

**You're all set!** ✅

`gouache.art` is already in your authorized domains list (as shown in your screenshot). This was a **one-time setup** for YOUR website domain. You'll never need to add customer email domains - they can use any email address they want.

