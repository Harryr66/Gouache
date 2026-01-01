'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { RefreshCw, DollarSign, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/auth-provider';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

interface Transaction {
  id: string;
  paymentIntentId: string;
  checkoutSessionId?: string;
  itemId: string;
  itemType: string;
  itemTitle: string;
  buyerId: string;
  artistId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  refunded?: boolean;
  refundedAt?: Timestamp;
}

type TimeFilter = 'day' | 'week' | 'month' | 'all';

export function TransactionsManager() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [confirmRefund, setConfirmRefund] = useState<Transaction | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadTransactions();
    }
  }, [user?.id]);

  const loadTransactions = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Query sales (from webhook)
      const salesQuery = query(
        collection(db, 'sales'),
        where('artistId', '==', user.id),
        orderBy('createdAt', 'desc')
      );
      const salesSnapshot = await getDocs(salesQuery);
      
      // Query course enrollments
      const enrollmentsQuery = query(
        collection(db, 'enrollments'),
        where('instructorId', '==', user.id),
        orderBy('createdAt', 'desc')
      );
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      
      // Combine and map to unified transaction format
      const salesTransactions = salesSnapshot.docs.map(doc => ({
        id: doc.id,
        paymentIntentId: doc.data().paymentIntentId,
        checkoutSessionId: doc.data().checkoutSessionId,
        itemId: doc.data().itemId,
        itemType: doc.data().itemType,
        itemTitle: doc.data().itemTitle || 'Untitled',
        buyerId: doc.data().buyerId,
        artistId: doc.data().artistId,
        amount: doc.data().amount,
        currency: doc.data().currency || 'usd',
        status: doc.data().status,
        createdAt: doc.data().createdAt,
        completedAt: doc.data().completedAt,
        refunded: doc.data().refunded || false,
        refundedAt: doc.data().refundedAt,
      }));
      
      const enrollmentTransactions = enrollmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        paymentIntentId: doc.data().paymentIntentId || '',
        checkoutSessionId: doc.data().checkoutSessionId,
        itemId: doc.data().courseId,
        itemType: 'course',
        itemTitle: doc.data().courseTitle || 'Untitled Course',
        buyerId: doc.data().userId,
        artistId: doc.data().instructorId,
        amount: 0, // Will be fetched from course if needed
        currency: 'usd',
        status: doc.data().status || 'active',
        createdAt: doc.data().createdAt,
        completedAt: doc.data().enrolledAt,
        refunded: doc.data().refunded || false,
        refundedAt: doc.data().refundedAt,
      }));
      
      // Combine and sort by date
      const allTransactions = [...salesTransactions, ...enrollmentTransactions]
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
      
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: "Failed to load transactions",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Transactions have been updated.",
    });
  };

  const handleRefundClick = (transaction: Transaction) => {
    setConfirmRefund(transaction);
  };

  const handleRefundConfirm = async () => {
    if (!confirmRefund) return;
    
    setRefundingId(confirmRefund.id);
    setConfirmRefund(null);
    
    try {
      const response = await fetch('/api/stripe/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: confirmRefund.paymentIntentId,
          transactionId: confirmRefund.id,
          reason: 'requested_by_customer',
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process refund');
      }
      
      toast({
        title: "Refund Successful",
        description: "The customer has been refunded. This may take 5-10 business days to appear in their account.",
      });
      
      // Reload transactions
      await loadTransactions();
    } catch (error: any) {
      console.error('Error processing refund:', error);
      toast({
        title: "Refund Failed",
        description: error.message || "Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setRefundingId(null);
    }
  };

  // Filter transactions by time
  const filteredTransactions = useMemo(() => {
    if (timeFilter === 'all') return transactions;
    
    const now = new Date();
    const cutoff = new Date();
    
    switch (timeFilter) {
      case 'day':
        cutoff.setDate(now.getDate() - 1);
        break;
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(now.getMonth() - 1);
        break;
    }
    
    return transactions.filter(t => {
      const date = t.createdAt?.toDate?.() || new Date(0);
      return date >= cutoff;
    });
  }, [transactions, timeFilter]);

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading transactions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                View and manage your sales transactions
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
          {/* Filters */}
          <div className="flex items-center gap-2 mb-4">
            <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as TimeFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Last 24 Hours</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium mb-1">No Transactions</p>
              <p className="text-xs text-muted-foreground">
                Transactions will appear here after sales
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{transaction.itemTitle}</h4>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {transaction.itemType}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.createdAt)}
                      </p>
                    </div>
                    {transaction.refunded ? (
                      <Badge variant="destructive" className="shrink-0">
                        <XCircle className="h-3 w-3 mr-1" />
                        Refunded
                      </Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-500 shrink-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Amount</p>
                      <p className="font-semibold">
                        {transaction.amount > 0 
                          ? formatCurrency(transaction.amount, transaction.currency)
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs mb-1">Payment ID</p>
                      <p className="font-mono text-xs">
                        {transaction.paymentIntentId?.slice(0, 20) || 'N/A'}...
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {!transaction.refunded && transaction.paymentIntentId && (
                    <div className="pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRefundClick(transaction)}
                        disabled={refundingId === transaction.id}
                        className="w-full sm:w-auto"
                      >
                        {refundingId === transaction.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Issue Refund
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-2">
              <p>
                <span className="font-medium">Refund Policy:</span> Refunds are processed through Stripe and typically take 5-10 business days to appear in the customer's account. The refunded amount will be deducted from your next payout.
              </p>
              <p>
                <span className="font-medium">Note:</span> Issuing a refund will revoke the customer's access to the purchased item (course enrollment, artwork ownership, etc.).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Refund Confirmation Dialog */}
      <AlertDialog open={!!confirmRefund} onOpenChange={(open) => !open && setConfirmRefund(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Refund</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to refund this transaction?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmRefund && (
            <div className="space-y-2 py-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Item:</span>
                <span className="font-medium">{confirmRefund.itemTitle}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">
                  {formatCurrency(confirmRefund.amount, confirmRefund.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{formatDate(confirmRefund.createdAt)}</span>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRefundConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

