'use client';

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { ArtworkTile } from '@/components/artwork-tile';
import { Artwork } from '@/lib/types';
import { Search, Filter, X, DollarSign, Palette, Star, Globe, MapPin, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Generate placeholder URLs
const generatePlaceholderUrl = (width: number = 400, height: number = 400) => {
  let backgroundColor = '#f5f5f5';
  let textColor = '#000000';
  
  if (typeof window !== 'undefined') {
    try {
      if (document.documentElement.classList.contains('dark')) {
        backgroundColor = '#374151';
        textColor = '#ffffff';
      }
    } catch (error) {
      console.warn('Theme detection failed:', error);
    }
  }
  
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}" stroke="#e5e7eb" stroke-width="1"/>
      <text x="50%" y="50%" text-anchor="middle" fill="${textColor}" font-family="Arial, sans-serif" font-size="32" font-weight="bold">SOMA</text>
    </svg>
  `)}`;
};

const generateAvatarPlaceholderUrl = (width: number = 150, height: number = 150) => {
  const isLightMode = typeof window !== 'undefined' && 
    (document.documentElement.classList.contains('light') || 
     !document.documentElement.classList.contains('dark'));
  
  const backgroundColor = isLightMode ? '#f5f5f5' : '#374151';
  const textColor = isLightMode ? '#000000' : '#ffffff';
  
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}"/>
      <text x="50%" y="50%" text-anchor="middle" fill="${textColor}" font-family="Arial, sans-serif" font-size="24" font-weight="bold">SOMA</text>
    </svg>
  `)}`;
};

// Mock artwork data for search
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
      isVerified: true,
      countryOfOrigin: 'United States',
      countryOfResidence: 'United States'
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
    category: 'Oil Painting',
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
      avatarUrl: generateAvatarPlaceholderUrl(150, 150),
      followerCount: 2100,
      followingCount: 156,
      createdAt: new Date('2022-11-20'),
      isProfessional: true,
      isVerified: true,
      countryOfOrigin: 'China',
      countryOfResidence: 'Canada'
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
    category: 'Oil Painting',
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
      avatarUrl: generateAvatarPlaceholderUrl(150, 150),
      followerCount: 890,
      followingCount: 234,
      createdAt: new Date('2023-03-10'),
      isProfessional: true,
      isVerified: false,
      countryOfOrigin: 'Spain',
      countryOfResidence: 'United Kingdom'
    },
    title: 'Watercolor Serenity',
    description: 'A delicate watercolor painting capturing the peaceful essence of nature.',
    imageUrl: generatePlaceholderUrl(400, 400),
    imageAiHint: 'Watercolor painting of nature scene',
    discussionId: 'discussion-3',
    tags: ['watercolor', 'nature', 'serenity'],
    price: 180,
    currency: 'USD',
    isForSale: true,
    category: 'Watercolor',
    medium: 'Watercolor',
    dimensions: { width: 16, height: 20, unit: 'in' },
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    views: 67,
    likes: 15,
    isAI: false,
    aiAssistance: 'none'
  }
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'views', label: 'Most Viewed' },
];

const CATEGORIES = [
  'All',
  'Abstract',
  'Sculpture',
  'Mixed Media',
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
  'Encaustic'
];

const MEDIUMS = [
  'All',
  'Oil on Canvas',
  'Digital',
  'Acrylic',
  'Watercolor',
  'Ceramic',
  'Bronze',
  'Mixed Media',
  'Charcoal',
  'Pencil',
  'Ink',
  'Pastel',
  'Gouache',
  'Tempera',
  'Fresco',
  'Encaustic'
];

const COUNTRIES = [
  'All',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Netherlands',
  'Japan',
  'South Korea',
  'Brazil',
  'Mexico',
  'Argentina',
  'India',
  'China',
  'Russia',
  'Belarus',
  'South Africa',
  'Nigeria',
  'Egypt',
  'Other'
];

const COMMON_TAGS = [
  'abstract',
  'realism',
  'impressionism',
  'expressionism',
  'surrealism',
  'minimalism',
  'contemporary',
  'traditional',
  'modern',
  'classical',
  'nature',
  'portrait',
  'landscape',
  'still-life',
  'figurative',
  'geometric',
  'colorful',
  'monochrome',
  'textured',
  'smooth'
];

export default function SearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMedium, setSelectedMedium] = useState('All');
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [sortBy, setSortBy] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [showForSaleOnly, setShowForSaleOnly] = useState(false);
  const [showAIOnly, setShowAIOnly] = useState(false);
  
  // New filter states
  const [selectedCountryOfOrigin, setSelectedCountryOfOrigin] = useState('All');
  const [selectedCountryOfResidence, setSelectedCountryOfResidence] = useState('All');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  // Hide filters for Additional Filters section
  const [hideDigitalArt, setHideDigitalArt] = useState(false);
  const [hideAIAssistedArt, setHideAIAssistedArt] = useState(false);
  const [hideNFTs, setHideNFTs] = useState(false);
  
  const filteredArtworks = useMemo(() => {
    let filtered = mockArtworks.filter(artwork => {
      // Search query filter
      const matchesSearch = searchQuery === '' || 
        artwork.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artwork.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artwork.artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artwork.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // Category filter
      const matchesCategory = selectedCategory === 'All' || artwork.category === selectedCategory;

      // Medium filter
      const matchesMedium = selectedMedium === 'All' || artwork.medium === selectedMedium;

      // Price range filter
      const matchesPrice = (artwork.price || 0) >= priceRange[0] && (artwork.price || 0) <= priceRange[1];

      // Verified artists filter
      const matchesVerified = !showVerifiedOnly || artwork.artist.isVerified;

      // For sale filter
      const matchesForSale = !showForSaleOnly || artwork.isForSale;

      // AI filter
      const matchesAI = !showAIOnly || artwork.isAI;

      // Country of origin filter
      const matchesCountryOfOrigin = selectedCountryOfOrigin === 'All' || 
        (artwork.artist as any).countryOfOrigin === selectedCountryOfOrigin;

      // Country of residence filter
      const matchesCountryOfResidence = selectedCountryOfResidence === 'All' || 
        (artwork.artist as any).countryOfResidence === selectedCountryOfResidence;

      // Tags filter
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.some(tag => artwork.tags?.some(artworkTag => 
          artworkTag.toLowerCase().includes(tag.toLowerCase())
        ));

      // Hide Digital Art filter
      const matchesHideDigitalArt = !hideDigitalArt || 
        (artwork.category !== 'Digital Art' && artwork.category !== 'Digital Painting');

      // Hide AI Assisted Art filter
      const matchesHideAIAssistedArt = !hideAIAssistedArt || 
        !(artwork.tags?.includes('AI assisted') || artwork.tags?.includes('AI-generated') || 
          artwork.imageAiHint?.toLowerCase().includes('ai') || artwork.imageAiHint?.toLowerCase().includes('artificial intelligence'));

      // Hide NFTs filter
      const matchesHideNFTs = !hideNFTs || 
        !(artwork.category === 'NFT' || artwork.tags?.includes('NFT') || 
          artwork.tags?.includes('blockchain') || artwork.tags?.includes('crypto'));

      return matchesSearch && matchesCategory && matchesMedium && matchesPrice && 
             matchesVerified && matchesForSale && matchesAI && 
             matchesCountryOfOrigin && matchesCountryOfResidence && matchesTags &&
             matchesHideDigitalArt && matchesHideAIAssistedArt && matchesHideNFTs;
    });

    // Sort results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'popular':
          return (b.likes || 0) - (a.likes || 0);
        case 'price-low':
          return (a.price || 0) - (b.price || 0);
        case 'price-high':
          return (b.price || 0) - (a.price || 0);
        case 'views':
          return (b.views || 0) - (a.views || 0);
        default: // relevance
          return 0;
      }
    });

    return filtered;
  }, [searchQuery, selectedCategory, selectedMedium, priceRange, sortBy, showVerifiedOnly, showForSaleOnly, showAIOnly, selectedCountryOfOrigin, selectedCountryOfResidence, selectedTags, hideDigitalArt, hideAIAssistedArt, hideNFTs]);

  const addTag = (tag: string) => {
    if (tag.trim() && !selectedTags.includes(tag.trim())) {
      setSelectedTags([...selectedTags, tag.trim()]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(tagInput);
      setTagInput('');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedMedium('All');
    setPriceRange([0, 1000]);
    setSortBy('relevance');
    setShowVerifiedOnly(false);
    setShowForSaleOnly(false);
    setShowAIOnly(false);
    setSelectedCountryOfOrigin('All');
    setSelectedCountryOfResidence('All');
    setSelectedTags([]);
    setTagInput('');
    setHideDigitalArt(false);
    setHideAIAssistedArt(false);
    setHideNFTs(false);
  };

  const activeFiltersCount = [
    searchQuery,
    selectedCategory !== 'All',
    selectedMedium !== 'All',
    priceRange[0] > 0 || priceRange[1] < 1000,
    sortBy !== 'relevance',
    showVerifiedOnly,
    showForSaleOnly,
    showAIOnly,
    selectedCountryOfOrigin !== 'All',
    selectedCountryOfResidence !== 'All',
    selectedTags.length > 0,
    hideDigitalArt,
    hideAIAssistedArt,
    hideNFTs
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Advanced Search</h1>
          <p className="text-muted-foreground text-lg">
            Find artworks with precise filters and search criteria
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search artworks, artists, tags, or descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 text-lg"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Advanced Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {filteredArtworks.length} artwork{filteredArtworks.length !== 1 ? 's' : ''} found
              </span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {showFilters && (
            <Card className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Category Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Category
                  </label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Medium Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Medium</label>
                  <Select value={selectedMedium} onValueChange={setSelectedMedium}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDIUMS.map((medium) => (
                        <SelectItem key={medium} value={medium}>
                          {medium}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Price Range: ${priceRange[0]} - ${priceRange[1]}
                  </label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={1000}
                    min={0}
                    step={50}
                    className="w-full"
                  />
                </div>

                {/* Additional Filters */}
                <div className="space-y-4">
                  <label className="text-sm font-medium block">Additional Filters</label>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="verified" 
                      checked={showVerifiedOnly}
                      onCheckedChange={(checked) => setShowVerifiedOnly(checked as boolean)}
                    />
                    <label htmlFor="verified" className="text-sm flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Verified Artists Only
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="forsale" 
                      checked={showForSaleOnly}
                      onCheckedChange={(checked) => setShowForSaleOnly(checked as boolean)}
                    />
                    <label htmlFor="forsale" className="text-sm">
                      For Sale Only
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="ai" 
                      checked={showAIOnly}
                      onCheckedChange={(checked) => setShowAIOnly(checked as boolean)}
                    />
                    <label htmlFor="ai" className="text-sm">
                      AI-Assisted Art Only
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="hide-digital" 
                      checked={hideDigitalArt}
                      onCheckedChange={(checked) => setHideDigitalArt(checked as boolean)}
                    />
                    <label htmlFor="hide-digital" className="text-sm">
                      Hide Digital Art
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="hide-ai" 
                      checked={hideAIAssistedArt}
                      onCheckedChange={(checked) => setHideAIAssistedArt(checked as boolean)}
                    />
                    <label htmlFor="hide-ai" className="text-sm">
                      Hide AI-Assisted Art
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="hide-nft" 
                      checked={hideNFTs}
                      onCheckedChange={(checked) => setHideNFTs(checked as boolean)}
                    />
                    <label htmlFor="hide-nft" className="text-sm">
                      Hide NFTs
                    </label>
                  </div>
                </div>

                {/* Country of Origin Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Artist Country of Origin
                  </label>
                  <Select value={selectedCountryOfOrigin} onValueChange={setSelectedCountryOfOrigin}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Country of Residence Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Artist Country of Residence
                  </label>
                  <Select value={selectedCountryOfResidence} onValueChange={setSelectedCountryOfResidence}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tags Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Type a tag and press Enter..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={handleTagInputKeyPress}
                    />
                    <div className="flex flex-wrap gap-2">
                      {COMMON_TAGS.map((tag) => (
                        <Button
                          key={tag}
                          variant={selectedTags.includes(tag) ? "default" : "outline"}
                          size="sm"
                          onClick={() => selectedTags.includes(tag) ? removeTag(tag) : addTag(tag)}
                        >
                          {tag}
                        </Button>
                      ))}
                    </div>
                    {selectedTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedTags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                            {tag}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => removeTag(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Results */}
        {filteredArtworks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No artworks found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search terms or filters to find what you're looking for.
            </p>
            <Button onClick={clearFilters} variant="outline">
              Clear All Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredArtworks.map((artwork) => (
              <ArtworkTile
                key={artwork.id}
                artwork={artwork}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}