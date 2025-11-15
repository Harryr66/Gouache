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
  User, 
  Bell, 
  Shield, 
  Palette, 
  Database, 
  Download,
  Upload,
  Trash2,
  CheckCircle,
  Eye,
  EyeOff,
  AlertCircle,
  Send
} from 'lucide-react';
import { useDiscoverSettings } from '@/providers/discover-settings-provider';
import { useAuth } from '@/providers/auth-provider';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { settings: discoverSettings, updateSettings: updateDiscoverSettings } = useDiscoverSettings();
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [reportMessage, setReportMessage] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isSavingDiscoverSettings, setIsSavingDiscoverSettings] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  
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
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="general" className="w-full">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>General Settings</span>
                </CardTitle>
                <CardDescription>
                  Manage your account and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg border-destructive/50">
                  <div>
                    <h4 className="font-medium">Sign Out</h4>
                    <p className="text-sm text-muted-foreground">Sign out of your account</p>
                  </div>
                  <Button 
                    variant="destructive"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {isSigningOut ? 'Signing out…' : 'Sign Out'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discover" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Discover Settings</span>
                </CardTitle>
                <CardDescription>
                  Customize what content you see in the Discover section. These preferences are permanent and will apply to all future visits.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="hideDigitalArt">Hide Digital Art</Label>
                    <p className="text-sm text-muted-foreground">
                      Permanently hide digital art and digital paintings from your discover feed
                    </p>
                  </div>
                  <Switch
                    id="hideDigitalArt"
                    checked={discoverPrefs.hideDigitalArt}
                    onCheckedChange={(checked) => setDiscoverPrefs({ ...discoverPrefs, hideDigitalArt: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="hideAiAssistedArt">Hide AI-Assisted Art</Label>
                    <p className="text-sm text-muted-foreground">
                      Permanently hide AI-assisted and AI-generated artworks from your discover feed
                    </p>
                  </div>
                  <Switch
                    id="hideAiAssistedArt"
                    checked={discoverPrefs.hideAIAssistedArt}
                    onCheckedChange={(checked) => setDiscoverPrefs({ ...discoverPrefs, hideAIAssistedArt: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="hideNFTs">Hide NFTs</Label>
                    <p className="text-sm text-muted-foreground">
                      Permanently hide NFT artworks from your discover feed
                    </p>
                  </div>
                  <Switch
                    id="hideNFTs"
                    checked={discoverPrefs.hideNFTs}
                    onCheckedChange={(checked) => setDiscoverPrefs({ ...discoverPrefs, hideNFTs: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="hidePhotography">Hide Photography</Label>
                    <p className="text-sm text-muted-foreground">
                      Permanently hide photography artworks from your discover feed
                    </p>
                  </div>
                  <Switch
                    id="hidePhotography"
                    checked={discoverPrefs.hidePhotography}
                    onCheckedChange={(checked) => setDiscoverPrefs({ ...discoverPrefs, hidePhotography: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="hideVideoArt">Hide Video Art</Label>
                    <p className="text-sm text-muted-foreground">
                      Permanently hide video art from your discover feed
                    </p>
                  </div>
                  <Switch
                    id="hideVideoArt"
                    checked={discoverPrefs.hideVideoArt}
                    onCheckedChange={(checked) => setDiscoverPrefs({ ...discoverPrefs, hideVideoArt: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="hidePerformanceArt">Hide Performance Art</Label>
                    <p className="text-sm text-muted-foreground">
                      Permanently hide performance art from your discover feed
                    </p>
                  </div>
                  <Switch
                    id="hidePerformanceArt"
                    checked={discoverPrefs.hidePerformanceArt}
                    onCheckedChange={(checked) => setDiscoverPrefs({ ...discoverPrefs, hidePerformanceArt: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="hideInstallationArt">Hide Installation Art</Label>
                    <p className="text-sm text-muted-foreground">
                      Permanently hide installation art from your discover feed
                    </p>
                  </div>
                  <Switch
                    id="hideInstallationArt"
                    checked={discoverPrefs.hideInstallationArt}
                    onCheckedChange={(checked) => setDiscoverPrefs({ ...discoverPrefs, hideInstallationArt: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="hidePrintmaking">Hide Printmaking</Label>
                    <p className="text-sm text-muted-foreground">
                      Permanently hide printmaking artworks from your discover feed
                    </p>
                  </div>
                  <Switch
                    id="hidePrintmaking"
                    checked={discoverPrefs.hidePrintmaking}
                    onCheckedChange={(checked) => setDiscoverPrefs({ ...discoverPrefs, hidePrintmaking: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="hideTextileArt">Hide Textile Art</Label>
                    <p className="text-sm text-muted-foreground">
                      Permanently hide textile art from your discover feed
                    </p>
                  </div>
                  <Switch
                    id="hideTextileArt"
                    checked={discoverPrefs.hideTextileArt}
                    onCheckedChange={(checked) => setDiscoverPrefs({ ...discoverPrefs, hideTextileArt: checked })}
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

          <TabsContent value="support" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>Report Bug or System Problem</span>
                </CardTitle>
                <CardDescription>
                  Found a bug or experiencing a system problem? Report it to our admin team and we'll investigate.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="report-message">Describe the issue *</Label>
                  <Textarea
                    id="report-message"
                    value={reportMessage}
                    onChange={(e) => setReportMessage(e.target.value)}
                    placeholder="Please describe the bug, system problem, or issue you're experiencing. Include steps to reproduce if possible..."
                    rows={8}
                    className="resize-none"
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
