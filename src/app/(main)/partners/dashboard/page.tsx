'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { AdCampaign, PartnerAccount } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, TrendingUp, Eye, MousePointerClick, Calendar, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ThemeLoading } from '@/components/theme-loading';
import { PartnerCampaignForm } from '@/components/partner/partner-campaign-form';
import { format } from 'date-fns';

export default function PartnerDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [partnerAccount, setPartnerAccount] = useState<PartnerAccount | null>(null);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/partners/login');
      return;
    }

    loadPartnerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadPartnerData = async () => {
    if (!user?.email) return;

    try {
      // Load partner account
      const partnerQuery = query(
        collection(db, 'partnerAccounts'),
        where('email', '==', user.email),
        limit(1)
      );

      const partnerSnapshot = await getDocs(partnerQuery);
      
      // Check if user is admin
      const isAdmin = user.isAdmin === true;

      if (partnerSnapshot.empty && !isAdmin) {
        toast({
          title: "Access Denied",
          description: "This account is not authorized for partner access.",
          variant: "destructive",
        });
        router.push('/partners/login');
        return;
      }

      // If partner account exists, load it
      if (!partnerSnapshot.empty) {
        const partnerData = partnerSnapshot.docs[0].data() as PartnerAccount;
        setPartnerAccount({
          ...partnerData,
          id: partnerSnapshot.docs[0].id,
        });
      } else if (isAdmin) {
        // Create a mock partner account for admin
        setPartnerAccount({
          id: 'admin',
          email: user.email || '',
          companyName: 'Gouache Admin',
          contactName: user.displayName || user.username || 'Admin',
          createdAt: new Date(),
          isActive: true,
          accountType: 'partner',
        });
      }

      // Load campaigns - if admin, load all campaigns; otherwise load only partner's campaigns
      let campaignsQuery;
      if (isAdmin && partnerSnapshot.empty) {
        // Admin can see all campaigns
        campaignsQuery = query(
          collection(db, 'adCampaigns'),
          orderBy('createdAt', 'desc')
        );
      } else {
        // Partner sees only their campaigns
        const partnerId = partnerSnapshot.docs[0].id;
        campaignsQuery = query(
          collection(db, 'adCampaigns'),
          where('partnerId', '==', partnerId),
          orderBy('createdAt', 'desc')
        );
      }

      const campaignsSnapshot = await getDocs(campaignsQuery);
      const loadedCampaigns = campaignsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        startDate: doc.data().startDate?.toDate?.() || new Date(),
        endDate: doc.data().endDate?.toDate?.(),
      })) as AdCampaign[];

      setCampaigns(loadedCampaigns);
    } catch (error) {
      console.error('Error loading partner data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCampaignCreated = () => {
    setShowCreateForm(false);
    loadPartnerData();
  };

  const toggleCampaignStatus = async (campaignId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'adCampaigns', campaignId), {
        isActive: !currentStatus,
        updatedAt: serverTimestamp(),
      });

      setCampaigns(campaigns.map(c => 
        c.id === campaignId ? { ...c, isActive: !currentStatus } : c
      ));

      toast({
        title: "Campaign Updated",
        description: `Campaign ${!currentStatus ? 'activated' : 'paused'} successfully.`,
      });
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign status.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container py-12">
        <ThemeLoading text="Loading dashboard..." />
      </div>
    );
  }

  if (!partnerAccount) {
    return null;
  }

  const activeCampaigns = campaigns.filter(c => c.isActive);
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);

  const formatCurrency = (amountInCents: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amountInCents / 100);
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Partner Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome, {partnerAccount.companyName || partnerAccount.contactName}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Clicks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Impressions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Click-Through Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ctr}%</div>
          </CardContent>
        </Card>
        {totalBudget > 0 && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Budget</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalBudget, campaigns[0]?.currency || 'usd')}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Spent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalSpent, campaigns[0]?.currency || 'usd')}
                </div>
                {totalBudget > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {((totalSpent / totalBudget) * 100).toFixed(1)}% used
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Campaigns */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Campaigns</CardTitle>
              <CardDescription>Manage your advertising campaigns</CardDescription>
            </div>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCreateForm ? (
            <PartnerCampaignForm
              partnerId={partnerAccount.id}
              onSuccess={handleCampaignCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No campaigns yet</p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{campaign.title}</h3>
                        <Badge variant={campaign.isActive ? 'default' : 'secondary'}>
                          {campaign.isActive ? 'Active' : 'Paused'}
                        </Badge>
                        <Badge variant="outline">{campaign.placement}</Badge>
                      </div>
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground mb-3">{campaign.description}</p>
                      )}
                      <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          <span>{campaign.impressions || 0} impressions</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MousePointerClick className="h-4 w-4" />
                          <span>{campaign.clicks || 0} clicks</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(campaign.startDate, 'MMM d, yyyy')}
                            {campaign.endDate && ` - ${format(campaign.endDate, 'MMM d, yyyy')}`}
                          </span>
                        </div>
                        {campaign.budget && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            <span>
                              {formatCurrency(campaign.spent || 0, campaign.currency || 'usd')} / {formatCurrency(campaign.budget, campaign.currency || 'usd')}
                              {campaign.spent !== undefined && campaign.budget > 0 && (
                                <span className="ml-1">
                                  ({((campaign.spent / campaign.budget) * 100).toFixed(1)}%)
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                      {campaign.budget && campaign.spent !== undefined && campaign.spent >= campaign.budget && (
                        <div className="mt-2">
                          <Badge variant="destructive" className="text-xs">
                            Budget Exceeded - Campaign Paused
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {campaign.mediaType === 'video' ? (
                        <Video className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleCampaignStatus(campaign.id, campaign.isActive)}
                      >
                        {campaign.isActive ? 'Pause' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
