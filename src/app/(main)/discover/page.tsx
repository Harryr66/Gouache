'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArtworkTile } from '@/components/artwork-tile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { Search, Filter, Star, TrendingUp, Clock, UserPlus, UserCheck, Instagram, Twitter, Globe, Calendar, ExternalLink, MapPin, CheckCircle } from 'lucide-react';
import { Artwork, Artist } from '@/lib/types';
import { ThemeLoading } from '@/components/theme-loading';
import { useFollow } from '@/providers/follow-provider';
import { usePlaceholder } from '@/hooks/use-placeholder';
import Link from 'next/link';

// Categories for filtering
const categories = [
  'All',
  'Oil Painting',
  'Acrylic Painting',
  'Watercolor',
  'Charcoal Drawing',
  'Pencil Drawing',
  'Ink Drawing',
  'Pastel Drawing',
  'Gouache',
  'Tempera',
  'Fresco',
  'Encaustic',
  'Sculpture',
  'Pottery & Ceramics',
  'Mixed Media',
  'Abstract',
  'Realism',
  'Impressionism',
  'Expressionism'
];

// Countries for filtering
const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 
  'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland',
  'Japan', 'South Korea', 'China', 'India', 'Brazil', 'Mexico', 
  'Argentina', 'Colombia', 'South Africa', 'Egypt', 'Morocco',
  'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Portugal',
  'Greece', 'Turkey', 'Israel', 'United Arab Emirates', 'Singapore',
  'New Zealand', 'Ireland', 'Austria', 'Czech Republic', 'Russia'
];

// Mock artists data
const mockArtists: Artist[] = [
  {
    id: 'artist-1',
      name: 'Elena Vance',
      handle: 'elena_vance',
    bio: 'Abstract expressionist painter exploring the intersection of color and emotion. My work delves into the subconscious, bringing forth vivid emotional landscapes that challenge perception.',
    followerCount: 12500,
      followingCount: 89,
      createdAt: new Date('2023-01-15'),
    isVerified: true,
      isProfessional: true,
    location: 'New York, NY',
    countryOfOrigin: 'United States',
    countryOfResidence: 'United States',
    socialLinks: {
      instagram: 'https://instagram.com/elena_vance',
      twitter: 'https://twitter.com/elena_vance',
      website: 'https://elena-vance.com'
    }
  },
  {
    id: 'artist-2',
      name: 'Marcus Chen',
      handle: 'marcus_chen',
    bio: 'Digital and traditional artist creating futuristic cityscapes and urban narratives. Specializing in mixed media that bridges the gap between physical and digital art.',
    followerCount: 21000,
      followingCount: 156,
      createdAt: new Date('2022-11-20'),
    isVerified: true,
      isProfessional: true,
    location: 'Los Angeles, CA',
    countryOfOrigin: 'China',
    countryOfResidence: 'United States',
    socialLinks: {
      instagram: 'https://instagram.com/marcus_chen',
      twitter: 'https://twitter.com/marcuschen',
      website: 'https://marcuschen.art'
    }
  },
  {
    id: 'artist-3',
      name: 'Sophia Rodriguez',
    handle: 'sophia_rodriguez',
    bio: 'Contemporary sculptor working with bronze, stone, and mixed materials. My sculptures explore themes of identity, culture, and human connection.',
    followerCount: 8900,
      followingCount: 234,
    createdAt: new Date('2021-06-10'),
    isVerified: true,
    isProfessional: true,
    location: 'Barcelona, Spain',
    countryOfOrigin: 'Spain',
    countryOfResidence: 'Spain',
    socialLinks: {
      instagram: 'https://instagram.com/sophia_rodriguez_art',
      website: 'https://sophiarodriguez.com'
    }
  },
  {
    id: 'artist-4',
    name: 'Yuki Tanaka',
    handle: 'yuki_tanaka',
    bio: 'Japanese watercolor artist specializing in traditional techniques with modern subjects. Exploring the beauty of nature through delicate brushwork.',
    followerCount: 15400,
    followingCount: 92,
    createdAt: new Date('2022-03-05'),
    isVerified: true,
    isProfessional: true,
    location: 'Tokyo, Japan',
    countryOfOrigin: 'Japan',
    countryOfResidence: 'Japan',
    socialLinks: {
      instagram: 'https://instagram.com/yuki_tanaka_art',
      website: 'https://yukitanaka.jp'
    }
  },
  {
    id: 'artist-5',
    name: 'Amara Okafor',
    handle: 'amara_okafor',
    bio: 'Nigerian-British contemporary artist exploring identity, diaspora, and cultural heritage through mixed media and installation art.',
    followerCount: 9800,
    followingCount: 145,
    createdAt: new Date('2021-09-12'),
    isVerified: true,
    isProfessional: true,
    location: 'London, UK',
    countryOfOrigin: 'Nigeria',
    countryOfResidence: 'United Kingdom',
    socialLinks: {
      instagram: 'https://instagram.com/amara.okafor',
      twitter: 'https://twitter.com/amaraokafor',
      website: 'https://amaraokafor.com'
    }
  },
  {
    id: 'artist-6',
    name: 'Lars Bergström',
    handle: 'lars_bergstrom',
    bio: 'Swedish minimalist painter creating serene landscapes inspired by Scandinavian nature and light. Working primarily with oils and acrylics.',
    followerCount: 11200,
    followingCount: 67,
    createdAt: new Date('2020-11-30'),
    isVerified: true,
    isProfessional: true,
    location: 'Stockholm, Sweden',
    countryOfOrigin: 'Sweden',
    countryOfResidence: 'Sweden',
    socialLinks: {
      instagram: 'https://instagram.com/lars.bergstrom.art',
      website: 'https://larsbergstrom.se'
    }
  },
  {
    id: 'artist-7',
    name: 'Isabella Costa',
    handle: 'isabella_costa',
    bio: 'Brazilian abstract expressionist bringing vibrant colors and rhythmic energy to canvas. Influenced by tropical landscapes and carnival culture.',
    followerCount: 18700,
    followingCount: 203,
    createdAt: new Date('2021-02-18'),
    isVerified: true,
      isProfessional: true,
    location: 'Rio de Janeiro, Brazil',
    countryOfOrigin: 'Brazil',
    countryOfResidence: 'Brazil',
    socialLinks: {
      instagram: 'https://instagram.com/isabella.costa.art',
      website: 'https://isabellacosta.com.br'
    }
  },
  {
    id: 'artist-8',
    name: 'Ahmed Hassan',
    handle: 'ahmed_hassan',
    bio: 'Egyptian calligraphy artist blending traditional Arabic script with contemporary design. Bridging ancient and modern visual languages.',
    followerCount: 7600,
    followingCount: 88,
    createdAt: new Date('2022-07-22'),
    isVerified: false,
    isProfessional: true,
    location: 'Cairo, Egypt',
    countryOfOrigin: 'Egypt',
    countryOfResidence: 'Egypt',
    socialLinks: {
      instagram: 'https://instagram.com/ahmed_hassan_calligraphy'
    }
  }
];

export default function DiscoverPage() {
  const router = useRouter();
  const { followArtist, unfollowArtist, isFollowing } = useFollow();
  const { generatePlaceholderUrl, generateAvatarPlaceholderUrl } = usePlaceholder();
  
  const [view, setView] = useState<'artworks' | 'artists'>('artworks');
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [activeArtFilter, setActiveArtFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCountryOfOrigin, setSelectedCountryOfOrigin] = useState<string>('all');
  const [selectedCountryOfResidence, setSelectedCountryOfResidence] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Generate mock artworks for each artist
  const generateArtworksForArtist = (artist: Artist, count: number = 12) => {
    const artworks: Artwork[] = [];
    const categories = ['Abstract', 'Sculpture', 'Mixed Media', 'Oil Painting', 'Acrylic Painting', 'Watercolor'];
    const mediums = ['Oil on Canvas', 'Acrylic', 'Bronze', 'Mixed Media', 'Watercolor', 'Ceramic'];
    
    for (let i = 0; i < count; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const medium = mediums[Math.floor(Math.random() * mediums.length)];
      
      artworks.push({
        id: `artwork-${artist.id}-${i}`,
        artist,
        title: `${category} ${i + 1}`,
        description: `A beautiful ${category.toLowerCase()} piece by ${artist.name}`,
        imageUrl: generatePlaceholderUrl(600, 600),
        imageAiHint: `${category} artwork`,
        discussionId: `discussion-${artist.id}-${i}`,
        tags: [category.toLowerCase(), 'art'],
        price: Math.floor(Math.random() * 5000) + 500,
        currency: 'USD',
        isForSale: Math.random() > 0.3,
        category,
        medium,
        dimensions: { width: 24, height: 30, unit: 'in' },
        createdAt: new Date(),
        updatedAt: new Date(),
        views: Math.floor(Math.random() * 5000),
        likes: Math.floor(Math.random() * 500),
      });
    }
    
    return artworks;
  };

  // Mock events for artist
  const generateEventsForArtist = (artist: Artist) => [
    {
      id: `event-${artist.id}-1`,
      title: `${artist.name} - Gallery Opening`,
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      location: artist.location || 'TBA',
      type: 'Exhibition'
    },
    {
      id: `event-${artist.id}-2`,
      title: 'Live Art Workshop',
      date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      location: 'Virtual Event',
      type: 'Workshop'
    }
  ];

  const handleFollowToggle = (artist: Artist) => {
    if (isFollowing(artist.id)) {
      unfollowArtist(artist.id);
    } else {
      followArtist(artist.id);
    }
  };

  const filteredArtists = mockArtists.filter(artist => {
    // Search term filter
    if (searchTerm) {
      const matchesSearch = artist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           artist.bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           artist.handle.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
    }
    
    // Country of origin filter
    if (selectedCountryOfOrigin !== 'all') {
      if (artist.countryOfOrigin !== selectedCountryOfOrigin) return false;
    }
    
    // Country of residence filter
    if (selectedCountryOfResidence !== 'all') {
      if (artist.countryOfResidence !== selectedCountryOfResidence) return false;
    }
    
    return true;
  });
  
  // Get unique countries from artists for filter options
  const availableOriginCountries = Array.from(new Set(mockArtists.map(a => a.countryOfOrigin).filter(Boolean))) as string[];
  const availableResidenceCountries = Array.from(new Set(mockArtists.map(a => a.countryOfResidence).filter(Boolean))) as string[];
  
  // Clear filters function
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedCountryOfOrigin('all');
    setSelectedCountryOfResidence('all');
  };
  
  // Count active filters
  const activeFiltersCount = [
    selectedCountryOfOrigin !== 'all',
    selectedCountryOfResidence !== 'all',
    selectedCategory !== 'All'
  ].filter(Boolean).length;

  if (selectedArtist) {
    const artistArtworks = generateArtworksForArtist(selectedArtist);
    const artistEvents = generateEventsForArtist(selectedArtist);
    const following = isFollowing(selectedArtist.id);

    return (
      <div className="min-h-screen bg-background">
        {/* Back Button */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3">
            <Button variant="ghost" onClick={() => setSelectedArtist(null)} className="mb-2">
              ← Back to Discover
            </Button>
          </div>
        </div>

        {/* Artist Profile Header - Compact Layout */}
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left: Avatar */}
              <div className="flex-shrink-0">
                <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                  <AvatarImage src={selectedArtist.avatarUrl || generateAvatarPlaceholderUrl(128, 128)} alt={selectedArtist.name} />
                  <AvatarFallback>{selectedArtist.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>

              {/* Right: Info */}
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-3xl font-bold">{selectedArtist.name}</h1>
                      {selectedArtist.isVerified && (
                        <CheckCircle className="h-6 w-6 text-blue-500 fill-blue-500" />
                      )}
                    </div>
                    <p className="text-muted-foreground">@{selectedArtist.handle}</p>
                  </div>
                  <Button
                    variant={following ? "outline" : "default"}
                    onClick={() => handleFollowToggle(selectedArtist)}
                    className="flex items-center gap-2"
                  >
                    {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                    {following ? 'Following' : 'Follow'}
                  </Button>
                </div>

                {/* Bio */}
                <p className="text-sm leading-relaxed">{selectedArtist.bio}</p>

                {/* Stats */}
                <div className="flex items-center gap-6 flex-wrap text-sm">
                  <div>
                    <span className="font-bold">{selectedArtist.followerCount.toLocaleString()}</span>
                    <span className="text-muted-foreground ml-1">followers</span>
                  </div>
                  <div>
                    <span className="font-bold">{selectedArtist.followingCount.toLocaleString()}</span>
                    <span className="text-muted-foreground ml-1">following</span>
                  </div>
                  {selectedArtist.location && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {selectedArtist.location}
                    </div>
                  )}
                </div>

                {/* Social Links */}
                {selectedArtist.socialLinks && (
                  <div className="flex items-center gap-3 flex-wrap">
                    {selectedArtist.socialLinks.website && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={selectedArtist.socialLinks.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4 mr-2" />
                          Website
                        </a>
                      </Button>
                    )}
                    {selectedArtist.socialLinks.instagram && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={selectedArtist.socialLinks.instagram} target="_blank" rel="noopener noreferrer">
                          <Instagram className="h-4 w-4 mr-2" />
                          Instagram
                        </a>
                      </Button>
                    )}
                    {selectedArtist.socialLinks.twitter && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={selectedArtist.socialLinks.twitter} target="_blank" rel="noopener noreferrer">
                          <Twitter className="h-4 w-4 mr-2" />
                          Twitter
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="container mx-auto px-4 py-6">
          <Tabs defaultValue="portfolio" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="portfolio">Portfolio ({artistArtworks.length})</TabsTrigger>
              <TabsTrigger value="events">Events ({artistEvents.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="portfolio" className="mt-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {artistArtworks.map((artwork) => (
                  <ArtworkTile key={artwork.id} artwork={artwork} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="events" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {artistEvents.map((event) => (
                  <Card key={event.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{event.title}</CardTitle>
                          <CardDescription className="mt-1">
                            <Badge variant="secondary" className="mr-2">{event.type}</Badge>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {event.date.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {artistEvents.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    No upcoming events scheduled
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
    <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold mb-2">Discover</h1>
          <p className="text-muted-foreground">Explore artworks and artists from around the world</p>
        </div>
        </div>

      {/* Search & Filters */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
                placeholder="Search artists and artworks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as 'artworks' | 'artists')} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="artworks">Artworks</TabsTrigger>
                <TabsTrigger value="artists">Artists</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="flex gap-3 mt-3 overflow-x-auto pb-2 flex-wrap">
            {view === 'artworks' && (
              <>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
            
            {view === 'artists' && (
              <>
                <Select value={selectedCountryOfOrigin} onValueChange={setSelectedCountryOfOrigin}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Country of Origin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Origins</SelectItem>
                    {availableOriginCountries.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedCountryOfResidence} onValueChange={setSelectedCountryOfResidence}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Country of Residence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Residences</SelectItem>
                    {availableResidenceCountries.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
                {activeFiltersCount > 0 && (
                  <Button variant="outline" onClick={clearFilters} className="whitespace-nowrap">
                    Clear Filters ({activeFiltersCount})
                  </Button>
                )}
              </>
            )}
            
            <Link href="/search">
              <Button variant="outline" className="whitespace-nowrap">
                <Filter className="h-4 w-4 mr-2" />
                Advanced Search
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {view === 'artists' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArtists.map((artist) => {
              const following = isFollowing(artist.id);
              return (
                <Card key={artist.id} className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden">
                  <div onClick={() => setSelectedArtist(artist)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-16 w-16 border-2 border-background">
                          <AvatarImage src={artist.avatarUrl || generateAvatarPlaceholderUrl(64, 64)} alt={artist.name} />
                          <AvatarFallback>{artist.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg truncate">{artist.name}</CardTitle>
                            {artist.isVerified && (
                              <CheckCircle className="h-4 w-4 text-blue-500 fill-blue-500 flex-shrink-0" />
                            )}
                          </div>
                          <CardDescription className="truncate">@{artist.handle}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">{artist.bio}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div>
                          <span className="font-bold text-foreground">{artist.followerCount.toLocaleString()}</span> followers
                        </div>
                        {artist.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{artist.location}</span>
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div className="flex items-center gap-2">
          <Button
                          variant={following ? "outline" : "default"}
            size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFollowToggle(artist);
                          }}
                          className="flex-1"
                        >
                          {following ? <UserCheck className="h-3 w-3 mr-1" /> : <UserPlus className="h-3 w-3 mr-1" />}
                          {following ? 'Following' : 'Follow'}
          </Button>
          <Button
                          variant="ghost"
            size="sm"
                          onClick={() => setSelectedArtist(artist)}
                        >
                          View Profile
          </Button>
        </div>
                    </CardContent>
          </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div>
            {/* Featured Artists Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Featured Artists</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mockArtists.slice(0, 3).map((artist) => {
                  const following = isFollowing(artist.id);
                  return (
                    <Card key={artist.id} className="group hover:shadow-lg transition-all cursor-pointer" onClick={() => setSelectedArtist(artist)}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={artist.avatarUrl || generateAvatarPlaceholderUrl(48, 48)} alt={artist.name} />
                            <AvatarFallback>{artist.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <CardTitle className="text-base truncate">{artist.name}</CardTitle>
                              {artist.isVerified && <CheckCircle className="h-3 w-3 text-blue-500 fill-blue-500" />}
                            </div>
                            <CardDescription className="text-xs truncate">@{artist.handle}</CardDescription>
                          </div>
                          <Button
                            variant={following ? "outline" : "ghost"}
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFollowToggle(artist);
                            }}
                          >
                            {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground line-clamp-2">{artist.bio}</p>
                      </CardContent>
                    </Card>
                  );
                })}
          </div>
            </div>

            {/* All Artworks Grid */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">All Artworks</h2>
              <span className="text-sm text-muted-foreground">Showing artworks from all artists</span>
          </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {mockArtists.flatMap(artist => generateArtworksForArtist(artist, 6)).map((artwork) => (
                <ArtworkTile key={artwork.id} artwork={artwork} />
              ))}
            </div>

            {isLoading && (
              <div className="flex justify-center py-12">
                <ThemeLoading text="Loading more artworks..." size="md" />
          </div>
        )}
          </div>
        )}
      </div>
    </div>
  );
}
