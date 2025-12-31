/**
 * Shared Stripe client initialization
 * Uses singleton pattern to avoid code splitting issues with Next.js
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromiseInstance: Promise<Stripe | null> | null = null;

/**
 * Get Stripe promise instance (singleton pattern)
 * This ensures the Stripe instance is available even with Next.js code splitting
 */
export function getStripePromise(): Promise<Stripe | null> | null {
  // If already initialized, return existing instance
  if (stripePromiseInstance !== null) {
    return stripePromiseInstance;
  }

  // Get key from environment
  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  // If no key, return null
  if (!stripeKey || stripeKey.length === 0) {
    console.error('[Stripe] No publishable key found in environment variables');
    stripePromiseInstance = null;
    return null;
  }

  // Initialize Stripe
  try {
    stripePromiseInstance = loadStripe(stripeKey);
    return stripePromiseInstance;
  } catch (error) {
    console.error('[Stripe] Error loading Stripe:', error);
    stripePromiseInstance = null;
    return null;
  }
}

