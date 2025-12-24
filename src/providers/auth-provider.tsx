'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  avatarUrl: string | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let previousEmail: string | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        const currentEmail = firebaseUser.email || '';
        
        // CRITICAL: If email changed in Firebase Auth (e.g., after verification), sync to Firestore immediately
        if (previousEmail && previousEmail !== currentEmail && currentEmail) {
          console.log('📧 Email changed in Firebase Auth, syncing to Firestore:', {
            previous: previousEmail,
            current: currentEmail,
            userId: firebaseUser.uid
          });
          
          try {
            await updateDoc(doc(db, 'userProfiles', firebaseUser.uid), {
              email: currentEmail,
              updatedAt: new Date()
            });
            console.log('✅ Email synced to Firestore after Firebase Auth change');
          } catch (syncError) {
            console.error('❌ Failed to sync email after Firebase Auth change:', syncError);
          }
        }
        
        // Update previous email for next check
        previousEmail = currentEmail;
        
        // Create immediate user object from Firebase Auth data for fast loading
        const immediateUser: User = {
          id: firebaseUser.uid,
          username: firebaseUser.displayName?.toLowerCase().replace(/\s+/g, '') || 'user',
          email: currentEmail,
          displayName: firebaseUser.displayName || 'User',
          avatarUrl: firebaseUser.photoURL || undefined,
          bio: '',
          website: '',
          location: '',
          followerCount: 0,
          followingCount: 0,
          postCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          isVerified: false,
          isProfessional: false,
          isActive: true,
          lastSeen: new Date(),
          artistType: '',
          isAdmin: false,
          tipJarEnabled: false,        // Coffee/tips hidden by default
          suggestionsEnabled: false,   // Suggestions hidden by default
          hideShop: true,   // Shop hidden by default
          hideLearn: true,   // Learn hidden by default
          socialLinks: {},
          showcaseLocations: [],
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
          }
        };
        
        // Set user immediately for fast loading
        setUser(immediateUser);
        setAvatarUrl(immediateUser.avatarUrl || null);
        setLoading(false);
        
        // Then fetch detailed data from Firestore in background
        try {
          const userDoc = await getDoc(doc(db, 'userProfiles', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // CRITICAL: Sync email - Firebase Auth email is the source of truth
            // If Firestore email doesn't match Firebase Auth email, update Firestore
            const firebaseAuthEmail = firebaseUser.email || '';
            const firestoreEmail = userData.email || '';
            
            if (firebaseAuthEmail && firestoreEmail && firebaseAuthEmail.toLowerCase() !== firestoreEmail.toLowerCase()) {
              console.warn('⚠️ Email mismatch detected:', {
                firebaseAuth: firebaseAuthEmail,
                firestore: firestoreEmail,
                userId: firebaseUser.uid
              });
              
              // Auto-sync: Update Firestore to match Firebase Auth
              try {
                await updateDoc(doc(db, 'userProfiles', firebaseUser.uid), {
                  email: firebaseAuthEmail,
                  updatedAt: new Date()
                });
                console.log('✅ Email synced: Firestore updated to match Firebase Auth');
              } catch (syncError) {
                console.error('❌ Failed to sync email:', syncError);
              }
            }
            
            // Convert portfolio items from Firestore format (with Timestamps) to Date objects
            const portfolio = userData.portfolio?.map((item: any) => {
              // Handle createdAt - could be Firestore Timestamp, Date, or serverTimestamp placeholder
              let createdAt: Date;
              if (item.createdAt?.toDate) {
                createdAt = item.createdAt.toDate();
              } else if (item.createdAt instanceof Date) {
                createdAt = item.createdAt;
              } else {
                createdAt = new Date();
              }
              
              return {
                ...item,
                createdAt: createdAt
              };
            }) || [];
            
            console.log('📋 Auth Provider (initial load): Loaded portfolio:', {
              userId: firebaseUser.uid,
              portfolioCount: portfolio.length,
              items: portfolio.map((item: any) => ({
                id: item.id,
                title: item.title,
                imageUrl: item.imageUrl ? 'has image' : 'no image'
              }))
            });
            
            const detailedUser: User = {
              id: firebaseUser.uid,
              username: userData.handle || immediateUser.username,
              email: firebaseAuthEmail, // Always use Firebase Auth email as source of truth
              displayName: userData.name || userData.displayName || immediateUser.displayName,
              avatarUrl: userData.avatarUrl || immediateUser.avatarUrl,
              bio: userData.bio || '',
              website: userData.website || '',
              location: userData.location || '',
              followerCount: userData.followerCount || userData.followers?.length || 0,
              followingCount: userData.followingCount || userData.following?.length || 0,
              postCount: userData.postCount || 0,
              createdAt: userData.createdAt?.toDate() || immediateUser.createdAt,
              updatedAt: userData.updatedAt?.toDate() || immediateUser.updatedAt,
              isVerified: userData.isVerified || false,
              isProfessional: userData.isProfessional || false,
              isActive: userData.isActive !== false,
              lastSeen: userData.lastSeen?.toDate(),
            artistType: userData.artistType || '',
            isAdmin: userData.isAdmin || false,
            // Tip jar & suggestions opt-in: default to disabled unless explicitly enabled
            tipJarEnabled: userData.tipJarEnabled ?? false,
            suggestionsEnabled: userData.suggestionsEnabled ?? false,
            // Tabs are hidden by default until explicitly enabled
            hideShop: userData.hideShop ?? true,
            hideLearn: userData.hideLearn ?? true,
            hideShowcaseLocations: userData.hideShowcaseLocations || false,
            newsletterLink: userData.newsletterLink || '',
            socialLinks: userData.socialLinks || {},
            showcaseLocations: userData.showcaseLocations || [],
            portfolio: portfolio,
            preferences: {
              notifications: userData.preferences?.notifications || immediateUser.preferences?.notifications || {
                likes: true,
                comments: true,
                follows: true,
                messages: true,
                auctions: true
              },
              privacy: userData.preferences?.privacy || immediateUser.preferences?.privacy || {
                showEmail: false,
                showLocation: false,
                allowMessages: true
              },
              discover: userData.preferences?.discover || {}
            },
            // Stripe Connect fields
            stripeAccountId: userData.stripeAccountId,
            stripeOnboardingStatus: userData.stripeOnboardingStatus,
            stripeOnboardingUrl: userData.stripeOnboardingUrl,
            stripeChargesEnabled: userData.stripeChargesEnabled,
            stripePayoutsEnabled: userData.stripePayoutsEnabled,
            stripeAccountType: userData.stripeAccountType,
            platformDonationEnabled: userData.platformDonationEnabled,
            platformDonationType: userData.platformDonationType,
            platformDonationPercentage: userData.platformDonationPercentage,
            platformDonationOneTimeAmount: userData.platformDonationOneTimeAmount,
            platformDonationOneTimeCompleted: userData.platformDonationOneTimeCompleted
          };
          setUser(detailedUser);
          setAvatarUrl(detailedUser.avatarUrl || null);
        }
      } catch (error) {
        console.error('Error fetching detailed user data:', error);
        // Keep the immediate user data if Firestore fails
      }
      } else {
        setUser(null);
        setAvatarUrl(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshUser = async () => {
    if (firebaseUser) {
      try {
        // Get user data from Firestore using userProfiles collection
        const userDoc = await getDoc(doc(db, 'userProfiles', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // CRITICAL: Sync email - Firebase Auth email is the source of truth
          // If Firestore email doesn't match Firebase Auth email, update Firestore
          const firebaseAuthEmail = firebaseUser.email || '';
          const firestoreEmail = userData.email || '';
          
          if (firebaseAuthEmail && firestoreEmail && firebaseAuthEmail.toLowerCase() !== firestoreEmail.toLowerCase()) {
            console.warn('⚠️ Email mismatch detected during refresh:', {
              firebaseAuth: firebaseAuthEmail,
              firestore: firestoreEmail,
              userId: firebaseUser.uid
            });
            
            // Auto-sync: Update Firestore to match Firebase Auth
            try {
              await updateDoc(doc(db, 'userProfiles', firebaseUser.uid), {
                email: firebaseAuthEmail,
                updatedAt: new Date()
              });
              console.log('✅ Email synced during refresh: Firestore updated to match Firebase Auth');
            } catch (syncError) {
              console.error('❌ Failed to sync email during refresh:', syncError);
            }
          }
          
          // Convert portfolio items from Firestore format (with Timestamps) to Date objects
          const portfolio = userData.portfolio?.map((item: any) => {
            // Handle createdAt - could be Firestore Timestamp, Date, or serverTimestamp placeholder
            let createdAt: Date;
            if (item.createdAt?.toDate) {
              createdAt = item.createdAt.toDate();
            } else if (item.createdAt instanceof Date) {
              createdAt = item.createdAt;
            } else {
              createdAt = new Date();
            }
            
            return {
              ...item,
              createdAt: createdAt
            };
          }) || [];
          
          console.log('📋 Auth Provider: Loaded portfolio:', {
            userId: firebaseUser.uid,
            portfolioCount: portfolio.length,
            items: portfolio.map((item: any) => ({
              id: item.id,
              title: item.title,
              imageUrl: item.imageUrl ? 'has image' : 'no image',
              createdAt: item.createdAt
            }))
          });
          
          const user: User = {
            id: firebaseUser.uid,
            username: userData.handle || '',
            email: firebaseAuthEmail, // Always use Firebase Auth email as source of truth
            displayName: userData.name || userData.displayName || firebaseUser.displayName || '',
            avatarUrl: userData.avatarUrl || firebaseUser.photoURL || undefined,
            bio: userData.bio || '',
            website: userData.website || '',
            location: userData.location || '',
            followerCount: userData.followerCount || userData.followers?.length || 0,
            followingCount: userData.followingCount || userData.following?.length || 0,
            postCount: userData.postCount || 0,
            createdAt: userData.createdAt?.toDate() || new Date(),
            updatedAt: userData.updatedAt?.toDate() || new Date(),
            isVerified: userData.isVerified || false,
            isProfessional: userData.isProfessional || false,
            isActive: userData.isActive !== false,
            lastSeen: userData.lastSeen?.toDate(),
            artistType: userData.artistType || '',
            isAdmin: userData.isAdmin || false,
            hideLocation: userData.hideLocation || false,
            hideFlags: userData.hideFlags || false,
            hideCard: userData.hideCard || false,
            hideShowcaseLocations: userData.hideShowcaseLocations || false,
            hideShop: userData.hideShop ?? true,
            hideLearn: userData.hideLearn ?? true,
            socialLinks: userData.socialLinks || {},
            showcaseLocations: userData.showcaseLocations || [],
            portfolio: portfolio,
            preferences: {
              notifications: userData.preferences?.notifications || {
                likes: true,
                comments: true,
                follows: true,
                messages: true,
                auctions: true
              },
              privacy: userData.preferences?.privacy || {
                showEmail: false,
                showLocation: false,
                allowMessages: true
              },
              discover: userData.preferences?.discover || {}
            }
          };
          setUser(user);
          setAvatarUrl(user.avatarUrl || null);
        }
      } catch (error) {
        console.error('Error refreshing user data:', error);
        // If Firestore is offline, keep the existing user data
        if ((error as any)?.code === 'unavailable' || (error as any)?.message?.includes('offline')) {
          console.log('Firestore offline during refresh, keeping existing user data');
        }
      }
    }
  };

  const value = {
    user,
    firebaseUser,
    loading,
    avatarUrl,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
