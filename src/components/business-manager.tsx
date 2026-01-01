'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Info
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { TransactionsManager } from '@/components/transactions-manager';
import { toast } from '@/hooks/use-toast';
import { ThemeLoading } from './theme-loading';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'in_transit';
  arrivalDate: string;
  description?: string;
  created: number;
}

interface Balance {
  available: number;
  pending: number;
  connectReserved?: number; // Funds held due to negative balances (Custom accounts)
  currency: string;
  availableBreakdown?: Array<{ amount: number; currency: string; source_types?: any }>;
  pendingBreakdown?: Array<{ amount: number; currency: string; source_types?: any }>;
}

interface Sale {
  id: string;
  itemId: string;
  itemType: string;
  itemTitle: string;
  buyerId: string;
  amount: number;
  currency: string;
  platformCommission: number;
  artistPayout: number;
  status: string;
  createdAt: any;
  completedAt?: any;
}

interface BusinessManagerProps {
  onComplete?: () => void;
}

export function BusinessManager({ onComplete }: BusinessManagerProps) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingStripeStatus, setCheckingStripeStatus] = useState(false);

  // Check Stripe status on mount and refresh user data
  useEffect(() => {
    const checkStripeStatus = async () => {
      if (user?.stripeAccountId && (!user?.stripeOnboardingStatus || user?.stripeOnboardingStatus !== 'complete')) {
        setCheckingStripeStatus(true);
        try {
          const response = await fetch(`/api/stripe/connect/account-status?accountId=${user.stripeAccountId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.onboardingStatus === 'complete' && data.chargesEnabled && data.payoutsEnabled) {
              // Update user profile in Firestore
              const { doc, updateDoc } = await import('firebase/firestore');
              const { db } = await import('@/lib/firebase');
              await updateDoc(doc(db, 'userProfiles', user.id), {
                stripeOnboardingStatus: 'complete',
                stripeChargesEnabled: data.chargesEnabled,
                stripePayoutsEnabled: data.payoutsEnabled,
              });
              await refreshUser();
            }
          }
        } catch (error) {
          console.error('Error checking Stripe status:', error);
        } finally {
          setCheckingStripeStatus(false);
        }
      }
    };

    checkStripeStatus();
  }, [user?.stripeAccountId, user?.id, refreshUser]);

  useEffect(() => {
    if (user?.stripeAccountId) {
      loadPayoutData();
    }
  }, [user?.stripeAccountId]);

  const loadPayoutData = async () => {
    if (!user?.stripeAccountId || !user?.id) return;
    
    setLoading(true);
    try {
      const [balanceResponse, payoutsResponse] = await Promise.all([
        fetch(`/api/stripe/connect/balance?accountId=${user.stripeAccountId}`),
        fetch(`/api/stripe/connect/payouts?accountId=${user.stripeAccountId}`)
      ]);

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setBalance(balanceData);
      }

      if (payoutsResponse.ok) {
        const payoutsData = await payoutsResponse.json();
        setPayouts(payoutsData.payouts || []);
      }

      // Load sales history
      const salesQuery = query(
        collection(db, 'sales'),
        where('artistId', '==', user.id),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const salesSnapshot = await getDocs(salesQuery);
      const salesData = salesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sale[];
      setSales(salesData);
    } catch (error) {
      console.error('Error loading payout data:', error);
      toast({
        title: "Failed to load payout data",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPayoutData();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Payout data has been updated.",
    });
  };

  // Check if Stripe is fully connected (same logic as StripeIntegrationWizard)
  const isStripeFullyConnected = user?.stripeAccountId && 
    user?.stripeOnboardingStatus === 'complete' && 
    user?.stripeChargesEnabled && 
    user?.stripePayoutsEnabled;

  if (!isStripeFullyConnected) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <CardTitle className="mb-2">Connect Stripe to View Payouts</CardTitle>
          <CardDescription className="mb-4">
            You need to connect your Stripe account to view your payout dashboard.
          </CardDescription>
          <Button 
            variant="gradient"
            onClick={() => {
              // Scroll to the Payments section on the same page
              const paymentsSection = document.querySelector('[data-payments-section]');
              if (paymentsSection) {
                paymentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
              } else {
                // Fallback: navigate to business tab
                window.location.href = '/settings?tab=business';
              }
            }}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Connect Stripe Account
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading && !balance) {
    return (
      <div className="flex justify-center py-12">
        <ThemeLoading text="" size="md" />
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100); // Convert from cents
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'in_transit':
        return <Badge variant="secondary"><RefreshCw className="h-3 w-3 mr-1" /> In Transit</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingPayouts = payouts.filter(p => p.status === 'pending' || p.status === 'in_transit');
  const totalPending = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);

  // Calculate business metrics
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, s) => sum + s.amount, 0);
  const totalPayout = sales.reduce((sum, s) => sum + s.artistPayout, 0);
  const totalPlatformDonation = sales.reduce((sum, s) => sum + (s.platformCommission || 0), 0);
  const totalStripeFees = sales.reduce((sum, s) => sum + ((s as any).stripeFeeAmount || 0), 0);
  
  // Sales by type
  const salesByType = sales.reduce((acc, sale) => {
    acc[sale.itemType] = (acc[sale.itemType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Revenue by type
  const revenueByType = sales.reduce((acc, sale) => {
    acc[sale.itemType] = (acc[sale.itemType] || 0) + sale.amount;
    return acc;
  }, {} as Record<string, number>);

  // Top selling items
  const topItems = sales
    .reduce((acc, sale) => {
      const key = sale.itemId;
      if (!acc[key]) {
        acc[key] = { title: sale.itemTitle, type: sale.itemType, count: 0, revenue: 0 };
      }
      acc[key].count += 1;
      acc[key].revenue += sale.amount;
      return acc;
    }, {} as Record<string, { title: string; type: string; count: number; revenue: number }>);

  const topItemsArray = Object.values(topItems)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Recent sales (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentSales = sales.filter(sale => {
    const saleDate = sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);
    return saleDate >= thirtyDaysAgo;
  });
  const recentRevenue = recentSales.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-4">
      {/* Compact Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">Total Sales</div>
          <div className="text-lg font-bold">{totalSales}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">Total Revenue</div>
          <div className="text-lg font-bold">{formatCurrency(totalRevenue)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">Your Payout</div>
          <div className="text-lg font-bold text-green-600">{formatCurrency(totalPayout)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">30 Day</div>
          <div className="text-lg font-bold">{formatCurrency(recentRevenue)}</div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1 mb-1">
            <div className="text-xs text-muted-foreground">Stripe Balance</div>
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 text-sm" align="start">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold mb-1">About Stripe Balance</h4>
                    <p className="text-xs text-muted-foreground">
                      Funds go directly to your Stripe account. Gouache does not hold payments. Any holds are managed by Stripe.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1 text-xs">Pending Settlement</h4>
                    <p className="text-xs text-muted-foreground">
                      Funds from recent transactions that are clearing (typically 1-7 days). These automatically become available once processed.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1 text-xs">Rolling Reserve</h4>
                    <p className="text-xs text-muted-foreground">
                      Stripe may hold a percentage of recent sales (typically 5-10%) for a set period (often 90 days) as a risk management measure. As new sales come in, older reserves are released. This is common for new accounts or higher-risk businesses. Check your Stripe Dashboard to see if a reserve is active.
                    </p>
                  </div>
                  {balance && balance.connectReserved && balance.connectReserved > 0 && (
                    <div>
                      <h4 className="font-semibold mb-1 text-xs">Funds On Hold</h4>
                      <p className="text-xs text-muted-foreground">
                        Funds explicitly held by Stripe, often due to disputes, chargebacks, or account verification requirements. Check your Stripe Dashboard for details.
                      </p>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="text-lg font-bold">
            {balance ? formatCurrency(balance.available + (balance.pending || 0) + (balance.connectReserved || 0), balance.currency) : '$0.00'}
          </div>
              {balance && (balance.pending > 0 || (balance.connectReserved && balance.connectReserved > 0)) && (
            <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
              {balance.pending > 0 && (
                <div>{formatCurrency(balance.pending)} pending settlement</div>
              )}
              {balance.connectReserved && balance.connectReserved > 0 && (
                <div>{formatCurrency(balance.connectReserved)} on hold</div>
              )}
            </div>
          )}
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">Pending Payouts</div>
          <div className="text-lg font-bold">{formatCurrency(totalPending)}</div>
          {pendingPayouts.length > 0 && (
            <div className="text-xs text-muted-foreground mt-0.5">{pendingPayouts.length} scheduled</div>
          )}
        </Card>
      </div>

      {/* Payout Dashboard */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Payouts</CardTitle>
              <CardDescription className="text-xs">
                Pending and completed payouts
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-xs">Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {payouts.length === 0 ? (
            <div className="text-center py-6">
              <DollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium mb-1">No Payouts Yet</p>
              <p className="text-xs text-muted-foreground">
                Payouts will appear here after sales
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Pending Payouts */}
              {pendingPayouts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Pending ({pendingPayouts.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingPayouts.map((payout) => (
                      <div
                        key={payout.id}
                        className="border rounded p-3 flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {getStatusBadge(payout.status)}
                          <span className="font-semibold">
                            {formatCurrency(payout.amount, payout.currency)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(payout.created)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Payouts */}
              {payouts.filter(p => p.status === 'paid').length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completed ({payouts.filter(p => p.status === 'paid').length})
                  </h3>
                  <div className="space-y-2">
                    {payouts
                      .filter(p => p.status === 'paid')
                      .slice(0, 5)
                      .map((payout) => (
                        <div
                          key={payout.id}
                          className="border rounded p-3 flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            {getStatusBadge(payout.status)}
                            <span className="font-semibold">
                              {formatCurrency(payout.amount, payout.currency)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(payout.created)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Analytics */}
      {sales.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sales by Type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sales by Type</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {Object.entries(salesByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs capitalize">{type}</Badge>
                      <span className="text-xs text-muted-foreground">{count} sale{count !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="font-semibold text-sm">{formatCurrency(revenueByType[type] || 0)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Selling Items */}
          {topItemsArray.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Top Items</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {topItemsArray.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-medium text-sm truncate">{item.title}</span>
                          <Badge variant="outline" className="text-xs shrink-0">{item.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.count} sale{item.count !== 1 ? 's' : ''}</p>
                      </div>
                      <span className="font-semibold text-sm ml-2">{formatCurrency(item.revenue)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Sales History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Sales</CardTitle>
              {totalStripeFees > 0 && (
                <CardDescription className="text-xs">
                  Total Stripe fees: {formatCurrency(totalStripeFees)}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {sales.length === 0 ? (
            <div className="text-center py-6">
              <DollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium mb-1">No Sales Yet</p>
              <p className="text-xs text-muted-foreground">
                Sales will appear here after purchases
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sales.slice(0, 10).map((sale) => (
                <div
                  key={sale.id}
                  className="border rounded p-3 text-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-500 text-xs">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Sold
                      </Badge>
                      <span className="font-medium">{sale.itemTitle || 'Untitled'}</span>
                      <Badge variant="secondary" className="text-xs">{sale.itemType}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className={`grid gap-3 text-xs ${sale.platformCommission > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Sale</p>
                      <p className="font-semibold">{formatCurrency(sale.amount, sale.currency)}</p>
                    </div>
                    {sale.platformCommission > 0 && (
                      <div>
                        <p className="text-muted-foreground mb-0.5">Donation</p>
                        <p className="font-semibold text-muted-foreground">
                          -{formatCurrency(sale.platformCommission, sale.currency)}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground mb-0.5">Payout</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(sale.artistPayout, sale.currency)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 text-xs text-muted-foreground">
              <span className="font-medium">Funds go directly to your Stripe account.</span> Gouache does not hold payments. Any pending balances or holds are managed by Stripe (typically 1-7 days for dispute protection). Payouts are automatic per your Stripe schedule. View details in your{' '}
              <a 
                href={`https://dashboard.stripe.com/connect/accounts/${user.stripeAccountId}/payouts`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Stripe Dashboard
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Manager */}
      <div className="mt-8">
        <TransactionsManager />
      </div>
    </div>
  );
}

