'use client';

import React, { useState, useEffect } from 'react';
import { StripeElementsOptions } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';

import { getStripePromise } from '@/lib/stripe-client';

// Use shared Stripe promise utility to ensure consistency

interface CheckoutFormProps {
  amount: number;
  currency?: string;
  artistId: string;
  itemId: string;
  itemType: 'original' | 'print' | 'book' | 'course' | 'merchandise' | 'product';
  itemTitle: string;
  buyerId: string;
  onSuccess?: (paymentIntentId: string) => void; // ← CHANGED: Now passes payment intent ID
  onCancel?: () => void;
}

function CheckoutFormContent({
  amount,
  currency = 'usd',
  artistId,
  itemId,
  itemType,
  itemTitle,
  buyerId,
  onSuccess,
  onCancel,
  clientSecret,
  paymentIntentId,
}: CheckoutFormProps & { clientSecret: string; paymentIntentId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check auth before allowing purchase
  useEffect(() => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to make purchases. You can browse as a guest, but need an account to buy artworks.",
        variant: "destructive",
      });
      router.push('/login');
      onCancel?.();
    }
  }, [user, router, onCancel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Payment form validation failed');
        setIsProcessing(false);
        return;
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/purchase-success?payment_intent=${paymentIntentId}`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed');
        toast({
          title: 'Payment Failed',
          description: confirmError.message || 'Your payment could not be processed.',
          variant: 'destructive',
        });
      } else if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture')) {
        // Payment authorized (requires_capture) or succeeded (automatic capture)
        // Both cases mean payment is ready - call parent's onSuccess
        
        if (onSuccess) {
          // CRITICAL: Pass payment intent ID to parent for enrollment creation + capture
          onSuccess(paymentIntent.id);
        } else {
          // Fallback: redirect to success page
          router.push(`/purchase-success?payment_intent=${paymentIntent.id}`);
        }
      } else if (paymentIntent && paymentIntent.status === 'requires_action') {
        // 3D Secure or other authentication required
        // Stripe will handle the redirect automatically
      }
    } catch (err: any) {
      console.error('Error processing payment:', err);
      setError(err.message || 'An unexpected error occurred');
      toast({
        title: 'Payment Error',
        description: err.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <PaymentElement 
        options={{
          layout: 'tabs',
        }}
      />

      <div className="flex gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currency.toUpperCase(),
            }).format(amount)}`
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Your payment is secure and encrypted. By completing this purchase, you agree to our terms of service.
      </p>
    </form>
  );
}

export function CheckoutForm(props: CheckoutFormProps) {
  const stripePromise = getStripePromise();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  if (!stripePromise) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">
          Payment processing is not configured. Please contact support.
        </p>
        {props.onCancel && (
          <Button variant="outline" onClick={props.onCancel}>
            Close
          </Button>
        )}
      </div>
    );
  }

  // Create payment intent when component mounts
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Math.round(props.amount * 100),
            currency: (props.currency || 'usd').toLowerCase(),
            artistId: props.artistId,
            itemId: props.itemId,
            itemType: props.itemType,
            buyerId: props.buyerId,
            description: `Purchase: ${props.itemTitle}`,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
      } catch (err: any) {
        console.error('Error creating payment intent:', err);
        setError(err.message);
        toast({
          title: 'Payment Error',
          description: err.message || 'Failed to initialize payment.',
          variant: 'destructive',
        });
      }
    };

    createPaymentIntent();
  }, [props.amount, props.currency, props.artistId, props.itemId, props.itemType, props.buyerId, props.itemTitle]);

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        {props.onCancel && (
          <Button variant="outline" onClick={props.onCancel}>
            Close
          </Button>
        )}
      </div>
    );
  }

  if (!clientSecret || !paymentIntentId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Initializing payment...</p>
        </CardContent>
      </Card>
    );
  }

  // Now we have clientSecret, pass it to Elements
  const options: StripeElementsOptions = {
    clientSecret, // CRITICAL: Pass clientSecret to Elements
    appearance: {
      theme: 'stripe',
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutFormContent {...props} clientSecret={clientSecret} paymentIntentId={paymentIntentId} />
    </Elements>
  );
}

