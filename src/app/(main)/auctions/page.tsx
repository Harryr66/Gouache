'use client';

import React, { useState, useEffect } from 'react';
import { AuctionCard } from '@/components/auction/auction-card';
import { AuctionService } from '@/lib/database';
import { Auction } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Search, Gavel, Clock, CheckCircle } from 'lucide-react';

export default function AuctionsPage() {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    loadAuctions();
  }, []);

  const loadAuctions = async () => {
    try {
      const activeAuctions = await AuctionService.getActiveAuctions();
      setAuctions(activeAuctions);
    } catch (error) {
      console.error('Error loading auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBid = async (auctionId: string, amount: number) => {
    if (!user) return;
    
    try {
      await AuctionService.placeBid(auctionId, user.id, amount);
      // Reload auctions to get updated prices
      await loadAuctions();
    } catch (error) {
      console.error('Error placing bid:', error);
      throw error;
    }
  };

  const filteredAuctions = auctions.filter(auction => {
    const matchesSearch = 
      auction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      auction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      auction.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTab = 
      activeTab === 'active' ? auction.status === 'active' :
      activeTab === 'ended' ? auction.status === 'ended' :
      activeTab === 'upcoming' ? auction.status === 'draft' :
      true;
    
    return matchesSearch && matchesTab;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold break-words">Auctions</h1>
            <p className="text-muted-foreground">
              Discover and bid on unique artworks from talented artists
            </p>
          </div>
          <Button>
            <Gavel className="h-4 w-4 mr-2" />
            Create Auction
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search auctions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="active" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Live Auctions</span>
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Upcoming</span>
            </TabsTrigger>
            <TabsTrigger value="ended" className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>Ended</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-6">
            {filteredAuctions.length === 0 ? (
              <div className="text-center py-12">
                <Gavel className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No active auctions</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Check back later for new auctions!'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAuctions.map((auction) => (
                  <AuctionCard
                    key={auction.id}
                    auction={auction}
                    onBid={handleBid}
                    currentUserId={user?.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="upcoming" className="mt-6">
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No upcoming auctions</h3>
              <p className="text-muted-foreground">
                Upcoming auctions will appear here.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="ended" className="mt-6">
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No ended auctions</h3>
              <p className="text-muted-foreground">
                Ended auctions will appear here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
