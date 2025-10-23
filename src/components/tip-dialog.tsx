'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Coffee, Star, Gift } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TipDialogProps {
  isOpen: boolean;
  onClose: () => void;
  artistName: string;
  artistId: string;
}

const tipAmounts = [
  { amount: 5, label: 'Coffee', icon: Coffee, description: 'Buy them a coffee' },
  { amount: 10, label: 'Appreciation', icon: Heart, description: 'Show your appreciation' },
  { amount: 25, label: 'Support', icon: Star, description: 'Support their work' },
  { amount: 50, label: 'Generous', icon: Gift, description: 'Generous support' },
];

export function TipDialog({ isOpen, onClose, artistName, artistId }: TipDialogProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTipSubmit = async () => {
    if (!selectedAmount && !customAmount) {
      toast({
        title: "Select amount",
        description: "Please select a tip amount or enter a custom amount.",
        variant: "destructive"
      });
      return;
    }

    const amount = selectedAmount || parseFloat(customAmount);
    if (amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid tip amount.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // TODO: Integrate with payment processor (Stripe, PayPal, etc.)
      // For now, simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: "Tip sent!",
        description: `Your $${amount} tip has been sent to ${artistName}. Thank you for supporting artists!`,
      });

      // Reset form
      setSelectedAmount(null);
      setCustomAmount('');
      setMessage('');
      onClose();
    } catch (error) {
      toast({
        title: "Tip failed",
        description: "Failed to send tip. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setSelectedAmount(null);
      setCustomAmount('');
      setMessage('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            A coffee on me!
          </DialogTitle>
          <DialogDescription>
            Support your favourite artists by buying them a coffee to brighten their day.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tip Amount Selection */}
          <div className="space-y-3">
            <Label>Select Amount</Label>
            <div className="grid grid-cols-2 gap-3">
              {tipAmounts.map((tip) => {
                const Icon = tip.icon;
                return (
                  <Card 
                    key={tip.amount}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedAmount === tip.amount 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      setSelectedAmount(tip.amount);
                      setCustomAmount('');
                    }}
                  >
                    <CardContent className="p-4 text-center">
                      <Icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <div className="font-semibold">${tip.amount}</div>
                      <div className="text-sm text-muted-foreground">{tip.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{tip.description}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="space-y-2">
            <Label htmlFor="customAmount">Or enter custom amount</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="customAmount"
                type="number"
                min="1"
                step="0.01"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                placeholder="0.00"
                className="flex-1"
              />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Leave a message for the artist..."
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/200 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTipSubmit}
              disabled={isProcessing || (!selectedAmount && !customAmount)}
              className="flex-1"
            >
              {isProcessing ? 'Processing...' : `Send $${selectedAmount || customAmount || '0'} Tip`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
