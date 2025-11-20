'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { X, Eye, Clock, User, Users, Calendar, ExternalLink, Upload, Video, Plus, Megaphone, Trash2, Edit, Package, ShoppingCart, Link, Image, Play, Pause, BarChart3, AlertCircle, BadgeCheck, ChevronUp, ChevronDown, Sparkles, Loader2, GripVertical, Type, ImageIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ArtistInviteConsole } from '@/components/admin/artist-invite-console';
import { useRouter } from 'next/navigation';
import { ArtistRequest, Episode, AdvertisingApplication, MarketplaceProduct, AffiliateProductRequest, Advertisement, AdvertisementAnalytics, Course, CourseSubmission, NewsArticle, UserReport } from '@/lib/types';
import { doc, updateDoc, serverTimestamp, deleteDoc, getDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

// This is a large component - props interface will be defined where it's used
export function AdminMainContent(props: any) {
  const router = useRouter();
  
  // Use props directly to avoid parser issues with large destructuring
  const {
    handleSignOut,
    selectedView,
    setSelectedView,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    suspendedRequests,
    activeNewsArticles,
    archivedNewsArticles,
    publishedArticles,
    draftedArticles,
    visibleNewsArticles,
    showArchivedNews,
    setShowArchivedNews,
    showDraftedArticles,
    setShowDraftedArticles,
    episodes,
    marketplaceProducts,
    affiliateRequests,
    userReports,
    advertisingApplications,
    advertisements,
    advertisementAnalytics,
    courses,
    courseSubmissions,
    newsArticles,
    professionalArtists,
    loadingArtists,
    isProcessing,
    selectedRequest,
    setSelectedRequest,
    handleApprove,
    handleReject,
    handleRemoveArtist,
    handleTransferPortfolio,
    handleSuspendArtist,
    handleReinstateArtist,
    handleApproveAdApplication,
    handleRejectAdApplication,
    handleVideoUpload,
    handleProductUpload,
    handleAdUpload,
    handleDeleteProduct,
    handleApproveAffiliateRequest,
    handleRejectAffiliateRequest,
    handleDeleteEpisode,
    handleCreateNewsArticle,
    handleArchiveNewsArticle,
    handleDeleteNewsArticle,
    handleUpdateReportStatus,
    handleCoursePublish,
    handleCourseUnpublish,
    handleCourseSubmissionReview,
    handleCourseDelete,
    formatDate,
    getStatusBadge,
    user,
    setShowAdUploadModal,
    setShowUploadModal,
    setNewArticle,
    setNewArticleSubheadline,
    setRejectionReason,
    setProfessionalArtists,
    handleBodyPaste,
    handleNewsArticleImageChange,
    clearNewsArticleImage,
    newArticle,
    newArticleSubheadline,
    newArticleImagePreview,
    newArticleImageFile
  } = props;
  
  return (
    <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
        <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2">
          <X className="h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {/* Professional Verification */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Professional Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => setSelectedView('artist-management')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'artist-management' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                Manage Artists
              </span>
              <Badge variant={selectedView === 'artist-management' ? 'secondary' : 'outline'}>
                ({approvedRequests.length})
              </Badge>
            </button>
            <button
              onClick={() => setSelectedView('artist-pending')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'artist-pending' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Pending</span>
              <Badge variant={selectedView === 'artist-pending' ? 'secondary' : 'outline'}>({pendingRequests.length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('artist-approved')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'artist-approved' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Approved</span>
              <Badge variant={selectedView === 'artist-approved' ? 'secondary' : 'outline'}>({approvedRequests.length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('artist-rejected')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'artist-rejected' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Rejected</span>
              <Badge variant={selectedView === 'artist-rejected' ? 'secondary' : 'outline'}>({rejectedRequests.length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('artist-suspended')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'artist-suspended' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Suspended</span>
              <Badge variant={selectedView === 'artist-suspended' ? 'secondary' : 'outline'}>({suspendedRequests.length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('artist-invites')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'artist-invites' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Invite Console</span>
              <Badge variant={selectedView === 'artist-invites' ? 'secondary' : 'outline'}>New</Badge>
            </button>
          </CardContent>
        </Card>

        {/* Newsroom */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Newsroom
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => setSelectedView('news-articles')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'news-articles' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Articles</span>
              <Badge variant={selectedView === 'news-articles' ? 'secondary' : 'outline'}>
                ({activeNewsArticles.length})
              </Badge>
            </button>
          </CardContent>
        </Card>

        {/* Episodes */}
              <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="h-4 w-4" />
              Episodes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => setSelectedView('episodes-all')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'episodes-all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Episodes</span>
              <Badge variant={selectedView === 'episodes-all' ? 'secondary' : 'outline'}>({episodes.length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('episodes-drafts')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'episodes-drafts' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Drafts</span>
              <Badge variant={selectedView === 'episodes-drafts' ? 'secondary' : 'outline'}>(0)</Badge>
            </button>
            <button
              onClick={() => setSelectedView('episodes-archived')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'episodes-archived' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Archived</span>
              <Badge variant={selectedView === 'episodes-archived' ? 'secondary' : 'outline'}>(0)</Badge>
            </button>
          </CardContent>
        </Card>

        {/* Marketplace */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Gallery
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => setSelectedView('marketplace-products')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'marketplace-products' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Products</span>
              <Badge variant={selectedView === 'marketplace-products' ? 'secondary' : 'outline'}>({marketplaceProducts.length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('marketplace-requests')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'marketplace-requests' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Requests</span>
              <Badge variant={selectedView === 'marketplace-requests' ? 'secondary' : 'outline'}>({affiliateRequests.filter(req => req.status === 'pending').length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('marketplace-archived')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'marketplace-archived' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Archived</span>
              <Badge variant={selectedView === 'marketplace-archived' ? 'secondary' : 'outline'}>(0)</Badge>
            </button>
          </CardContent>
        </Card>

        {/* Marketplace Products */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-4 w-4" />
              Marketplace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => setSelectedView('marketplace-products')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'marketplace-products' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">All Products</span>
              <Badge variant={selectedView === 'marketplace-products' ? 'secondary' : 'outline'}>({marketplaceProducts.length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('marketplace-active')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'marketplace-active' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Active Products</span>
              <Badge variant={selectedView === 'marketplace-active' ? 'secondary' : 'outline'}>({marketplaceProducts.filter(p => p.isActive).length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('marketplace-requests')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'marketplace-requests' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Product Requests</span>
              <Badge variant={selectedView === 'marketplace-requests' ? 'secondary' : 'outline'}>({affiliateRequests.filter(req => req.status === 'pending').length})</Badge>
            </button>
          </CardContent>
        </Card>

        {/* User Reports */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              User Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => setSelectedView('user-reports')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'user-reports' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Reports</span>
              <Badge variant={selectedView === 'user-reports' ? 'secondary' : 'outline'}>
                ({userReports.filter(r => r.status === 'pending').length})
              </Badge>
            </button>
          </CardContent>
        </Card>

        {/* Advertising */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Advertising
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => setSelectedView('advertising-live')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'advertising-live' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Live Media</span>
              <Badge variant={selectedView === 'advertising-live' ? 'secondary' : 'outline'}>({advertisingApplications.filter(app => app.status === 'approved').length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('advertising-requests')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'advertising-requests' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Requests</span>
              <Badge variant={selectedView === 'advertising-requests' ? 'secondary' : 'outline'}>({advertisingApplications.filter(app => app.status === 'pending').length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('advertising-archived')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'advertising-archived' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Archived</span>
              <Badge variant={selectedView === 'advertising-archived' ? 'secondary' : 'outline'}>(0)</Badge>
            </button>
            <button
              onClick={() => setSelectedView('advertising-media')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'advertising-media' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Media Ads</span>
              <Badge variant={selectedView === 'advertising-media' ? 'secondary' : 'outline'}>({advertisements.length})</Badge>
            </button>
            <button
              onClick={() => setSelectedView('advertising-analytics')}
              className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                selectedView === 'advertising-analytics' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm">Analytics</span>
              <Badge variant={selectedView === 'advertising-analytics' ? 'secondary' : 'outline'}>({advertisementAnalytics.length})</Badge>
            </button>
          </CardContent>
        </Card>

      </div>

      {/* Upload Buttons */}
      <div className="flex justify-end gap-4 mb-6">
        <Button onClick={() => setShowAdUploadModal(true)} className="flex items-center gap-2">
          <Megaphone className="h-4 w-4" />
          Upload Ad
        </Button>
        <Button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload Content
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {selectedView === 'artist-management' && (
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
                {loadingArtists ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : professionalArtists.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No professional artists found.</p>
                ) : (
                  <div className="space-y-4">
                    {professionalArtists.map((artist) => (
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
                                  setProfessionalArtists(prev =>
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
                {approvedRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No verified artists have been approved yet.
                  </p>
                ) : (
                  approvedRequests.map((request) => (
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
                              <span>Reviewed: {formatDate(request.reviewedAt)}</span>
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
                            onClick={() => handleSuspendArtist(request)}
                            disabled={isProcessing}
                          >
                            Suspend
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" disabled={isProcessing}>
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
                                  onClick={() => handleRemoveArtist(request)}
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
                {suspendedRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No artists are currently suspended.</p>
                ) : (
                  suspendedRequests.map((request) => (
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
                              <span>Suspended: {formatDate(request.reviewedAt)}</span>
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
                            onClick={() => handleReinstateArtist(request)}
                            disabled={isProcessing}
                          >
                            Reinstate
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" disabled={isProcessing}>
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
                                  onClick={() => handleRemoveArtist(request)}
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
        {selectedView === 'artist-invites' && (
          <div className="space-y-6">
            <ArtistInviteConsole />
          </div>
        )}

        {selectedView === 'artist-pending' && (
          pendingRequests.length === 0 ? (
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
              {pendingRequests.map((request) => (
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
                          onClick={() => setSelectedRequest(request)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request)}
                          disabled={isProcessing}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setRejectionReason('');
                          }}
                          disabled={isProcessing}
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
        {selectedView === 'artist-approved' && (
          approvedRequests.length === 0 ? (
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
              {approvedRequests.map((request) => (
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
                        <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                          <Eye className="h-4 w-4 mr-1" /> View Details
                        </Button>
                        {request.portfolioImages && request.portfolioImages.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTransferPortfolio(request)}
                            disabled={isProcessing}
                            className="text-blue-600 hover:text-blue-700 border-blue-200"
                          >
                            <Upload className="h-4 w-4 mr-1" /> Transfer Portfolio
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuspendArtist(request)}
                          disabled={isProcessing}
                        >
                          Suspend
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isProcessing}>
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
                                onClick={() => handleRemoveArtist(request)}
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

        {selectedView === 'artist-suspended' && (
          suspendedRequests.length === 0 ? (
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
              {suspendedRequests.map((request) => (
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
                          onClick={() => handleReinstateArtist(request)}
                          disabled={isProcessing}
                        >
                          Reinstate
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isProcessing}>
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
                                onClick={() => handleRemoveArtist(request)}
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

        {selectedView === 'artist-rejected' && (
          rejectedRequests.length === 0 ? (
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
              {rejectedRequests.map((request) => (
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
                            <p><strong>Reason:</strong> {request.rejectionReason || 'No reason provided'}</p>
                            <p><strong>Rejected:</strong> {request.reviewedAt instanceof Date ? request.reviewedAt.toLocaleDateString() : (request.reviewedAt as any)?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                          <Eye className="h-4 w-4 mr-1" /> View Details
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isProcessing}>
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
                                onClick={() => handleRemoveArtist(request)}
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

        {selectedView === 'news-articles' && (
          <div className="space-y-6">
            {/* Article Editor */}
            <Card id="article-editor">
              <CardHeader>
                <CardTitle>Create newsroom article</CardTitle>
                <CardDescription>
                  Publish Gouache editorial or link out to external coverage. Articles appear in the newsroom alongside sponsored tiles.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="news-title">Headline *</Label>
                    <Input
                      id="news-title"
                      placeholder="e.g. Inside the Lagos Art Weekender"
                      value={newArticle.title}
                      onChange={(event) => setNewArticle((prev) => ({ ...prev, title: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="news-subheadline">Subheadline</Label>
                    <Input
                      id="news-subheadline"
                      placeholder="Optional subheadline"
                      value={newArticleSubheadline}
                      onChange={(e) => setNewArticleSubheadline(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="news-category">Category *</Label>
                    <Select
                      value={newArticle.category || 'Stories'}
                      onValueChange={(value) => setNewArticle((prev) => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger id="news-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Stories">Stories</SelectItem>
                        <SelectItem value="Events">Events</SelectItem>
                        <SelectItem value="News">News</SelectItem>
                        <SelectItem value="Partners">Partners</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="news-author">Author</Label>
                    <Input
                      id="news-author"
                      placeholder="Byline (optional)"
                      value={newArticle.author}
                      onChange={(event) => setNewArticle((prev) => ({ ...prev, author: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="news-summary">Standfirst *</Label>
                    <Textarea
                      id="news-summary"
                      rows={3}
                      placeholder="One or two sentences summarising the story."
                      value={newArticle.summary}
                      onChange={(event) => setNewArticle((prev) => ({ ...prev, summary: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="article-body-editor">Article Body *</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Paste images directly into the editor. Hold Shift and drag images to resize them.
                    </p>
                    <div
                      id="article-body-editor"
                      contentEditable
                      onPaste={handleBodyPaste}
                      className="min-h-[400px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      style={{ whiteSpace: 'pre-wrap' }}
                      suppressContentEditableWarning
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="news-image-upload">Upload hero image</Label>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Input
                        id="news-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleNewsArticleImageChange}
                      />
                      {(newArticleImagePreview || newArticle.imageUrl) && (
                        <Button variant="ghost" size="sm" type="button" onClick={clearNewsArticleImage}>
                          Remove image
                        </Button>
                      )}
                    </div>
                    {(newArticleImagePreview || newArticle.imageUrl) && (
                      <div className="mt-2">
                        <img
                          src={newArticleImagePreview || newArticle.imageUrl}
                          alt="Article preview"
                          className="h-32 w-full max-w-sm rounded-lg border object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="news-tags">Tags</Label>
                    <Input
                      id="news-tags"
                      placeholder="Comma separated (e.g. art fair, investment, photography)"
                      value={newArticle.tags}
                      onChange={(event) => setNewArticle((prev) => ({ ...prev, tags: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <Label>Article Location *</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Select where this article should appear on the news page:
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="location-main-banner"
                          name="article-location"
                          value="main-banner"
                          checked={newArticle.location === 'main-banner'}
                          onChange={(e) => setNewArticle((prev) => ({ ...prev, location: e.target.value as 'main-banner' | 'whats-new' | 'evergreen' }))}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="location-main-banner" className="font-normal cursor-pointer">
                          Main Banner (Hero tile - first article)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="location-whats-new"
                          name="article-location"
                          value="whats-new"
                          checked={newArticle.location === 'whats-new'}
                          onChange={(e) => setNewArticle((prev) => ({ ...prev, location: e.target.value as 'main-banner' | 'whats-new' | 'evergreen' }))}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="location-whats-new" className="font-normal cursor-pointer">
                          What&apos;s New (Featured section - articles 2-4)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="location-evergreen"
                          name="article-location"
                          value="evergreen"
                          checked={newArticle.location === 'evergreen'}
                          onChange={(e) => setNewArticle((prev) => ({ ...prev, location: e.target.value as 'main-banner' | 'whats-new' | 'evergreen' }))}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="location-evergreen" className="font-normal cursor-pointer">
                          Evergreen Article (Normal article spaces - articles 5+)
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleCreateNewsArticle} disabled={isPublishingArticle}>
                    {isPublishingArticle ? 'Publishing…' : 'Publish article'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="news-date">Publish date</Label>
                    <Input
                      id="news-date"
                      type="datetime-local"
                      value={newArticle.publishedAt}
                      onChange={(event) => setNewArticle((prev) => ({ ...prev, publishedAt: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="news-image">Hero image URL (optional)</Label>
                    <Input
                      id="news-image"
                      placeholder="https://"
                      value={newArticle.imageUrl}
                      onChange={(event) => setNewArticle((prev) => ({ ...prev, imageUrl: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="news-link">External link</Label>
                    <Input
                      id="news-link"
                      placeholder="https://"
                      value={newArticle.externalUrl}
                      onChange={(event) => setNewArticle((prev) => ({ ...prev, externalUrl: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="news-summary">Standfirst *</Label>
                    <Textarea
                      id="news-summary"
                      rows={3}
                      placeholder="One or two sentences summarising the story."
                      value={newArticle.summary}
                      onChange={(event) => setNewArticle((prev) => ({ ...prev, summary: event.target.value }))}
                    />
                  </div>
                  {/* AI-Assisted Article Structuring - Collapsible */}
                  <div className="space-y-4 md:col-span-2">
                    <Card className="border-primary/20 bg-primary/5">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-primary" />
                              AI-Assisted Article Structuring (Optional)
                            </CardTitle>
                            <CardDescription>
                              Paste your raw text, add headlines and images, and let AI structure your article automatically
                            </CardDescription>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAiSection(!showAiSection)}
                          >
                            {showAiSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </CardHeader>
                      {showAiSection && (
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Raw Article Text *</Label>
                          <Textarea
                            placeholder="Paste your complete article text here..."
                            rows={8}
                            value={aiRawText}
                            onChange={(e) => setAiRawText(e.target.value)}
                            className="font-mono text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Headlines (optional)</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter a headline..."
                              value={aiHeadlineInput}
                              onChange={(e) => setAiHeadlineInput(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addAiHeadline();
                                }
                              }}
                            />
                            <Button type="button" onClick={addAiHeadline} size="sm">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {aiHeadlines.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {aiHeadlines.map((headline, index) => (
                                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                  {headline}
                                  <button
                                    onClick={() => removeAiHeadline(index)}
                                    className="ml-1 hover:text-destructive"
                                  >
                                    ×
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Images (optional)</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleAiImageUpload}
                          />
                          {aiImagePreviews.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                              {aiImagePreviews.map((preview, index) => (
                                <div key={index} className="relative">
                                  <img
                                    src={preview}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-32 object-cover rounded-lg border"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 h-6 w-6 bg-background/80"
                                    onClick={() => removeAiImage(index)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                  <Input
                                    placeholder="Image description..."
                                    value={aiImageDescriptions[index] || ''}
                                    onChange={(e) => {
                                      const newDescriptions = [...aiImageDescriptions];
                                      newDescriptions[index] = e.target.value;
                                      setAiImageDescriptions(newDescriptions);
                                    }}
                                    className="mt-2 text-xs"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button
                          type="button"
                          onClick={structureArticleWithAI}
                          disabled={isStructuringArticle || !aiRawText.trim()}
                          className="w-full"
                        >
                          {isStructuringArticle ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Structuring Article...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Structure Article with AI
                            </>
                          )}
                        </Button>

                        {aiGeneratedSections.length > 0 && (
                          <Card className="border-green-500/20 bg-green-500/5">
                            <CardHeader>
                              <CardTitle className="text-green-700 dark:text-green-400">
                                AI Generated {aiGeneratedSections.length} Sections
                              </CardTitle>
                              <CardDescription>
                                Review the sections below and accept to add them to your article
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {aiGeneratedSections
                                .sort((a, b) => a.order - b.order)
                                .map((section, index) => (
                                  <div key={section.id} className="border rounded-lg p-3 bg-background">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="outline">
                                        {section.type === 'image' ? 'Image' : section.type === 'text-image' ? 'Text + Image' : section.type.charAt(0).toUpperCase() + section.type.slice(1)}
                                      </Badge>
                                      {section.imagePosition && (
                                        <Badge variant="secondary">{section.imagePosition}</Badge>
                                      )}
                                    </div>
                                    {section.content && (
                                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{section.content}</p>
                                    )}
                                    {section.imageUrl && (
                                      <img src={section.imageUrl} alt={section.caption || 'Section image'} className="h-20 w-auto rounded mb-2" />
                                    )}
                                    {section.caption && (
                                      <p className="text-xs text-muted-foreground italic">{section.caption}</p>
                                    )}
                                  </div>
                                ))}
                              <div className="flex gap-2">
                                <Button onClick={acceptAiSections} className="flex-1">
                                  <Check className="h-4 w-4 mr-2" />
                                  Accept & Add Sections
                                </Button>
                                <Button onClick={rejectAiSections} variant="outline" className="flex-1">
                                  <X className="h-4 w-4 mr-2" />
                                  Reject
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </CardContent>
                      )}
                    </Card>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleCreateNewsArticle} disabled={isPublishingArticle}>
                    {isPublishingArticle ? 'Publishing…' : 'Publish article'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    {showArchivedNews 
                      ? 'Archived articles' 
                      : showDraftedArticles
                      ? 'Drafted articles'
                      : 'Published articles'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {showArchivedNews
                      ? 'Review past stories and restore any that should return to the feed.'
                      : showDraftedArticles
                      ? 'Review and publish drafted articles. Make final edits before publishing.'
                      : 'Manage everything currently live in the newsroom feed.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={!showArchivedNews && !showDraftedArticles ? 'secondary' : 'outline'}
                    onClick={() => {
                      setShowArchivedNews(false);
                      setShowDraftedArticles(false);
                    }}
                  >
                    Published ({publishedArticles.length})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={showDraftedArticles && !showArchivedNews ? 'secondary' : 'outline'}
                    onClick={() => {
                      setShowArchivedNews(false);
                      setShowDraftedArticles(true);
                    }}
                  >
                    Drafted ({draftedArticles.length})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={showArchivedNews ? 'secondary' : 'outline'}
                    onClick={() => {
                      setShowArchivedNews(true);
                      setShowDraftedArticles(false);
                    }}
                  >
                    Archived ({archivedNewsArticles.length})
                  </Button>
                </div>
              </div>

              {visibleNewsArticles.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center space-y-2">
                    <h3 className="text-lg font-semibold">
                      {showArchivedNews 
                        ? 'No archived stories yet' 
                        : showDraftedArticles 
                        ? 'No drafted articles yet'
                        : 'No stories published yet'}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {showArchivedNews
                        ? 'When you archive a story, it will move here so you can restore or permanently delete it later.'
                        : showDraftedArticles
                        ? 'Drafted articles will appear here. Review and publish drafted articles.'
                        : 'Publish your first story to populate the newsroom feed.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {visibleNewsArticles.map((article) => (
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
                                      
                                      setNewArticle({
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

                                      setArticleSections((data.sections || []).map((s: any) => ({
                                        ...s,
                                        order: s.order || 0,
                                      })));
                                      setNewArticleContent(data.content || '');

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
                              onClick={() => handleArchiveNewsArticle(article, !article.archived)}
                            >
                              {article.archived ? 'Restore' : 'Archive'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleDeleteNewsArticle(article)}
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
        {selectedView === 'user-reports' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">User Reports</h2>
                <p className="text-muted-foreground">
                  Review reports submitted by users about issues, bugs, or concerns.
                </p>
              </div>
              <Badge variant="outline">
                {userReports.filter(r => r.status === 'pending').length} pending
              </Badge>
            </div>

            {userReports.length === 0 ? (
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
                {userReports.map((report) => (
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
                                onClick={() => handleUpdateReportStatus(report, 'reviewed')}
                                disabled={isProcessing}
                              >
                                Mark as Reviewed
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleUpdateReportStatus(report, 'resolved')}
                                disabled={isProcessing}
                              >
                                Mark as Resolved
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateReportStatus(report, 'dismissed')}
                                disabled={isProcessing}
                              >
                                Dismiss
                              </Button>
                            </>
                          )}
                          {report.status !== 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateReportStatus(report, 'pending')}
                              disabled={isProcessing}
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

        {/* Episodes - All */}
        {selectedView === 'episodes-all' && (
          episodes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Video className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No episodes uploaded</h3>
                <p className="text-muted-foreground text-center">
                  Upload your first video using the Upload button.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">All Episodes</h2>
              {episodes.map((episode) => (
                <Card key={episode.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-32 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={episode.thumbnailUrl}
                          alt={episode.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{episode.title}</h3>
                          {episode.isMainEvent && (
                            <Badge variant="default" className="bg-red-600">Main Event</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{episode.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{episode.viewCount} views</span>
                          <span>{episode.likes} likes</span>
                          <span>Created {episode.createdAt instanceof Date ? episode.createdAt.toLocaleDateString() : 'Recently'}</span>
                      </div>
                        </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEpisode(episode)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteEpisode(episode)}
                          disabled={isProcessing}
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

        {/* Marketplace - Products */}
        {selectedView === 'marketplace-products' && (
          marketplaceProducts.length === 0 ? (
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
              {marketplaceProducts.map((product) => (
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
                          onClick={() => handleDeleteProduct(product)}
                          disabled={isProcessing}
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
        {selectedView === 'marketplace-active' && (
          marketplaceProducts.filter(p => p.isActive).length === 0 ? (
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
              {marketplaceProducts.filter(p => p.isActive).map((product) => (
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
                          onClick={() => handleDeleteProduct(product)}
                          disabled={isProcessing}
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
        {selectedView === 'marketplace-requests' && (
          affiliateRequests.filter(req => req.status === 'pending').length === 0 ? (
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
              {affiliateRequests.filter(req => req.status === 'pending').map((request) => (
                <Card key={request.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        {request.productImages.length > 0 && (
                          <img 
                            src={request.productImages[0]} 
                            alt={request.productTitle}
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{request.productTitle}</h3>
                            <Badge variant="outline">Pending</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                              <p><strong>Company:</strong> {request.companyName}</p>
                              <p><strong>Email:</strong> {request.email}</p>
                        </div>
                            <div>
                              <p><strong>Price:</strong> ${request.productPrice} {request.productCurrency}</p>
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
                          onClick={() => handleApproveAffiliateRequest(request)}
                          disabled={isProcessing}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRejectAffiliateRequest(request)}
                          disabled={isProcessing}
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
        {selectedView === 'advertising-requests' && (
          advertisingApplications.filter(app => app.status === 'pending').length === 0 ? (
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
              {advertisingApplications.filter(app => app.status === 'pending').map((application) => (
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
                          onClick={() => setSelectedAdApplication(application)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveAdApplication(application)}
                          disabled={isProcessing}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setSelectedAdApplication(application)}
                          disabled={isProcessing}
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
        {(selectedView === 'episodes-drafts' || selectedView === 'episodes-archived' || 
          selectedView === 'marketplace-archived' || selectedView === 'advertising-live' || 
          selectedView === 'advertising-archived') && (
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
        {selectedView === 'advertising-media' && (
          advertisements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No advertisements uploaded</h3>
                <p className="text-muted-foreground text-center">
                  Upload pre-roll advertisements to play before episodes.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Advertising Media</h2>
              {advertisements.map((ad) => (
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
                              <p><strong>Advertiser:</strong> {ad.advertiserName}</p>
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
                          disabled={isProcessing}
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
                          disabled={isProcessing}
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
        {selectedView === 'advertising-analytics' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Advertising Analytics</h2>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <BarChart3 className="h-8 w-8 text-primary" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Total Impressions</p>
                      <p className="text-2xl font-bold">
                        {advertisements.reduce((sum, ad) => sum + ad.impressions, 0).toLocaleString()}
                      </p>
          </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Eye className="h-8 w-8 text-primary" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Total Views</p>
                      <p className="text-2xl font-bold">
                        {advertisements.reduce((sum, ad) => sum + ad.views, 0).toLocaleString()}
                </p>
              </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <ExternalLink className="h-8 w-8 text-primary" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Total Clicks</p>
                      <p className="text-2xl font-bold">
                        {advertisements.reduce((sum, ad) => sum + ad.clicks, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Megaphone className="h-8 w-8 text-primary" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Active Ads</p>
                      <p className="text-2xl font-bold">
                        {advertisements.filter(ad => ad.isActive).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analytics Table */}
          <Card>
            <CardHeader>
                <CardTitle>Advertisement Performance</CardTitle>
                <CardDescription>Detailed analytics for each advertisement</CardDescription>
            </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {advertisements.map((ad) => (
                    <div key={ad.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">{ad.title}</h3>
                        <Badge variant={ad.isActive ? 'default' : 'secondary'}>
                          {ad.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
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

        {/* Course Management Sections - Deprecated (moved to Marketplace) */}
        {/* Published Courses */}
        {selectedView === 'courses-published' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Published Courses</h2>
            {courses.filter(c => c.isPublished).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Play className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No published courses</h3>
                  <p className="text-muted-foreground text-center">
                    No courses have been published yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {courses.filter(c => c.isPublished).map((course) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                            <p className="text-muted-foreground mb-2">{course.description}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Instructor: {course.instructor.name}</span>
                              <span>Students: {course.students}</span>
                              <span>Rating: {course.rating}/5</span>
                              <span>Price: ${course.price}</span>
                      </div>
                    </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCourseUnpublish(course.id)}
                          >
                            Unpublish
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCourseDelete(course.id)}
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
        )}

        {/* Draft Courses */}
        {selectedView === 'courses-draft' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Draft Courses</h2>
            {courses.filter(c => !c.isPublished).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Edit className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No draft courses</h3>
                  <p className="text-muted-foreground text-center">
                    No courses are currently in draft status.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {courses.filter(c => !c.isPublished).map((course) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                            <p className="text-muted-foreground mb-2">{course.description}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Instructor: {course.instructor.name}</span>
                              <span>Price: ${course.price}</span>
                              <span>Created: {course.createdAt.toLocaleDateString()}</span>
                        </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleCoursePublish(course.id)}
                          >
                            Publish
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCourseDelete(course.id)}
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
        )}

        {/* Course Submissions */}
        {selectedView === 'course-submissions' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Course Submission Requests</h2>
            {courseSubmissions.filter(s => s.status === 'pending').length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <User className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                  <p className="text-muted-foreground text-center">
                    No course submission requests pending review.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {courseSubmissions.filter(s => s.status === 'pending').map((submission) => (
                  <Card key={submission.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">{submission.courseTitle}</h3>
                          <p className="text-muted-foreground mb-4">{submission.courseDescription}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p><strong>Company:</strong> {submission.companyName}</p>
                              <p><strong>Contact:</strong> {submission.contactName}</p>
                              <p><strong>Email:</strong> {submission.email}</p>
                              <p><strong>Website:</strong> {submission.website}</p>
                            </div>
                            <div>
                              <p><strong>Category:</strong> {submission.courseCategory}</p>
                              <p><strong>Subcategory:</strong> {submission.courseSubcategory}</p>
                              <p><strong>Duration:</strong> {submission.courseDuration || 'Not specified'}</p>
                              <p><strong>Format:</strong> {submission.courseFormat || 'Not specified'}</p>
                            </div>
                          </div>
                          <div className="mt-4">
                            <p><strong>Instructor Bio:</strong></p>
                            <p className="text-muted-foreground">{submission.instructorBio}</p>
                          </div>
                          <div className="mt-4">
                            <p><strong>Teaching Experience:</strong></p>
                            <p className="text-muted-foreground">{submission.teachingExperience}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleCourseSubmissionReview(submission.id, 'approved')}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCourseSubmissionReview(submission.id, 'rejected')}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
              </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center justify-between">
                Upload Content
                <Button variant="ghost" size="sm" onClick={() => setShowUploadModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pb-6">
              <Tabs defaultValue="video-upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-12">
                  <TabsTrigger value="video-upload" className="text-sm font-medium">Video Upload</TabsTrigger>
                  <TabsTrigger value="product-upload" className="text-sm font-medium">Product Upload</TabsTrigger>
                </TabsList>

                <TabsContent value="video-upload" className="mt-6">
                  {/* Video Upload Form */}
                  <div className="space-y-4">
              <div className="space-y-2">
                      <Label htmlFor="video-title">Video Title *</Label>
                <Input
                  id="video-title"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Enter video title..."
                />
              </div>

              <div className="space-y-2">
                      <Label htmlFor="video-description">Video Description *</Label>
                <Textarea
                  id="video-description"
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="Enter video description..."
                        rows={3}
                />
              </div>

              <div className="space-y-2">
                      <Label htmlFor="video-file">Video File *</Label>
                <Input
                        id="video-file"
                        type="file"
                        accept="video/*"
                        onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                        className="h-12 file:mr-4 file:py-2 file:px-6 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80 file:cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                      <Label htmlFor="thumbnail-file">Thumbnail (optional)</Label>
                      <Input
                        id="thumbnail-file"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                        className="h-12 file:mr-4 file:py-2 file:px-6 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80 file:cursor-pointer"
                      />
                </div>

                    <Button
                      onClick={handleVideoUpload}
                      disabled={isUploading || !videoFile || !videoTitle.trim() || !videoDescription.trim()}
                      className="w-full h-12 text-base font-medium"
                      size="lg"
                    >
                      {isUploading ? (
                        <>
                          <Upload className="h-5 w-5 mr-2 animate-spin" />
                          Uploading Video...
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 mr-2" />
                          Upload Video
                        </>
                      )}
                    </Button>
              </div>
                </TabsContent>

                <TabsContent value="product-upload" className="mt-6">
                  {/* Product Upload Form */}
                  <div className="space-y-4">
              <div className="space-y-2">
                      <Label htmlFor="product-title">Product Title *</Label>
                      <Input
                        id="product-title"
                        value={productTitle}
                        onChange={(e) => setProductTitle(e.target.value)}
                        placeholder="Enter product title..."
                      />
              </div>

              <div className="space-y-2">
                      <Label htmlFor="product-description">Product Description *</Label>
                      <Textarea
                        id="product-description"
                        value={productDescription}
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
                          value={productPrice}
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
                      onClick={handleProductUpload}
                      disabled={isProductUploading || !productTitle.trim() || !productDescription.trim() || !productPrice.trim() || productImages.length < 2}
                      className="w-full h-12 text-base font-medium"
                      size="lg"
                    >
                      {isProductUploading ? (
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
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Advertising Upload Modal */}
      {showAdUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center justify-between">
                Upload Advertisement
                <Button variant="ghost" size="sm" onClick={() => setShowAdUploadModal(false)}>
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
                    value={adTitle}
                    onChange={(e) => setAdTitle(e.target.value)}
                    placeholder="Enter advertisement title..."
                  />
              </div>

                <div className="space-y-2">
                  <Label htmlFor="ad-description">Description *</Label>
                  <Textarea
                    id="ad-description"
                    value={adDescription}
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
                      value={advertiserName}
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
                  onClick={handleAdUpload}
                  disabled={isAdUploading || !adMediaFile || !adTitle.trim() || !adDescription.trim() || !advertiserName.trim()}
                  className="w-full h-12 text-base font-medium"
                  size="lg"
                >
                  {isAdUploading ? (
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
      {selectedRequest && (
        <AlertDialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedRequest.user.avatarUrl || undefined} alt={selectedRequest.user.displayName} />
                  <AvatarFallback>{selectedRequest.user.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div>{selectedRequest.user.displayName}</div>
                  <div className="text-sm font-normal text-muted-foreground">@{selectedRequest.user.username}</div>
                </div>
              </AlertDialogTitle>
            </AlertDialogHeader>

            <div className="space-y-6">
              {/* Portfolio Images */}
              {selectedRequest.portfolioImages.length > 0 && (
              <div>
                  <Label className="text-base font-semibold">Portfolio Images</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                  {selectedRequest.portfolioImages.map((url, index) => (
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
              {selectedRequest.artistStatement && (
              <div>
                  <Label className="text-base font-semibold">Artist Statement</Label>
                  <p className="mt-2 text-sm text-muted-foreground">{selectedRequest.artistStatement}</p>
              </div>
              )}

              {/* Experience */}
                <div>
                <Label className="text-base font-semibold">Experience</Label>
                <p className="mt-2 text-sm text-muted-foreground">{selectedRequest.experience}</p>
                </div>

              {/* Social Links */}
              {selectedRequest.socialLinks && (
                <div>
                  <Label className="text-base font-semibold">Social Links</Label>
                  <div className="mt-2 space-y-2">
                    {selectedRequest.socialLinks.website && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <span className="text-sm">Website: {selectedRequest.socialLinks.website}</span>
                      </div>
                    )}
                    {selectedRequest.socialLinks.instagram && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <span className="text-sm">Instagram: {selectedRequest.socialLinks.instagram}</span>
                      </div>
                    )}
                    {selectedRequest.socialLinks.x && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <span className="text-sm">X: {selectedRequest.socialLinks.x}</span>
                      </div>
                    )}
                    {selectedRequest.socialLinks.tiktok && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <span className="text-sm">TikTok: {selectedRequest.socialLinks.tiktok}</span>
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
              {selectedRequest.status === 'pending' && (
                <div>
                  <Label htmlFor="rejectionReason">Rejection Reason (if rejecting)</Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide a reason for rejection..."
                    rows={3}
                  />
                </div>
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedRequest(null)}>
                Close
              </AlertDialogCancel>
              {selectedRequest.status === 'pending' && (
                <>
                  <AlertDialogAction
                    onClick={() => handleReject(selectedRequest)}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Rejecting...' : 'Reject'}
                  </AlertDialogAction>
                  <AlertDialogAction
                    onClick={() => handleApprove(selectedRequest)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Approving...' : 'Approve'}
                  </AlertDialogAction>
                </>
              )}
              {selectedRequest.status === 'approved' && selectedRequest.portfolioImages && selectedRequest.portfolioImages.length > 0 && (
                <AlertDialogAction
                  onClick={() => {
                    handleTransferPortfolio(selectedRequest);
                    setSelectedRequest(null);
                  }}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? 'Transferring...' : 'Transfer Portfolio Images'}
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      </div>
    </div>
  );
}
