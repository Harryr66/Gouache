'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Mail, Loader2, Check } from 'lucide-react';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address.',
        variant: 'destructive'
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe to newsletter');
      }

      setIsSuccess(true);
      setEmail('');
      
      toast({
        title: 'Successfully subscribed!',
        description: 'Thank you for subscribing to the Gouache newsletter.',
      });

      // Reset success state after 3 seconds
      setTimeout(() => {
        setIsSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      toast({
        title: 'Subscription failed',
        description: error instanceof Error ? error.message : 'Unable to subscribe. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-2">
      <CardHeader className="text-center space-y-2">
        <div className="flex justify-center mb-2">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Stay in the Loop</CardTitle>
        <CardDescription className="text-base">
          Get the latest art world news, artist spotlights, and exclusive content delivered to your inbox.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting || isSuccess}
              className="flex-1"
              required
            />
            <Button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className="shrink-0"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subscribing...
                </>
              ) : isSuccess ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Subscribed!
                </>
              ) : (
                'Subscribe'
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

