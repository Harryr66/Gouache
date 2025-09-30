'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArtworkTile } from '@/components/artwork-tile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { Search, Filter, Star, TrendingUp, Clock } from 'lucide-react';
import { Artwork } from '@/lib/types';

// Generate SOMA placeholder URLs
const generatePlaceholderUrl = (width: number = 400, height: number = 400) => {
  // Use CSS custom properties that will adapt to theme changes
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="var(--muted)" stroke="var(--border)" stroke-width="1"/>
      <text x="50%" y="50%" text-anchor="middle" fill="var(--muted-foreground)" font-family="Arial, sans-serif" font-size="32" font-weight="bold">SOMA</text>
    </svg>
  `)}`;
};

// Generate SOMA avatar placeholder URLs
const generateAvatarPlaceholderUrl = (width: number = 150, height: number = 150) => {
  // Check if we're in light mode by looking at the document's class or theme
  const isLightMode = typeof window !== 'undefined' && 
    (document.documentElement.classList.contains('light') || 
     !document.documentElement.classList.contains('dark'));
  
  const backgroundColor = isLightMode ? '#f8f9fa' : '#1f2937'; // very light gray or dark gray
  const textColor = isLightMode ? '#6b7280' : '#ffffff'; // medium gray or white
  
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}"/>
      <text x="50%" y="50%" text-anchor="middle" fill="${textColor}" font-family="Arial, sans-serif" font-size="24" font-weight="bold">SOMA</text>
    </svg>
  `)}`;
};

// Mock data for discover page
const mockArtworks: Artwork[] = [
  {
    id: '1',
    artist: {
      id: 'elena',
      name: 'Elena Vance',
      handle: 'elena_vance',
      avatarUrl: generateAvatarPlaceholderUrl(150, 150),
      followerCount: 1250,
      followingCount: 89,
      createdAt: new Date('2023-01-15'),
      isProfessional: true,
      isVerified: true
    },
    title: 'Abstract Harmony',
    description: 'A vibrant abstract piece exploring the relationship between color and emotion.',
    imageUrl: generatePlaceholderUrl(400, 400),
    imageAiHint: 'Abstract painting with vibrant colors',
    discussionId: 'discussion-1',
    tags: ['abstract', 'color', 'emotion'],
    price: 250,
    currency: 'USD',
    isForSale: true,
    category: 'Abstract',
    medium: 'Oil on Canvas',
    dimensions: { width: 24, height: 30, unit: 'in' },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    views: 156,
    likes: 42,
    isAI: false,
    aiAssistance: 'none'
  },
  {
    id: '2',
    artist: {
      id: 'marcus',
      name: 'Marcus Chen',
      handle: 'marcus_chen',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      followerCount: 2100,
      followingCount: 156,
      createdAt: new Date('2022-11-20'),
      isProfessional: true,
      isVerified: true
    },
    title: 'Digital Dreams',
    description: 'A futuristic cityscape rendered in digital art, exploring themes of urban isolation.',
    imageUrl: generatePlaceholderUrl(400, 400),
    imageAiHint: 'Digital artwork featuring futuristic cityscape',
    discussionId: 'discussion-2',
    tags: ['digital', 'cityscape', 'futuristic'],
    price: 150,
    currency: 'USD',
    isForSale: true,
    category: 'Digital Art',
    medium: 'Digital',
    dimensions: { width: 1920, height: 1080, unit: 'px' },
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    views: 89,
    likes: 23,
    isAI: true,
    aiAssistance: 'assisted'
  },
  {
    id: '3',
    artist: {
      id: 'sophia',
      name: 'Sophia Rodriguez',
      handle: 'sophia_art',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      followerCount: 890,
      followingCount: 234,
      createdAt: new Date('2023-03-10'),
      isProfessional: true,
      isVerified: false
    },
    title: 'Ceramic Contemplation',
    description: 'A hand-crafted ceramic sculpture representing the beauty of human contemplation.',
    imageUrl: generatePlaceholderUrl(400, 400),
    imageAiHint: 'Ceramic sculpture of a woman in contemplation',
    discussionId: 'discussion-3',
    tags: ['ceramic', 'sculpture', 'contemplation'],
    price: 500,
    currency: 'USD',
    isForSale: true,
    category: 'Sculpture',
    medium: 'Ceramic',
    dimensions: { width: 12, height: 18, unit: 'in' },
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    views: 67,
    likes: 15,
    isAI: false,
    aiAssistance: 'none'
  }
];

const categories = [
  'All',
  'Abstract',
  'Digital Art',
  'Photography',
  'Sculpture',
  'Painting',
  'Mixed Media',
  'NFTs'
];

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'trending', label: 'Trending' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' }
];

export default function DiscoverPage() {
  const router = useRouter();
  const [allArtworks, setAllArtworks] = useState<Artwork[]>(mockArtworks);
  const [artworks, setArtworks] = useState<Artwork[]>(mockArtworks);
  const [filteredArtworks, setFilteredArtworks] = useState<Artwork[]>(mockArtworks);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [activeArtFilter, setActiveArtFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Generate more artworks for infinite scroll
  const generateMoreArtworks = useCallback(() => {
    const newArtworks: Artwork[] = [];
    const artists = ['Elena Vance', 'Marcus Chen', 'Sophia Rodriguez', 'Alex Rivera', 'Maya Patel', 'David Kim', 'Emma Wilson', 'James Brown'];
    const titles = ['Abstract Harmony', 'Digital Dreams', 'Ceramic Contemplation', 'Urban Reflections', 'Nature\'s Symphony', 'Cosmic Journey', 'Emotional Landscapes', 'Minimalist Forms'];
    const categories = ['Abstract', 'Digital Art', 'Photography', 'Sculpture', 'Painting', 'Mixed Media'];
    const mediums = ['Oil on Canvas', 'Digital', 'Acrylic', 'Watercolor', 'Ceramic', 'Bronze', 'Mixed Media'];
    
    for (let i = 0; i < 9; i++) {
      const randomArtist = artists[Math.floor(Math.random() * artists.length)];
      const randomTitle = titles[Math.floor(Math.random() * titles.length)];
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      const randomMedium = mediums[Math.floor(Math.random() * mediums.length)];
      const randomPrice = Math.floor(Math.random() * 800) + 100;
      const randomViews = Math.floor(Math.random() * 500) + 10;
      const randomLikes = Math.floor(Math.random() * 100) + 5;
      
      newArtworks.push({
        id: `artwork-${Date.now()}-${i}`,
        artist: {
          id: `artist-${i}`,
          name: randomArtist,
          handle: randomArtist.toLowerCase().replace(' ', '_'),
          avatarUrl: generateAvatarPlaceholderUrl(150, 150),
          followerCount: Math.floor(Math.random() * 2000) + 100,
          followingCount: Math.floor(Math.random() * 200) + 10,
          createdAt: new Date('2023-01-01'),
          isProfessional: true,
          isVerified: Math.random() > 0.5
        },
        title: `${randomTitle} ${i + 1}`,
        description: `A beautiful ${randomCategory.toLowerCase()} piece that explores themes of creativity and expression.`,
        imageUrl: generatePlaceholderUrl(400, 400),
        imageAiHint: `${randomCategory} artwork`,
        discussionId: `discussion-${Date.now()}-${i}`,
        tags: [randomCategory.toLowerCase(), 'art', 'creative'],
        price: randomPrice,
        currency: 'USD',
        isForSale: true,
        category: randomCategory,
        medium: randomMedium,
        dimensions: { width: 24, height: 30, unit: 'in' },
        createdAt: new Date(),
        updatedAt: new Date(),
        views: randomViews,
        likes: randomLikes,
        isAI: Math.random() > 0.7,
        aiAssistance: Math.random() > 0.7 ? 'assisted' : 'none'
      });
    }
    
    return newArtworks;
  }, []);

  const loadMoreArtworks = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newArtworks = generateMoreArtworks();
    setAllArtworks(prev => [...prev, ...newArtworks]);
    setArtworks(prev => [...prev, ...newArtworks]);
    
    // Simulate end of content after 5 pages (45 total artworks)
    if (allArtworks.length + newArtworks.length >= 45) {
      setHasMore(false);
    }
    
    setIsLoading(false);
  }, [isLoading, hasMore, allArtworks.length, generateMoreArtworks]);

  useEffect(() => {
    filterAndSortArtworks();
  }, [artworks, searchTerm, selectedCategory, sortBy]);

  // Infinite scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
        loadMoreArtworks();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMoreArtworks]);

  const filterAndSortArtworks = () => {
    let filtered = [...artworks];

    // Only show artworks from professional artists
    filtered = filtered.filter(artwork => artwork.artist.isProfessional === true);

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(artwork =>
        artwork.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artwork.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artwork.artist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artwork.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(artwork => artwork.category === selectedCategory);
    }

    // Sort artworks
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'popular':
          return (b.likes || 0) - (a.likes || 0);
        case 'trending':
          return (b.views || 0) - (a.views || 0);
        case 'price-low':
          return (a.price || 0) - (b.price || 0);
        case 'price-high':
          return (b.price || 0) - (a.price || 0);
        default:
          return 0;
      }
    });

    setFilteredArtworks(filtered);
  };

  const handleArtworkClick = (artwork: Artwork) => {
    router.push(`/artwork/${artwork.id}`);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">SOMA Discover</h1>
          <p className="text-muted-foreground">
            Explore amazing artworks from professional artists around the world
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search artworks, artists, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Advanced Search Link */}
          <Button 
            variant="outline" 
            onClick={() => router.push('/search')}
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Advanced Search
          </Button>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort Filter */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeArtFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveArtFilter('all')}
          >
            All
          </Button>
          <Button
            variant={activeArtFilter === 'trending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveArtFilter('trending')}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Trending
          </Button>
          <Button
            variant={activeArtFilter === 'new' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveArtFilter('new')}
          >
            <Clock className="h-4 w-4 mr-1" />
            New
          </Button>
          <Button
            variant={activeArtFilter === 'featured' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveArtFilter('featured')}
          >
            <Star className="h-4 w-4 mr-1" />
            Featured
          </Button>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredArtworks.length} artwork{filteredArtworks.length !== 1 ? 's' : ''} found
          </p>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filters applied</span>
          </div>
        </div>

        {/* Artworks Grid/List */}
        {filteredArtworks.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No artworks found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms or filters to find what you're looking for.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredArtworks.map((artwork) => (
              <ArtworkTile
                key={`${activeArtFilter}-${artwork.id}-${Math.random()}`}
                artwork={artwork}
                onClick={() => handleArtworkClick(artwork)}
              />
            ))}
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-muted-foreground">Loading more artworks...</span>
            </div>
          </div>
        )}

        {/* End of Content */}
        {!hasMore && !isLoading && filteredArtworks.length > 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">You've reached the end of the discover feed!</p>
          </div>
        )}

        {/* Manual Load More Button (fallback) */}
        {hasMore && !isLoading && filteredArtworks.length > 0 && (
          <div className="flex justify-center">
            <Button variant="outline" size="lg" onClick={loadMoreArtworks}>
              Load More Artworks
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
