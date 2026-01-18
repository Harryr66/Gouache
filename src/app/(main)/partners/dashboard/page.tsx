'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { AdCampaign, PartnerAccount, PartnerBillingRecord } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, TrendingUp, Eye, MousePointerClick, Calendar, Image as ImageIcon, Video, CreditCard, Receipt, BarChart3, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ThemeLoading } from '@/components/theme-loading';
import { PartnerCampaignForm } from '@/components/partner/partner-campaign-form';
import { format } from 'date-fns';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Payment Setup Form Component
function PaymentSetupForm({ 
  partnerId, 
  partnerEmail,
  companyName,
  contactName,
  onSuccess 
}: { 
  partnerId: string;
  partnerEmail: string;
  companyName: string;
  contactName: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    initializeSetup();
  }, []);

  const initializeSetup = async () => {
    try {
      // Create Stripe customer
      const customerRes = await fetch('/api/partner/create-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: partnerEmail,
          companyName,
          contactName,
          partnerId,
        }),
      });

      if (!customerRes.ok) throw new Error('Failed to create customer');
      const { customerId: newCustomerId } = await customerRes.json();
      setCustomerId(newCustomerId);

      // Create SetupIntent
      const setupRes = await fetch('/api/partner/setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: newCustomerId }),
      });

      if (!setupRes.ok) throw new Error('Failed to create setup intent');
      const { clientSecret: secret } = await setupRes.json();
      setClientSecret(secret);
    } catch (error) {
      console.error('Error initializing payment setup:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize payment setup. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret || !customerId) return;

    setIsLoading(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      // Confirm setup
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            email: partnerEmail,
            name: companyName || contactName,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (setupIntent?.payment_method) {
        // Save payment method to partner account
        const saveRes = await fetch('/api/partner/save-payment-method', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId,
            paymentMethodId: setupIntent.payment_method,
          }),
        });

        if (!saveRes.ok) throw new Error('Failed to save payment method');
        const { last4, brand } = await saveRes.json();

        // Update partner account in Firestore
        await updateDoc(doc(db, 'partnerAccounts', partnerId), {
          stripeCustomerId: customerId,
          paymentMethodId: setupIntent.payment_method,
          paymentMethodLast4: last4,
          paymentMethodBrand: brand,
          billingSetupComplete: true,
          updatedAt: serverTimestamp(),
        });

        toast({
          title: 'Payment Method Added',
          description: 'Your card has been saved successfully. You will be billed monthly for ad spend.',
        });

        onSuccess();
      }
    } catch (error: any) {
      console.error('Error setting up payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save payment method.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Card Details</label>
        <div className="p-4 border rounded-lg bg-background">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#fff',
                  '::placeholder': { color: '#6b7280' },
                },
                invalid: { color: '#ef4444' },
              },
            }}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Your card will be charged at the end of each month for your advertising spend.
        You can update your payment method at any time.
      </p>
      <Button type="submit" disabled={!stripe || !clientSecret || isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Save Payment Method
          </>
        )}
      </Button>
    </form>
  );
}

export default function PartnerDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [partnerAccount, setPartnerAccount] = useState<PartnerAccount | null>(null);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [billingRecords, setBillingRecords] = useState<PartnerBillingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState('campaigns');

  useEffect(() => {
    if (!user) {
      router.push('/partners/login');
      return;
    }

    loadPartnerData();
  }, [user]);

  const loadPartnerData = async () => {
    if (!user?.email) return;

    try {
      // Load partner account
      const partnerQuery = query(
        collection(db, 'partnerAccounts'),
        where('email', '==', user.email),
        limit(1)
      );

      const partnerSnapshot = await getDocs(partnerQuery);
      const isAdmin = user.isAdmin === true;

      if (partnerSnapshot.empty && !isAdmin) {
        toast({
          title: "Access Denied",
          description: "This account is not authorized for partner access.",
          variant: "destructive",
        });
        router.push('/partners/login');
        return;
      }

      let partnerId = '';

      if (!partnerSnapshot.empty) {
        const partnerData = partnerSnapshot.docs[0].data() as PartnerAccount;
        partnerId = partnerSnapshot.docs[0].id;
        setPartnerAccount({
          ...partnerData,
          id: partnerId,
        });
      } else if (isAdmin) {
        partnerId = 'admin';
        setPartnerAccount({
          id: 'admin',
          email: user.email || '',
          companyName: 'Gouache Admin',
          contactName: user.displayName || user.username || 'Admin',
          createdAt: new Date(),
          isActive: true,
          accountType: 'partner',
          billingSetupComplete: true, // Admin doesn't need billing setup
        });
      }

      // Load campaigns
      let campaignsQuery;
      if (isAdmin && partnerSnapshot.empty) {
        campaignsQuery = query(
          collection(db, 'adCampaigns'),
          orderBy('createdAt', 'desc')
        );
      } else {
        campaignsQuery = query(
          collection(db, 'adCampaigns'),
          where('partnerId', '==', partnerId),
          orderBy('createdAt', 'desc')
        );
      }

      const campaignsSnapshot = await getDocs(campaignsQuery);
      const loadedCampaigns = campaignsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        startDate: doc.data().startDate?.toDate?.() || new Date(),
        endDate: doc.data().endDate?.toDate?.(),
      })) as AdCampaign[];

      setCampaigns(loadedCampaigns);

      // Load billing records
      if (partnerId && partnerId !== 'admin') {
        try {
          const billingRes = await fetch(`/api/partner/billing-history?partnerId=${partnerId}`);
          if (billingRes.ok) {
            const { records } = await billingRes.json();
            setBillingRecords(records);
          }
        } catch (e) {
          console.error('Error loading billing history:', e);
        }
      }
    } catch (error) {
      console.error('Error loading partner data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCampaignCreated = () => {
    setShowCreateForm(false);
    loadPartnerData();
  };

  const toggleCampaignStatus = async (campaignId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'adCampaigns', campaignId), {
        isActive: !currentStatus,
        updatedAt: serverTimestamp(),
      });

      setCampaigns(campaigns.map(c => 
        c.id === campaignId ? { ...c, isActive: !currentStatus } : c
      ));

      toast({
        title: "Campaign Updated",
        description: `Campaign ${!currentStatus ? 'activated' : 'paused'} successfully.`,
      });
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign status.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <ThemeLoading text="Loading dashboard..." />
      </div>
    );
  }

  if (!partnerAccount) {
    return null;
  }

  const activeCampaigns = campaigns.filter(c => c.isActive);
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
  const totalSpent = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);
  const currentMonthSpend = totalSpent; // This billing period

  const formatCurrency = (amountInCents: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amountInCents / 100);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Partner Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome, {partnerAccount.companyName || partnerAccount.contactName}
        </p>
      </div>

      {/* Billing Setup Alert */}
      {!partnerAccount.billingSetupComplete && partnerAccount.id !== 'admin' && (
        <Card className="mb-6 border-amber-500/50 bg-amber-500/10">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="h-6 w-6 text-amber-500" />
            <div className="flex-1">
              <p className="font-medium">Payment Method Required</p>
              <p className="text-sm text-muted-foreground">
                Please add a payment method to activate your campaigns. You will be billed monthly for ad spend.
              </p>
            </div>
            <Button variant="outline" onClick={() => setActiveTab('billing')}>
              Set Up Billing
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Impressions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Clicks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Click-Through Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ctr}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>This Month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(currentMonthSpend)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>All Time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(partnerAccount.totalSpentAllTime || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="campaigns" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="metrics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Campaigns</CardTitle>
                  <CardDescription>Manage your advertising campaigns</CardDescription>
                </div>
                <Button 
                  onClick={() => setShowCreateForm(true)}
                  disabled={!partnerAccount.billingSetupComplete && partnerAccount.id !== 'admin'}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Campaign
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showCreateForm ? (
                <PartnerCampaignForm
                  partnerId={partnerAccount.id}
                  onSuccess={handleCampaignCreated}
                  onCancel={() => setShowCreateForm(false)}
                />
              ) : campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No campaigns yet</p>
                  <Button 
                    onClick={() => setShowCreateForm(true)}
                    disabled={!partnerAccount.billingSetupComplete && partnerAccount.id !== 'admin'}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Campaign
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <Card key={campaign.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{campaign.title}</h3>
                            <Badge variant={campaign.isActive ? 'default' : 'secondary'}>
                              {campaign.isActive ? 'Active' : 'Paused'}
                            </Badge>
                            <Badge variant="outline">{campaign.placement}</Badge>
                          </div>
                          <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              <span>{campaign.impressions || 0} impressions</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MousePointerClick className="h-4 w-4" />
                              <span>{campaign.clicks || 0} clicks</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {format(campaign.startDate, 'MMM d, yyyy')}
                                {campaign.endDate && ` - ${format(campaign.endDate, 'MMM d, yyyy')}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-4 w-4" />
                              <span>{formatCurrency(campaign.spent || 0, campaign.currency || 'usd')} spent</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {campaign.mediaType === 'video' ? (
                            <Video className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleCampaignStatus(campaign.id, campaign.isActive)}
                          >
                            {campaign.isActive ? 'Pause' : 'Activate'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics">
          <div className="grid gap-6">
            {/* Campaign Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
                <CardDescription>Detailed metrics for each campaign</CardDescription>
              </CardHeader>
              <CardContent>
                {campaigns.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No campaign data yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2 font-medium">Campaign</th>
                          <th className="text-right py-3 px-2 font-medium">Impressions</th>
                          <th className="text-right py-3 px-2 font-medium">Clicks</th>
                          <th className="text-right py-3 px-2 font-medium">CTR</th>
                          <th className="text-right py-3 px-2 font-medium">Spend</th>
                          <th className="text-right py-3 px-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((campaign) => {
                          const campaignCtr = campaign.impressions && campaign.impressions > 0 
                            ? ((campaign.clicks || 0) / campaign.impressions * 100).toFixed(2) 
                            : '0.00';
                          return (
                            <tr key={campaign.id} className="border-b">
                              <td className="py-3 px-2">
                                <div className="font-medium">{campaign.title}</div>
                                <div className="text-xs text-muted-foreground">{campaign.placement}</div>
                              </td>
                              <td className="text-right py-3 px-2">{(campaign.impressions || 0).toLocaleString()}</td>
                              <td className="text-right py-3 px-2">{(campaign.clicks || 0).toLocaleString()}</td>
                              <td className="text-right py-3 px-2">{campaignCtr}%</td>
                              <td className="text-right py-3 px-2">{formatCurrency(campaign.spent || 0, campaign.currency || 'usd')}</td>
                              <td className="text-right py-3 px-2">
                                <Badge variant={campaign.isActive ? 'default' : 'secondary'} className="text-xs">
                                  {campaign.isActive ? 'Active' : 'Paused'}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="font-semibold">
                          <td className="py-3 px-2">Total</td>
                          <td className="text-right py-3 px-2">{totalImpressions.toLocaleString()}</td>
                          <td className="text-right py-3 px-2">{totalClicks.toLocaleString()}</td>
                          <td className="text-right py-3 px-2">{ctr}%</td>
                          <td className="text-right py-3 px-2">{formatCurrency(totalSpent)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Method
                </CardTitle>
                <CardDescription>
                  Your card will be charged monthly for advertising spend
                </CardDescription>
              </CardHeader>
              <CardContent>
                {partnerAccount.billingSetupComplete ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="p-2 bg-primary/10 rounded">
                        <CreditCard className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium capitalize">
                          {partnerAccount.paymentMethodBrand} •••• {partnerAccount.paymentMethodLast4}
                        </p>
                        <p className="text-sm text-muted-foreground">Default payment method</p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You will be automatically charged at the end of each month for your advertising spend.
                    </p>
                  </div>
                ) : partnerAccount.id !== 'admin' ? (
                  <Elements stripe={stripePromise}>
                    <PaymentSetupForm
                      partnerId={partnerAccount.id}
                      partnerEmail={partnerAccount.email}
                      companyName={partnerAccount.companyName}
                      contactName={partnerAccount.contactName}
                      onSuccess={loadPartnerData}
                    />
                  </Elements>
                ) : (
                  <p className="text-muted-foreground">Admin accounts do not require billing setup.</p>
                )}
              </CardContent>
            </Card>

            {/* Current Period */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Current Billing Period
                </CardTitle>
                <CardDescription>
                  {format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'MMMM d')} - {format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'MMMM d, yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-4xl font-bold">{formatCurrency(currentMonthSpend)}</div>
                  <p className="text-sm text-muted-foreground">
                    This amount will be charged to your payment method at the end of the billing period.
                  </p>
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Impression costs</span>
                      <span>{formatCurrency(campaigns.reduce((sum, c) => sum + ((c.impressions || 0) * (c.costPerImpression || 0)), 0))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Click costs</span>
                      <span>{formatCurrency(campaigns.reduce((sum, c) => sum + ((c.clicks || 0) * (c.costPerClick || 0)), 0))}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing History */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Billing History
                </CardTitle>
                <CardDescription>Your past invoices and payments</CardDescription>
              </CardHeader>
              <CardContent>
                {billingRecords.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No billing history yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2 font-medium">Period</th>
                          <th className="text-right py-3 px-2 font-medium">Amount</th>
                          <th className="text-right py-3 px-2 font-medium">Status</th>
                          <th className="text-right py-3 px-2 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billingRecords.map((record) => (
                          <tr key={record.id} className="border-b">
                            <td className="py-3 px-2">
                              {format(new Date(record.billingPeriodStart), 'MMM d')} - {format(new Date(record.billingPeriodEnd), 'MMM d, yyyy')}
                            </td>
                            <td className="text-right py-3 px-2">{formatCurrency(record.amount, record.currency)}</td>
                            <td className="text-right py-3 px-2">
                              <Badge 
                                variant={record.status === 'paid' ? 'default' : record.status === 'failed' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {record.status}
                              </Badge>
                            </td>
                            <td className="text-right py-3 px-2 text-muted-foreground">
                              {format(new Date(record.createdAt), 'MMM d, yyyy')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
