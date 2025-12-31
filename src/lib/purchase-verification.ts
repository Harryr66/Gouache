/**
 * PURCHASE VERIFICATION UTILITIES
 * 
 * CRITICAL: These functions verify that webhook has completed database updates
 * after Stripe payment succeeds. This prevents frontend crashes and ensures
 * users only see success messages after access is actually granted.
 * 
 * DO NOT navigate away or show success until these return true.
 */

import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Verify artwork was marked as sold by webhook
 * Polls Firestore every 2 seconds for up to 20 seconds
 * 
 * @param artworkId - The artwork document ID
 * @param paymentIntentId - The Stripe payment intent ID
 * @param maxAttempts - Maximum polling attempts (default 10 = 20 seconds)
 * @returns true if artwork.sold === true AND artwork.paymentIntentId matches
 */
export async function verifyArtworkPurchase(
  artworkId: string,
  paymentIntentId: string,
  maxAttempts: number = 10
): Promise<boolean> {
  console.log(`[verifyArtworkPurchase] Starting verification for artwork ${artworkId}, payment ${paymentIntentId}`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[verifyArtworkPurchase] Attempt ${attempt}/${maxAttempts}`);
      
      const artworkDoc = await getDoc(doc(db, 'artworks', artworkId));
      
      if (artworkDoc.exists()) {
        const data = artworkDoc.data();
        
        // Check if sold AND payment intent ID matches
        if (data.sold === true && data.paymentIntentId === paymentIntentId) {
          console.log(`[verifyArtworkPurchase] ✅ Artwork purchase verified!`);
          return true;
        }
        
        console.log(`[verifyArtworkPurchase] Not yet verified:`, {
          sold: data.sold,
          paymentIntentId: data.paymentIntentId,
          expected: paymentIntentId
        });
      } else {
        console.error(`[verifyArtworkPurchase] Artwork document not found`);
      }
      
      // Wait 2 seconds before next attempt (unless last attempt)
      if (attempt < maxAttempts) {
        console.log(`[verifyArtworkPurchase] Waiting 2 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`[verifyArtworkPurchase] Error on attempt ${attempt}:`, error);
      
      // Wait and retry on error (unless last attempt)
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  console.log(`[verifyArtworkPurchase] ❌ Timeout: Artwork purchase not verified after ${maxAttempts} attempts`);
  return false;
}

/**
 * Verify marketplace purchase record was created by webhook
 * Polls Firestore every 2 seconds for up to 20 seconds
 * 
 * @param productId - The product document ID
 * @param paymentIntentId - The Stripe payment intent ID  
 * @param userId - The buyer's user ID
 * @param maxAttempts - Maximum polling attempts (default 10 = 20 seconds)
 * @returns true if purchase record exists with matching paymentIntentId
 */
export async function verifyMarketplacePurchase(
  productId: string,
  paymentIntentId: string,
  userId: string,
  maxAttempts: number = 10
): Promise<boolean> {
  console.log(`[verifyMarketplacePurchase] Starting verification for product ${productId}, payment ${paymentIntentId}`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[verifyMarketplacePurchase] Attempt ${attempt}/${maxAttempts}`);
      
      // Query purchases collection for matching record
      const purchasesQuery = query(
        collection(db, 'purchases'),
        where('productId', '==', productId),
        where('buyerId', '==', userId),
        where('paymentIntentId', '==', paymentIntentId)
      );
      
      const snapshot = await getDocs(purchasesQuery);
      
      if (!snapshot.empty) {
        console.log(`[verifyMarketplacePurchase] ✅ Purchase record verified!`);
        return true;
      }
      
      console.log(`[verifyMarketplacePurchase] Purchase record not found yet`);
      
      // Wait 2 seconds before next attempt (unless last attempt)
      if (attempt < maxAttempts) {
        console.log(`[verifyMarketplacePurchase] Waiting 2 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`[verifyMarketplacePurchase] Error on attempt ${attempt}:`, error);
      
      // Wait and retry on error (unless last attempt)
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  console.log(`[verifyMarketplacePurchase] ❌ Timeout: Purchase not verified after ${maxAttempts} attempts`);
  return false;
}

