'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle,
  Send,
  Settings,
  LogOut,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { db, auth, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, deleteDoc, query, where, getDocs, writeBatch, onSnapshot, setDoc } from 'firebase/firestore';
import { signOut as firebaseSignOut, deleteUser, reauthenticateWithCredential, EmailAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { useRouter, useSearchParams } from 'next/navigation';
import { StripeIntegrationWizard } from '@/components/stripe-integration-wizard';
import { BusinessManager } from '@/components/business-manager';
import { ThemeLoading } from '@/components/theme-loading';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function SettingsPageContent() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reportMessage, setReportMessage] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [hasApprovedArtistRequest, setHasApprovedArtistRequest] = useState(false);
  const [hueEnabled, setHueEnabled] = useState(true);

  // Allow guests to access settings, but grey out sign-in required tabs
  
  // Get tab from URL or default to 'general' (or 'hue' for guests)
  // Map old 'payments' tab to 'business' for backward compatibility
  const getTabFromUrl = () => {
    const tab = searchParams.get('tab') || (user ? 'general' : 'hue');
    // Map old 'payments' tab to 'business'
    if (tab === 'payments') {
      return 'business';
    }
    // Redirect guests away from sign-in required tabs
    if (!user && (tab === 'general' || tab === 'business')) {
      return 'hue';
    }
    return tab;
  };
  
  const currentTab = getTabFromUrl();
  const [activeTab, setActiveTab] = useState(currentTab);
  
  // Update active tab when URL changes
  useEffect(() => {
    const tab = getTabFromUrl();
    setActiveTab(tab);
    // If URL has old 'payments' tab, update it to 'business'
    if (searchParams.get('tab') === 'payments') {
      router.replace(`/settings?tab=business${searchParams.get('refresh') ? '&refresh=true' : ''}${searchParams.get('success') ? '&success=true' : ''}`, { scroll: false });
    }
    // Redirect guests away from sign-in required tabs
    if (!user && (tab === 'general' || tab === 'business')) {
      router.replace('/settings?tab=hue', { scroll: false });
    }
  }, [searchParams, router, user]);
  
  // Load Hue enabled state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const loadHuePreference = () => {
      // For guests (no user.id), use localStorage
      if (!user?.id) {
        const savedPreference = localStorage.getItem('hue-enabled');
        if (savedPreference !== null) {
          setHueEnabled(savedPreference === 'true');
        } else {
          // Default to true for guests
          setHueEnabled(true);
        }
        return;
      }

      // For authenticated users, use Firestore
      const userRef = doc(db, 'userProfiles', user.id);
      const unsubscribe = onSnapshot(
        userRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const enabled = userData.preferences?.hueEnabled !== false; // Default to true
            setHueEnabled(enabled);
          }
        },
        (error) => {
          // Handle Firestore listener errors gracefully
          console.error('Settings: Error listening to user profile:', error);
          // Fallback to localStorage or default if Firestore fails
          const savedPreference = localStorage.getItem('hue-enabled');
          if (savedPreference !== null) {
            setHueEnabled(savedPreference === 'true');
          } else {
            // Default to true if no saved preference and Firestore fails
            setHueEnabled(true);
          }
        }
      );

      return unsubscribe;
    };

    const unsubscribe = loadHuePreference();
    
    // Listen for localStorage changes (for guests)
    if (!user?.id) {
      const handleStorageChange = (e: StorageEvent | Event) => {
        if (e instanceof StorageEvent && e.key === 'hue-enabled') {
          setHueEnabled(e.newValue === 'true');
        } else if (e.type === 'hue-preference-changed') {
          // Custom event from settings page
          const savedPreference = localStorage.getItem('hue-enabled');
          if (savedPreference !== null) {
            setHueEnabled(savedPreference === 'true');
          }
        }
      };

      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('hue-preference-changed', handleStorageChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('hue-preference-changed', handleStorageChange);
        if (unsubscribe) unsubscribe();
      };
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.id]);
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    // Prevent switching to sign-in required tabs if user is not signed in
    if ((value === 'general' || value === 'business') && !user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to access this section.",
        variant: "destructive"
      });
      return;
    }
    setActiveTab(value);
    router.push(`/settings?tab=${value}`, { scroll: false });
  };
  
  // Check if user has an approved artist request (fallback for missing isProfessional flag)
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'artistRequests'),
      where('userId', '==', user.id),
      where('status', '==', 'approved')
    );
    const unsub = onSnapshot(q, (snap) => {
      setHasApprovedArtistRequest(!snap.empty);
    });
    return () => unsub();
  }, [user?.id]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await firebaseSignOut(auth);
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully.'
      });
      router.push('/login');
    } catch (error) {
      console.error('Failed to sign out:', error);
      toast({
        title: 'Sign out failed',
        description: 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !auth.currentUser) {
      toast({
        title: 'Error',
        description: 'User not found. Please refresh the page.',
        variant: 'destructive'
      });
      return;
    }

    if (!deletePassword) {
      toast({
        title: 'Password required',
        description: 'Please enter your password to confirm account deletion.',
        variant: 'destructive'
      });
      return;
    }

    setIsDeletingAccount(true);
    let deletionSuccessful = false;
    let errorStep = '';
    
    // Re-authenticate user before deletion
    try {
      if (!auth.currentUser?.email) {
        throw new Error('User email not found');
      }
      
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        deletePassword
      );
      
      await reauthenticateWithCredential(auth.currentUser, credential);
    } catch (reauthError: any) {
      setIsDeletingAccount(false);
      let errorMessage = 'Re-authentication failed. Please check your password.';
      
      if (reauthError?.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (reauthError?.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid credentials. Please check your password.';
      } else if (reauthError?.message) {
        errorMessage = `Re-authentication failed: ${reauthError.message}`;
      }
      
      toast({
        title: 'Authentication failed',
        description: errorMessage,
        variant: 'destructive'
      });
      setDeletePassword('');
      return;
    }
    
    try {
      const userId = user.id;
      
      // Helper function to execute batch in chunks (Firestore limit is 500 operations)
      const executeBatchInChunks = async (operations: Array<{ type: 'delete', ref: any }>) => {
        const BATCH_LIMIT = 500;
        for (let i = 0; i < operations.length; i += BATCH_LIMIT) {
          const chunk = operations.slice(i, i + BATCH_LIMIT);
          const batch = writeBatch(db);
          chunk.forEach(op => {
            if (op.type === 'delete') {
              batch.delete(op.ref);
            }
          });
          await batch.commit();
        }
      };

      const operations: Array<{ type: 'delete', ref: any }> = [];

      // 1. Delete user profile
      errorStep = 'deleting user profile';
      const userProfileRef = doc(db, 'userProfiles', userId);
      operations.push({ type: 'delete', ref: userProfileRef });

      // 2. Delete handle mapping (skip if it doesn't exist)
      errorStep = 'deleting handle mapping';
      if (user.username) {
        try {
          const handleRef = doc(db, 'handles', user.username);
          const handleDoc = await getDoc(handleRef);
          if (handleDoc.exists()) {
            operations.push({ type: 'delete', ref: handleRef });
          }
        } catch (error: any) {
          // Handle might not exist, continue
          console.warn('Handle not found or error checking handle:', error?.message);
        }
      }

      // 3. Delete user's artworks
      errorStep = 'fetching artworks';
      try {
        const artworksQuery = query(collection(db, 'artworks'), where('artist.userId', '==', userId));
        const artworksSnapshot = await getDocs(artworksQuery);
        artworksSnapshot.forEach((doc) => {
          operations.push({ type: 'delete', ref: doc.ref });
        });
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        toast({
          title: 'Warning',
          description: `Could not fetch artworks: ${errorMsg}. Continuing with deletion...`,
          variant: 'default'
        });
      }

      // 4. Delete user's posts
      errorStep = 'fetching posts';
      try {
        const postsQuery = query(collection(db, 'posts'), where('artist.id', '==', userId));
        const postsSnapshot = await getDocs(postsQuery);
        postsSnapshot.forEach((doc) => {
          operations.push({ type: 'delete', ref: doc.ref });
        });
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        toast({
          title: 'Warning',
          description: `Could not fetch posts: ${errorMsg}. Continuing with deletion...`,
          variant: 'default'
        });
      }

      // 5. Delete user's courses (if any)
      errorStep = 'fetching courses';
      try {
        const coursesQuery = query(collection(db, 'courses'), where('instructor.userId', '==', userId));
        const coursesSnapshot = await getDocs(coursesQuery);
        coursesSnapshot.forEach((doc) => {
          operations.push({ type: 'delete', ref: doc.ref });
        });
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        toast({
          title: 'Warning',
          description: `Could not fetch courses: ${errorMsg}. Continuing with deletion...`,
          variant: 'default'
        });
      }

      // 6. Delete user's marketplace products
      errorStep = 'fetching marketplace products';
      try {
        const productsQuery = query(collection(db, 'marketplaceProducts'), where('sellerId', '==', userId));
        const productsSnapshot = await getDocs(productsQuery);
        productsSnapshot.forEach((doc) => {
          operations.push({ type: 'delete', ref: doc.ref });
        });
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        toast({
          title: 'Warning',
          description: `Could not fetch marketplace products: ${errorMsg}. Continuing with deletion...`,
          variant: 'default'
        });
      }

      // 7. Delete user's artist request (if any)
      errorStep = 'fetching artist requests';
      try {
        const artistRequestsQuery = query(collection(db, 'artistRequests'), where('userId', '==', userId));
        const artistRequestsSnapshot = await getDocs(artistRequestsQuery);
        artistRequestsSnapshot.forEach((doc) => {
          operations.push({ type: 'delete', ref: doc.ref });
        });
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        toast({
          title: 'Warning',
          description: `Could not fetch artist requests: ${errorMsg}. Continuing with deletion...`,
          variant: 'default'
        });
      }

      // Commit all Firestore deletions in chunks if needed
      errorStep = `committing ${operations.length} deletions`;
      if (operations.length > 0) {
        await executeBatchInChunks(operations);
      }

      // 8. Delete storage files (avatars, banners, portfolio)
      errorStep = 'deleting storage files';
      try {
        // Delete avatar
        if (user.avatarUrl) {
          try {
            const avatarRef = ref(storage, `avatars/${userId}`);
            await deleteObject(avatarRef);
          } catch (error: any) {
            console.warn('Could not delete avatar:', error?.message || error);
          }
        }

        // Delete banner
        if (user.bannerImageUrl) {
          try {
            const bannerRef = ref(storage, `banners/${userId}`);
            await deleteObject(bannerRef);
          } catch (error: any) {
            console.warn('Could not delete banner:', error?.message || error);
          }
        }

        // Delete portfolio images
        try {
          const portfolioRef = ref(storage, `portfolio/${userId}`);
          const portfolioList = await listAll(portfolioRef);
          await Promise.all(portfolioList.items.map(item => deleteObject(item)));
        } catch (error: any) {
          console.warn('Could not delete portfolio images:', error?.message || error);
        }
      } catch (storageError: any) {
        const errorMsg = storageError?.message || String(storageError);
        toast({
          title: 'Warning',
          description: `Could not delete all storage files: ${errorMsg}. Continuing with account deletion...`,
          variant: 'default'
        });
        // Continue with account deletion even if storage cleanup fails
      }

      // 9. Delete Firebase Auth user (must be last)
      errorStep = 'deleting authentication account';
      await deleteUser(auth.currentUser);

      toast({
        title: 'Account deleted',
        description: 'Your account and all associated data have been permanently deleted.',
      });

      deletionSuccessful = true;

      // Reset state
      setDeletePassword('');
      setShowPasswordInput(false);

      // Redirect to login
      router.push('/login');
    } catch (error: any) {
      const errorCode = error?.code || 'unknown';
      const errorMessage = error?.message || String(error) || 'Unknown error';
      const errorStack = error?.stack;
      
      console.error('Error deleting account:', {
        step: errorStep,
        code: errorCode,
        message: errorMessage,
        stack: errorStack
      });
      
      let userFriendlyMessage = 'Failed to delete account. ';
      
      if (errorCode === 'auth/requires-recent-login') {
        userFriendlyMessage = 'For security, please sign out and sign back in, then try deleting your account again.';
      } else if (errorCode === 'permission-denied') {
        userFriendlyMessage = `Permission denied at step: ${errorStep}. Error: ${errorMessage}`;
      } else if (errorCode === 'unavailable') {
        userFriendlyMessage = 'Service temporarily unavailable. Please try again in a moment.';
      } else if (errorCode === 'failed-precondition') {
        userFriendlyMessage = `Operation failed: ${errorMessage}. Please try again.`;
      } else if (errorCode === 'not-found') {
        userFriendlyMessage = `Resource not found at step: ${errorStep}. Error: ${errorMessage}`;
      } else {
        userFriendlyMessage = `Failed at step: ${errorStep}. Error code: ${errorCode}. Message: ${errorMessage}`;
      }

      toast({
        title: 'Deletion failed',
        description: userFriendlyMessage,
        variant: 'destructive',
        duration: 10000 // Show for 10 seconds so user can read it
      });
    } finally {
      setIsDeletingAccount(false);
      // Only close dialog on success - let user try again on error
      if (deletionSuccessful) {
        setShowDeleteAccountDialog(false);
        setShowPasswordInput(false);
        setDeletePassword('');
      }
    }
  };
  
  
  const handleSubmitReport = async () => {
    if (!reportMessage.trim()) {
      toast({
        title: "Message required",
        description: "Please describe the issue you're reporting.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingReport(true);
    try {
      await addDoc(collection(db, 'userReports'), {
        userId: user?.id || 'guest',
        userEmail: user?.email || 'guest@anonymous.com',
        username: user?.username || 'guest',
        displayName: user?.displayName || 'Guest User',
        message: reportMessage.trim(),
        status: 'pending',
        submittedAt: serverTimestamp(),
      });

      toast({
        title: "Report submitted",
        description: "Thank you for your report. We'll review it and get back to you if needed.",
      });

      setReportMessage('');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Submission failed",
        description: "Failed to submit your report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 max-w-6xl w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
              <TabsTrigger 
                value="general" 
                className={cn(
                  "shrink-0 whitespace-nowrap",
                  !user && "opacity-50 cursor-not-allowed"
                )}
                disabled={!user}
              >
                General
              </TabsTrigger>
              <TabsTrigger value="hue" className="shrink-0 whitespace-nowrap">Hue</TabsTrigger>
              <TabsTrigger 
                value="business" 
                className={cn(
                  "shrink-0 whitespace-nowrap",
                  !user && "opacity-50 cursor-not-allowed"
                )}
                disabled={!user}
              >
                Business
              </TabsTrigger>
              <TabsTrigger value="support" className="shrink-0 whitespace-nowrap text-xs sm:text-sm">Report bug</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="general" className="mt-4 sm:mt-6">
            {!user ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center space-y-2">
                    <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Sign in required</h3>
                    <p className="text-sm text-muted-foreground">
                      Please sign in to access general settings.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>General Settings</span>
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Manage your account and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 border rounded-lg border-destructive/50">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm sm:text-base">Sign Out</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">Sign out of your account</p>
                  </div>
                  <Button 
                    variant="destructive"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="w-full sm:w-auto shrink-0"
                    size="sm"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {isSigningOut ? 'Signing out…' : 'Sign Out'}
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 border rounded-lg border-destructive">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm sm:text-base text-foreground">Delete Account</h4>
                    <p className="text-xs sm:text-sm text-foreground/90">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      setShowDeleteAccountDialog(true);
                      setShowPasswordInput(false);
                      setDeletePassword('');
                    }}
                    disabled={isDeletingAccount}
                    className="w-full sm:w-auto shrink-0"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeletingAccount ? 'Deleting…' : 'Delete Account'}
                  </Button>
                </div>

                <AlertDialog 
                  open={showDeleteAccountDialog} 
                  onOpenChange={(open) => {
                    if (!isDeletingAccount) {
                      setShowDeleteAccountDialog(open);
                      if (!open) {
                        setShowPasswordInput(false);
                        setDeletePassword('');
                      }
                    }
                  }}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>
                          This action <strong>cannot be undone</strong>. This will permanently delete:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Your account and profile</li>
                          <li>All your artworks and portfolio</li>
                          <li>All your posts and content</li>
                          {user?.isProfessional && (
                            <>
                              <li>All your courses</li>
                              <li>All your marketplace products</li>
                            </>
                          )}
                          <li>All your uploaded images and files</li>
                          <li>All your account data</li>
                        </ul>
                        <p className="font-semibold text-destructive mt-2">
                          This action is permanent and irreversible.
                        </p>
                        {showPasswordInput && (
                          <div className="mt-4 space-y-2">
                            <Label htmlFor="delete-password">Enter your password to confirm:</Label>
                            <Input
                              id="delete-password"
                              type="password"
                              value={deletePassword}
                              onChange={(e) => setDeletePassword(e.target.value)}
                              placeholder="Your password"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && deletePassword) {
                                  handleDeleteAccount();
                                }
                              }}
                            />
                          </div>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel 
                        disabled={isDeletingAccount}
                        onClick={() => {
                          setShowPasswordInput(false);
                          setDeletePassword('');
                        }}
                      >
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async (e) => {
                          e.preventDefault();
                          if (!showPasswordInput) {
                            setShowPasswordInput(true);
                          } else if (deletePassword) {
                            await handleDeleteAccount();
                          }
                        }}
                        disabled={isDeletingAccount || (showPasswordInput && !deletePassword)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeletingAccount ? 'Deleting...' : showPasswordInput ? 'Confirm & Delete' : 'Yes, delete my account'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
            )}
          </TabsContent>

          <TabsContent value="business" className="mt-4 sm:mt-6 space-y-6">
            {!user ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center space-y-2">
                    <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Sign in required</h3>
                    <p className="text-sm text-muted-foreground">
                      Please sign in to access business settings.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
            {(user?.isProfessional || hasApprovedArtistRequest) && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Business Management</h2>
                <BusinessManager />
              </div>
            )}
            <div data-payments-section>
              <h2 className="text-lg font-semibold mb-4">Payments & Payouts</h2>
              <StripeIntegrationWizard />
            </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="hue" className="mt-4 sm:mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                  <span>Hue Assistant</span>
                </CardTitle>
                <CardDescription className="text-sm">
                  Manage your Hue AI assistant settings. Hue helps detect errors and provides customer support.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm sm:text-base">Enable Hue</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Show the Hue assistant on your screen. Hue will always detect errors even when hidden.
                    </p>
                  </div>
                  <Button 
                    variant={hueEnabled ? "outline" : "default"}
                    onClick={async () => {
                      const newValue = !hueEnabled;
                      
                      // For guests (no user.id), use localStorage
                      if (!user?.id) {
                        try {
                          localStorage.setItem('hue-enabled', String(newValue));
                          // Dispatch custom event to notify Hue component
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new Event('hue-preference-changed'));
                          }
                          setHueEnabled(newValue);
                          toast({
                            title: newValue ? 'Hue enabled' : 'Hue disabled',
                            description: newValue 
                              ? 'Hue assistant is now visible on your screen.'
                              : 'Hue assistant is now hidden. It will still detect errors.',
                          });
                          return;
                        } catch (error) {
                          console.error('Error saving Hue preference to localStorage:', error);
                          toast({
                            title: 'Error',
                            description: 'Failed to update Hue preference. Please try again.',
                            variant: 'destructive'
                          });
                          return;
                        }
                      }

                      // For authenticated users, use Firestore
                      try {
                        const userRef = doc(db, 'userProfiles', user.id);
                        const userDoc = await getDoc(userRef);
                        const currentData = userDoc.exists() ? (userDoc.data() || {}) : {};
                        const existingPreferences = currentData.preferences || {};
                        
                        // Use setDoc with merge: true to only update the preferences field
                        await setDoc(userRef, {
                          preferences: {
                            ...existingPreferences,
                            hueEnabled: newValue
                          }
                        }, { merge: true });

                        setHueEnabled(newValue);
                        toast({
                          title: newValue ? 'Hue enabled' : 'Hue disabled',
                          description: newValue 
                            ? 'Hue assistant is now visible on your screen.'
                            : 'Hue assistant is now hidden. It will still detect errors.',
                        });

                        if (refreshUser) {
                          await refreshUser();
                        }
                      } catch (error) {
                        console.error('Error updating Hue preference:', error);
                        toast({
                          title: 'Error',
                          description: 'Failed to update Hue preference. Please try again.',
                          variant: 'destructive'
                        });
                      }
                    }}
                    className="w-full sm:w-auto shrink-0"
                    size="sm"
                  >
                    {hueEnabled ? 'Disable Hue' : 'Enable Hue'}
                  </Button>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">About Hue</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Hue is an AI-powered assistant that helps detect errors and provides customer support. 
                        Even when hidden, Hue continues to monitor for errors and will automatically appear if an issue is detected.
                        You can drag Hue to reposition it on your screen.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support" className="mt-4 sm:mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Report Bug</span>
                </CardTitle>
                <CardDescription className="text-sm">
                  Found a bug or experiencing a system problem? Report it to our admin team and we'll investigate.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="report-message" className="text-sm sm:text-base">Describe the issue *</Label>
                  <Textarea
                    id="report-message"
                    value={reportMessage}
                    onChange={(e) => setReportMessage(e.target.value)}
                    placeholder="Please describe the bug, system problem, or issue you're experiencing. Include steps to reproduce if possible..."
                    rows={6}
                    className="resize-none text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Include as much detail as possible: what happened, when it occurred, what you were trying to do, and any error messages you saw. This helps us investigate and fix the issue quickly.
                  </p>
                </div>
                <Button 
                  onClick={handleSubmitReport} 
                  disabled={isSubmittingReport || !reportMessage.trim()}
                  className="w-full"
                >
                  {isSubmittingReport ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Report
                    </>
                  )}
                </Button>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">What happens next?</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your report will be sent directly to our admin panel for review. Our team will investigate the issue and take appropriate action. 
                        Reports are reviewed in the order they are received, and we'll work to resolve issues as quickly as possible.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <ThemeLoading size="lg" text="" />
        </div>
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  );
}
