'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
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
import { ArtistInviteConsole } from '@/components/admin/artist-invite-console';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminViewRouter } from '@/components/admin/admin-view-router';
import { useRouter } from 'next/navigation';
import { ArtistRequest, AdvertisingApplication, MarketplaceProduct, AffiliateProductRequest, Advertisement, AdvertisementAnalytics, Course, CourseSubmission, NewsArticle, UserReport } from '@/lib/types';
import { doc, updateDoc, serverTimestamp, deleteDoc, getDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

// This is a large component - props interface will be defined where it's used
export const AdminMainContent = (props: any): JSX.Element => {
  const router = useRouter();
  
  // Use props directly to avoid parser issues with large destructuring
  return (
    <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          <Button variant="outline" onClick={props.handleSignOut} className="flex items-center gap-2">
            <X className="h-4 w-4" />
            Logout
          </Button>
        </div>

        <AdminSidebar
          selectedView={props.selectedView}
          setSelectedView={props.setSelectedView}
          approvedRequests={props.approvedRequests}
          pendingRequests={props.pendingRequests}
          rejectedRequests={props.rejectedRequests}
          suspendedRequests={props.suspendedRequests}
          activeNewsArticles={props.activeNewsArticles}
          marketplaceProducts={props.marketplaceProducts}
          affiliateRequests={props.affiliateRequests}
          userReports={props.userReports}
          advertisingApplications={props.advertisingApplications}
          advertisements={props.advertisements}
          advertisementAnalytics={props.advertisementAnalytics}
          shopProducts={props.shopProducts}
        />

      {/* Upload Buttons */}
      <div className="flex justify-end gap-4 mb-6">
        <Button onClick={() => props.setShowAdUploadModal(true)} className="flex items-center gap-2">
          <Megaphone className="h-4 w-4" />
          Upload Ad
        </Button>
        <Button onClick={() => props.setShowUploadModal(true)} className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload Content
        </Button>
      </div>

      {/* Main Content Area */}
      <AdminViewRouter {...props} />
    </div>
  );
};
