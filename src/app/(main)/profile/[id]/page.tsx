
'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProfileHeader } from '@/components/profile-header';
import { ProfileTabs } from '@/components/profile-tabs';
import { useAuth } from '@/providers/auth-provider';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ArtistProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const artistId = params.id as string;
  
  const [profileUser, setProfileUser] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'userProfiles', artistId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          
          // Convert portfolio items from Firestore format (with Timestamps) to Date objects
          const portfolio = (data.portfolio || []).map((item: any) => ({
            ...item,
            createdAt: item.createdAt?.toDate?.() || (item.createdAt instanceof Date ? item.createdAt : new Date())
          }));
          
          // Map Firestore data to ProfileHeader expected format
          const profileData = {
            id: userDoc.id,
            displayName: data.name || data.displayName || 'User',
            username: data.handle || data.username || `user_${userDoc.id}`,
            avatarUrl: data.avatarUrl || undefined,
            bannerImageUrl: data.bannerImageUrl || undefined,
            bio: data.bio || '',
            location: data.location || '',
            countryOfOrigin: data.countryOfOrigin || '',
            countryOfResidence: data.countryOfResidence || '',
            followerCount: data.followerCount || 0,
            followingCount: data.followingCount || 0,
            isProfessional: data.isProfessional || false,
            profileRingColor: data.profileRingColor || undefined,
            tipJarEnabled: data.tipJarEnabled || false,
            suggestionsEnabled: data.suggestionsEnabled || false,
            hideLocation: data.hideLocation || false,
            hideFlags: data.hideFlags || false,
            hideCard: data.hideCard || false,
            hideUpcomingEvents: data.hideUpcomingEvents || false,
            hideShowcaseLocations: data.hideShowcaseLocations || false,
            // Default to hidden until explicitly enabled
            hideShop: data.hideShop ?? true,
            hideLearn: data.hideLearn ?? true,
            eventCity: data.eventCity || undefined,
            eventCountry: data.eventCountry || undefined,
            eventDate: data.eventDate || undefined,
            showcaseLocations: data.showcaseLocations || [],
            newsletterLink: data.newsletterLink || undefined,
            portfolio: portfolio, // Include portfolio for ProfileTabs
          };
          
          console.log('📋 Profile loaded:', {
            id: profileData.id,
            name: profileData.displayName,
            username: profileData.username,
            portfolioCount: portfolio.length,
            isProfessional: profileData.isProfessional
          });
          
          setProfileUser(profileData);
        } else {
          console.error('❌ Profile not found:', artistId);
          notFound();
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        notFound();
      } finally {
        setLoading(false);
      }
    };

    if (artistId) {
      fetchProfile();
    }
  }, [artistId]);

  const handleFollowToggle = async () => {
    // TODO: Implement follow/unfollow logic
    setIsFollowing(!isFollowing);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-24"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    notFound();
  }

  const isOwnProfile = user?.id === artistId;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="space-y-8">
        <ProfileHeader
          user={profileUser}
          isOwnProfile={isOwnProfile}
          isFollowing={isFollowing}
          onFollowToggle={handleFollowToggle}
        />

        <ProfileTabs
          userId={artistId}
          isOwnProfile={isOwnProfile}
          isProfessional={profileUser.isProfessional || false}
          hideShop={profileUser.hideShop || false}
          hideLearn={profileUser.hideLearn || false}
        />
      </div>
    </div>
  );
}
