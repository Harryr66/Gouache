/**
 * Migration script to move portfolio items from userProfiles.portfolio arrays
 * to the new portfolioItems collection
 * 
 * This should be run once to migrate existing data.
 * After migration, new items will be written to portfolioItems collection.
 */

import { collection, getDocs, doc, getDoc, query, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { PortfolioService, PortfolioItem } from './database';

interface MigrationStats {
  totalUsers: number;
  usersWithPortfolios: number;
  totalItemsMigrated: number;
  itemsSkipped: number;
  errors: string[];
}

/**
 * Migrate portfolio items from userProfiles to portfolioItems collection
 * @param batchSize - Number of users to process per batch (default: 10)
 * @param dryRun - If true, only logs what would be migrated without actually migrating
 */
export async function migratePortfoliosToCollection(
  batchSize: number = 10,
  dryRun: boolean = false
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalUsers: 0,
    usersWithPortfolios: 0,
    totalItemsMigrated: 0,
    itemsSkipped: 0,
    errors: [],
  };

  try {
    console.log('🚀 Starting portfolio migration...', { batchSize, dryRun });

    // Get all user profiles
    const usersQuery = query(collection(db, 'userProfiles'));
    const usersSnapshot = await getDocs(usersQuery);
    stats.totalUsers = usersSnapshot.docs.length;

    console.log(`📊 Found ${stats.totalUsers} user profiles`);

    // Process users in batches
    for (let i = 0; i < usersSnapshot.docs.length; i += batchSize) {
      const batch = usersSnapshot.docs.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1} (users ${i + 1}-${Math.min(i + batchSize, usersSnapshot.docs.length)})`);

      for (const userDoc of batch) {
        try {
          const userData = userDoc.data();
          const userId = userDoc.id;
          const portfolio = userData.portfolio || [];

          if (!Array.isArray(portfolio) || portfolio.length === 0) {
            continue; // Skip users without portfolios
          }

          stats.usersWithPortfolios++;

          console.log(`  👤 User ${userId}: ${portfolio.length} portfolio items`);

          // Check if items already migrated (by checking if any portfolioItems exist for this user)
          const existingItemsQuery = query(
            collection(db, 'portfolioItems'),
            where('userId', '==', userId),
            where('id', 'in', portfolio.slice(0, 10).map((item: any) => item.id || '').filter(Boolean))
          );
          const existingItems = await getDocs(existingItemsQuery);
          
          if (existingItems.size > 0) {
            console.log(`    ⚠️  User ${userId} already has migrated items, skipping...`);
            stats.itemsSkipped += portfolio.length;
            continue;
          }

          // Prepare items for migration
          const itemsToMigrate: Omit<PortfolioItem, 'id' | 'createdAt' | 'updatedAt'>[] = [];

          for (const item of portfolio) {
            // Skip items without required fields
            if (!item.id || !item.title) {
              stats.itemsSkipped++;
              continue;
            }

            // Convert Firestore Timestamps to Date objects
            let createdAt: Date;
            if (item.createdAt?.toDate) {
              createdAt = item.createdAt.toDate();
            } else if (item.createdAt instanceof Date) {
              createdAt = item.createdAt;
            } else {
              createdAt = new Date();
            }

            let updatedAt: Date;
            if (item.updatedAt?.toDate) {
              updatedAt = item.updatedAt.toDate();
            } else if (item.updatedAt instanceof Date) {
              updatedAt = item.updatedAt;
            } else {
              updatedAt = createdAt;
            }

            // Map portfolio item to new structure
            // Helper to convert undefined to null for Firestore compatibility
            const toFirestoreValue = (value: any) => value === undefined ? null : value;
            
            // Determine videoUrl explicitly to avoid undefined
            let videoUrl: string | null = null;
            if (item.videoUrl) {
              videoUrl = item.videoUrl;
            } else if (item.mediaUrls?.[0] && item.mediaTypes?.[0] === 'video') {
              videoUrl = item.mediaUrls[0];
            }
            
            const portfolioItem: any = {
              userId: userId,
              imageUrl: item.imageUrl || item.supportingImages?.[0] || item.images?.[0] || item.mediaUrls?.[0] || '',
              videoUrl: videoUrl, // Explicitly set to string or null, never undefined
              mediaType: item.mediaType || (videoUrl ? 'video' : 'image'),
              supportingImages: item.supportingImages || item.images || [],
              mediaUrls: item.mediaUrls || [],
              mediaTypes: item.mediaTypes || [],
              title: item.title || 'Untitled',
              description: item.description || '',
              medium: item.medium || '',
              dimensions: item.dimensions || '',
              year: item.year || '',
              tags: item.tags || [],
              showInPortfolio: item.showInPortfolio !== false, // Default to true
              showInShop: item.showInShop || false,
              isForSale: item.isForSale || false,
              sold: item.sold || false,
              price: toFirestoreValue(item.price),
              currency: item.currency || 'USD',
              priceType: toFirestoreValue(item.priceType),
              contactForPrice: item.contactForPrice || item.priceType === 'contact',
              deliveryScope: toFirestoreValue(item.deliveryScope),
              deliveryCountries: item.deliveryCountries || [],
              artworkType: toFirestoreValue(item.artworkType || (item.type === 'artwork' ? 'original' : null)),
              type: item.type || 'artwork',
              deleted: item.deleted || false,
              aiAssistance: item.aiAssistance || 'none',
              isAI: item.isAI || false,
              likes: item.likes || 0,
              commentsCount: item.commentsCount || 0,
              category: item.category || '',
            };
            
            // Remove any remaining undefined values (safety check) - deep clean
            const deepClean = (obj: any): any => {
              if (obj === null || obj === undefined) {
                return null;
              }
              if (Array.isArray(obj)) {
                return obj.map(deepClean);
              }
              if (typeof obj === 'object') {
                const cleaned: any = {};
                for (const key in obj) {
                  if (obj.hasOwnProperty(key)) {
                    const value = obj[key];
                    cleaned[key] = value === undefined ? null : deepClean(value);
                  }
                }
                return cleaned;
              }
              return obj;
            };
            
            const cleanedPortfolioItem = deepClean(portfolioItem);
            itemsToMigrate.push(cleanedPortfolioItem);
          }

          if (itemsToMigrate.length === 0) {
            console.log(`    ⚠️  No valid items to migrate for user ${userId}`);
            continue;
          }

          if (dryRun) {
            console.log(`    🔍 DRY RUN: Would migrate ${itemsToMigrate.length} items for user ${userId}`);
            stats.totalItemsMigrated += itemsToMigrate.length;
          } else {
            // Migrate items using batch write
            const firestoreBatch = writeBatch(db);
            const timestamp = serverTimestamp();

            for (const item of itemsToMigrate) {
              // Use the original item ID as document ID for easier tracking
              const itemId = portfolio.find((p: any) => 
                p.title === item.title && 
                (p.imageUrl === item.imageUrl || p.id)
              )?.id || `${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

              // Deep clean function to remove all undefined values recursively
              const deepClean = (obj: any): any => {
                if (obj === null) {
                  return null;
                }
                if (obj === undefined) {
                  return null;
                }
                if (Array.isArray(obj)) {
                  return obj.map(deepClean);
                }
                if (typeof obj === 'object' && obj.constructor === Object) {
                  const cleaned: any = {};
                  for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                      const value = obj[key];
                      cleaned[key] = value === undefined ? null : deepClean(value);
                    }
                  }
                  return cleaned;
                }
                return obj;
              };
              
              // Clean the item object to remove any undefined values
              const cleanItem: any = deepClean({
                ...item,
                id: itemId, // Store original ID in document
                createdAt: timestamp,
                updatedAt: timestamp,
              });

              const itemRef = doc(collection(db, 'portfolioItems'), itemId);
              firestoreBatch.set(itemRef, cleanItem);
            }

            await firestoreBatch.commit();
            console.log(`    ✅ Migrated ${itemsToMigrate.length} items for user ${userId}`);
            stats.totalItemsMigrated += itemsToMigrate.length;
          }
        } catch (error: any) {
          const errorMsg = `Error migrating user ${userDoc.id}: ${error.message}`;
          console.error(`    ❌ ${errorMsg}`);
          stats.errors.push(errorMsg);
        }
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  Total users: ${stats.totalUsers}`);
    console.log(`  Users with portfolios: ${stats.usersWithPortfolios}`);
    console.log(`  Items migrated: ${stats.totalItemsMigrated}`);
    console.log(`  Items skipped: ${stats.itemsSkipped}`);
    console.log(`  Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      stats.errors.forEach(err => console.log(`  - ${err}`));
    }

    return stats;
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    stats.errors.push(`Migration failed: ${error.message}`);
    throw error;
  }
}

/**
 * Helper function to check migration status
 */
export async function checkMigrationStatus(): Promise<{
  totalUsers: number;
  usersWithPortfolios: number;
  usersMigrated: number;
  totalPortfolioItems: number;
  totalMigratedItems: number;
}> {
  const usersQuery = query(collection(db, 'userProfiles'));
  const usersSnapshot = await getDocs(usersQuery);
  
  let usersWithPortfolios = 0;
  let totalPortfolioItems = 0;
  let usersMigrated = 0;
  let totalMigratedItems = 0;

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const portfolio = userData.portfolio || [];
    
    if (Array.isArray(portfolio) && portfolio.length > 0) {
      usersWithPortfolios++;
      totalPortfolioItems += portfolio.length;

      // Check if user has migrated items
      const migratedQuery = query(
        collection(db, 'portfolioItems'),
        where('userId', '==', userDoc.id)
      );
      const migratedSnapshot = await getDocs(migratedQuery);
      
      if (migratedSnapshot.size > 0) {
        usersMigrated++;
        totalMigratedItems += migratedSnapshot.size;
      }
    }
  }

  return {
    totalUsers: usersSnapshot.docs.length,
    usersWithPortfolios,
    usersMigrated,
    totalPortfolioItems,
    totalMigratedItems,
  };
}

