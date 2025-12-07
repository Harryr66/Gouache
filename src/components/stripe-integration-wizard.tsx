'use client';

import React, { useState, useEffect } from 'react';
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

interface StripeIntegrationWizardProps {
  onComplete?: () => void;
}

export function StripeIntegrationWizard({ onComplete }: StripeIntegrationWizardProps) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    accountId?: string;
    onboardingStatus?: 'incomplete' | 'pending' | 'complete';
    onboardingUrl?: string;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    accountType?: 'express' | 'standard' | 'custom';
  }>({});

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
        setStripeStatus({
          accountId: data.stripeAccountId,
          onboardingStatus: data.stripeOnboardingStatus,
          onboardingUrl: data.stripeOnboardingUrl,
          chargesEnabled: data.stripeChargesEnabled,
          payoutsEnabled: data.stripePayoutsEnabled,
          accountType: data.stripeAccountType,
        });
      }
    } catch (error) {
      console.error('Error loading Stripe status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleConnectStripe = async () => {
    if (!user) {
      toast({
        title: "Not signed in",
        description: "Please sign in to connect your Stripe account.",
        variant: "destructive"
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
        const error = await response.json();
        console.error('Stripe account creation error:', error);
        throw new Error(error.error || error.message || 'Failed to create Stripe account');
      }

      const data = await response.json();
      
      // Save account ID and onboarding URL to Firestore
      await updateDoc(doc(db, 'userProfiles', user.id), {
        stripeAccountId: data.accountId,
        stripeOnboardingStatus: 'incomplete',
        stripeOnboardingUrl: data.onboardingUrl,
        stripeAccountType: 'express',
      });

      // Open Stripe onboarding in new window
      window.open(data.onboardingUrl, '_blank', 'width=800,height=600');
      
      toast({
        title: "Stripe account created",
        description: "Complete the onboarding process in the new window. We'll check your status automatically.",
      });

      // Refresh user data
      await refreshUser();
      await loadStripeStatus();
      
      // Poll for status updates
      startStatusPolling();
    } catch (error: any) {
      console.error('Error connecting Stripe:', error);
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect Stripe account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContinueOnboarding = () => {
    if (stripeStatus.onboardingUrl) {
      window.open(stripeStatus.onboardingUrl, '_blank', 'width=800,height=600');
      startStatusPolling();
    }
  };

  const startStatusPolling = () => {
    if (!stripeStatus.accountId) return;
    
    // Poll every 5 seconds for status updates
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/stripe/connect/account-status?accountId=${stripeStatus.accountId}`);
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
            setStripeStatus({
              ...stripeStatus,
              onboardingStatus: data.onboardingStatus,
              chargesEnabled: data.chargesEnabled,
              payoutsEnabled: data.payoutsEnabled,
            });
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
                for originals, prints, books, and courses. Our marketplace is commission-free - you keep 100% of sales.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <h4 className="font-semibold">What you'll need:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
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

            <Button
              onClick={handleContinueOnboarding}
              className="w-full"
              size="lg"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Continue Onboarding
            </Button>
          </div>
        )}

        {/* Platform Donation Setting - Only show if account is connected */}
        {stripeStatus.accountId && stripeStatus.onboardingStatus === 'complete' && 
         stripeStatus.chargesEnabled && stripeStatus.payoutsEnabled && (
          <div className="pt-4 border-t space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="font-semibold">Support Gouache (Optional)</h4>
                  <p className="text-sm text-muted-foreground">
                    Optionally donate a percentage of your sales to support the Gouache platform. 
                    This is completely voluntary and can be changed at any time.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Switch
                  checked={user?.platformDonationEnabled || false}
                  onCheckedChange={async (checked) => {
                    if (!user) return;
                    try {
                      await updateDoc(doc(db, 'userProfiles', user.id), {
                        platformDonationEnabled: checked,
                        platformDonationPercentage: checked ? (user.platformDonationPercentage || 5) : 0,
                      });
                      await refreshUser();
                      toast({
                        title: checked ? 'Donation enabled' : 'Donation disabled',
                        description: checked 
                          ? `You're now donating ${user.platformDonationPercentage || 5}% of sales to Gouache. Thank you!`
                          : 'Donation disabled. You keep 100% of sales.',
                      });
                    } catch (error) {
                      console.error('Error updating donation setting:', error);
                      toast({
                        title: 'Update failed',
                        description: 'Could not update donation setting. Please try again.',
                        variant: 'destructive',
                      });
                    }
                  }}
                />
                <div className="flex-1">
                  <Label className="text-sm font-medium">
                    {user?.platformDonationEnabled ? 'Donating to Gouache' : 'Donate to Gouache'}
                  </Label>
                  {user?.platformDonationEnabled && (
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={user.platformDonationPercentage || 5}
                        onChange={async (e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value >= 0 && value <= 100 && user) {
                            try {
                              await updateDoc(doc(db, 'userProfiles', user.id), {
                                platformDonationPercentage: value,
                              });
                              await refreshUser();
                            } catch (error) {
                              console.error('Error updating donation percentage:', error);
                            }
                          }
                        }}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">% of each sale</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <h4 className="font-semibold mb-2">Fees & Payouts</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• 💚 Commission-free marketplace - you keep 100% of sales</p>
            <p>• Stripe processing fee: ~2.9% + $0.30 per transaction (paid by buyer)</p>
            <p>• Customers can add voluntary donations to support you</p>
            <p>• Optionally donate a % of your sales to support Gouache (completely voluntary)</p>
            <p>• Payouts are processed automatically to your bank account</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

