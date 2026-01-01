'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Package, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

function PurchaseSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const sid = searchParams?.get('session_id');
    if (sid) {
      setSessionId(sid);
    } else {
      // No session ID, redirect to home
      router.push('/');
    }
  }, [searchParams, router]);

  if (!sessionId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Icon */}
        <div className="flex justify-center mb-8">
          <div className="rounded-full bg-green-500/10 p-6">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
        </div>

        {/* Main Message */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Thank You for Your Purchase!</h1>
          <p className="text-xl text-muted-foreground">
            Your order has been confirmed and is being processed.
          </p>
        </div>

        {/* Info Cards */}
        <div className="space-y-4 mb-8">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Confirmation Email Sent</h3>
                <p className="text-sm text-muted-foreground">
                  We've sent a confirmation email with your order details and receipt. 
                  Please check your inbox (and spam folder, just in case).
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">What Happens Next?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  The artist will prepare your order and ship it to your address. 
                  You'll receive tracking information once your item ships.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Order processing: 1-3 business days</li>
                  <li>• Shipping: 5-10 business days (depending on location)</li>
                  <li>• Questions? Check your confirmation email for artist contact details</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* Order Reference */}
        <div className="bg-muted/50 rounded-lg p-4 mb-8">
          <p className="text-sm text-muted-foreground text-center">
            Order Reference: <span className="font-mono text-foreground">{sessionId.slice(-12)}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="default"
            className="flex-1"
            onClick={() => router.push('/discover')}
          >
            Continue Shopping
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push('/profile')}
          >
            View My Orders
          </Button>
        </div>

        {/* Support Note */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Need help? Contact us at{' '}
          <a href="mailto:support@gouache.art" className="text-primary hover:underline">
            support@gouache.art
          </a>
        </p>
      </div>
    </div>
  );
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-pulse">
            <div className="h-16 w-16 bg-muted rounded-full mx-auto mb-8"></div>
            <div className="h-8 bg-muted rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    }>
      <PurchaseSuccessContent />
    </Suspense>
  );
}

