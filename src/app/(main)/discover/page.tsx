'use client';

import React, { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ArtworkTile } from '@/components/artwork-tile';
import { Artwork } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { useDiscoverSettings } from '@/providers/discover-settings-provider';
import { ThemeLoading } from '@/components/theme-loading';

export default function DiscoverPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings: discoverSettings } = useDiscoverSettings();

  useEffect(() => {
    const fetchArtworks = async () => {
      try {
        setLoading(true);
        const artworksQuery = query(
          collection(db, 'artworks'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        
        const snapshot = await getDocs(artworksQuery);
        const fetchedArtworks: Artwork[] = [];
        
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          
          // Apply discover settings filters
          if (discoverSettings.hideAiAssistedArt && (data.aiAssistance === 'assisted' || data.aiAssistance === 'generated' || data.isAI)) {
            return; // Skip AI-assisted/generated artworks if hidden
          }
          
          const artwork: Artwork = {
            id: doc.id,
            title: data.title || 'Untitled',
            description: data.description || '',
            imageUrl: data.imageUrl || '',
            imageAiHint: data.imageAiHint || '',
            artist: {
              id: data.artist?.userId || data.artist?.id || '',
              name: data.artist?.name || 'Unknown Artist',
              handle: data.artist?.handle || '',
              avatarUrl: data.artist?.avatarUrl || null,
              isVerified: data.artist?.isVerified || false,
              isProfessional: data.artist?.isProfessional || false,
              followerCount: data.artist?.followerCount || 0,
              followingCount: data.artist?.followingCount || 0,
              createdAt: data.artist?.createdAt?.toDate() || new Date(),
            },
            likes: data.likes || 0,
            commentsCount: data.commentsCount || 0,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || data.createdAt?.toDate() || new Date(),
            category: data.category || '',
            medium: data.medium || '',
            tags: data.tags || [],
            aiAssistance: data.aiAssistance || 'none',
            isAI: data.isAI || false,
          };
          
          fetchedArtworks.push(artwork);
        });
        
        setArtworks(fetchedArtworks);
      } catch (error) {
        console.error('Error fetching artworks:', error);
        toast({
          title: 'Error loading artworks',
          description: 'Failed to load the discover feed. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchArtworks();
  }, [discoverSettings]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ThemeLoading text="Loading discover feed..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            Discover
          </h1>
          <p className="text-muted-foreground">
            Discover New Artists, Upcoming Exhibitions, Events & More
          </p>
        </div>

        {artworks.length === 0 ? (
          <div className="text-center py-16">
            <Eye className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No artworks found</h2>
            <p className="text-muted-foreground">
              Check back later for new content.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {artworks.map((artwork) => (
              <ArtworkTile key={artwork.id} artwork={artwork} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
