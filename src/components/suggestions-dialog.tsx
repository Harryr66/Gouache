'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Send, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SuggestionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  artistName: string;
  artistId: string;
}

const suggestionCategories = [
  { id: 'style', label: 'Art Style', icon: '🎨' },
  { id: 'subject', label: 'Subject Matter', icon: '🖼️' },
  { id: 'technique', label: 'Technique', icon: '🖌️' },
  { id: 'medium', label: 'Medium', icon: '🎭' },
  { id: 'series', label: 'Series Ideas', icon: '📚' },
  { id: 'other', label: 'Other', icon: '💡' },
];

export function SuggestionsDialog({ isOpen, onClose, artistName, artistId }: SuggestionsDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [suggestion, setSuggestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCategory || !suggestion.trim()) {
      toast({
        title: "Complete suggestion",
        description: "Please select a category and provide your suggestion.",
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
      setSelectedCategory('');
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
      setSelectedCategory('');
      setSuggestion('');
      onClose();
    }
  };

  const getCategoryLabel = (categoryId: string) => {
    return suggestionCategories.find(cat => cat.id === categoryId)?.label || '';
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
            Share ideas for what you'd like to see more of in their portfolio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Category Selection */}
          <div className="space-y-3">
            <Label>What would you like to suggest?</Label>
            <div className="grid grid-cols-2 gap-2">
              {suggestionCategories.map((category) => (
                <Card
                  key={category.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedCategory === category.id
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl mb-1">{category.icon}</div>
                    <div className="text-sm font-medium">{category.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Selected Category Display */}
          {selectedCategory && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Selected:</span>
              <Badge variant="secondary">{getCategoryLabel(selectedCategory)}</Badge>
            </div>
          )}

          {/* Suggestion Input */}
          <div className="space-y-2">
            <Label htmlFor="suggestion">Your Suggestion</Label>
            <Textarea
              id="suggestion"
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder={`What would you like to see more of in ${artistName}'s ${getCategoryLabel(selectedCategory).toLowerCase()}? Be specific and constructive...`}
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
              <CardTitle className="text-sm text-blue-800 dark:text-blue-200">
                💡 Suggestion Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Be specific and constructive</li>
                <li>• Focus on what you'd like to see more of</li>
                <li>• Avoid criticism or negative feedback</li>
                <li>• Artists appreciate detailed, thoughtful suggestions</li>
              </ul>
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
              disabled={isSubmitting || !selectedCategory || !suggestion.trim()}
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
