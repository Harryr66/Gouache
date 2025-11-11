// Database setup script for Gouache
// Run this script to initialize the Firestore database with required collections

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, writeBatch } = require('firebase/firestore');

// Firebase config - replace with your actual config
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function setupDatabase() {
  console.log('Setting up Gouache database...');
  
  try {
    const batch = writeBatch(db);
    
    // Create initial collections with sample data structure
    
    // 1. Create a sample user profile
    const sampleUserId = 'sample-user-id';
    const userProfileRef = doc(db, 'userProfiles', sampleUserId);
    batch.set(userProfileRef, {
      name: 'Sample User',
      handle: 'sampleuser',
      email: 'sample@example.com',
      bio: 'This is a sample user profile',
      website: 'https://example.com',
      location: 'Sample City, Country',
      avatarUrl: '',
      followerCount: 0,
      followingCount: 0,
      postCount: 0,
      isVerified: false,
      isProfessional: false,
      isActive: true,
      artistType: '',
      isTipJarEnabled: false,
      profileRingColor: '#3b82f6',
      socialLinks: {
        instagram: '',
        twitter: '',
        website: ''
      },
      preferences: {
        notifications: {
          likes: true,
          comments: true,
          follows: true,
          messages: true,
          auctions: true
        },
        privacy: {
          showEmail: false,
          showLocation: false,
          allowMessages: true
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // 2. Create handle mapping
    const handleRef = doc(db, 'handles', 'sampleuser');
    batch.set(handleRef, {
      userId: sampleUserId,
      createdAt: new Date()
    });
    
    // 3. Create sample artwork
    const artworkRef = doc(db, 'artworks', 'sample-artwork-1');
    batch.set(artworkRef, {
      title: 'Sample Artwork',
      description: 'This is a sample artwork',
      imageUrl: '/placeholder-art.jpg',
      imageAiHint: 'Sample artwork description',
      artist: {
        id: sampleUserId,
        name: 'Sample User',
        handle: 'sampleuser',
        followerCount: 0,
        followingCount: 0,
        createdAt: new Date()
      },
      price: 299,
      currency: 'USD',
      isForSale: true,
      tags: ['digital', 'art', 'sample'],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // 4. Create sample community
    const communityRef = doc(db, 'communities', 'sample-community-1');
    batch.set(communityRef, {
      name: 'Sample Art Community',
      description: 'A sample community for artists',
      ownerId: sampleUserId,
      memberCount: 1,
      isPublic: true,
      tags: ['art', 'community', 'sample'],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // 5. Create sample post
    const postRef = doc(db, 'posts', 'sample-post-1');
    batch.set(postRef, {
      content: 'This is a sample post',
      artist: {
        id: sampleUserId,
        name: 'Sample User',
        handle: 'sampleuser',
        followerCount: 0,
        followingCount: 0,
        createdAt: new Date()
      },
      imageUrl: '/placeholder-post.jpg',
      likes: 0,
      comments: 0,
      shares: 0,
      tags: ['sample', 'post'],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Commit the batch
    await batch.commit();
    
    console.log('✅ Database setup completed successfully!');
    console.log('Created collections:');
    console.log('- userProfiles');
    console.log('- handles');
    console.log('- artworks');
    console.log('- communities');
    console.log('- posts');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
  }
}

// Run the setup
setupDatabase();
