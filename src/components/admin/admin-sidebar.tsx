'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Megaphone, ShoppingCart, Package, AlertCircle } from 'lucide-react';

interface AdminSidebarProps {
  selectedView: string;
  setSelectedView: (view: string) => void;
  approvedRequests: any[];
  pendingRequests: any[];
  rejectedRequests: any[];
  suspendedRequests: any[];
  activeNewsArticles: any[];
  marketplaceProducts: any[];
  affiliateRequests: any[];
  userReports: any[];
  advertisingApplications: any[];
  advertisements: any[];
  advertisementAnalytics: any[];
}

export function AdminSidebar(props: AdminSidebarProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {/* Professional Verification */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Professional Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <button
            onClick={() => props.setSelectedView('artist-management')}
            className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
              props.selectedView === 'artist-management' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <span className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              Manage Artists
            </span>
            <Badge variant={props.selectedView === 'artist-management' ? 'secondary' : 'outline'}>
              ({props.approvedRequests.length})
            </Badge>
          </button>
          <button
            onClick={() => props.setSelectedView('artist-pending')}
            className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
              props.selectedView === 'artist-pending' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <span className="text-sm">Pending</span>
            <Badge variant={props.selectedView === 'artist-pending' ? 'secondary' : 'outline'}>({props.pendingRequests.length})</Badge>
          </button>
          <button
            onClick={() => props.setSelectedView('artist-approved')}
            className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
              props.selectedView === 'artist-approved' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <span className="text-sm">Approved</span>
            <Badge variant={props.selectedView === 'artist-approved' ? 'secondary' : 'outline'}>({props.approvedRequests.length})</Badge>
          </button>
          <button
            onClick={() => props.setSelectedView('artist-rejected')}
            className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
              props.selectedView === 'artist-rejected' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <span className="text-sm">Rejected</span>
            <Badge variant={props.selectedView === 'artist-rejected' ? 'secondary' : 'outline'}>({props.rejectedRequests.length})</Badge>
          </button>
          <button
            onClick={() => props.setSelectedView('artist-suspended')}
            className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
              props.selectedView === 'artist-suspended' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <span className="text-sm">Suspended</span>
            <Badge variant={props.selectedView === 'artist-suspended' ? 'secondary' : 'outline'}>({props.suspendedRequests.length})</Badge>
          </button>
          <button
            onClick={() => props.setSelectedView('artist-invites')}
            className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
              props.selectedView === 'artist-invites' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <span className="text-sm">Invite Console</span>
            <Badge variant={props.selectedView === 'artist-invites' ? 'secondary' : 'outline'}>New</Badge>
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
            onClick={() => props.setSelectedView('news-articles')}
            className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
              props.selectedView === 'news-articles' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <span className="text-sm">Articles</span>
            <Badge variant={props.selectedView === 'news-articles' ? 'secondary' : 'outline'}>
              ({props.activeNewsArticles.length})
            </Badge>
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
            onClick={() => props.setSelectedView('marketplace-products')}
            className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
              props.selectedView === 'marketplace-products' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <span className="text-sm">Products</span>
            <Badge variant={props.selectedView === 'marketplace-products' ? 'secondary' : 'outline'}>({props.marketplaceProducts.length})</Badge>
          </button>
          <button
            onClick={() => props.setSelectedView('marketplace-requests')}
            className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
              props.selectedView === 'marketplace-requests' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <span className="text-sm">Requests</span>
            <Badge variant={props.selectedView === 'marketplace-requests' ? 'secondary' : 'outline'}>({props.affiliateRequests.filter(req => req.status === 'pending').length})</Badge>
          </button>
          <button
            onClick={() => props.setSelectedView('marketplace-archived')}
            className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
              props.selectedView === 'marketplace-archived' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <span className="text-sm">Archived</span>
            <Badge variant={props.selectedView === 'marketplace-archived' ? 'secondary' : 'outline'}>(0)</Badge>
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
            onClick={() => props.setSelectedView('marketplace-products')}
            className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
              props.selectedView === 'marketplace-products' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <span className="text-sm">All Products</span>
            <Badge variant={props.selectedView === 'marketplace-products' ? 'secondary' : 'outline'}>({props.marketplaceProducts.length})</Badge>
          </button>
          <button
            onClick={() => props.setSelectedView('marketplace-active')}
            className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
              props.selectedView === 'marketplace-active' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <span className="text-sm">Active Products</span>
            <Badge variant={props.selectedView === 'marketplace-active' ? 'secondary' : 'outline'}>({props.marketplaceProducts.filter(p => p.isActive).length})</Badge>
          </button>
          <button
            onClick={() => props.setSelectedView('marketplace-requests')}
            className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
              props.selectedView === 'marketplace-requests' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <span className="text-sm">Product Requests</span>
            <Badge variant={props.selectedView === 'marketplace-requests' ? 'secondary' : 'outline'}>({props.affiliateRequests.filter(req => req.status === 'pending').length})</Badge>
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
            onClick={() => props.setSelectedView('user-reports')}
            className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
              props.selectedView === 'user-reports' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <span className="text-sm">Reports</span>
            <Badge variant={props.selectedView === 'user-reports' ? 'secondary' : 'outline'}>
              ({props.userReports.filter(r => r.status === 'pending').length})
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
            onClick={() => props.setSelectedView('advertising-live')}
            className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
              props.selectedView === 'advertising-live' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <span className="text-sm">Live Media</span>
            <Badge variant={props.selectedView === 'advertising-live' ? 'secondary' : 'outline'}>({props.advertisingApplications.filter(app => app.status === 'approved').length})</Badge>
          </button>
          <button
            onClick={() => props.setSelectedView('advertising-requests')}
            className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
              props.selectedView === 'advertising-requests' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <span className="text-sm">Requests</span>
            <Badge variant={props.selectedView === 'advertising-requests' ? 'secondary' : 'outline'}>({props.advertisingApplications.filter(app => app.status === 'pending').length})</Badge>
          </button>
          <button
            onClick={() => props.setSelectedView('advertising-archived')}
            className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
              props.selectedView === 'advertising-archived' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <span className="text-sm">Archived</span>
            <Badge variant={props.selectedView === 'advertising-archived' ? 'secondary' : 'outline'}>(0)</Badge>
          </button>
          <button
            onClick={() => props.setSelectedView('advertising-media')}
            className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
              props.selectedView === 'advertising-media' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <span className="text-sm">Media Ads</span>
            <Badge variant={props.selectedView === 'advertising-media' ? 'secondary' : 'outline'}>({props.advertisements.length})</Badge>
          </button>
          <button
            onClick={() => props.setSelectedView('advertising-analytics')}
            className={`w-full flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
              props.selectedView === 'advertising-analytics' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <span className="text-sm">Analytics</span>
            <Badge variant={props.selectedView === 'advertising-analytics' ? 'secondary' : 'outline'}>({props.advertisementAnalytics.length})</Badge>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

