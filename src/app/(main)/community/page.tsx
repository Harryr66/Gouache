'use client';

import React, { useState, useEffect } from 'react';
import { CommunityCard } from '@/components/community/community-card';
import { CreateCommunityDialog } from '@/components/community/create-community-dialog';
import { CommunityService } from '@/lib/database';
import { Community } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, Plus } from 'lucide-react';

export default function CommunityPage() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      const allCommunities = await CommunityService.getCommunities();
      setCommunities(allCommunities);
      // TODO: Load joined communities for current user
      setJoinedCommunities([]);
    } catch (error) {
      console.error('Error loading communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    if (!user) return;
    
    try {
      await CommunityService.joinCommunity(communityId, user.id);
      // Update local state
      setCommunities(prev => 
        prev.map(community => 
          community.id === communityId 
            ? { ...community, memberCount: community.memberCount + 1 }
            : community
        )
      );
    } catch (error) {
      console.error('Error joining community:', error);
    }
  };

  const handleLeaveCommunity = async (communityId: string) => {
    if (!user) return;
    
    try {
      await CommunityService.leaveCommunity(communityId, user.id);
      // Update local state
      setCommunities(prev => 
        prev.map(community => 
          community.id === communityId 
            ? { ...community, memberCount: community.memberCount - 1 }
            : community
        )
      );
    } catch (error) {
      console.error('Error leaving community:', error);
    }
  };

  const handleCommunityCreated = (community: Community) => {
    setCommunities(prev => [community, ...prev]);
  };

  const filteredCommunities = communities.filter(community =>
    community.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    community.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    community.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
            <h1 className="text-2xl sm:text-3xl font-bold break-words">Communities</h1>
            <p className="text-muted-foreground">
              Discover and join communities of artists and art enthusiasts
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} variant="gradient">
            <Plus className="h-4 w-4 mr-2" />
            Create Community
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search communities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Communities</TabsTrigger>
            <TabsTrigger value="joined">My Communities</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            {filteredCommunities.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No communities found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Be the first to create a community!'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCommunities.map((community) => (
                  <CommunityCard
                    key={community.id}
                    community={community}
                    onJoin={handleJoinCommunity}
                    onLeave={handleLeaveCommunity}
                    isJoined={false} // TODO: Check if user is joined
                    isOwner={community.ownerId === user?.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="joined" className="mt-6">
            {joinedCommunities.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No joined communities</h3>
                <p className="text-muted-foreground">
                  Join some communities to see them here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {joinedCommunities.map((community) => (
                  <CommunityCard
                    key={community.id}
                    community={community}
                    onJoin={handleJoinCommunity}
                    onLeave={handleLeaveCommunity}
                    isJoined={true}
                    isOwner={community.ownerId === user?.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Community Dialog */}
      {showCreateDialog && (
        <CreateCommunityDialog 
          onClose={() => setShowCreateDialog(false)}
          onCommunityCreated={handleCommunityCreated}
        />
      )}
    </div>
  );
}
