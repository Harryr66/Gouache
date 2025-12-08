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
import { useTheme } from 'next-themes';

const generatePlaceholderArtworks = (theme: string | undefined, count: number = 20): Artwork[] => {
  const placeholderImage = theme === 'dark' 
    ? '/assets/placeholder-dark.png' 
    : '/assets/placeholder-light.png';
  
  const artistNames = [
    'Alexandra Chen', 'Marcus Rivera', 'Sophie Laurent', 'David Kim', 'Emma Thompson',
    'James Wilson', 'Isabella Garcia', 'Oliver Brown', 'Maya Patel', 'Lucas Anderson',
    'Chloe Martinez', 'Noah Taylor', 'Ava Johnson', 'Ethan Davis', 'Zoe White',
    'Liam Harris', 'Mia Clark', 'Aiden Lewis', 'Lily Walker', 'Jackson Hall'
  ];
  
  const titles = [
    'Abstract Composition', 'Urban Landscape', 'Portrait Study', 'Nature Series',
    'Geometric Forms', 'Color Exploration', 'Emotional Expression', 'Minimalist Study',
    'Dynamic Movement', 'Still Life', 'Contemporary Vision', 'Traditional Technique',
    'Experimental Work', 'Mixed Media', 'Digital Art', 'Watercolor Study',
    'Oil Painting', 'Charcoal Drawing', 'Acrylic Piece', 'Ink Illustration'
  ];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `placeholder-${i + 1}`,
    title: titles[i % titles.length],
    description: 'A beautiful artwork showcasing artistic expression and creativity.',
    imageUrl: placeholderImage,
    imageAiHint: 'Placeholder artwork',
    artist: {
      id: `placeholder-artist-${i + 1}`,
      name: artistNames[i % artistNames.length],
      handle: `artist${i + 1}`,
      avatarUrl: null,
      isVerified: i % 3 === 0,
      isProfessional: true,
      followerCount: Math.floor(Math.random() * 5000) + 100,
      followingCount: Math.floor(Math.random() * 500) + 50,
      createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
    },
    likes: Math.floor(Math.random() * 500) + 10,
    commentsCount: Math.floor(Math.random() * 50) + 2,
    createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
    updatedAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
    category: ['Painting', 'Drawing', 'Digital', 'Mixed Media'][i % 4],
    medium: ['Oil', 'Acrylic', 'Watercolor', 'Charcoal', 'Digital'][i % 5],
    tags: ['art', 'creative', 'contemporary', 'modern'],
    aiAssistance: 'none' as const,
    isAI: false,
  }));
};

export default function DiscoverPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings: discoverSettings } = useDiscoverSettings();
  const { theme } = useTheme();

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
        
        // Always add placeholder artworks to simulate the feed
        const placeholderArtworks = generatePlaceholderArtworks(theme, 20);
        setArtworks([...fetchedArtworks, ...placeholderArtworks]);
      } catch (error) {
        console.error('Error fetching artworks:', error);
        // Even on error, show placeholder artworks
        const placeholderArtworks = generatePlaceholderArtworks(theme, 20);
        setArtworks(placeholderArtworks);
      } finally {
        setLoading(false);
      }
    };
    
    fetchArtworks();
  }, [discoverSettings, theme]);

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
