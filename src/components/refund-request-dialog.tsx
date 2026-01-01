'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/auth-provider';
import { Loader2 } from 'lucide-react';

interface Order {
  id: string;
  productId?: string;
  courseId?: string;
  artworkId?: string;
  itemTitle?: string;
  price: number;
  currency: string;
  status: string;
  createdAt: any;
  shippingAddress?: any;
  type: 'product' | 'course' | 'artwork';
  sellerId: string;
}

interface RefundRequestDialogProps {
  order: Order;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RefundRequestDialog({
  order,
  open,
  onClose,
  onSuccess,
}: RefundRequestDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please provide a reason for your refund request.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to request a refund.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/orders/request-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          orderType: order.type,
          itemTitle: order.itemTitle,
          price: order.price,
          currency: order.currency,
          sellerId: order.sellerId,
          reason: reason.trim(),
          buyerEmail: user.email,
          buyerName: user.displayName || user.username || 'Customer',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit refund request');
      }

      toast({
        title: 'Refund Request Sent',
        description: 'The seller has been notified and will review your request.',
      });

      onSuccess();
    } catch (error) {
      console.error('Error submitting refund request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit refund request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Refund</DialogTitle>
          <DialogDescription>
            Explain why you'd like a refund for <strong>{order.itemTitle}</strong>.
            The seller will review your request and respond via email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for refund</Label>
            <Textarea
              id="reason"
              placeholder="Please describe the issue with your order..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              disabled={submitting}
            />
            <p className="text-sm text-muted-foreground">
              Be specific about any issues to help the seller process your request faster.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !reason.trim()}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

