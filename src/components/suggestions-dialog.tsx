'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Send, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SuggestionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  artistName: string;
  artistId: string;
}

export function SuggestionsDialog({ isOpen, onClose, artistName, artistId }: SuggestionsDialogProps) {
  const [suggestion, setSuggestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!suggestion.trim()) {
      toast({
        title: "Enter suggestion",
        description: "Please provide your suggestion before submitting.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Save suggestion to Firestore
      // For now, simulate submission
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({
        title: "Suggestion sent!",
        description: `Your suggestion has been sent to ${artistName}. Thank you for your input!`,
      });

      // Reset form
      setSuggestion('');
      onClose();
    } catch (error) {
      toast({
        title: "Submission failed",
        description: "Failed to send suggestion. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSuggestion('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Send Suggestions to {artistName}
          </DialogTitle>
          <DialogDescription>
            Share what you like and what you want to see more of
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Suggestion Input */}
          <div className="space-y-2">
            <Label htmlFor="suggestion">Your Suggestion</Label>
            <Textarea
              id="suggestion"
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder={`What would you like to see more of in ${artistName}'s artwork? Be specific and constructive...`}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {suggestion.length}/500 characters
            </p>
          </div>

          {/* Guidelines */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                A Kind Reminder
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <li>• <strong>Be respectful and constructive</strong> - Everyone deserves respect</li>
                <li>• <strong>Focus on requests, not criticism</strong> - What you'd like to see more of</li>
                <li>• <strong>No hate speech, harassment, or negativity</strong> - This will not be tolerated</li>
                <li>• <strong>Violations lead to platform removal</strong> - We protect our creators</li>
              </ul>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-2 font-medium">
                Please Keep All Suggestions Pleasant & Helpful
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                Thank you
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !suggestion.trim()}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Suggestion
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
