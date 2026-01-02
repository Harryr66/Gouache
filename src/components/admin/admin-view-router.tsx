'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { X, Eye, Clock, User, Users, Calendar, ExternalLink, Upload, Plus, Megaphone, Trash2, Edit, Package, ShoppingCart, Link, Image, Play, Pause, BarChart3, AlertCircle, BadgeCheck, ChevronUp, ChevronDown, Sparkles, Loader2, GripVertical, Type, ImageIcon, Check, Bold, Heading2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ArtistInviteConsole } from '@/components/admin/artist-invite-console';
import { useRouter } from 'next/navigation';
import { ArtistRequest, AdvertisingApplication, MarketplaceProduct, AffiliateProductRequest, Advertisement, AdvertisementAnalytics, Course, CourseSubmission, NewsArticle, UserReport, Report } from '@/lib/types';
import { doc, updateDoc, serverTimestamp, deleteDoc, getDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { toast, useToast } from '@/hooks/use-toast';
import { migratePortfoliosToCollection, checkMigrationStatus } from '@/lib/migrate-portfolio';

export function AdminViewRouter(props: any) {
  const router = useRouter();
  
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
                    {props.professionalArtists.map((artist: any) => (
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
                                  props.setProfessionalArtists((prev: any[]) =>
                                    prev.map((a: any) => a.id === artist.id ? { ...a, isVerified: checked } : a)
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
                  props.approvedRequests.map((request: any) => (
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
                          {props.handleConvertToProfessional && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => props.handleConvertToProfessional(request)}
                              disabled={props.isProcessing}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Convert to Professional
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
                  props.suspendedRequests.map((request: any) => (
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
              {props.pendingRequests.map((request: any) => (
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
                              <p><strong>Experience:</strong> {request.experience || 'Not provided'}</p>
                              {(request.socialLinks?.instagram || request.socialLinks?.x || request.socialLinks?.tiktok || request.socialLinks?.website) && (
                                <div className="mt-2 space-y-1">
                                  <p><strong>Social Links:</strong></p>
                                  {request.socialLinks?.instagram && (
                                    <p className="text-xs">Instagram: <a href={request.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{request.socialLinks.instagram}</a></p>
                                  )}
                                  {request.socialLinks?.x && (
                                    <p className="text-xs">X: <a href={request.socialLinks.x} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{request.socialLinks.x}</a></p>
                                  )}
                                  {request.socialLinks?.tiktok && (
                                    <p className="text-xs">TikTok: <a href={request.socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{request.socialLinks.tiktok}</a></p>
                                  )}
                                  {request.socialLinks?.website && (
                                    <p className="text-xs">Website: <a href={request.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{request.socialLinks.website}</a></p>
                                  )}
                                </div>
                              )}
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
              {props.approvedRequests.map((request: any) => (
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
                        {props.handleConvertToProfessional && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => props.handleConvertToProfessional(request)}
                            disabled={props.isProcessing}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Convert to Professional
                          </Button>
                        )}
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
              {props.suspendedRequests.map((request: any) => (
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
              {props.rejectedRequests.map((request: any) => (
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
                      onChange={(event) => props.setNewArticle((prev: any) => ({ ...prev, title: event.target.value }))}
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
                    <Label htmlFor="artist-avatar">Artist Profile Image (optional)</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload a profile image for the artist. This will appear in the bottom left of the hero image.
                    </p>
                    {props.newArticleAuthorAvatarPreview ? (
                      <div className="relative">
                        <img
                          src={props.newArticleAuthorAvatarPreview}
                          alt="Artist avatar preview"
                          className="w-24 h-24 object-cover rounded-full border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-0 right-0 h-6 w-6"
                          onClick={props.clearAuthorAvatar}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          id="artist-avatar"
                          type="file"
                          accept="image/*"
                          onChange={props.handleAuthorAvatarChange}
                          className="cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="article-thumbnail">News Page Thumbnail (optional)</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload a thumbnail image for the news page listing. This will appear in the article card on the news page.
                    </p>
                    {props.newArticleThumbnailPreview ? (
                      <div className="relative">
                        <img
                          src={props.newArticleThumbnailPreview}
                          alt="Thumbnail preview"
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={props.clearThumbnail}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          id="article-thumbnail"
                          type="file"
                          accept="image/*"
                          onChange={props.handleThumbnailChange}
                          className="cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hero-image">Hero Image</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload a hero image that will appear at the top of the article (optional).
                    </p>
                    {props.newArticleImagePreview ? (
                      <div className="relative">
                        <img
                          src={props.newArticleImagePreview}
                          alt="Hero preview"
                          className="w-full h-64 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={props.clearNewsArticleImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          id="hero-image"
                          type="file"
                          accept="image/*"
                          onChange={props.handleNewsArticleImageChange}
                          className="cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                    <Label htmlFor="article-body-editor">Article Body *</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const editor = document.getElementById('article-body-editor') as HTMLDivElement;
                            if (!editor) return;
                            
                            // Make selected text bold
                            document.execCommand('bold', false);
                            editor.focus();
                          }}
                          title="Bold"
                        >
                          <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const editor = document.getElementById('article-body-editor') as HTMLDivElement;
                            if (!editor) return;
                            
                            const selection = window.getSelection();
                            if (selection && selection.rangeCount > 0) {
                              const range = selection.getRangeAt(0);
                              
                              // Check if text is selected
                              if (range.collapsed) {
                                // No text selected - insert a new heading
                                const heading = document.createElement('h2');
                                heading.textContent = 'Subheading';
                                heading.style.fontSize = '1.5rem';
                                heading.style.fontWeight = 'bold';
                                heading.style.marginTop = '1.5rem';
                                heading.style.marginBottom = '0.75rem';
                                range.insertNode(heading);
                                
                                // Place cursor after the heading
                                range.setStartAfter(heading);
                                range.collapse(true);
                                selection.removeAllRanges();
                                selection.addRange(range);
                              } else {
                                // Text is selected - wrap it in a heading
                                const contents = range.extractContents();
                                const heading = document.createElement('h2');
                                heading.appendChild(contents);
                                heading.style.fontSize = '1.5rem';
                                heading.style.fontWeight = 'bold';
                                heading.style.marginTop = '1.5rem';
                                heading.style.marginBottom = '0.75rem';
                                range.insertNode(heading);
                                
                                // Select the heading
                                range.selectNodeContents(heading);
                                selection.removeAllRanges();
                                selection.addRange(range);
                              }
                            }
                            editor.focus();
                          }}
                          title="Subheading (H2)"
                        >
                          <Heading2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Trigger file input
                            const fileInput = document.getElementById('insert-image-input') as HTMLInputElement;
                            if (fileInput) {
                              fileInput.click();
                            }
                          }}
                          title="Insert Image"
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                        <input
                          id="insert-image-input"
                          type="file"
                          accept="image/*"
                          onChange={props.handleInsertImage}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const editor = document.getElementById('article-body-editor') as HTMLDivElement;
                            if (!editor) return;
                            
                            // Find all images with outline (selected images)
                            const allImages = editor.querySelectorAll('.article-image');
                            const selectedImages: HTMLElement[] = [];
                            
                            allImages.forEach((img) => {
                              const imgEl = img as HTMLElement;
                              const outline = imgEl.style.outline || window.getComputedStyle(imgEl).outline;
                              if (outline && outline !== 'none' && outline.includes('solid')) {
                                selectedImages.push(imgEl);
                              }
                            });
                            
                            if (selectedImages.length > 0) {
                              // Align all selected images to left
                              selectedImages.forEach((selectedImage) => {
                                const wrapper = selectedImage.closest('.image-wrapper') as HTMLElement;
                                if (wrapper) {
                                  wrapper.style.textAlign = 'left';
                                  wrapper.style.marginLeft = '0';
                                  wrapper.style.marginRight = 'auto';
                                  wrapper.style.display = 'block';
                                  wrapper.style.width = 'fit-content';
                                  wrapper.style.maxWidth = '100%';
                                  // Align the image itself
                                  selectedImage.style.marginLeft = '0';
                                  selectedImage.style.marginRight = 'auto';
                                  selectedImage.style.display = 'block';
                                }
                              });
                            } else {
                              // Align text to left
                              document.execCommand('justifyLeft', false);
                            }
                            editor.focus();
                          }}
                          title="Align Left"
                        >
                          <Type className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const editor = document.getElementById('article-body-editor') as HTMLDivElement;
                            if (!editor) return;
                            
                            // Find all images with outline (selected images)
                            const allImages = editor.querySelectorAll('.article-image');
                            const selectedImages: HTMLElement[] = [];
                            
                            allImages.forEach((img) => {
                              const imgEl = img as HTMLElement;
                              const outline = imgEl.style.outline || window.getComputedStyle(imgEl).outline;
                              if (outline && outline !== 'none' && outline.includes('solid')) {
                                selectedImages.push(imgEl);
                              }
                            });
                            
                            if (selectedImages.length > 0) {
                              // Align all selected images to center
                              selectedImages.forEach((selectedImage) => {
                                const wrapper = selectedImage.closest('.image-wrapper') as HTMLElement;
                                if (wrapper) {
                                  // Clear any existing alignment
                                  wrapper.style.marginLeft = 'auto';
                                  wrapper.style.marginRight = 'auto';
                                  wrapper.style.textAlign = 'center';
                                  wrapper.style.display = 'block';
                                  wrapper.style.width = 'fit-content';
                                  wrapper.style.maxWidth = '100%';
                                  // Center the image itself
                                  selectedImage.style.display = 'block';
                                  selectedImage.style.marginLeft = 'auto';
                                  selectedImage.style.marginRight = 'auto';
                                  selectedImage.style.width = selectedImage.style.width || 'auto';
                                }
                              });
                            } else {
                              // Align text to center
                              document.execCommand('justifyCenter', false);
                            }
                            editor.focus();
                          }}
                          title="Align Center"
                        >
                          <Type className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const editor = document.getElementById('article-body-editor') as HTMLDivElement;
                            if (!editor) return;
                            
                            // Check if an image is selected
                            const selectedImages = editor.querySelectorAll('.article-image[style*="outline"]');
                            if (selectedImages.length > 0) {
                              const img = selectedImages[0] as HTMLImageElement;
                              const currentWidth = img.offsetWidth;
                              const newWidth = prompt('Enter image width in pixels (200-1200):', currentWidth.toString());
                              if (newWidth) {
                                const width = parseInt(newWidth);
                                if (!isNaN(width) && width >= 200 && width <= 1200) {
                                  const aspectRatio = img.naturalWidth / img.naturalHeight;
                                  img.style.width = `${width}px`;
                                  img.style.height = `${width / aspectRatio}px`;
                                  img.style.maxWidth = '100%';
                                } else {
                                  toast({
                                    title: 'Invalid size',
                                    description: 'Please enter a number between 200 and 1200.',
                                    variant: 'destructive'
                                  });
                                }
                              }
                            } else {
                              toast({
                                title: 'No image selected',
                                description: 'Please click on an image first to resize it.',
                                variant: 'destructive'
                              });
                            }
                            editor.focus();
                          }}
                          title="Resize Image"
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Paste images directly into the editor. Click images to select, then use alignment buttons. Use resize button or drag corner handle to resize.
                    </p>
                    <div
                      id="article-body-editor"
                      contentEditable
                      onPaste={props.handleBodyPaste}
                      onClick={props.handleEditorClick}
                      className="min-h-[500px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      style={{ whiteSpace: 'pre-wrap' }}
                      suppressContentEditableWarning
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    <AlertCircle className="h-3 w-3" />
                    <span>Your draft is automatically saved locally. Find saved drafts in the <strong>"Drafted"</strong> section below.</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto text-xs"
                      onClick={() => {
                        try {
                          const savedDraft = localStorage.getItem('gouache-article-draft');
                          if (savedDraft) {
                            const draft = JSON.parse(savedDraft);
                            if (draft.title || draft.body || draft.subheadline) {
                              props.setNewArticle({
                                title: draft.title || '',
                                summary: '',
                                category: draft.category || 'Stories',
                                author: draft.author || '',
                                authorAvatarUrl: draft.authorAvatarUrl || '',
                                imageUrl: draft.imageUrl || '',
                                externalUrl: '',
                                publishedAt: '',
                                tags: '',
                                location: draft.location || 'evergreen'
                              });
                              props.setNewArticleSubheadline(draft.subheadline || '');
                              props.setNewArticleBody(draft.body || '');
                              if (draft.imagePreview) {
                                props.setNewArticleImagePreview(draft.imagePreview);
                              }
                              if (draft.authorAvatarPreview) {
                                props.setNewArticleAuthorAvatarPreview(draft.authorAvatarPreview);
                              }
                              if (draft.thumbnailPreview) {
                                props.setNewArticleThumbnailPreview(draft.thumbnailPreview);
                              }
                              setTimeout(() => {
                                const bodyEditor = document.getElementById('article-body-editor') as HTMLDivElement;
                                if (bodyEditor && draft.body) {
                                  bodyEditor.innerHTML = draft.body;
                                }
                              }, 100);
                              toast({
                                title: 'Draft restored from backup',
                                description: 'Your local draft has been restored. Click "Save as Draft" to save it to the server.',
                              });
                            } else {
                              toast({
                                title: 'No local draft found',
                                description: 'There is no saved draft in your browser.',
                                variant: 'destructive'
                              });
                            }
                          } else {
                            toast({
                              title: 'No local draft found',
                              description: 'There is no saved draft in your browser.',
                              variant: 'destructive'
                            });
                          }
                        } catch (error) {
                          console.error('Failed to restore draft:', error);
                          toast({
                            title: 'Restore failed',
                            description: 'Could not restore draft from backup.',
                            variant: 'destructive'
                          });
                        }
                      }}
                    >
                      Restore from Backup
                    </Button>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline"
                      onClick={props.handleSaveDraftArticle} 
                      disabled={props.isPublishingArticle || !props.newArticle.title.trim()}
                    >
                      {props.isPublishingArticle ? 'Saving…' : 'Save as Draft'}
                    </Button>
                    {props.editingArticleId ? (
                      <Button 
                        onClick={props.handleUpdateArticle} 
                        disabled={props.isPublishingArticle || !props.newArticle.title.trim()}
                      >
                        {props.isPublishingArticle ? 'Updating…' : 'Update Article'}
                      </Button>
                    ) : (
                      <Button 
                        onClick={props.handleCreateNewsArticle} 
                        disabled={props.isPublishingArticle || !props.newArticle.title.trim()}
                      >
                    {props.isPublishingArticle ? 'Publishing…' : 'Publish article'}
                  </Button>
                    )}
                  </div>
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
                  {props.visibleNewsArticles.map((article: any) => (
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
                            {!article.archived && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                onClick={() => {
                                  if (props.handleEditArticle) {
                                    props.handleEditArticle(article);
                                      setTimeout(() => {
                                        document.getElementById('article-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                      }, 100);
                                    }
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                            )}
                            {article.status === 'draft' && !article.archived && (
                              <>
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
                {props.userReports.filter((r: any) => r.status === 'pending').length} pending
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
                {props.userReports.map((report: any) => (
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

        {/* AI Content Reports */}
        {props.selectedView === 'ai-content-reports' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">AI Content Reports</h2>
              <p className="text-muted-foreground mt-1">
                Reports of suspected AI-generated artwork. Review and take action on violations.
              </p>
            </div>

            {!props.contentReports || props.contentReports.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No AI content reports</h3>
                  <p className="text-muted-foreground">
                    No reports of suspected AI-generated content have been submitted yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {props.contentReports
                  .filter((report: Report) => report.isAIContentReport)
                  .map((report: Report) => (
                    <Card key={report.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="destructive">AI Content Report</Badge>
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
                          <span className="text-sm text-muted-foreground">
                            {new Date(report.timestamp).toLocaleDateString()} at{' '}
                            {new Date(report.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Content Type:</span> {report.contentType}
                            </div>
                            <div>
                              <span className="font-medium">Reported By:</span> {report.reportedBy}
                            </div>
                            <div>
                              <span className="font-medium">Content ID:</span>{' '}
                              <code className="text-xs bg-muted px-1 rounded">{report.contentId}</code>
                            </div>
                            <div>
                              <span className="font-medium">Offender:</span> {report.offenderHandle}
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <Label className="text-sm font-medium mb-2 block">Report Reason</Label>
                          <div className="p-3 bg-destructive/10 rounded-lg mb-2">
                            <p className="text-sm font-semibold text-destructive">{report.reason}</p>
                          </div>
                          {report.details && (
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <p className="text-sm whitespace-pre-wrap">{report.details}</p>
                            </div>
                          )}
                        </div>

                        <div className="border-t pt-4">
                          <Label className="text-sm font-medium mb-2 block">Content</Label>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm">{report.content}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-4 border-t">
                          {report.status === 'pending' && (
                            <>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await updateDoc(doc(db, 'contentReports', report.id), {
                                      status: 'resolved',
                                      reviewedBy: props.user?.displayName || 'Admin',
                                      reviewedAt: serverTimestamp(),
                                    });
                                    toast({
                                      title: 'Report resolved',
                                      description: 'AI content report has been marked as resolved.',
                                    });
                                  } catch (error) {
                                    console.error('Error updating report:', error);
                                    toast({
                                      title: 'Error',
                                      description: 'Failed to update report status.',
                                      variant: 'destructive',
                                    });
                                  }
                                }}
                              >
                                Suspend User
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await updateDoc(doc(db, 'contentReports', report.id), {
                                      status: 'dismissed',
                                      reviewedBy: props.user?.displayName || 'Admin',
                                      reviewedAt: serverTimestamp(),
                                    });
                                    toast({
                                      title: 'Report dismissed',
                                      description: 'AI content report has been dismissed.',
                                    });
                                  } catch (error) {
                                    console.error('Error updating report:', error);
                                    toast({
                                      title: 'Error',
                                      description: 'Failed to update report status.',
                                      variant: 'destructive',
                                    });
                                  }
                                }}
                              >
                                Dismiss
                              </Button>
                            </>
                          )}
                          {report.status !== 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await updateDoc(doc(db, 'contentReports', report.id), {
                                    status: 'pending',
                                    reviewedBy: undefined,
                                    reviewedAt: undefined,
                                  });
                                  toast({
                                    title: 'Report reopened',
                                    description: 'AI content report has been reopened.',
                                  });
                                } catch (error) {
                                  console.error('Error updating report:', error);
                                  toast({
                                    title: 'Error',
                                    description: 'Failed to update report status.',
                                    variant: 'destructive',
                                  });
                                }
                              }}
                            >
                              Reopen
                            </Button>
                          )}
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
              {props.marketplaceProducts.map((product: any) => (
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
                          onClick={() => {
                            if (props.setSelectedProduct) {
                              props.setSelectedProduct(product);
                            }
                          }}
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
          props.marketplaceProducts.filter((p: any) => p.isActive).length === 0 ? (
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
              {props.marketplaceProducts.filter((p: any) => p.isActive).map((product: any) => (
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
                          onClick={() => {
                            if (props.setSelectedProduct) {
                              props.setSelectedProduct(product);
                            }
                          }}
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
          props.affiliateRequests.filter((req: any) => req.status === 'pending').length === 0 ? (
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
              {props.affiliateRequests.filter((req: any) => req.status === 'pending').map((request: any) => (
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
                          onClick={() => {
                            if (props.setSelectedAffiliateRequest) {
                              props.setSelectedAffiliateRequest(request);
                            }
                          }}
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
          props.advertisingApplications.filter((app: any) => app.status === 'pending').length === 0 ? (
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
              {props.advertisingApplications.filter((app: any) => app.status === 'pending').map((application: any) => (
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
              {props.advertisements.map((ad: any) => (
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
                          onClick={() => {
                            if (props.setSelectedAdvertisement) {
                              props.setSelectedAdvertisement(ad);
                            }
                          }}
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
                  <p className="text-xl font-bold">{props.advertisements.reduce((sum: any, ad: any) => sum + ad.impressions, 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Views</p>
                  <p className="text-xl font-bold">{props.advertisements.reduce((sum: any, ad: any) => sum + ad.views, 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Clicks</p>
                  <p className="text-xl font-bold">{props.advertisements.reduce((sum: any, ad: any) => sum + ad.clicks, 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Active Ads</p>
                  <p className="text-xl font-bold">{props.advertisements.filter((ad: any) => ad.isActive).length}</p>
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
                  {props.advertisements.map((ad: any) => (
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
        {/* Artist Request Detail Dialog */}
        <Dialog open={!!props.selectedRequest} onOpenChange={(open) => !open && props.setSelectedRequest(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Artist Request Details</DialogTitle>
              <DialogDescription>
                Full details for {props.selectedRequest?.user.displayName || 'artist request'}
              </DialogDescription>
            </DialogHeader>
            {props.selectedRequest && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={props.selectedRequest.user.avatarUrl || ''} />
                    <AvatarFallback>
                      {props.selectedRequest.user.displayName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{props.selectedRequest.user.displayName}</h3>
                    <p className="text-muted-foreground">{props.selectedRequest.user.email}</p>
                    <Badge variant="outline" className="mt-1">
                      {props.selectedRequest.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Contact Information</h4>
                      <p className="text-sm"><strong>Email:</strong> {props.selectedRequest.user.email}</p>
                      {props.selectedRequest.socialLinks && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-semibold">Social Links:</p>
                          {props.selectedRequest.socialLinks.instagram && (
                            <p className="text-sm">Instagram: <a href={props.selectedRequest.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{props.selectedRequest.socialLinks.instagram}</a></p>
                          )}
                          {props.selectedRequest.socialLinks.x && (
                            <p className="text-sm">X: <a href={props.selectedRequest.socialLinks.x} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{props.selectedRequest.socialLinks.x}</a></p>
                          )}
                          {props.selectedRequest.socialLinks.tiktok && (
                            <p className="text-sm">TikTok: <a href={props.selectedRequest.socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{props.selectedRequest.socialLinks.tiktok}</a></p>
                          )}
                          {props.selectedRequest.socialLinks.website && (
                            <p className="text-sm">Website: <a href={props.selectedRequest.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{props.selectedRequest.socialLinks.website}</a></p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Submission Details</h4>
                      <p className="text-sm"><strong>Submitted:</strong> {props.selectedRequest.submittedAt instanceof Date ? props.selectedRequest.submittedAt.toLocaleDateString() : (props.selectedRequest.submittedAt as any)?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                      <p className="text-sm"><strong>Portfolio Images:</strong> {props.selectedRequest.portfolioImages.length}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {props.selectedRequest.experience && (
                      <div>
                        <h4 className="font-semibold mb-2">Experience</h4>
                        <p className="text-sm whitespace-pre-wrap">{props.selectedRequest.experience}</p>
                      </div>
                    )}
                    {props.selectedRequest.artistStatement && (
                      <div>
                        <h4 className="font-semibold mb-2">Artist Statement</h4>
                        <p className="text-sm whitespace-pre-wrap">{props.selectedRequest.artistStatement}</p>
                      </div>
                    )}
                  </div>
                </div>

                {props.selectedRequest.portfolioImages.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-4">Portfolio Images</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {props.selectedRequest.portfolioImages.map((imageUrl: string, index: number) => (
                        <div key={index} className="relative aspect-square">
                          <img
                            src={imageUrl}
                            alt={`Portfolio ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg border"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => props.handleApprove(props.selectedRequest)}
                    disabled={props.isProcessing}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      props.setRejectionReason('');
                      props.setSelectedRequest(null);
                    }}
                    disabled={props.isProcessing}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      {/* Portfolio Migration Tool */}
      {props.selectedView === 'portfolio-migration' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Migration Tool</CardTitle>
              <CardDescription>
                Migrate portfolio items from userProfiles.portfolio arrays to the new portfolioItems collection.
                This improves query performance and scalability.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <PortfolioMigrationTool />
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}

// Portfolio Migration Tool Component
function PortfolioMigrationTool() {
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<string>('');
  const [migrationResults, setMigrationResults] = useState<any>(null);
  const [batchSize, setBatchSize] = useState(10);
  const { toast } = useToast();

  const checkStatus = async () => {
    setIsChecking(true);
    setMigrationProgress('Checking migration status...');
    try {
      const status = await checkMigrationStatus();
      setMigrationStatus(status);
      setMigrationProgress('');
      toast({
        title: "Status checked",
        description: `Found ${status.usersWithPortfolios} users with portfolios, ${status.usersMigrated} already migrated.`,
      });
    } catch (error: any) {
      console.error('Error checking migration status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to check migration status",
        variant: "destructive"
      });
      setMigrationProgress('');
    } finally {
      setIsChecking(false);
    }
  };

  const runDryRun = async () => {
    setIsMigrating(true);
    setMigrationProgress('Running dry run (no changes will be made)...');
    setMigrationResults(null);
    try {
      const results = await migratePortfoliosToCollection(batchSize, true);
      setMigrationResults(results);
      setMigrationProgress('');
      toast({
        title: "Dry run complete",
        description: `Would migrate ${results.totalItemsMigrated} items from ${results.usersWithPortfolios} users.`,
      });
    } catch (error: any) {
      console.error('Error running dry run:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to run dry run",
        variant: "destructive"
      });
      setMigrationProgress('');
    } finally {
      setIsMigrating(false);
    }
  };

  const runMigration = async () => {
    if (!confirm('⚠️ Are you sure you want to run the migration? This will create portfolioItems documents. Make sure you have a backup!')) {
      return;
    }

    setIsMigrating(true);
    setMigrationProgress('Starting migration...');
    setMigrationResults(null);
    try {
      const results = await migratePortfoliosToCollection(batchSize, false);
      setMigrationResults(results);
      setMigrationProgress('');
      toast({
        title: "Migration complete",
        description: `Migrated ${results.totalItemsMigrated} items from ${results.usersWithPortfolios} users.`,
      });
      
      // Refresh status
      await checkStatus();
    } catch (error: any) {
      console.error('Error running migration:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to run migration",
        variant: "destructive"
      });
      setMigrationProgress('');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Check */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Migration Status</h3>
            <p className="text-sm text-muted-foreground">Check current migration status</p>
          </div>
          <Button onClick={checkStatus} disabled={isChecking}>
            {isChecking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Check Status
          </Button>
        </div>

        {migrationStatus && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{migrationStatus.totalUsers}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Users with Portfolios</p>
                  <p className="text-2xl font-bold">{migrationStatus.usersWithPortfolios}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Users Migrated</p>
                  <p className="text-2xl font-bold">{migrationStatus.usersMigrated}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Portfolio Items</p>
                  <p className="text-2xl font-bold">{migrationStatus.totalPortfolioItems}</p>
                </div>
                <div className="col-span-2 md:col-span-4">
                  <p className="text-sm text-muted-foreground">Items in portfolioItems Collection</p>
                  <p className="text-2xl font-bold">{migrationStatus.totalMigratedItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Migration Controls */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Run Migration</h3>
          <p className="text-sm text-muted-foreground mb-4">
            ⚠️ Always run a dry run first to preview what will be migrated.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="batchSize">Batch Size (users per batch)</Label>
          <Input
            id="batchSize"
            type="number"
            min="1"
            max="50"
            value={batchSize}
            onChange={(e) => setBatchSize(parseInt(e.target.value) || 10)}
            disabled={isMigrating}
          />
          <p className="text-xs text-muted-foreground">
            Smaller batches are safer but slower. Recommended: 10-20.
          </p>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={runDryRun}
            disabled={isMigrating}
            variant="outline"
          >
            {isMigrating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Run Dry Run
          </Button>
          <Button
            onClick={runMigration}
            disabled={isMigrating || !migrationResults}
            variant="default"
          >
            {isMigrating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Run Migration
          </Button>
        </div>

        {migrationProgress && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">{migrationProgress}</p>
          </div>
        )}

        {migrationResults && (
          <Card>
            <CardHeader>
              <CardTitle>Migration Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Items Migrated</p>
                  <p className="text-xl font-bold">{migrationResults.totalItemsMigrated}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Items Skipped</p>
                  <p className="text-xl font-bold">{migrationResults.itemsSkipped}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Users with Portfolios</p>
                  <p className="text-xl font-bold">{migrationResults.usersWithPortfolios}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Errors</p>
                  <p className="text-xl font-bold text-destructive">{migrationResults.errors.length}</p>
                </div>
              </div>
              {migrationResults.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-destructive mb-2">Errors:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {migrationResults.errors.map((error: string, index: number) => (
                      <p key={index} className="text-xs text-destructive">{error}</p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ol className="list-decimal list-inside space-y-2">
            <li>Click "Check Status" to see current migration state</li>
            <li>Click "Run Dry Run" to preview what will be migrated (no changes made)</li>
            <li>Review the dry run results</li>
            <li>If everything looks good, click "Run Migration" to perform the actual migration</li>
            <li>After migration, verify in Firebase Console that portfolioItems collection has documents</li>
            <li>Test the app to ensure everything still works</li>
          </ol>
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="font-semibold text-yellow-800 dark:text-yellow-200">⚠️ Important:</p>
            <ul className="list-disc list-inside mt-2 text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>Migration is safe - original data in userProfiles.portfolio is NOT deleted</li>
              <li>If migration fails, the app will automatically fall back to userProfiles.portfolio</li>
              <li>New uploads are already writing to portfolioItems collection</li>
              <li>You can run migration multiple times - it will skip already migrated items</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
