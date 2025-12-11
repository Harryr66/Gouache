'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/providers/auth-provider';
import { Report } from '@/lib/types';
import { Flag, AlertTriangle } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

interface ReportDialogProps {
  contentId: string;
  contentType: 'Artwork' | 'Discussion' | 'Reply' | 'Post' | 'User' | 'Community';
  content: string;
  offenderId: string;
  offenderHandle: string;
  onReport: (report: Report) => void;
}

const reportReasons = [
  'Suspected AI-generated content',
  'Spam',
  'Inappropriate content',
  'Harassment',
  'Hate speech',
  'Violence',
  'Copyright violation',
  'Impersonation',
  'Other'
];

export function ReportDialog({ 
  contentId, 
  contentType, 
  content, 
  offenderId, 
  offenderHandle, 
  onReport 
}: ReportDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !user) {
      return;
    }
    
    const reporterHandle = user.username || user.email?.split('@')[0] || 'anonymous';

    const isAIContentReport = reason === 'Suspected AI-generated content';

    const newReport: Report = {
      id: `report-${Date.now()}`,
      contentId,
      contentType,
      content,
      reportedBy: reporterHandle,
      reporterId: user.id,
      offenderId,
      offenderHandle,
      reason,
      details: details.trim() || undefined,
      timestamp: new Date().toISOString(),
      status: 'pending',
      isAIContentReport
    };

    setLoading(true);
    try {
      // Save report to Firestore
      const reportData = {
        ...newReport,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'contentReports'), reportData);
      
      // Also call the onReport callback if provided
      if (onReport) {
      await onReport(newReport);
      }
      
      toast({
        title: "Report submitted",
        description: isAIContentReport 
          ? "Thank you for reporting suspected AI-generated content. Our team will review this."
          : "Thank you for your report. Our team will review this.",
      });
      
      setOpen(false);
      setReason('');
      setDetails('');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
          <Flag className="h-4 w-4 mr-1" />
          Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span>Report Content</span>
          </DialogTitle>
          <DialogDescription>
            Help us keep the community safe by reporting content that violates our guidelines.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for reporting</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reportReasons.map((reasonOption) => (
                  <SelectItem key={reasonOption} value={reasonOption}>
                    {reasonOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="details">Additional details (optional)</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide any additional context that might help us understand the issue..."
              rows={3}
            />
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Content:</strong> {content}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Type:</strong> {contentType}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Reported by:</strong> {user?.username || 'Anonymous'}
            </p>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!reason || loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
