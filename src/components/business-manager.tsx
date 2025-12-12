'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
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
  currency: string;
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

  if (!user?.stripeAccountId) {
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
        <ThemeLoading text="Loading payout data..." size="md" />
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

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balance ? formatCurrency(balance.available, balance.currency) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ready to be paid out</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balance ? formatCurrency(balance.pending, balance.currency) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPending)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{pendingPayouts.length} payout{pendingPayouts.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Dashboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payout Dashboard</CardTitle>
              <CardDescription>
                View your pending and completed payouts
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No Payouts Yet</CardTitle>
              <CardDescription>
                Your payouts will appear here once you make your first sale.
              </CardDescription>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending Payouts Section */}
              {pendingPayouts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Pending Payouts
                  </h3>
                  <div className="space-y-3">
                    {pendingPayouts.map((payout) => (
                      <div
                        key={payout.id}
                        className="border rounded-lg p-4 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusBadge(payout.status)}
                            <span className="font-semibold text-lg">
                              {formatCurrency(payout.amount, payout.currency)}
                            </span>
                          </div>
                          {payout.description && (
                            <p className="text-sm text-muted-foreground">{payout.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Arrives: {formatDate(payout.created)}
                            {payout.arrivalDate && ` • Expected: ${new Date(payout.arrivalDate).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Payouts Section */}
              {payouts.filter(p => p.status === 'paid').length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Completed Payouts
                  </h3>
                  <div className="space-y-3">
                    {payouts
                      .filter(p => p.status === 'paid')
                      .slice(0, 10) // Show last 10
                      .map((payout) => (
                        <div
                          key={payout.id}
                          className="border rounded-lg p-4 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getStatusBadge(payout.status)}
                              <span className="font-semibold text-lg">
                                {formatCurrency(payout.amount, payout.currency)}
                              </span>
                            </div>
                            {payout.description && (
                              <p className="text-sm text-muted-foreground">{payout.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Paid: {formatDate(payout.created)}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>
            Your recent sales and commissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No Sales Yet</CardTitle>
              <CardDescription>
                Your sales will appear here once customers make purchases.
              </CardDescription>
            </div>
          ) : (
            <div className="space-y-3">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="border rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Sold
                      </Badge>
                      <span className="font-semibold">{sale.itemTitle || 'Untitled'}</span>
                      <Badge variant="secondary">{sale.itemType}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Sale Amount</p>
                        <p className="font-semibold">{formatCurrency(sale.amount, sale.currency)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Platform Fee (5%)</p>
                        <p className="font-semibold text-muted-foreground">
                          -{formatCurrency(sale.platformCommission, sale.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Your Payout</p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(sale.artistPayout, sale.currency)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleDateString() : 'Date unavailable'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">About Payouts</h4>
              <p className="text-sm text-muted-foreground">
                Payouts are automatically processed by Stripe. Pending payouts typically arrive in your bank account within 2-7 business days. 
                You can view detailed payout information in your{' '}
                <a 
                  href={`https://dashboard.stripe.com/connect/accounts/${user.stripeAccountId}/payouts`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Stripe Dashboard
                  <ExternalLink className="h-3 w-3" />
                </a>
                .
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

