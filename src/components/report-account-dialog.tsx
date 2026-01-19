'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/providers/auth-provider';

interface ReportAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId: string;
  reportedUsername: string;
  artworkId?: string; // Optional - if reporting from an artwork
}

const REPORT_REASONS = [
  { value: 'fraud', label: 'Fraud - Impersonating Another Artist' },
  { value: 'ai_artwork', label: 'AI Generated Artwork (Undisclosed)' },
  { value: 'stolen_art', label: 'Stolen/Plagiarized Artwork' },
  { value: 'fake_identity', label: 'Fake Identity/Credentials' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'spam', label: 'Spam or Scam' },
  { value: 'other', label: 'Other' },
];

export function ReportAccountDialog({
  open,
  onOpenChange,
  reportedUserId,
  reportedUsername,
  artworkId,
}: ReportAccountDialogProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to report an account.",
        variant: "destructive",
      });
      return;
    }

    if (!reason) {
      toast({
        title: "Reason required",
        description: "Please select a reason for your report.",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Details required",
        description: "Please provide details about your report.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create report in Firestore
      await addDoc(collection(db, 'accountReports'), {
        reportedUserId,
        reportedUsername,
        reporterUserId: user.id,
        reporterUsername: user.username,
        reporterEmail: user.email,
        reason,
        message: message.trim(),
        artworkId: artworkId || null,
        status: 'pending', // pending, reviewing, resolved, dismissed
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        adminNotes: '',
        adminAction: null, // email_sent, suspended, banned, dismissed
      });

      toast({
        title: "Report submitted",
        description: "Thank you for helping keep our community safe. We'll review this report shortly.",
      });

      // Reset form
      setReason('');
      setMessage('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Submission failed",
        description: "Failed to submit your report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Account</DialogTitle>
          <DialogDescription>
            Report @{reportedUsername} for violating community guidelines or suspected fraudulent activity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                False reports may result in account restrictions. Please only report genuine concerns.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Report *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Details *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide specific details about why you're reporting this account..."
              rows={5}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/1000 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason || !message.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
