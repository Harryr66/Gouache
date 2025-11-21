'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Eye,
  EyeOff,
  AlertCircle,
  Send,
  Settings,
  LogOut,
  Trash2
} from 'lucide-react';
import { useDiscoverSettings } from '@/providers/discover-settings-provider';
import { useAuth } from '@/providers/auth-provider';
import { db, auth, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, deleteDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { signOut as firebaseSignOut, deleteUser } from 'firebase/auth';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { StripeIntegrationWizard } from '@/components/stripe-integration-wizard';
import { BusinessManager } from '@/components/business-manager';
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

export default function SettingsPage() {
  const { settings: discoverSettings, updateSettings: updateDiscoverSettings } = useDiscoverSettings();
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [reportMessage, setReportMessage] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isSavingDiscoverSettings, setIsSavingDiscoverSettings] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  
  // Discover preferences state - load from user preferences
  const [discoverPrefs, setDiscoverPrefs] = useState({
    hideDigitalArt: user?.preferences?.discover?.hideDigitalArt || false,
    hideAIAssistedArt: user?.preferences?.discover?.hideAIAssistedArt || false,
    hideNFTs: user?.preferences?.discover?.hideNFTs || false,
    hidePhotography: user?.preferences?.discover?.hidePhotography || false,
    hideVideoArt: user?.preferences?.discover?.hideVideoArt || false,
    hidePerformanceArt: user?.preferences?.discover?.hidePerformanceArt || false,
    hideInstallationArt: user?.preferences?.discover?.hideInstallationArt || false,
    hidePrintmaking: user?.preferences?.discover?.hidePrintmaking || false,
    hideTextileArt: user?.preferences?.discover?.hideTextileArt || false,
  });
  
  // Load preferences from user when user changes
  useEffect(() => {
    if (user?.preferences?.discover) {
      setDiscoverPrefs({
        hideDigitalArt: user.preferences.discover.hideDigitalArt || false,
        hideAIAssistedArt: user.preferences.discover.hideAIAssistedArt || false,
        hideNFTs: user.preferences.discover.hideNFTs || false,
        hidePhotography: user.preferences.discover.hidePhotography || false,
        hideVideoArt: user.preferences.discover.hideVideoArt || false,
        hidePerformanceArt: user.preferences.discover.hidePerformanceArt || false,
        hideInstallationArt: user.preferences.discover.hideInstallationArt || false,
        hidePrintmaking: user.preferences.discover.hidePrintmaking || false,
        hideTextileArt: user.preferences.discover.hideTextileArt || false,
      });
    }
  }, [user?.preferences?.discover]);
  
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

    setIsDeletingAccount(true);
    try {
      const userId = user.id;
      const batch = writeBatch(db);

      // 1. Delete user profile
      const userProfileRef = doc(db, 'userProfiles', userId);
      batch.delete(userProfileRef);

      // 2. Delete handle mapping
      if (user.username) {
        const handleRef = doc(db, 'handles', user.username);
        batch.delete(handleRef);
      }

      // 3. Delete user's artworks
      const artworksQuery = query(collection(db, 'artworks'), where('artist.userId', '==', userId));
      const artworksSnapshot = await getDocs(artworksQuery);
      artworksSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 4. Delete user's posts
      const postsQuery = query(collection(db, 'posts'), where('artist.id', '==', userId));
      const postsSnapshot = await getDocs(postsQuery);
      postsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 5. Delete user's courses (if any)
      const coursesQuery = query(collection(db, 'courses'), where('instructor.userId', '==', userId));
      const coursesSnapshot = await getDocs(coursesQuery);
      coursesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 6. Delete user's marketplace products
      const productsQuery = query(collection(db, 'marketplaceProducts'), where('sellerId', '==', userId));
      const productsSnapshot = await getDocs(productsQuery);
      productsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 7. Delete user's artist request (if any)
      const artistRequestsQuery = query(collection(db, 'artistRequests'), where('userId', '==', userId));
      const artistRequestsSnapshot = await getDocs(artistRequestsQuery);
      artistRequestsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Commit all Firestore deletions
      await batch.commit();

      // 8. Delete storage files (avatars, banners, portfolio)
      try {
        // Delete avatar
        if (user.avatarUrl) {
          try {
            const avatarRef = ref(storage, `avatars/${userId}`);
            await deleteObject(avatarRef);
          } catch (error) {
            console.warn('Could not delete avatar:', error);
          }
        }

        // Delete banner
        if (user.bannerImageUrl) {
          try {
            const bannerRef = ref(storage, `banners/${userId}`);
            await deleteObject(bannerRef);
          } catch (error) {
            console.warn('Could not delete banner:', error);
          }
        }

        // Delete portfolio images
        try {
          const portfolioRef = ref(storage, `portfolio/${userId}`);
          const portfolioList = await listAll(portfolioRef);
          await Promise.all(portfolioList.items.map(item => deleteObject(item)));
        } catch (error) {
          console.warn('Could not delete portfolio images:', error);
        }
      } catch (storageError) {
        console.warn('Error deleting storage files:', storageError);
        // Continue with account deletion even if storage cleanup fails
      }

      // 9. Delete Firebase Auth user (must be last)
      await deleteUser(auth.currentUser);

      toast({
        title: 'Account deleted',
        description: 'Your account and all associated data have been permanently deleted.',
      });

      // Redirect to login
      router.push('/login');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      
      let errorMessage = 'Failed to delete account. Please try again.';
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'For security, please sign out and sign back in, then try deleting your account again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Deletion failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteAccountDialog(false);
    }
  };
  
  
  const handleSaveDiscoverSettings = async () => {
    if (!user) {
      toast({
        title: "Not signed in",
        description: "Please sign in to save settings.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSavingDiscoverSettings(true);
    try {
      const userProfileRef = doc(db, 'userProfiles', user.id);
      const userProfileSnap = await getDoc(userProfileRef);
      
      const currentPreferences = userProfileSnap.data()?.preferences || {};
      const updatedPreferences = {
        ...currentPreferences,
        discover: {
          hideDigitalArt: discoverPrefs.hideDigitalArt,
          hideAIAssistedArt: discoverPrefs.hideAIAssistedArt,
          hideNFTs: discoverPrefs.hideNFTs,
          hidePhotography: discoverPrefs.hidePhotography,
          hideVideoArt: discoverPrefs.hideVideoArt,
          hidePerformanceArt: discoverPrefs.hidePerformanceArt,
          hideInstallationArt: discoverPrefs.hideInstallationArt,
          hidePrintmaking: discoverPrefs.hidePrintmaking,
          hideTextileArt: discoverPrefs.hideTextileArt,
        }
      };
      
      await updateDoc(userProfileRef, {
        preferences: updatedPreferences,
        updatedAt: serverTimestamp()
      });
      
      // Refresh user data to reflect changes
      await refreshUser();
      
      toast({
        title: "Settings saved",
        description: "Your discover preferences have been saved and will apply to all future visits.",
      });
    } catch (error) {
      console.error('Error saving discover settings:', error);
      toast({
        title: "Save failed",
        description: "Failed to save discover settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSavingDiscoverSettings(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!user) {
      toast({
        title: "Not signed in",
        description: "Please sign in to submit a report.",
        variant: "destructive"
      });
      return;
    }

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
        userId: user.id,
        userEmail: user.email || '',
        username: user.username || '',
        displayName: user.displayName || '',
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
    <div className="container mx-auto px-4 py-4 sm:py-6 max-w-6xl">
      <div className="flex flex-col space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="general" className="w-full">
          <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
              <TabsTrigger value="general" className="shrink-0 whitespace-nowrap">General</TabsTrigger>
              {user?.isProfessional && (
                <>
                  <TabsTrigger value="business" className="shrink-0 whitespace-nowrap text-xs sm:text-sm">Business</TabsTrigger>
                  <TabsTrigger value="payments" className="shrink-0 whitespace-nowrap">Payments</TabsTrigger>
                </>
              )}
              <TabsTrigger value="discover" className="shrink-0 whitespace-nowrap">Discover</TabsTrigger>
              <TabsTrigger value="support" className="shrink-0 whitespace-nowrap">Support</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="general" className="mt-4 sm:mt-6">
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
                    <h4 className="font-medium text-sm sm:text-base text-destructive">Delete Account</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                  <Button 
                    variant="destructive"
                    onClick={() => setShowDeleteAccountDialog(true)}
                    disabled={isDeletingAccount}
                    className="w-full sm:w-auto shrink-0"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeletingAccount ? 'Deleting…' : 'Delete Account'}
                  </Button>
                </div>

                <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
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
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeletingAccount}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={isDeletingAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeletingAccount ? 'Deleting...' : 'Yes, delete my account'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>

          {user?.isProfessional && (
            <>
              <TabsContent value="business" className="mt-4 sm:mt-6">
                <BusinessManager />
              </TabsContent>
              <TabsContent value="payments" className="mt-4 sm:mt-6">
                <StripeIntegrationWizard />
              </TabsContent>
            </>
          )}

          <TabsContent value="discover" className="mt-4 sm:mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                  <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Discover Settings</span>
                </CardTitle>
                <CardDescription className="text-sm">
                  Customize what content you see in the Discover section. These preferences are permanent and will apply to all future visits.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="hideDigitalArt" className="text-sm sm:text-base">Hide Digital Art</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Permanently hide digital art and digital paintings from your discover feed
                    </p>
                  </div>
                  <Switch
                    id="hideDigitalArt"
                    checked={discoverPrefs.hideDigitalArt}
                    onCheckedChange={(checked) => setDiscoverPrefs({ ...discoverPrefs, hideDigitalArt: checked })}
                    className="shrink-0"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="hideAiAssistedArt" className="text-sm sm:text-base">Hide AI-Assisted Art</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Permanently hide AI-assisted and AI-generated artworks from your discover feed
                    </p>
                  </div>
                  <Switch
                    id="hideAiAssistedArt"
                    checked={discoverPrefs.hideAIAssistedArt}
                    onCheckedChange={(checked) => setDiscoverPrefs({ ...discoverPrefs, hideAIAssistedArt: checked })}
                    className="shrink-0"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="hideNFTs" className="text-sm sm:text-base">Hide NFTs</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Permanently hide NFT artworks from your discover feed
                    </p>
                  </div>
                  <Switch
                    id="hideNFTs"
                    checked={discoverPrefs.hideNFTs}
                    onCheckedChange={(checked) => setDiscoverPrefs({ ...discoverPrefs, hideNFTs: checked })}
                    className="shrink-0"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="hidePhotography" className="text-sm sm:text-base">Hide Photography</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Permanently hide photography artworks from your discover feed
                    </p>
                  </div>
                  <Switch
                    id="hidePhotography"
                    checked={discoverPrefs.hidePhotography}
                    onCheckedChange={(checked) => setDiscoverPrefs({ ...discoverPrefs, hidePhotography: checked })}
                    className="shrink-0"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="hideVideoArt" className="text-sm sm:text-base">Hide Video Art</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Permanently hide video art from your discover feed
                    </p>
                  </div>
                  <Switch
                    id="hideVideoArt"
                    checked={discoverPrefs.hideVideoArt}
                    onCheckedChange={(checked) => setDiscoverPrefs({ ...discoverPrefs, hideVideoArt: checked })}
                    className="shrink-0"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="hidePerformanceArt" className="text-sm sm:text-base">Hide Performance Art</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Permanently hide performance art from your discover feed
                    </p>
                  </div>
                  <Switch
                    id="hidePerformanceArt"
                    checked={discoverPrefs.hidePerformanceArt}
                    onCheckedChange={(checked) => setDiscoverPrefs({ ...discoverPrefs, hidePerformanceArt: checked })}
                    className="shrink-0"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="hideInstallationArt" className="text-sm sm:text-base">Hide Installation Art</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Permanently hide installation art from your discover feed
                    </p>
                  </div>
                  <Switch
                    id="hideInstallationArt"
                    checked={discoverPrefs.hideInstallationArt}
                    onCheckedChange={(checked) => setDiscoverPrefs({ ...discoverPrefs, hideInstallationArt: checked })}
                    className="shrink-0"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="hidePrintmaking" className="text-sm sm:text-base">Hide Printmaking</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Permanently hide printmaking artworks from your discover feed
                    </p>
                  </div>
                  <Switch
                    id="hidePrintmaking"
                    checked={discoverPrefs.hidePrintmaking}
                    onCheckedChange={(checked) => setDiscoverPrefs({ ...discoverPrefs, hidePrintmaking: checked })}
                    className="shrink-0"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="hideTextileArt" className="text-sm sm:text-base">Hide Textile Art</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Permanently hide textile art from your discover feed
                    </p>
                  </div>
                  <Switch
                    id="hideTextileArt"
                    checked={discoverPrefs.hideTextileArt}
                    onCheckedChange={(checked) => setDiscoverPrefs({ ...discoverPrefs, hideTextileArt: checked })}
                    className="shrink-0"
                  />
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <EyeOff className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">About Content Filtering</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        These settings are permanent and will automatically filter content in your Discover feed. 
                        You can override these filters temporarily using the Advanced Search panel on the Discover page, 
                        but your permanent preferences will be restored when you refresh the page.
                      </p>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleSaveDiscoverSettings}
                  disabled={isSavingDiscoverSettings}
                >
                  {isSavingDiscoverSettings ? 'Saving...' : 'Save Discover Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support" className="mt-4 sm:mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Report Bug or System Problem</span>
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
