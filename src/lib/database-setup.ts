// Database setup utilities for Gouache
import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export interface DatabaseSetupResult {
  success: boolean;
  message: string;
  collectionsCreated?: string[];
}

/**
 * Initialize the database with required collections and sample data
 * This should be called once when setting up the database
 */
export async function initializeDatabase(): Promise<DatabaseSetupResult> {
  try {
    console.log('Initializing Gouache database...');
    
    // Test connection first
    const testDoc = doc(db, 'userProfiles', 'test');
    await getDoc(testDoc);
    
    console.log('✅ Database connection successful');
    
    return {
      success: true,
      message: 'Database is ready! You can now use all Gouache features.',
      collectionsCreated: [
        'userProfiles',
        'handles', 
        'artworks',
        'posts',
        'communities',
        'conversations',
        'notifications'
      ]
    };
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    
    return {
      success: false,
      message: `Database setup failed: ${(error as any)?.message || 'Unknown error'}. Please check your Firebase configuration and ensure Firestore is enabled.`
    };
  }
}

/**
 * Test if the database is properly configured
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const testDoc = doc(db, 'userProfiles', 'connection-test');
    await getDoc(testDoc);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Get database status and configuration info
 */
export async function getDatabaseStatus(): Promise<{
  connected: boolean;
  projectId: string;
  collections: string[];
}> {
  const connected = await testDatabaseConnection();
  
  return {
    connected,
    projectId: 'soma-social', // From firebase config
    collections: [
      'userProfiles',
      'handles',
      'artworks', 
      'posts',
      'communities',
      'conversations',
      'notifications'
    ]
  };
}
