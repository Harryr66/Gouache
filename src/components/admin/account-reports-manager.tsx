'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Ban, Calendar, Check, ExternalLink, Loader2, Mail, Shield, User, X } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface AccountReport {
  id: string;
  reportedUserId: string;
  reportedUsername: string;
  reporterUserId: string;
  reporterUsername: string;
  reporterEmail: string;
  reason: string;
  message: string;
  artworkId?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  createdAt: any;
  updatedAt: any;
  adminNotes?: string;
  adminAction?: 'email_sent' | 'suspended' | 'banned' | 'dismissed' | null;
  reviewedBy?: string;
  reviewedAt?: any;
}

interface ReportedUserDetails {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  handle?: string;
  location?: string;
  countryOfOrigin?: string;
  countryOfResidence?: string;
  isProfessional?: boolean;
  isVerified?: boolean;
  createdAt?: any;
  isSuspended?: boolean;
  suspendedUntil?: any;
  isBanned?: boolean;
  bannedAt?: any;
  banReason?: string;
}

const REASON_LABELS: Record<string, string> = {
  fraud: 'Fraud - Impersonating Artist',
  ai_artwork: 'AI Generated Artwork',
  stolen_art: 'Stolen/Plagiarized Artwork',
  fake_identity: 'Fake Identity/Credentials',
  inappropriate: 'Inappropriate Content',
  spam: 'Spam or Scam',
  other: 'Other',
};

export function AccountReportsManager() {
  const [reports, setReports] = useState<AccountReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<AccountReport | null>(null);
  const [userDetails, setUserDetails] = useState<ReportedUserDetails | null>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'suspend' | 'ban' | 'dismiss' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchReports();
  }, [activeTab]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const reportsRef = collection(db, 'accountReports');
      let q;
      
      if (activeTab === 'all') {
        q = query(reportsRef, orderBy('createdAt', 'desc'), limit(100));
      } else {
        q = query(
          reportsRef,
          where('status', '==', activeTab),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      }

      const snapshot = await getDocs(q);
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AccountReport[];

      setReports(reportsData);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error",
        description: "Failed to fetch reports.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    try {
      setLoadingUserDetails(true);
      const userDoc = await getDoc(doc(db, 'userProfiles', userId));
      
      if (userDoc.exists()) {
        setUserDetails(userDoc.data() as ReportedUserDetails);
      } else {
        setUserDetails(null);
        toast({
          title: "User not found",
          description: "Could not fetch user details.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch user details.",
        variant: "destructive",
      });
    } finally {
      setLoadingUserDetails(false);
    }
  };

  const handleViewReport = async (report: AccountReport) => {
    setSelectedReport(report);
    setAdminNotes(report.adminNotes || '');
    await fetchUserDetails(report.reportedUserId);
  };

  const handleUpdateStatus = async (reportId: string, newStatus: AccountReport['status']) => {
    try {
      await updateDoc(doc(db, 'accountReports', reportId), {
        status: newStatus,
        updatedAt: new Date(),
      });

      toast({
        title: "Status updated",
        description: `Report marked as ${newStatus}.`,
      });

      fetchReports();
      if (selectedReport?.id === reportId) {
        setSelectedReport({ ...selectedReport, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      });
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedReport) return;

    try {
      await updateDoc(doc(db, 'accountReports', selectedReport.id), {
        adminNotes,
        updatedAt: new Date(),
      });

      toast({
        title: "Notes saved",
        description: "Admin notes have been saved.",
      });

      setSelectedReport({ ...selectedReport, adminNotes });
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: "Error",
        description: "Failed to save notes.",
        variant: "destructive",
      });
    }
  };

  const handleSendEmail = () => {
    setShowEmailDialog(true);
    setEmailSubject(`Regarding your account on Gouache`);
    setEmailBody(`Hello,\n\nWe're reaching out regarding recent activity on your account...\n\nBest regards,\nGouache Team`);
  };

  const confirmSendEmail = async () => {
    if (!selectedReport || !userDetails?.email) return;

    try {
      // Call API route to send email
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: userDetails.email,
          subject: emailSubject,
          body: emailBody,
          reportId: selectedReport.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to send email');

      await updateDoc(doc(db, 'accountReports', selectedReport.id), {
        adminAction: 'email_sent',
        adminNotes: `${adminNotes}\n\n[Email sent on ${new Date().toISOString()}]`,
        updatedAt: new Date(),
      });

      toast({
        title: "Email sent",
        description: "Email has been sent to the account owner.",
      });

      setShowEmailDialog(false);
      fetchReports();
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: "Failed to send email.",
        variant: "destructive",
      });
    }
  };

  const handleAccountAction = (action: 'suspend' | 'ban' | 'dismiss') => {
    setSelectedAction(action);
    setActionReason('');
    setShowActionDialog(true);
  };

  const confirmAccountAction = async () => {
    if (!selectedReport || !selectedAction || !userDetails) return;

    setProcessingAction(true);
    try {
      const updates: any = {
        updatedAt: new Date(),
      };

      if (selectedAction === 'suspend') {
        const suspendUntil = new Date();
        suspendUntil.setDate(suspendUntil.getDate() + 30); // 30 days suspension
        
        updates.isSuspended = true;
        updates.suspendedUntil = suspendUntil;
        updates.suspendReason = actionReason;

        await updateDoc(doc(db, 'userProfiles', selectedReport.reportedUserId), updates);
        await updateDoc(doc(db, 'accountReports', selectedReport.id), {
          adminAction: 'suspended',
          status: 'resolved',
          adminNotes: `${adminNotes}\n\n[Suspended for 30 days: ${actionReason}]`,
          updatedAt: new Date(),
        });

        toast({
          title: "Account suspended",
          description: "Account has been suspended for 30 days.",
        });
      } else if (selectedAction === 'ban') {
        updates.isBanned = true;
        updates.bannedAt = new Date();
        updates.banReason = actionReason;
        updates.isSuspended = false;

        await updateDoc(doc(db, 'userProfiles', selectedReport.reportedUserId), updates);
        await updateDoc(doc(db, 'accountReports', selectedReport.id), {
          adminAction: 'banned',
          status: 'resolved',
          adminNotes: `${adminNotes}\n\n[Permanently banned: ${actionReason}]`,
          updatedAt: new Date(),
        });

        toast({
          title: "Account banned",
          description: "Account has been permanently banned.",
        });
      } else if (selectedAction === 'dismiss') {
        await updateDoc(doc(db, 'accountReports', selectedReport.id), {
          adminAction: 'dismissed',
          status: 'dismissed',
          adminNotes: `${adminNotes}\n\n[Report dismissed: ${actionReason}]`,
          updatedAt: new Date(),
        });

        toast({
          title: "Report dismissed",
          description: "Report has been dismissed.",
        });
      }

      setShowActionDialog(false);
      setSelectedAction(null);
      setActionReason('');
      fetchReports();
      await fetchUserDetails(selectedReport.reportedUserId);
    } catch (error) {
      console.error('Error processing action:', error);
      toast({
        title: "Error",
        description: "Failed to process action.",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'default',
      reviewing: 'secondary',
      resolved: 'outline',
      dismissed: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account Reports</CardTitle>
          <CardDescription>
            Review and manage user-submitted reports for fraud accounts and policy violations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="reviewing">Reviewing</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
              <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4 mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No reports found.
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <Card key={report.id} className="cursor-pointer hover:bg-muted/50 transition"
                      onClick={() => handleViewReport(report)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span className="font-medium">@{report.reportedUsername}</span>
                              {getStatusBadge(report.status)}
                              {report.adminAction && (
                                <Badge variant="outline" className="text-xs">
                                  {report.adminAction.replace('_', ' ')}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm">
                              <strong>Reason:</strong> {REASON_LABELS[report.reason] || report.reason}
                            </div>
                            <div className="text-sm text-muted-foreground line-clamp-2">
                              {report.message}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Reporter: @{report.reporterUsername}</span>
                              <span>•</span>
                              <span>{formatDistanceToNow(report.createdAt?.toDate?.() || new Date(), { addSuffix: true })}</span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleViewReport(report)}>
                            Review
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Report Details Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
            <DialogDescription>
              Review report and take appropriate action
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-6">
              {/* Report Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Report Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Reported User</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-medium">@{selectedReport.reportedUsername}</span>
                        <Link href={`/profile/${selectedReport.reportedUserId}`} target="_blank">
                          <Button variant="ghost" size="sm" className="h-6 px-2">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Reporter</Label>
                      <p className="mt-1">@{selectedReport.reporterUsername}</p>
                      <p className="text-xs text-muted-foreground">{selectedReport.reporterEmail}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Reason</Label>
                      <p className="mt-1">{REASON_LABELS[selectedReport.reason] || selectedReport.reason}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Report Message</Label>
                    <p className="mt-1 p-3 bg-muted rounded text-sm">{selectedReport.message}</p>
                  </div>
                  {selectedReport.artworkId && (
                    <div>
                      <Label className="text-muted-foreground">Related Artwork</Label>
                      <Link href={`/artwork/${selectedReport.artworkId}`} target="_blank">
                        <Button variant="outline" size="sm" className="mt-1">
                          <ExternalLink className="h-3 w-3 mr-2" />
                          View Artwork
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* User Details */}
              {loadingUserDetails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : userDetails ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Account Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Legal Name</Label>
                        <p className="mt-1">
                          {[userDetails.firstName, userDetails.middleName, userDetails.lastName]
                            .filter(Boolean)
                            .join(' ') || 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Display Name</Label>
                        <p className="mt-1">{userDetails.displayName || 'Not set'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p className="mt-1">{userDetails.email || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Handle</Label>
                        <p className="mt-1">@{userDetails.handle || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Location</Label>
                        <p className="mt-1">{userDetails.location || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Country</Label>
                        <p className="mt-1">{userDetails.countryOfResidence || userDetails.countryOfOrigin || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Account Type</Label>
                        <div className="mt-1 flex gap-2">
                          {userDetails.isProfessional && <Badge>Professional</Badge>}
                          {userDetails.isVerified && <Badge variant="secondary">Verified</Badge>}
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Account Status</Label>
                        <div className="mt-1 flex gap-2">
                          {userDetails.isBanned && <Badge variant="destructive">Banned</Badge>}
                          {userDetails.isSuspended && <Badge variant="destructive">Suspended</Badge>}
                          {!userDetails.isBanned && !userDetails.isSuspended && (
                            <Badge variant="outline">Active</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {(userDetails.isSuspended || userDetails.isBanned) && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                          <div className="text-sm">
                            {userDetails.isBanned && (
                              <p><strong>Banned:</strong> {userDetails.banReason || 'No reason provided'}</p>
                            )}
                            {userDetails.isSuspended && userDetails.suspendedUntil && (
                              <p><strong>Suspended until:</strong> {new Date(userDetails.suspendedUntil.toDate?.() || userDetails.suspendedUntil).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    User details not available
                  </CardContent>
                </Card>
              )}

              {/* Admin Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Admin Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add internal notes about this report..."
                    rows={4}
                  />
                  <Button onClick={handleSaveNotes} size="sm">
                    Save Notes
                  </Button>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Select value={selectedReport.status} onValueChange={(value) => handleUpdateStatus(selectedReport.id, value as any)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Change Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={handleSendEmail} variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Email User
                </Button>

                {!userDetails?.isSuspended && !userDetails?.isBanned && (
                  <>
                    <Button onClick={() => handleAccountAction('suspend')} variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      Suspend (30 days)
                    </Button>
                    <Button onClick={() => handleAccountAction('ban')} variant="destructive">
                      <Ban className="h-4 w-4 mr-2" />
                      Permanent Ban
                    </Button>
                  </>
                )}

                <Button onClick={() => handleAccountAction('dismiss')} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Dismiss Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription>
              Send an email to the reported account owner
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="emailSubject">Subject</Label>
              <Input
                id="emailSubject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div>
              <Label htmlFor="emailBody">Message</Label>
              <Textarea
                id="emailBody"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Email message..."
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>Cancel</Button>
            <Button onClick={confirmSendEmail}>Send Email</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAction === 'suspend' && 'Suspend Account'}
              {selectedAction === 'ban' && 'Permanently Ban Account'}
              {selectedAction === 'dismiss' && 'Dismiss Report'}
            </DialogTitle>
            <DialogDescription>
              {selectedAction === 'suspend' && 'This will suspend the account for 30 days.'}
              {selectedAction === 'ban' && 'This will permanently ban the account and email.'}
              {selectedAction === 'dismiss' && 'This will mark the report as dismissed.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="actionReason">Reason *</Label>
              <Textarea
                id="actionReason"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Provide a reason for this action..."
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)} disabled={processingAction}>
              Cancel
            </Button>
            <Button 
              onClick={confirmAccountAction} 
              disabled={!actionReason.trim() || processingAction}
              variant={selectedAction === 'ban' ? 'destructive' : 'default'}
            >
              {processingAction ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Confirm {selectedAction === 'ban' ? 'Ban' : selectedAction === 'suspend' ? 'Suspension' : 'Dismissal'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
