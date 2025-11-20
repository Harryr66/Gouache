'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { X, Eye, Clock, User, Users, Calendar, ExternalLink, Upload, Plus, Megaphone, Trash2, Edit, Package, ShoppingCart, Link, Image, Play, Pause, BarChart3, AlertCircle, BadgeCheck, ChevronUp, ChevronDown, Sparkles, Loader2, GripVertical, Type, ImageIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ArtistInviteConsole } from '@/components/admin/artist-invite-console';
import { useRouter } from 'next/navigation';
import { ArtistRequest, AdvertisingApplication, MarketplaceProduct, AffiliateProductRequest, Advertisement, AdvertisementAnalytics, Course, CourseSubmission, NewsArticle, UserReport } from '@/lib/types';
import { doc, updateDoc, serverTimestamp, deleteDoc, getDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

export function AdminViewRouter(props: any) {
  const router = useRouter();
  
  // This component will be populated with all view content
  // For now, return a placeholder to reduce main file size
  return (
    <div className="space-y-6">
        {props.selectedView === 'artist-management' && (
          <div className="space-y-6">
            {/* Verified Status Management */}
            <Card>
              <CardHeader>
                <CardTitle>Verified Status Management</CardTitle>
                <CardDescription>
                  Manage verified status for professional artist accounts. All approved artists are verified by default.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {props.loadingArtists ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : props.professionalArtists.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No professional artists found.</p>
                ) : (
                  <div className="space-y-4">
                    {props.professionalArtists.map((artist) => (
                      <div
                        key={artist.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={artist.avatarUrl || ''} />
                            <AvatarFallback>{artist.name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{artist.name}</h3>
                              {artist.isVerified && (
                                <BadgeCheck className="h-4 w-4 text-blue-500 fill-current" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {artist.username && `@${artist.username}`} {artist.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={artist.isVerified}
                              onCheckedChange={async (checked) => {
                                try {
                                  await updateDoc(doc(db, 'userProfiles', artist.id), {
                                    isVerified: checked,
                                    updatedAt: serverTimestamp()
                                  });
                                  props.setProfessionalArtists(prev =>
                                    prev.map(a => a.id === artist.id ? { ...a, isVerified: checked } : a)
                                  );
                                  toast({
                                    title: checked ? "Verified status enabled" : "Verified status removed",
                                    description: `${artist.name}'s verified status has been ${checked ? 'enabled' : 'removed'}.`,
                                  });
                                } catch (error) {
                                  console.error('Error updating verified status:', error);
                                  toast({
                                    title: "Update failed",
                                    description: "Failed to update verified status. Please try again.",
                                    variant: "destructive"
                                  });
                                }
                              }}
                            />
                            <span className="text-sm text-muted-foreground">
                              {artist.isVerified ? 'Verified' : 'Not Verified'}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/profile/${artist.username || artist.id}`)}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View Profile
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Artists</CardTitle>
                <CardDescription>
                  Review verified artist accounts and suspend or remove them when necessary.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {props.approvedRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No verified artists have been approved yet.
                  </p>
                ) : (
                  props.approvedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-lg border border-border/60 p-4 transition hover:bg-muted/50"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={request.user.avatarUrl || ''} alt={request.user.displayName} />
                            <AvatarFallback>{request.user.displayName?.charAt(0).toUpperCase() || 'A'}</AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold leading-snug">
                                {request.user.displayName || request.user.username || request.user.email}
                              </h3>
                              <Badge variant="default" className="bg-emerald-600 text-emerald-50">
                                Approved
                              </Badge>
                            </div>
                            {request.user.username && (
                              <p className="text-sm text-muted-foreground">@{request.user.username}</p>
                            )}
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                              <span>Email: {request.user.email}</span>
                              <span>Reviewed: {props.formatDate(request.reviewedAt)}</span>
                              {request.reviewedBy && <span>Reviewed by: {request.reviewedBy}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/profile/${request.user.username || request.userId}`)}
                          >
                            <ExternalLink className="mr-1 h-4 w-4" />
                            View Profile
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => props.handleSuspendArtist(request)}
                            disabled={props.isProcessing}
                          >
                            Suspend
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" disabled={props.isProcessing}>
                                Remove
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove artist account?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will delete the artist&apos;s profile and revoke their access. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => props.handleRemoveArtist(request)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Confirm removal
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Suspended Artists</CardTitle>
                <CardDescription>
                  Reinstate suspended accounts or escalate to permanent removal.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {props.suspendedRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No artists are currently suspended.</p>
                ) : (
                  props.suspendedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-lg border border-border/60 p-4 transition hover:bg-muted/50"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={request.user.avatarUrl || ''} alt={request.user.displayName} />
                            <AvatarFallback>{request.user.displayName?.charAt(0).toUpperCase() || 'A'}</AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold leading-snug">
                                {request.user.displayName || request.user.username || request.user.email}
                              </h3>
                              <Badge variant="destructive">Suspended</Badge>
                            </div>
                            {request.user.username && (
                              <p className="text-sm text-muted-foreground">@{request.user.username}</p>
                            )}
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                              <span>Email: {request.user.email}</span>
                              <span>Suspended: {props.formatDate(request.reviewedAt)}</span>
                              {request.reviewedBy && <span>By: {request.reviewedBy}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/profile/${request.user.username || request.userId}`)}
                          >
                            <ExternalLink className="mr-1 h-4 w-4" />
                            View Profile
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => props.handleReinstateArtist(request)}
                            disabled={props.isProcessing}
                          >
                            Reinstate
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" disabled={props.isProcessing}>
                                Remove
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove artist account?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will delete the artist&apos;s profile and revoke their access permanently.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => props.handleRemoveArtist(request)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Confirm removal
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Artist Account - Pending */}
        {props.selectedView === 'artist-invites' && (
          <div className="space-y-6">
            <ArtistInviteConsole />
          </div>
        )}

        {props.selectedView === 'artist-pending' && (
          props.pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                <p className="text-muted-foreground text-center">
                  All artist requests have been reviewed.
                </p>
                </CardContent>
              </Card>
            ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Pending Professional Verification Requests</h2>
              {props.pendingRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.user.avatarUrl || ''} />
                          <AvatarFallback>
                            {request.user.displayName?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{request.user.displayName}</h3>
                            <Badge variant="outline">Pending</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                              <p><strong>Email:</strong> {request.user.email}</p>
                              <p><strong>Experience:</strong> {request.experience}</p>
                        </div>
                            <div>
                              <p><strong>Submitted:</strong> {request.submittedAt instanceof Date ? request.submittedAt.toLocaleDateString() : (request.submittedAt as any)?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                              <p><strong>Portfolio Images:</strong> {request.portfolioImages.length}</p>
                      </div>
                          </div>
                          {request.artistStatement && (
                            <p className="text-sm mt-2">{request.artistStatement}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => props.setSelectedRequest(request)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => props.handleApprove(request)}
                          disabled={props.isProcessing}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            props.setSelectedRequest(request);
                            props.setRejectionReason('');
                          }}
                          disabled={props.isProcessing}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
                            </div>
          )
        )}

        {/* Artist Account - Approved */}
        {props.selectedView === 'artist-approved' && (
          props.approvedRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Check className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No approved requests</h3>
                <p className="text-muted-foreground text-center">
                  No artist requests have been approved yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Verified Professional Artists</h2>
              {props.approvedRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.user.avatarUrl || ''} />
                          <AvatarFallback>{request.user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{request.user.displayName}</h3>
                            <Badge variant="default" className="bg-green-600">Approved</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <p><strong>Email:</strong> {request.user.email}</p>
                            <p><strong>Reviewed:</strong> {request.reviewedAt instanceof Date ? request.reviewedAt.toLocaleDateString() : (request.reviewedAt as any)?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                            <p><strong>Reviewed by:</strong> {request.reviewedBy || 'admin'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => props.setSelectedRequest(request)}>
                          <Eye className="h-4 w-4 mr-1" /> View Details
                        </Button>
                        {request.portfolioImages && request.portfolioImages.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => props.handleTransferPortfolio(request)}
                            disabled={props.isProcessing}
                            className="text-blue-600 hover:text-blue-700 border-blue-200"
                          >
                            <Upload className="h-4 w-4 mr-1" /> Transfer Portfolio
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => props.handleSuspendArtist(request)}
                          disabled={props.isProcessing}
                        >
                          Suspend
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={props.isProcessing}>
                              Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove artist account?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the artist's profile and revoke their access. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => props.handleRemoveArtist(request)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {props.selectedView === 'artist-suspended' && (
          props.suspendedRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No suspended artists</h3>
                <p className="text-muted-foreground text-center">
                  Suspended artist accounts will appear here for review or reinstatement.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Suspended Artists</h2>
              {props.suspendedRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-lg transition-shadow border-amber-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.user.avatarUrl || ''} />
                          <AvatarFallback>{request.user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{request.user.displayName}</h3>
                            <Badge variant="secondary" className="bg-amber-500 text-black">Suspended</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <p><strong>Email:</strong> {request.user.email}</p>
                            <p><strong>Suspended:</strong> {request.reviewedAt instanceof Date ? request.reviewedAt.toLocaleDateString() : (request.reviewedAt as any)?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                            <p><strong>Suspended by:</strong> {request.reviewedBy || 'admin'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => props.handleReinstateArtist(request)}
                          disabled={props.isProcessing}
                        >
                          Reinstate
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={props.isProcessing}>
                              Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove artist account?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the artist's profile and revoke their access. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => props.handleRemoveArtist(request)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {props.selectedView === 'artist-rejected' && (
          props.rejectedRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <X className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No rejected requests</h3>
                <p className="text-muted-foreground text-center">
                  No artist requests have been rejected yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Rejected Professional Verification Requests</h2>
              {props.rejectedRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.user.avatarUrl || ''} />
                          <AvatarFallback>{request.user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{request.user.displayName}</h3>
                            <Badge variant="destructive">Rejected</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><strong>Reason:</strong> {request.props.rejectionReason || 'No reason provided'}</p>
                            <p><strong>Rejected:</strong> {request.reviewedAt instanceof Date ? request.reviewedAt.toLocaleDateString() : (request.reviewedAt as any)?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => props.setSelectedRequest(request)}>
                          <Eye className="h-4 w-4 mr-1" /> View Details
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={props.isProcessing}>
                              Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove artist account?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the artist's profile and revoke their access. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => props.handleRemoveArtist(request)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {props.selectedView === 'news-articles' && (
          <div className="space-y-6">
            {/* Article Editor */}
            <Card id="article-editor">
              <CardHeader>
                <CardTitle>Create newsroom article</CardTitle>
                <CardDescription>
                  Write and publish articles. Paste images directly into the body text between paragraphs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="news-title">Headline *</Label>
                    <Input
                      id="news-title"
                      placeholder="e.g. Inside the Lagos Art Weekender"
                      value={props.newArticle.title}
                      onChange={(event) => props.setNewArticle((prev) => ({ ...prev, title: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="news-subheadline">Subheadline</Label>
                    <Input
                      id="news-subheadline"
                      placeholder="Optional subheadline"
                      value={props.newArticleSubheadline}
                      onChange={(e) => props.setNewArticleSubheadline(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="article-body-editor">Article Body *</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Paste images directly into the editor between paragraphs. Images can be resized by dragging.
                    </p>
                    <div
                      id="article-body-editor"
                      contentEditable
                      onPaste={props.handleBodyPaste}
                      className="min-h-[500px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      style={{ whiteSpace: 'pre-wrap' }}
                      suppressContentEditableWarning
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={props.handleCreateNewsArticle} disabled={props.isPublishingArticle || !props.newArticle.title.trim()}>
                    {props.isPublishingArticle ? 'Publishing…' : 'Publish article'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    {props.showArchivedNews 
                      ? 'Archived articles' 
                      : props.showDraftedArticles
                      ? 'Drafted articles'
                      : 'Published articles'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {props.showArchivedNews
                      ? 'Review past stories and restore any that should return to the feed.'
                      : props.showDraftedArticles
                      ? 'Review and publish drafted articles. Make final edits before publishing.'
                      : 'Manage everything currently live in the newsroom feed.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={!props.showArchivedNews && !props.showDraftedArticles ? 'secondary' : 'outline'}
                    onClick={() => {
                      props.setShowArchivedNews(false);
                      props.setShowDraftedArticles(false);
                    }}
                  >
                    Published ({props.publishedArticles.length})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={props.showDraftedArticles && !props.showArchivedNews ? 'secondary' : 'outline'}
                    onClick={() => {
                      props.setShowArchivedNews(false);
                      props.setShowDraftedArticles(true);
                    }}
                  >
                    Drafted ({props.draftedArticles.length})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={props.showArchivedNews ? 'secondary' : 'outline'}
                    onClick={() => {
                      props.setShowArchivedNews(true);
                      props.setShowDraftedArticles(false);
                    }}
                  >
                    Archived ({props.archivedNewsArticles.length})
                  </Button>
                </div>
              </div>

              {props.visibleNewsArticles.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center space-y-2">
                    <h3 className="text-lg font-semibold">
                      {props.showArchivedNews 
                        ? 'No archived stories yet' 
                        : props.showDraftedArticles 
                        ? 'No drafted articles yet'
                        : 'No stories published yet'}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {props.showArchivedNews
                        ? 'When you archive a story, it will move here so you can restore or permanently delete it later.'
                        : props.showDraftedArticles
                        ? 'Drafted articles will appear here. Review and publish drafted articles.'
                        : 'Publish your first story to populate the newsroom feed.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {props.visibleNewsArticles.map((article) => (
                    <Card key={article.id} className="flex flex-col overflow-hidden">
                      <div className="relative w-full pt-[60%]">
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        <Badge className="absolute top-3 left-3" variant="secondary">
                          {article.category}
                        </Badge>
                        {article.archived && (
                          <Badge className="absolute top-3 right-3" variant="destructive">
                            Archived
                          </Badge>
                        )}
                        {article.status === 'draft' && !article.archived && (
                          <Badge className="absolute top-3 right-3" variant="outline" style={{ backgroundColor: 'rgba(255, 193, 7, 0.2)' }}>
                            Draft
                          </Badge>
                        )}
                      </div>
                      <CardContent className="flex-1 p-5 space-y-3">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-lg leading-tight line-clamp-2">{article.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-3">{article.summary}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {article.author ? `${article.author} • ` : ''}
                            {article.publishedAt 
                              ? article.publishedAt.toLocaleDateString() 
                              : article.updatedAt 
                              ? `Updated ${article.updatedAt.toLocaleDateString()}`
                              : 'Draft'}
                          </span>
                          <div className="flex items-center gap-2">
                            {article.status === 'draft' && !article.archived && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      // Load draft into editor
                                      const articleDoc = await getDoc(doc(db, 'newsArticles', article.id));
                                      if (!articleDoc.exists()) {
                                        toast({
                                          title: 'Article not found',
                                          variant: 'destructive',
                                        });
                                        return;
                                      }

                                      const data = articleDoc.data();
                                      
                                      props.setNewArticle({
                                        title: data.title || '',
                                        summary: data.summary || '',
                                        category: data.category || 'Stories',
                                        author: data.author || '',
                                        imageUrl: data.imageUrl || '',
                                        externalUrl: data.externalUrl || '',
                                        publishedAt: '',
                                        tags: (data.tags || []).join(', '),
                                        location: data.location || 'evergreen',
                                      });

                                      // Load content into editor
                                      const bodyEditor = document.getElementById('article-body-editor') as HTMLDivElement;
                                      if (bodyEditor && data.content) {
                                        bodyEditor.innerHTML = data.content;
                                      }

                                      // Scroll to editor
                                      setTimeout(() => {
                                        document.getElementById('article-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                      }, 100);

                                      toast({
                                        title: 'Draft loaded',
                                        description: 'Article loaded into editor. Make your changes and publish.',
                                      });
                                    } catch (error) {
                                      console.error('Error loading draft:', error);
                                      toast({
                                        title: 'Load failed',
                                        description: 'Failed to load draft. Please try again.',
                                        variant: 'destructive',
                                      });
                                    }
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await updateDoc(doc(db, 'newsArticles', article.id), {
                                        status: 'published',
                                        publishedAt: serverTimestamp(),
                                        updatedAt: serverTimestamp(),
                                      });
                                      toast({
                                        title: 'Article published',
                                        description: `"${article.title}" is now live.`,
                                      });
                                    } catch (error) {
                                      console.error('Error publishing article:', error);
                                      toast({
                                        title: 'Publish failed',
                                        description: 'Failed to publish article. Please try again.',
                                        variant: 'destructive'
                                      });
                                    }
                                  }}
                                >
                                  Publish
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => props.handleArchiveNewsArticle(article, !article.archived)}
                            >
                              {article.archived ? 'Restore' : 'Archive'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => props.handleDeleteNewsArticle(article)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Reports */}
        {props.selectedView === 'user-reports' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">User Reports</h2>
                <p className="text-muted-foreground">
                  Review reports submitted by users about issues, bugs, or concerns.
                </p>
              </div>
              <Badge variant="outline">
                {props.userReports.filter(r => r.status === 'pending').length} pending
              </Badge>
            </div>

            {props.userReports.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
                  <p className="text-muted-foreground text-center">
                    User reports will appear here when submitted.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {props.userReports.map((report) => (
                  <Card key={report.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{report.displayName}</h3>
                              <Badge
                                variant={
                                  report.status === 'pending'
                                    ? 'default'
                                    : report.status === 'resolved'
                                    ? 'secondary'
                                    : 'outline'
                                }
                              >
                                {report.status}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p>
                                <span className="font-medium">Username:</span> {report.username}
                              </p>
                              <p>
                                <span className="font-medium">Email:</span> {report.userEmail}
                              </p>
                              <p>
                                <span className="font-medium">User ID:</span> {report.userId}
                              </p>
                              <p>
                                <span className="font-medium">Submitted:</span>{' '}
                                {report.submittedAt.toLocaleDateString()} at{' '}
                                {report.submittedAt.toLocaleTimeString()}
                              </p>
                              {report.reviewedAt && (
                                <p>
                                  <span className="font-medium">Reviewed:</span>{' '}
                                  {report.reviewedAt.toLocaleDateString()} at{' '}
                                  {report.reviewedAt.toLocaleTimeString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <Label className="text-sm font-medium mb-2 block">Report Message</Label>
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm whitespace-pre-wrap">{report.message}</p>
                          </div>
                        </div>

                        {report.adminNotes && (
                          <div className="border-t pt-4">
                            <Label className="text-sm font-medium mb-2 block">Admin Notes</Label>
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <p className="text-sm whitespace-pre-wrap">{report.adminNotes}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-4 border-t">
                          {report.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => props.handleUpdateReportStatus(report, 'reviewed')}
                                disabled={props.isProcessing}
                              >
                                Mark as Reviewed
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => props.handleUpdateReportStatus(report, 'resolved')}
                                disabled={props.isProcessing}
                              >
                                Mark as Resolved
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => props.handleUpdateReportStatus(report, 'dismissed')}
                                disabled={props.isProcessing}
                              >
                                Dismiss
                              </Button>
                            </>
                          )}
                          {report.status !== 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => props.handleUpdateReportStatus(report, 'pending')}
                              disabled={props.isProcessing}
                            >
                              Reopen
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Marketplace - Products */}
        {props.selectedView === 'marketplace-products' && (
          props.marketplaceProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No products yet</h3>
                <p className="text-muted-foreground text-center">
                  Upload your first product using the Upload button.
                </p>
              </CardContent>
            </Card>
          ) : (
          <div className="space-y-4">
              <h2 className="text-2xl font-bold">All Products</h2>
              {props.marketplaceProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        {product.images.length > 0 && (
                          <img 
                            src={product.images[0]} 
                            alt={product.title}
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{product.title}</h3>
                            <Badge variant={product.isActive ? "default" : "secondary"}>
                              {product.isActive ? "Active" : "Inactive"}
                            </Badge>
                            {product.isOnSale && <Badge variant="destructive">On Sale</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-semibold">${product.price} {product.currency}</span>
                            <span>Stock: {product.stock}</span>
                            <span>Sales: {product.salesCount}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => props.handleDeleteProduct(product)}
                          disabled={props.isProcessing}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {/* Active Products */}
        {props.selectedView === 'marketplace-active' && (
          props.marketplaceProducts.filter(p => p.isActive).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No active products</h3>
                <p className="text-muted-foreground text-center">
                  No products are currently active in the marketplace.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Active Products</h2>
              {props.marketplaceProducts.filter(p => p.isActive).map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        {product.images.length > 0 && (
                          <img 
                            src={product.images[0]} 
                            alt={product.title}
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{product.title}</h3>
                            <Badge variant="default">Active</Badge>
                            {product.isOnSale && <Badge variant="destructive">On Sale</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-semibold">${product.price} {product.currency}</span>
                            <span>Stock: {product.stock}</span>
                            <span>Sales: {product.salesCount}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => props.handleDeleteProduct(product)}
                          disabled={props.isProcessing}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {/* Product Requests */}
        {props.selectedView === 'marketplace-requests' && (
          props.affiliateRequests.filter(req => req.status === 'pending').length === 0 ? (
              <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Link className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No affiliate requests</h3>
                <p className="text-muted-foreground text-center">
                  No affiliate product requests pending review.
                </p>
                </CardContent>
              </Card>
            ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Affiliate Product Requests</h2>
              {props.affiliateRequests.filter(req => req.status === 'pending').map((request) => (
                <Card key={request.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        {request.props.productImages.length > 0 && (
                          <img 
                            src={request.props.productImages[0]} 
                            alt={request.props.productTitle}
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{request.props.productTitle}</h3>
                            <Badge variant="outline">Pending</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                              <p><strong>Company:</strong> {request.companyName}</p>
                              <p><strong>Email:</strong> {request.email}</p>
                        </div>
                            <div>
                              <p><strong>Price:</strong> ${request.props.productPrice} {request.productCurrency}</p>
                              <p><strong>Category:</strong> {request.productCategory}</p>
                      </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAffiliateRequest(request)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => props.handleApproveAffiliateRequest(request)}
                          disabled={props.isProcessing}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => props.handleRejectAffiliateRequest(request)}
                          disabled={props.isProcessing}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
                        </div>
          )
        )}

        {/* Advertising - Requests */}
        {props.selectedView === 'advertising-requests' && (
          props.advertisingApplications.filter(app => app.status === 'pending').length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No advertising requests</h3>
                <p className="text-muted-foreground text-center">
                  No advertising applications pending review.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Advertising Applications</h2>
              {props.advertisingApplications.filter(app => app.status === 'pending').map((application) => (
                <Card key={application.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{application.companyName}</h3>
                          <Badge variant="outline">Pending</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                            <p><strong>Contact:</strong> {application.contactName}</p>
                            <p><strong>Email:</strong> {application.email}</p>
                        </div>
                          <div>
                            <p><strong>Type:</strong> {application.advertisingType}</p>
                            <p><strong>Budget:</strong> {application.budget || 'Not specified'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => props.setSelectedAdApplication(application)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => props.handleApproveAdApplication(application)}
                          disabled={props.isProcessing}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => props.setSelectedAdApplication(application)}
                          disabled={props.isProcessing}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {/* Empty states for other views */}
        {(props.selectedView === 'marketplace-archived' || props.selectedView === 'advertising-live' || 
          props.selectedView === 'advertising-archived') && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No items</h3>
              <p className="text-muted-foreground text-center">
                This section is currently empty.
              </p>
            </CardContent>
          </Card>
        )}


        {/* Advertising Media Management */}
        {props.selectedView === 'advertising-media' && (
          props.advertisements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No advertisements uploaded</h3>
                <p className="text-muted-foreground text-center">
                  Upload advertisements to display on the platform.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Advertising Media</h2>
              {props.advertisements.map((ad) => (
                <Card key={ad.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="w-32 h-20 bg-muted rounded-lg flex items-center justify-center">
                          {ad.thumbnailUrl ? (
                            <img src={ad.thumbnailUrl} alt={ad.title} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Play className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{ad.title}</h3>
                            <Badge variant={ad.isActive ? 'default' : 'secondary'}>
                              {ad.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{ad.description}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                              <p><strong>Advertiser:</strong> {ad.props.advertiserName}</p>
                              <p><strong>Duration:</strong> {ad.duration}s</p>
                      </div>
                            <div>
                              <p><strong>Views:</strong> {ad.views.toLocaleString()}</p>
                              <p><strong>Clicks:</strong> {ad.clicks.toLocaleString()}</p>
                    </div>
                            <div>
                              <p><strong>CTR:</strong> {ad.clickThroughRate.toFixed(2)}%</p>
                              <p><strong>Budget:</strong> ${ad.budget?.toLocaleString() || 'N/A'}</p>
                        </div>
                            <div>
                              <p><strong>Start:</strong> {ad.startDate instanceof Date ? ad.startDate.toLocaleDateString() : 'N/A'}</p>
                              <p><strong>End:</strong> {ad.endDate instanceof Date ? ad.endDate.toLocaleDateString() : 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAdvertisement(ad)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            // Toggle active status
                            updateDoc(doc(db, 'advertisements', ad.id), {
                              isActive: !ad.isActive,
                              updatedAt: serverTimestamp()
                            });
                          }}
                          disabled={props.isProcessing}
                        >
                          {ad.isActive ? (
                            <>
                              <Pause className="h-4 w-4 mr-1" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            // Delete advertisement
                            deleteDoc(doc(db, 'advertisements', ad.id));
                          }}
                          disabled={props.isProcessing}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
                    </div>
          )
        )}

        {/* Advertising Analytics */}
        {props.selectedView === 'advertising-analytics' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Advertising Analytics</h2>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Impressions</p>
                  <p className="text-xl font-bold">{props.advertisements.reduce((sum, ad) => sum + ad.impressions, 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Views</p>
                  <p className="text-xl font-bold">{props.advertisements.reduce((sum, ad) => sum + ad.views, 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Clicks</p>
                  <p className="text-xl font-bold">{props.advertisements.reduce((sum, ad) => sum + ad.clicks, 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Active Ads</p>
                  <p className="text-xl font-bold">{props.advertisements.filter(ad => ad.isActive).length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Advertisement List */}
          <Card>
            <CardHeader>
                <CardTitle>Advertisement Performance</CardTitle>
            </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {props.advertisements.map((ad) => (
                    <div key={ad.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm">{ad.title}</h3>
                        <Badge variant={ad.isActive ? 'default' : 'secondary'} className="text-xs">
                          {ad.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-5 gap-2 text-xs">
                      <div>
                          <p className="text-muted-foreground">Impressions</p>
                          <p className="font-semibold">{ad.impressions.toLocaleString()}</p>
                      </div>
                        <div>
                          <p className="text-muted-foreground">Views</p>
                          <p className="font-semibold">{ad.views.toLocaleString()}</p>
                    </div>
                        <div>
                          <p className="text-muted-foreground">Clicks</p>
                          <p className="font-semibold">{ad.clicks.toLocaleString()}</p>
                    </div>
                        <div>
                          <p className="text-muted-foreground">CTR</p>
                          <p className="font-semibold">{ad.clickThroughRate.toFixed(2)}%</p>
                </div>
                        <div>
                          <p className="text-muted-foreground">Revenue</p>
                          <p className="font-semibold">${ad.totalSpent.toLocaleString()}</p>
              </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Course Management Sections */}
        {props.selectedView === 'courses-published' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Published Courses</h2>
            {props.courses.filter(c => c.isPublished).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Play className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No published courses</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {props.courses.filter(c => c.isPublished).map((course) => (
                  <Card key={course.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-3 flex-1">
                          <img src={course.thumbnail} alt={course.title} className="w-16 h-16 object-cover rounded" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{course.title}</h3>
                            <p className="text-sm text-muted-foreground truncate">{course.description}</p>
                            <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                              <span>{course.instructor.name}</span>
                              <span>•</span>
                              <span>${course.price}</span>
                      </div>
                    </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => props.handleCourseUnpublish(course.id)}>Unpublish</Button>
                          <Button variant="destructive" size="sm" onClick={() => props.handleCourseDelete(course.id)}>Delete</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {props.selectedView === 'courses-draft' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Draft Courses</h2>
            {props.courses.filter(c => !c.isPublished).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Edit className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No draft courses</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {props.courses.filter(c => !c.isPublished).map((course) => (
                  <Card key={course.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-3 flex-1">
                          <img src={course.thumbnail} alt={course.title} className="w-16 h-16 object-cover rounded" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{course.title}</h3>
                            <p className="text-sm text-muted-foreground truncate">{course.description}</p>
                            <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                              <span>{course.instructor.name}</span>
                              <span>•</span>
                              <span>${course.price}</span>
                        </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="default" size="sm" onClick={() => props.handleCoursePublish(course.id)}>Publish</Button>
                          <Button variant="destructive" size="sm" onClick={() => props.handleCourseDelete(course.id)}>Delete</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                    </div>
                  )}
                </div>
        )}

        {props.selectedView === 'course-submissions' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Course Submission Requests</h2>
            {props.courseSubmissions.filter(s => s.status === 'pending').length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <User className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No pending requests</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {props.courseSubmissions.filter(s => s.status === 'pending').map((submission) => (
                  <Card key={submission.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold mb-2">{submission.courseTitle}</h3>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{submission.courseDescription}</p>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div><strong>Company:</strong> {submission.companyName}</div>
                            <div><strong>Contact:</strong> {submission.contactName}</div>
                            <div><strong>Email:</strong> {submission.email}</div>
                            <div><strong>Category:</strong> {submission.courseCategory}</div>
                            </div>
                            </div>
                        <div className="flex flex-col gap-2">
                          <Button variant="default" size="sm" onClick={() => props.handleCourseSubmissionReview(submission.id, 'approved')}>Approve</Button>
                          <Button variant="destructive" size="sm" onClick={() => props.handleCourseSubmissionReview(submission.id, 'rejected')}>Reject</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

      {/* Upload Modal */}
      {props.showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center justify-between">
                Upload Content
                <Button variant="ghost" size="sm" onClick={() => props.setShowUploadModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pb-6">
                  <div className="space-y-4">
                  {/* Product Upload Form */}
                  <div className="space-y-4">
              <div className="space-y-2">
                      <Label htmlFor="product-title">Product Title *</Label>
                      <Input
                        id="product-title"
                        value={props.productTitle}
                        onChange={(e) => setProductTitle(e.target.value)}
                        placeholder="Enter product title..."
                      />
              </div>

              <div className="space-y-2">
                      <Label htmlFor="product-description">Product Description *</Label>
                      <Textarea
                        id="product-description"
                        value={props.productDescription}
                        onChange={(e) => setProductDescription(e.target.value)}
                        placeholder="Enter product description..."
                        rows={3}
                      />
              </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                        <Label htmlFor="product-price">Price *</Label>
                  <Input
                          id="product-price"
                          type="number"
                          step="0.01"
                          value={props.productPrice}
                          onChange={(e) => setProductPrice(e.target.value)}
                          placeholder="0.00"
                        />
                </div>
                      <div className="space-y-2">
                        <Label htmlFor="product-category">Category *</Label>
                        <Select value={productCategory} onValueChange={(value) => {
                          setProductCategory(value);
                          setProductSubcategory(value === 'art-prints' ? 'fine-art-prints' : 'art-history');
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="art-prints">Art Prints</SelectItem>
                            <SelectItem value="art-books">Art Books</SelectItem>
                          </SelectContent>
                        </Select>
                  </div>
              </div>

                    <div className="space-y-2">
                      <Label htmlFor="product-images">Product Images * (2-5 images on white background)</Label>
                      <Input
                        id="product-images"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setProductImages(files);
                        }}
                        className="h-12 file:mr-4 file:py-2 file:px-6 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80 file:cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground">
                        Upload 2-5 high-quality images of your product on a white background
                      </p>
                    </div>

              <Button
                      onClick={props.handleProductUpload}
                      disabled={props.isProductUploading || !props.productTitle.trim() || !props.productDescription.trim() || !props.productPrice.trim() || props.productImages.length < 2}
                      className="w-full h-12 text-base font-medium"
                      size="lg"
                    >
                      {props.isProductUploading ? (
                        <>
                          <Upload className="h-5 w-5 mr-2 animate-spin" />
                          Uploading Product...
                  </>
                ) : (
                  <>
                          <Package className="h-5 w-5 mr-2" />
                          Upload Product
                  </>
                )}
              </Button>
                  </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Advertising Upload Modal */}
      {props.showAdUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center justify-between">
                Upload Advertisement
                <Button variant="ghost" size="sm" onClick={() => props.setShowAdUploadModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pb-6">
          <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ad-title">Advertisement Title *</Label>
                  <Input
                    id="ad-title"
                    value={props.adTitle}
                    onChange={(e) => setAdTitle(e.target.value)}
                    placeholder="Enter advertisement title..."
                  />
              </div>

                <div className="space-y-2">
                  <Label htmlFor="ad-description">Description *</Label>
                  <Textarea
                    id="ad-description"
                    value={props.adDescription}
                    onChange={(e) => setAdDescription(e.target.value)}
                    placeholder="Enter advertisement description..."
                    rows={3}
                  />
            </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="advertiser-name">Advertiser Name *</Label>
                    <Input
                      id="advertiser-name"
                      value={props.advertiserName}
                      onChange={(e) => setAdvertiserName(e.target.value)}
                      placeholder="Enter advertiser name..."
                    />
                          </div>
                  <div className="space-y-2">
                    <Label htmlFor="advertiser-website">Advertiser Website</Label>
                    <Input
                      id="advertiser-website"
                      value={advertiserWebsite}
                      onChange={(e) => setAdvertiserWebsite(e.target.value)}
                      placeholder="https://example.com"
                    />
                            </div>
                            </div>

                <div className="space-y-2">
                  <Label htmlFor="ad-media">Advertisement Media * (Video/Image)</Label>
                  <Input
                    id="ad-media"
                    type="file"
                    accept="video/*,image/*"
                    onChange={(e) => setAdMediaFile(e.target.files?.[0] || null)}
                    className="h-12 file:mr-4 file:py-2 file:px-6 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80 file:cursor-pointer"
                  />
                          </div>

                <div className="space-y-2">
                  <Label htmlFor="ad-thumbnail">Thumbnail (optional)</Label>
                  <Input
                    id="ad-thumbnail"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAdThumbnailFile(e.target.files?.[0] || null)}
                    className="h-12 file:mr-4 file:py-2 file:px-6 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80 file:cursor-pointer"
                  />
                            </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ad-duration">Duration (seconds)</Label>
                    <Input
                      id="ad-duration"
                      type="number"
                      value={adDuration}
                      onChange={(e) => setAdDuration(e.target.value)}
                      placeholder="30"
                    />
                            </div>
                  <div className="space-y-2">
                    <Label htmlFor="ad-budget">Budget ($)</Label>
                    <Input
                      id="ad-budget"
                      type="number"
                      step="0.01"
                      value={adBudget}
                      onChange={(e) => setAdBudget(e.target.value)}
                      placeholder="1000.00"
                    />
                            </div>
                  <div className="space-y-2">
                    <Label htmlFor="ad-start-date">Start Date</Label>
                    <Input
                      id="ad-start-date"
                      type="date"
                      value={adStartDate}
                      onChange={(e) => setAdStartDate(e.target.value)}
                    />
                        </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ad-end-date">End Date</Label>
                  <Input
                    id="ad-end-date"
                    type="date"
                    value={adEndDate}
                    onChange={(e) => setAdEndDate(e.target.value)}
                  />
                </div>

                          <Button
                  onClick={props.handleAdUpload}
                  disabled={props.isAdUploading || !props.adMediaFile || !props.adTitle.trim() || !props.adDescription.trim() || !props.advertiserName.trim()}
                  className="w-full h-12 text-base font-medium"
                  size="lg"
                >
                  {props.isAdUploading ? (
                    <>
                      <Upload className="h-5 w-5 mr-2 animate-spin" />
                      Uploading Advertisement...
                    </>
                  ) : (
                    <>
                      <Megaphone className="h-5 w-5 mr-2" />
                      Upload Advertisement
                            </>
                          )}
                </Button>
                      </div>
                    </CardContent>
                  </Card>
              </div>
            )}

      {/* Request Detail Modal */}
      {props.selectedRequest && (
        <AlertDialog open={!!props.selectedRequest} onOpenChange={() => props.setSelectedRequest(null)}>
          <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={props.selectedRequest.user.avatarUrl || undefined} alt={props.selectedRequest.user.displayName} />
                  <AvatarFallback>{props.selectedRequest.user.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div>{props.selectedRequest.user.displayName}</div>
                  <div className="text-sm font-normal text-muted-foreground">@{props.selectedRequest.user.username}</div>
                </div>
              </AlertDialogTitle>
            </AlertDialogHeader>

            <div className="space-y-6">
              {/* Portfolio Images */}
              {props.selectedRequest.portfolioImages.length > 0 && (
              <div>
                  <Label className="text-base font-semibold">Portfolio Images</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                  {props.selectedRequest.portfolioImages.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Portfolio ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                    />
                  ))}
                </div>
              </div>
              )}

              {/* Artist Statement */}
              {props.selectedRequest.artistStatement && (
              <div>
                  <Label className="text-base font-semibold">Artist Statement</Label>
                  <p className="mt-2 text-sm text-muted-foreground">{props.selectedRequest.artistStatement}</p>
              </div>
              )}

              {/* Experience */}
                <div>
                <Label className="text-base font-semibold">Experience</Label>
                <p className="mt-2 text-sm text-muted-foreground">{props.selectedRequest.experience}</p>
                </div>

              {/* Social Links */}
              {props.selectedRequest.socialLinks && (
                <div>
                  <Label className="text-base font-semibold">Social Links</Label>
                  <div className="mt-2 space-y-2">
                    {props.selectedRequest.socialLinks.website && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <span className="text-sm">Website: {props.selectedRequest.socialLinks.website}</span>
                      </div>
                    )}
                    {props.selectedRequest.socialLinks.instagram && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <span className="text-sm">Instagram: {props.selectedRequest.socialLinks.instagram}</span>
                      </div>
                    )}
                    {props.selectedRequest.socialLinks.x && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <span className="text-sm">X: {props.selectedRequest.socialLinks.x}</span>
                      </div>
                    )}
                    {props.selectedRequest.socialLinks.tiktok && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <span className="text-sm">TikTok: {props.selectedRequest.socialLinks.tiktok}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <Label htmlFor="adminNotes">Admin Notes</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes about this request..."
                  rows={3}
                />
              </div>

              {/* Rejection Reason (only for pending requests) */}
              {props.selectedRequest.status === 'pending' && (
                <div>
                  <Label htmlFor="props.rejectionReason">Rejection Reason (if rejecting)</Label>
                  <Textarea
                    id="props.rejectionReason"
                    value={props.rejectionReason}
                    onChange={(e) => props.setRejectionReason(e.target.value)}
                    placeholder="Provide a reason for rejection..."
                    rows={3}
                  />
                </div>
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => props.setSelectedRequest(null)}>
                Close
              </AlertDialogCancel>
              {props.selectedRequest.status === 'pending' && (
                <>
                  <AlertDialogAction
                    onClick={() => props.handleReject(props.selectedRequest)}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={props.isProcessing}
                  >
                    {props.isProcessing ? 'Rejecting...' : 'Reject'}
                  </AlertDialogAction>
                  <AlertDialogAction
                    onClick={() => props.handleApprove(props.selectedRequest)}
                    disabled={props.isProcessing}
                  >
                    {props.isProcessing ? 'Approving...' : 'Approve'}
                  </AlertDialogAction>
                </>
              )}
              {props.selectedRequest.status === 'approved' && props.selectedRequest.portfolioImages && props.selectedRequest.portfolioImages.length > 0 && (
                <AlertDialogAction
                  onClick={() => {
                    props.handleTransferPortfolio(props.selectedRequest);
                    props.setSelectedRequest(null);
                  }}
                  disabled={props.isProcessing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {props.isProcessing ? 'Transferring...' : 'Transfer Portfolio Images'}
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
        </div>
      )}
    </div>
  );
}