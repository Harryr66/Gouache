'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentIntentId = searchParams.get('payment_intent');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    if (!paymentIntentId) {
      setStatus('error');
      return;
    }

    // Verify payment status
    const verifyPayment = async () => {
      try {
        const response = await fetch(`/api/stripe/verify-payment?paymentIntentId=${paymentIntentId}`);
        if (response.ok) {
          const data = await response.json();
          setPaymentDetails(data);
          setStatus(data.status === 'succeeded' ? 'success' : 'error');
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        setStatus('error');
      }
    };

    verifyPayment();
  }, [paymentIntentId]);

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <CardTitle className="mb-2">Verifying Payment</CardTitle>
            <CardDescription>Please wait while we confirm your purchase...</CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <CardTitle className="mb-2">Payment Verification Failed</CardTitle>
            <CardDescription className="mb-6">
              We couldn't verify your payment. If you were charged, please contact support.
            </CardDescription>
            <div className="flex gap-3 justify-center">
              <Button asChild variant="outline">
                <Link href="/support">Contact Support</Link>
              </Button>
              <Button asChild>
                <Link href="/">Go Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card>
        <CardContent className="p-12 text-center">
          <CheckCircle2 className="h-16 w-16 mx-auto mb-6 text-green-500" />
          <CardTitle className="text-2xl mb-2">Payment Successful!</CardTitle>
          <CardDescription className="mb-6">
            Your purchase has been completed successfully. You will receive a confirmation email shortly.
          </CardDescription>

          {paymentDetails && (
            <div className="bg-muted rounded-lg p-4 mb-6 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Item:</span>
                  <span className="font-medium">{paymentDetails.itemTitle || 'Purchase'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: paymentDetails.currency?.toUpperCase() || 'USD',
                    }).format((paymentDetails.amount || 0) / 100)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment ID:</span>
                  <span className="font-mono text-xs">{paymentIntentId}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {paymentDetails?.itemType === 'course' && (
              <Button asChild>
                <Link href={`/courses/${paymentDetails.itemId}`}>
                  Access Course
                </Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/profile">View My Purchases</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Continue Browsing</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

