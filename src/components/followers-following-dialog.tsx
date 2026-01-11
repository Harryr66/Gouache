'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFollow } from '@/providers/follow-provider';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { UserCheck, UserPlus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  isProfessional?: boolean;
}

interface FollowersFollowingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  type: 'followers' | 'following';
  followerCount: number;
  followingCount: number;
}

export function FollowersFollowingDialog({
  open,
  onOpenChange,
  userId,
  type,
  followerCount,
  followingCount,
}: FollowersFollowingDialogProps) {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(type);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedFollowers, setLoadedFollowers] = useState(false);
  const [loadedFollowing, setLoadedFollowing] = useState(false);
  const { followArtist, unfollowArtist, isFollowing } = useFollow();
  const { user: currentUser } = useAuth();

  // Fetch followers (users who have this userId in their following array)
  const fetchFollowers = async () => {
    if (loadedFollowers) return; // Already loaded
    
    setLoading(true);
    try {
      // Query all userProfiles where their following array contains userId
      const usersRef = collection(db, 'userProfiles');
      const q = query(usersRef, where('following', 'array-contains', userId));
      const snapshot = await getDocs(q);
      
      const followersList: User[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        followersList.push({
          id: docSnap.id,
          displayName: data.displayName || data.name || data.username || 'Unknown User',
          username: data.username || data.handle || '',
          avatarUrl: data.avatarUrl || null,
          isVerified: data.isVerified || false,
          isProfessional: data.isProfessional || false,
        });
      }
      
      setFollowers(followersList);
      setLoadedFollowers(true);
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch following (users in this userId's following array)
  const fetchFollowing = async () => {
    if (loadedFollowing) return; // Already loaded
    
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'userProfiles', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const followingIds = data.following || [];
        
        const followingList: User[] = [];
        for (const followingId of followingIds) {
          try {
            const followingDoc = await getDoc(doc(db, 'userProfiles', followingId));
            if (followingDoc.exists()) {
              const followingData = followingDoc.data();
              followingList.push({
                id: followingId,
                displayName: followingData.displayName || followingData.name || followingData.username || 'Unknown User',
                username: followingData.username || followingData.handle || '',
                avatarUrl: followingData.avatarUrl || null,
                isVerified: followingData.isVerified || false,
                isProfessional: followingData.isProfessional || false,
              });
            }
          } catch (error) {
            console.error(`Error fetching user ${followingId}:`, error);
          }
        }
        
        setFollowing(followingList);
        setLoadedFollowing(true);
      }
    } catch (error) {
      console.error('Error fetching following:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      if (activeTab === 'followers' && !loadedFollowers) {
        fetchFollowers();
      } else if (activeTab === 'following' && !loadedFollowing) {
        fetchFollowing();
      }
    }
  }, [open, activeTab, loadedFollowers, loadedFollowing]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setFollowers([]);
      setFollowing([]);
      setLoadedFollowers(false);
      setLoadedFollowing(false);
    }
  }, [open]);

  const handleFollowToggle = async (artistId: string) => {
    if (isFollowing(artistId)) {
      await unfollowArtist(artistId);
    } else {
      await followArtist(artistId);
    }
  };

  const renderUserList = (users: User[]) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>No {activeTab} found</p>
        </div>
      );
    }

    return (
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {users.map((user) => {
          const isUserFollowing = isFollowing(user.id);
          const isOwnAccount = currentUser?.id === user.id;
          
          return (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Link
                href={`/profile/${user.id}`}
                className="flex items-center gap-3 flex-1 min-w-0"
                onClick={() => onOpenChange(false)}
              >
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback>
                    {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{user.displayName}</p>
                    {user.isVerified && (
                      <span className="text-primary text-xs">✓</span>
                    )}
                  </div>
                  {user.username && (
                    <p className="text-sm text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  )}
                </div>
              </Link>
              {!isOwnAccount && currentUser && (
                <Button
                  variant={isUserFollowing ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => handleFollowToggle(user.id)}
                  className="ml-2 flex-shrink-0"
                >
                  {isUserFollowing ? (
                    <>
                      <UserCheck className="h-4 w-4 mr-1" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-1" />
                      Follow
                    </>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {activeTab === 'followers' ? 'Followers' : 'Following'}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'followers' | 'following')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers">
              Followers ({followerCount})
            </TabsTrigger>
            <TabsTrigger value="following">
              Following ({followingCount})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="followers" className="mt-4">
            {renderUserList(followers)}
          </TabsContent>
          
          <TabsContent value="following" className="mt-4">
            {renderUserList(following)}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
