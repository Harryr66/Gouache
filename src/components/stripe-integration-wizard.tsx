'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ExternalLink,
  Loader2,
  Info
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StripeIntegrationWizardProps {
  onComplete?: () => void;
}

export function StripeIntegrationWizard({ onComplete }: StripeIntegrationWizardProps) {
  const { user, refreshUser } = useAuth();
  const searchParams = useSearchParams();
  
  // Check for donation completion status from URL
  useEffect(() => {
    const donationStatus = searchParams?.get('donation');
    if (donationStatus === 'success' && user) {
      // Refresh user data to get updated donation status
      refreshUser();
      toast({
        title: 'Donation completed!',
        description: 'Thank you for supporting Gouache!',
      });
      // Clean up URL
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', window.location.pathname);
      }
    } else if (donationStatus === 'cancelled') {
      toast({
        title: 'Donation cancelled',
        description: 'Your donation was cancelled. You can try again anytime.',
        variant: 'default',
      });
      // Clean up URL
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [searchParams, user, refreshUser]);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    accountId?: string;
    onboardingStatus?: 'incomplete' | 'pending' | 'complete';
    onboardingUrl?: string;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    accountType?: 'express' | 'standard' | 'custom';
    country?: string; // Stripe account country
  }>({});
  const [countryMismatch, setCountryMismatch] = useState(false);

  useEffect(() => {
    if (user) {
      loadStripeStatus();
    }
  }, [user]);

  const loadStripeStatus = async () => {
    if (!user) return;
    
    setCheckingStatus(true);
    try {
      const userDoc = await getDoc(doc(db, 'userProfiles', user.id));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const accountId = data.stripeAccountId;
        
        setStripeStatus({
          accountId,
          onboardingStatus: data.stripeOnboardingStatus,
          onboardingUrl: data.stripeOnboardingUrl,
          chargesEnabled: data.stripeChargesEnabled,
          payoutsEnabled: data.stripePayoutsEnabled,
          accountType: data.stripeAccountType,
        });

        // Check for country mismatch if account exists
        if (accountId) {
          try {
            const response = await fetch(`/api/stripe/connect/account-status?accountId=${accountId}`);
            if (response.ok) {
              const accountData = await response.json();
              const stripeCountry = accountData.country;
              const userCountry = data.countryOfResidence || data.countryOfOrigin;
              
              // Map country names to codes for comparison
              const countryNameToCode: { [key: string]: string } = {
                'United States': 'US', 'United Kingdom': 'GB', 'Canada': 'CA', 'Australia': 'AU',
                'Germany': 'DE', 'France': 'FR', 'Italy': 'IT', 'Spain': 'ES', 'Netherlands': 'NL',
                'Belgium': 'BE', 'Switzerland': 'CH', 'Austria': 'AT', 'Sweden': 'SE', 'Norway': 'NO',
                'Denmark': 'DK', 'Finland': 'FI', 'Ireland': 'IE', 'Portugal': 'PT', 'Greece': 'GR',
                'Poland': 'PL', 'Japan': 'JP', 'South Korea': 'KR', 'China': 'CN', 'India': 'IN',
                'Singapore': 'SG', 'Brazil': 'BR', 'Mexico': 'MX', 'New Zealand': 'NZ',
              };
              
              const userCountryCode = userCountry ? (countryNameToCode[userCountry] || userCountry) : null;
              
              if (userCountryCode && stripeCountry && stripeCountry !== userCountryCode) {
                setCountryMismatch(true);
                setStripeStatus(prev => ({ ...prev, country: stripeCountry }));
              } else {
                setCountryMismatch(false);
              }
            }
          } catch (error) {
            console.error('Error checking account country:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading Stripe status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleConnectStripe = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!user) {
      toast({
        title: "Not signed in",
        description: "Please sign in to connect your Stripe account.",
        variant: "destructive"
      });
      return;
    }

    if (!user.email) {
      toast({
        title: "Email required",
        description: "Your account must have an email address to connect Stripe.",
        variant: "destructive"
      });
      return;
    }

    // Check if account exists with wrong country - must reset first
    if (stripeStatus.accountId && countryMismatch) {
      toast({
        title: "Account country mismatch",
        description: "Your existing Stripe account was created with the wrong country. Please click 'Reset Account Connection' first, then create a new account with the correct country.",
        variant: "destructive",
        duration: 10000
      });
      return;
    }

    setLoading(true);
    try {
      // Call API to create Stripe Connect account
      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          name: user.displayName || user.username || 'Artist',
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create Stripe account';
        let helpUrl: string | null = null;
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
          helpUrl = error.helpUrl;
          
          // Handle country not set error
          if (errorMessage.includes('Country not set in profile') || errorMessage.includes('country') && errorMessage.includes('profile')) {
            toast({
              title: "Country not set",
              description: "Please set your Country of Residence in your profile settings first, then try connecting Stripe again.",
              variant: "destructive",
              duration: 15000,
              action: (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/profile/edit'}
                >
                  Go to Profile Settings
                </Button>
              )
            });
            return;
          }
          
          // Handle Connect profile incomplete error
          if (error.code === 'CONNECT_PROFILE_INCOMPLETE' || 
              errorMessage.includes('responsibilities of managing losses') ||
              errorMessage.includes('platform profile') ||
              errorMessage.includes('platform-profile')) {
            toast({
              title: "Stripe Connect setup required",
              description: "Please complete your Stripe Connect platform profile setup in the Stripe Dashboard.",
              variant: "destructive",
              duration: 15000,
              action: helpUrl ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(helpUrl!, '_blank')}
                >
                  Complete Setup
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://dashboard.stripe.com/settings/connect/platform-profile', '_blank')}
                >
                  Complete Setup
                </Button>
              )
            });
          }
          
          console.error('Stripe account creation error:', error);
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.accountId || !data.onboardingUrl) {
        throw new Error('Invalid response from server: missing account ID or onboarding URL');
      }
      
      // Save account ID and onboarding URL to Firestore
      await updateDoc(doc(db, 'userProfiles', user.id), {
        stripeAccountId: data.accountId,
        stripeOnboardingStatus: 'incomplete',
        stripeOnboardingUrl: data.onboardingUrl,
        stripeAccountType: 'express',
      });

      // Open Stripe onboarding in new window
      const onboardingWindow = window.open(data.onboardingUrl, '_blank', 'width=800,height=600');
      
      if (!onboardingWindow) {
        toast({
          title: "Popup blocked",
          description: "Please allow popups for this site and try again, or click the link below to open onboarding.",
          variant: "destructive"
        });
        // Fallback: show the URL so user can manually open it
        console.log('Onboarding URL:', data.onboardingUrl);
      } else {
        toast({
          title: "Stripe account created",
          description: "Complete the onboarding process in the new window. We'll check your status automatically.",
        });
      }

      // Refresh user data
      await refreshUser();
      await loadStripeStatus();
      
      // Poll for status updates using the newly created account ID
      startStatusPolling(data.accountId);
    } catch (error: any) {
      console.error('Error connecting Stripe:', error);
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect Stripe account. Please try again.",
        variant: "destructive",
        duration: 10000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContinueOnboarding = async () => {
    if (!stripeStatus.accountId) {
      toast({
        title: "Account not found",
        description: "Please connect your Stripe account first.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Get a fresh onboarding URL from the API
      const response = await fetch('/api/stripe/connect/refresh-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: stripeStatus.accountId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to refresh onboarding URL');
      }

      const data = await response.json();
      
      if (!data.onboardingUrl) {
        throw new Error('No onboarding URL received from server');
      }

      // Update Firestore with the new onboarding URL
      await updateDoc(doc(db, 'userProfiles', user!.id), {
        stripeOnboardingUrl: data.onboardingUrl,
      });

      // Open the fresh onboarding URL
      const onboardingWindow = window.open(data.onboardingUrl, '_blank', 'width=800,height=600');
      
      if (!onboardingWindow) {
        toast({
          title: "Popup blocked",
          description: "Please allow popups for this site and try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Opening Stripe onboarding",
          description: "Complete the onboarding process in the new window. We'll check your status automatically.",
        });
      }

      // Refresh status and start polling
      await loadStripeStatus();
      startStatusPolling(stripeStatus.accountId);
    } catch (error: any) {
      console.error('Error refreshing onboarding URL:', error);
      toast({
        title: "Failed to open onboarding",
        description: error.message || "Failed to refresh onboarding URL. Please try again.",
        variant: "destructive",
        duration: 10000
      });
    } finally {
      setLoading(false);
    }
  };

  const startStatusPolling = (accountId?: string) => {
    const targetAccountId = accountId || stripeStatus.accountId;
    if (!targetAccountId) return;
    
    // Poll every 5 seconds for status updates
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/stripe/connect/account-status?accountId=${targetAccountId}`);
        if (response.ok) {
          const data = await response.json();
          
          if (data.onboardingStatus === 'complete' && data.chargesEnabled && data.payoutsEnabled) {
            // Update Firestore
            await updateDoc(doc(db, 'userProfiles', user!.id), {
              stripeOnboardingStatus: 'complete',
              stripeChargesEnabled: data.chargesEnabled,
              stripePayoutsEnabled: data.payoutsEnabled,
            });
            
            await refreshUser();
            await loadStripeStatus();
            clearInterval(interval);
            
            toast({
              title: "Stripe account connected!",
              description: "You can now accept payments and receive payouts.",
            });
            
            if (onComplete) {
              onComplete();
            }
          } else {
            // Update status
            setStripeStatus((prev) => ({
              ...prev,
              onboardingStatus: data.onboardingStatus,
              chargesEnabled: data.chargesEnabled,
              payoutsEnabled: data.payoutsEnabled,
              country: data.country,
            }));
            
            // Check for country mismatch
            if (data.country && user) {
              const userDoc = await getDoc(doc(db, 'userProfiles', user.id));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                const userCountry = userData.countryOfResidence || userData.countryOfOrigin;
                const countryNameToCode: { [key: string]: string } = {
                  'United States': 'US', 'United Kingdom': 'GB', 'Canada': 'CA', 'Australia': 'AU',
                  'Germany': 'DE', 'France': 'FR', 'Italy': 'IT', 'Spain': 'ES', 'Netherlands': 'NL',
                  'Belgium': 'BE', 'Switzerland': 'CH', 'Austria': 'AT', 'Sweden': 'SE', 'Norway': 'NO',
                  'Denmark': 'DK', 'Finland': 'FI', 'Ireland': 'IE', 'Portugal': 'PT', 'Greece': 'GR',
                  'Poland': 'PL', 'Japan': 'JP', 'South Korea': 'KR', 'China': 'CN', 'India': 'IN',
                  'Singapore': 'SG', 'Brazil': 'BR', 'Mexico': 'MX', 'New Zealand': 'NZ',
                };
                const userCountryCode = userCountry ? (countryNameToCode[userCountry] || userCountry) : null;
                setCountryMismatch(userCountryCode && data.country !== userCountryCode);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking status:', error);
      }
    }, 5000);

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
  };

  const getStatusBadge = () => {
    if (!stripeStatus.accountId) {
      return <Badge variant="secondary">Not Connected</Badge>;
    }
    
    if (stripeStatus.onboardingStatus === 'complete' && 
        stripeStatus.chargesEnabled && 
        stripeStatus.payoutsEnabled) {
      return <Badge variant="default" className="bg-green-500">Active</Badge>;
    }
    
    if (stripeStatus.onboardingStatus === 'pending') {
      return <Badge variant="default" className="bg-yellow-500">Pending</Badge>;
    }
    
    return <Badge variant="default" className="bg-orange-500">Incomplete</Badge>;
  };

  const getProgress = () => {
    if (!stripeStatus.accountId) return 0;
    if (stripeStatus.onboardingStatus === 'complete' && 
        stripeStatus.chargesEnabled && 
        stripeStatus.payoutsEnabled) return 100;
    if (stripeStatus.onboardingStatus === 'pending') return 50;
    return 25;
  };

  if (checkingStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Stripe Payment Setup
            </CardTitle>
            <CardDescription>
              Connect your Stripe account to accept payments and receive payouts
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Progress value={getProgress()} className="h-2" />
        
        {!stripeStatus.accountId ? (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Get Started</AlertTitle>
              <AlertDescription>
                Connect your Stripe account to start selling. You'll be able to accept payments 
                for originals, prints, books, and courses. You receive 100% of sales directly to your Stripe account - no platform commission.
              </AlertDescription>
            </Alert>

            <Alert className="border-amber-500 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-amber-500">Setup Required</AlertTitle>
              <AlertDescription>
                Before connecting Stripe, please ensure your <strong>Country of Residence</strong> is set in your profile. 
                Go to <strong>Profile → Edit → Personal Details</strong> and select your country. 
                Stripe requires your country to create your account correctly.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <h4 className="font-semibold">What you'll need:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Country of Residence set in your profile (required)</li>
                <li>Business information (name, address, tax ID if applicable)</li>
                <li>Bank account details for payouts</li>
                <li>Identity verification documents</li>
              </ul>
            </div>

            <Button 
              onClick={handleConnectStripe} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Connect Stripe Account
                </>
              )}
            </Button>
          </div>
        ) : stripeStatus.onboardingStatus === 'complete' && 
            stripeStatus.chargesEnabled && 
            stripeStatus.payoutsEnabled ? (
          <div className="space-y-4">
            <Alert className="border-green-500 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-500">Account Connected</AlertTitle>
              <AlertDescription>
                Your Stripe account is fully set up and ready to accept payments. 
                You can now list items for sale in your shop.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Account Type</div>
                <div className="font-semibold capitalize">
                  {stripeStatus.accountType || 'Express'}
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Account ID</div>
                <div className="font-mono text-xs">
                  {stripeStatus.accountId?.substring(0, 20)}...
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Stripe Dashboard
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {countryMismatch && (
              <Alert className="border-amber-500 bg-amber-500/10">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertTitle className="text-amber-500">Country Mismatch Detected</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>
                    Your Stripe account was created with the wrong country (US) but your profile indicates you're in the UK. 
                    Stripe accounts cannot have their country changed after creation.
                  </p>
                  <p className="font-semibold">
                    To fix this, you need to:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Delete your current Stripe account in the Stripe Dashboard</li>
                    <li>Click "Reset Account" below to clear the connection</li>
                    <li>Create a new account with the correct country</li>
                  </ol>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!user || !stripeStatus.accountId) return;
                      try {
                        await updateDoc(doc(db, 'userProfiles', user.id), {
                          stripeAccountId: null,
                          stripeOnboardingStatus: null,
                          stripeOnboardingUrl: null,
                          stripeChargesEnabled: null,
                          stripePayoutsEnabled: null,
                        });
                        await refreshUser();
                        await loadStripeStatus();
                        toast({
                          title: "Account reset",
                          description: "You can now create a new Stripe account with the correct country.",
                        });
                      } catch (error) {
                        console.error('Error resetting account:', error);
                        toast({
                          title: "Reset failed",
                          description: "Could not reset account. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="mt-2"
                  >
                    Reset Account
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Complete Onboarding</AlertTitle>
              <AlertDescription>
                Your Stripe account has been created, but you need to complete the onboarding process 
                to start accepting payments.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {stripeStatus.onboardingStatus === 'complete' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={stripeStatus.onboardingStatus === 'complete' ? 'text-green-500' : ''}>
                  Onboarding {stripeStatus.onboardingStatus === 'complete' ? 'Complete' : 'Incomplete'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {stripeStatus.chargesEnabled ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={stripeStatus.chargesEnabled ? 'text-green-500' : ''}>
                  Charges {stripeStatus.chargesEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {stripeStatus.payoutsEnabled ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={stripeStatus.payoutsEnabled ? 'text-green-500' : ''}>
                  Payouts {stripeStatus.payoutsEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleContinueOnboarding();
                }}
                className="w-full gradient-button"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Opening...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Set up Stripe
                  </>
                )}
              </Button>
              
              {/* Always show reset option if account exists */}
              {stripeStatus.accountId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!user || !stripeStatus.accountId) return;
                    if (!confirm('Are you sure you want to reset your Stripe account connection? You will need to create a new account.')) {
                      return;
                    }
                    try {
                      await updateDoc(doc(db, 'userProfiles', user.id), {
                        stripeAccountId: null,
                        stripeOnboardingStatus: null,
                        stripeOnboardingUrl: null,
                        stripeChargesEnabled: null,
                        stripePayoutsEnabled: null,
                      });
                      await refreshUser();
                      await loadStripeStatus();
                      setCountryMismatch(false);
                      toast({
                        title: "Account reset",
                        description: "Stripe account connection has been cleared. You can now connect a new account.",
                      });
                    } catch (error) {
                      console.error('Error resetting account:', error);
                      toast({
                        title: "Reset failed",
                        description: "Could not reset account. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="w-full text-sm"
                >
                  Reset Account Connection
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Platform Donation Setting - Only show if account is connected */}
        {stripeStatus.accountId && stripeStatus.onboardingStatus === 'complete' && 
         stripeStatus.chargesEnabled && stripeStatus.payoutsEnabled && (
          <div className="pt-4 border-t space-y-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <h4 className="font-semibold">Support Gouache (Optional)</h4>
                <p className="text-sm text-muted-foreground">
                  Optionally support the Gouache platform with a one-time donation or ongoing percentage of sales. 
                  This is completely voluntary and can be changed at any time.
                </p>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                {/* Donation Type Selector */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Donation Type</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={user?.platformDonationType === 'one-time' ? "default" : "outline"}
                      size="sm"
                      onClick={async () => {
                        if (!user) return;
                        try {
                          await updateDoc(doc(db, 'userProfiles', user.id), {
                            platformDonationType: 'one-time',
                            platformDonationEnabled: true,
                            platformDonationPercentage: 0, // Clear percentage for one-time
                            platformDonationOneTimeCompleted: false, // Reset completion status
                          });
                          await refreshUser();
                        } catch (error) {
                          console.error('Error updating donation type:', error);
                          toast({
                            title: 'Update failed',
                            description: 'Could not update donation type. Please try again.',
                            variant: 'destructive',
                          });
                        }
                      }}
                    >
                      One-Time Donation
                    </Button>
                    <Button
                      type="button"
                      variant={user?.platformDonationType === 'ongoing' || !user?.platformDonationType ? "default" : "outline"}
                      size="sm"
                      onClick={async () => {
                        if (!user) return;
                        try {
                          await updateDoc(doc(db, 'userProfiles', user.id), {
                            platformDonationType: 'ongoing',
                            platformDonationEnabled: true,
                            platformDonationOneTimeAmount: 0, // Clear one-time amount for ongoing
                            platformDonationOneTimeCompleted: false, // Reset completion status
                          });
                          await refreshUser();
                        } catch (error) {
                          console.error('Error updating donation type:', error);
                          toast({
                            title: 'Update failed',
                            description: 'Could not update donation type. Please try again.',
                            variant: 'destructive',
                          });
                        }
                      }}
                    >
                      Ongoing (Percentage)
                    </Button>
                  </div>
                </div>

                {/* One-Time Donation Section - Only show when one-time is selected */}
                {user?.platformDonationType === 'one-time' ? (
                  <div className="space-y-3 p-3 border rounded-lg">
                    <Label className="text-sm font-medium">One-Time Donation Amount</Label>
                    <div className="flex gap-2 flex-wrap">
                      {[10, 25, 50, 100, 250, 500].map((amount) => (
                        <Button
                          key={amount}
                          type="button"
                          variant={user?.platformDonationOneTimeAmount === amount * 100 ? "default" : "outline"}
                          size="sm"
                          onClick={async () => {
                            if (!user) return;
                            try {
                              await updateDoc(doc(db, 'userProfiles', user.id), {
                                platformDonationOneTimeAmount: amount * 100, // Store in cents
                                platformDonationEnabled: true,
                                platformDonationType: 'one-time',
                                platformDonationOneTimeCurrency: user.platformDonationOneTimeCurrency || 'usd',
                              });
                              await refreshUser();
                            } catch (error) {
                              console.error('Error setting donation amount:', error);
                              toast({
                                title: 'Update failed',
                                description: 'Could not update donation amount. Please try again.',
                                variant: 'destructive',
                              });
                            }
                          }}
                        >
                          ${amount}
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="Custom amount"
                        value={user?.platformDonationOneTimeAmount && ![10, 25, 50, 100, 250, 500].includes((user.platformDonationOneTimeAmount || 0) / 100) 
                          ? (user.platformDonationOneTimeAmount / 100).toFixed(2)
                          : ''}
                        onChange={async (e) => {
                          const value = e.target.value;
                          if (!user) return;
                          
                          if (value === '') {
                            try {
                              await updateDoc(doc(db, 'userProfiles', user.id), {
                                platformDonationOneTimeAmount: 0,
                                platformDonationEnabled: false,
                              });
                              await refreshUser();
                            } catch (error) {
                              console.error('Error clearing donation:', error);
                            }
                            return;
                          }
                          
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue) && numValue > 0) {
                            try {
                              await updateDoc(doc(db, 'userProfiles', user.id), {
                                platformDonationOneTimeAmount: Math.round(numValue * 100), // Convert to cents
                                platformDonationEnabled: true,
                                platformDonationType: 'one-time',
                                platformDonationOneTimeCurrency: user.platformDonationOneTimeCurrency || 'usd',
                              });
                              await refreshUser();
                            } catch (error) {
                              console.error('Error updating donation:', error);
                            }
                          }
                        }}
                        className="w-40"
                      />
                      <Select
                        value={user?.platformDonationOneTimeCurrency || 'usd'}
                        onValueChange={async (value) => {
                          if (!user) return;
                          try {
                            await updateDoc(doc(db, 'userProfiles', user.id), {
                              platformDonationOneTimeCurrency: value,
                            });
                            await refreshUser();
                          } catch (error) {
                            console.error('Error updating currency:', error);
                          }
                        }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="usd">USD</SelectItem>
                          <SelectItem value="gbp">GBP</SelectItem>
                          <SelectItem value="eur">EUR</SelectItem>
                          <SelectItem value="cad">CAD</SelectItem>
                          <SelectItem value="aud">AUD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {user?.platformDonationOneTimeAmount && user.platformDonationOneTimeAmount > 0 && !user.platformDonationOneTimeCompleted && (
                      <Button
                        type="button"
                        variant="gradient"
                        size="sm"
                        className="w-full"
                        onClick={async () => {
                          if (!user || !user.platformDonationOneTimeAmount) return;
                          
                          try {
                            // Create Stripe Checkout session
                            const response = await fetch('/api/stripe/create-donation-checkout', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                artistId: user.id,
                                amount: user.platformDonationOneTimeAmount, // Already in cents
                                currency: user.platformDonationOneTimeCurrency || 'usd',
                              }),
                            });

                            if (!response.ok) {
                              const error = await response.json();
                              throw new Error(error.error || 'Failed to create checkout');
                            }

                            const { url } = await response.json();
                            
                            // Redirect to Stripe Checkout
                            if (url) {
                              window.location.href = url;
                            } else {
                              throw new Error('No checkout URL received');
                            }
                          } catch (error: any) {
                            console.error('Error creating donation checkout:', error);
                            toast({
                              title: 'Donation failed',
                              description: error.message || 'Failed to process donation. Please try again.',
                              variant: 'destructive',
                            });
                          }
                        }}
                      >
                        Complete One-Time Donation
                      </Button>
                    )}
                    {user?.platformDonationOneTimeCompleted && (
                      <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded text-sm text-green-800 dark:text-green-200">
                        ✓ One-time donation completed
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Ongoing Percentage Donation Section - Only show when ongoing is selected or no type set */}
                {(user?.platformDonationType === 'ongoing' || !user?.platformDonationType) ? (
                  <>
                {/* Percentage Selector */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Suggested Percentage</Label>
                  <div className="flex gap-2 flex-wrap">
                    {[5, 10, 15, 20].map((percentage) => (
                      <Button
                        key={percentage}
                        type="button"
                        variant={user?.platformDonationPercentage === percentage ? "default" : "outline"}
                        size="sm"
                        onClick={async () => {
                          if (!user) return;
                          try {
                            await updateDoc(doc(db, 'userProfiles', user.id), {
                              platformDonationEnabled: true,
                              platformDonationType: 'ongoing',
                              platformDonationPercentage: percentage,
                              platformDonationOneTimeAmount: 0, // Clear one-time amount
                            });
                            await refreshUser();
                            toast({
                              title: 'Donation set',
                              description: `You're now donating ${percentage}% of sales to Gouache. Thank you!`,
                            });
                          } catch (error) {
                            console.error('Error updating donation:', error);
                            toast({
                              title: 'Update failed',
                              description: 'Could not update donation setting. Please try again.',
                              variant: 'destructive',
                            });
                          }
                        }}
                      >
                        {percentage}%
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant={user?.platformDonationEnabled && ![5, 10, 15, 20].includes(user.platformDonationPercentage || 0) ? "default" : "outline"}
                      size="sm"
                      onClick={async () => {
                        if (!user) return;
                        try {
                          await updateDoc(doc(db, 'userProfiles', user.id), {
                            platformDonationEnabled: false,
                            platformDonationType: 'ongoing',
                            platformDonationPercentage: 0,
                          });
                          await refreshUser();
                          toast({
                            title: 'Donation removed',
                            description: 'You keep 100% of sales.',
                          });
                        } catch (error) {
                          console.error('Error removing donation:', error);
                          toast({
                            title: 'Update failed',
                            description: 'Could not update donation setting. Please try again.',
                            variant: 'destructive',
                          });
                        }
                      }}
                    >
                      None
                    </Button>
                  </div>
                </div>

                {/* Manual Percentage Input */}
                <div className="space-y-2">
                  <Label htmlFor="custom-donation" className="text-sm font-medium">
                    Or enter custom percentage
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="custom-donation"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="0"
                      value={user?.platformDonationEnabled && user.platformDonationPercentage && ![5, 10, 15, 20].includes(user.platformDonationPercentage) 
                        ? user.platformDonationPercentage 
                        : ''}
                      onChange={async (e) => {
                        const value = e.target.value;
                        if (!user) return;
                        
                        if (value === '') {
                          // Clear donation if input is empty
                          try {
                            await updateDoc(doc(db, 'userProfiles', user.id), {
                              platformDonationEnabled: false,
                              platformDonationType: 'ongoing',
                              platformDonationPercentage: 0,
                            });
                            await refreshUser();
                          } catch (error) {
                            console.error('Error clearing donation:', error);
                          }
                          return;
                        }
                        
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                          try {
                            await updateDoc(doc(db, 'userProfiles', user.id), {
                              platformDonationEnabled: numValue > 0,
                              platformDonationType: 'ongoing',
                              platformDonationPercentage: numValue,
                              platformDonationOneTimeAmount: 0, // Clear one-time amount
                            });
                            await refreshUser();
                          } catch (error) {
                            console.error('Error updating donation:', error);
                            toast({
                              title: 'Update failed',
                              description: 'Could not update donation. Please try again.',
                              variant: 'destructive',
                            });
                          }
                        }
                      }}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                {/* Current Status */}
                {user?.platformDonationEnabled && (
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                    {user.platformDonationType === 'one-time' && user.platformDonationOneTimeAmount && user.platformDonationOneTimeAmount > 0 ? (
                      <p className="text-sm font-medium">
                        {user.platformDonationOneTimeCompleted ? (
                          <>✓ One-time donation of <span className="text-primary">${(user.platformDonationOneTimeAmount / 100).toFixed(2)}</span> completed</>
                        ) : (
                          <>One-time donation of <span className="text-primary">${(user.platformDonationOneTimeAmount / 100).toFixed(2)}</span> pending</>
                        )}
                      </p>
                    ) : user.platformDonationPercentage && user.platformDonationPercentage > 0 ? (
                      <p className="text-sm font-medium">
                        Currently donating <span className="text-primary">{user.platformDonationPercentage}%</span> of each sale to Gouache
                      </p>
                    ) : null}
                  </div>
                )}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <h4 className="font-semibold mb-2">Fees & Payouts</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• 0% platform commission - you keep 100% of sales</p>
            <p>• Stripe processing fee: ~2.9% + $0.30 per transaction. Paid by seller, and should be included within price for an optimal customer experience.</p>
            <p>• Optionally donate a % of your sales to support Gouache</p>
            <p>• Payouts are processed automatically to your bank account</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

