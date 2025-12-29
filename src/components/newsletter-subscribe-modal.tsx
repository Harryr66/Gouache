'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, CheckCircle2, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface NewsletterSubscribeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistId: string;
  artistName?: string;
  provider?: 'convertkit' | 'mailchimp' | 'substack' | 'custom' | null;
  newsletterLink?: string;
}

export function NewsletterSubscribeModal({
  open,
  onOpenChange,
  artistId,
  artistName,
  provider,
  newsletterLink,
}: NewsletterSubscribeModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
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
      const response = await fetch(`/api/newsletter/subscribe/${artistId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(),
          name: name.trim() || undefined,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      // Check if we need to redirect
      if (data.redirectUrl) {
        // Open redirect URL in new tab
        window.open(data.redirectUrl, '_blank');
        toast({
          title: 'Redirecting...',
          description: 'Opening newsletter signup page in a new tab.',
        });
        onOpenChange(false);
        return;
      }

      setIsSuccess(true);
      setEmail('');
      setName('');
      
      toast({
        title: 'Successfully subscribed!',
        description: data.alreadySubscribed 
          ? 'You are already subscribed to this newsletter.'
          : `Thank you for subscribing to ${artistName || 'this artist'}'s newsletter.`,
      });

      // Close modal after 2 seconds
      setTimeout(() => {
        setIsSuccess(false);
        onOpenChange(false);
      }, 2000);
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

  const handleClose = () => {
    if (!isSubmitting) {
      setIsSuccess(false);
      setEmail('');
      setName('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Subscribe to Newsletter
          </DialogTitle>
          <DialogDescription>
            {artistName 
              ? `Subscribe to ${artistName}'s newsletter to stay updated.`
              : 'Subscribe to this artist\'s newsletter to stay updated.'}
          </DialogDescription>
        </DialogHeader>
        
        {isSuccess ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
            <div>
              <h3 className="text-lg font-semibold">Subscribed!</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Thank you for subscribing. Check your email for confirmation.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="gradient-button"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Subscribing...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Subscribe
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

