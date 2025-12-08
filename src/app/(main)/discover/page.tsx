'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Eye, Filter, Search, X, Palette, Calendar, ShoppingBag, MapPin } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ArtworkTile } from '@/components/artwork-tile';
import { Artwork, MarketplaceProduct } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { useDiscoverSettings } from '@/providers/discover-settings-provider';
import { ThemeLoading } from '@/components/theme-loading';
import { useTheme } from 'next-themes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

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

const generatePlaceholderEvents = (theme: string | undefined, count: number = 12) => {
  const placeholderImage = theme === 'dark' 
    ? '/assets/placeholder-dark.png' 
    : '/assets/placeholder-light.png';
  
  const eventTitles = [
    'Contemporary Art Exhibition', 'Gallery Opening Night', 'Artist Workshop Series',
    'Sculpture Garden Tour', 'Abstract Art Showcase', 'Photography Exhibition',
    'Mixed Media Workshop', 'Art Auction Gala', 'Street Art Festival',
    'Digital Art Symposium', 'Watercolor Masterclass', 'Printmaking Workshop'
  ];
  
  const venues = [
    'Modern Art Gallery', 'Downtown Cultural Center', 'Riverside Gallery',
    'Metropolitan Museum', 'Art District Studio', 'Contemporary Space',
    'Heritage Gallery', 'Creative Hub', 'Urban Art Center',
    'Gallery 302', 'The Loft', 'Artisan Collective'
  ];
  
  const locations = [
    'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'San Francisco, CA',
    'Miami, FL', 'Seattle, WA', 'Boston, MA', 'Portland, OR',
    'Austin, TX', 'Denver, CO', 'Philadelphia, PA', 'Nashville, TN'
  ];
  
  return Array.from({ length: count }, (_, i) => {
    const daysFromNow = i * 7 + Math.floor(Math.random() * 7);
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + daysFromNow);
    const endDate = new Date(eventDate);
    endDate.setDate(endDate.getDate() + (i % 3 === 0 ? 7 : 1));
    
    return {
      id: `placeholder-event-${i + 1}`,
      title: eventTitles[i % eventTitles.length],
      description: 'Join us for an exciting art event featuring contemporary works and engaging discussions.',
      date: eventDate,
      endDate: i % 3 === 0 ? endDate : undefined,
      location: locations[i % locations.length],
      venue: venues[i % venues.length],
      type: ['Exhibition', 'Workshop', 'Gallery Opening', 'Festival'][i % 4],
      imageUrl: placeholderImage,
      price: i % 4 === 0 ? 'Free' : `$${Math.floor(Math.random() * 50) + 10}`,
      capacity: Math.floor(Math.random() * 200) + 50,
    };
  });
};

const generatePlaceholderMarketplaceProducts = (theme: string | undefined, count: number = 20): MarketplaceProduct[] => {
  const placeholderImage = theme === 'dark' 
    ? '/assets/placeholder-dark.png' 
    : '/assets/placeholder-light.png';
  
  const productTitles = [
    'Abstract Expressionist Painting', 'Limited Edition Art Print', 'Watercolor Landscape',
    'Charcoal Portrait Study', 'Digital Art Collection', 'Mixed Media Sculpture',
    'Oil Painting Series', 'Acrylic Abstract', 'Ink Illustration Set',
    'Pastel Drawing', 'Photography Print', 'Sculpture Piece',
    'Fine Art Print', 'Original Sketch', 'Contemporary Artwork',
    'Traditional Painting', 'Modern Art Print', 'Artist Portfolio',
    'Gallery Quality Print', 'Handmade Art Piece'
  ];
  
  const sellerNames = [
    'Sarah Martinez', 'James Chen', 'Emma Wilson', 'Michael Brown',
    'Sophie Anderson', 'David Lee', 'Olivia Garcia', 'Ryan Taylor',
    'Isabella White', 'Noah Harris', 'Ava Clark', 'Lucas Moore',
    'Mia Johnson', 'Ethan Davis', 'Zoe Martinez', 'Liam Thompson',
    'Chloe Rodriguez', 'Aiden Lewis', 'Lily Walker', 'Jackson Hall'
  ];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `placeholder-market-${i + 1}`,
    title: productTitles[i % productTitles.length],
    description: 'A beautiful piece of art perfect for collectors and art enthusiasts.',
    price: Math.floor(Math.random() * 500) + 50,
    currency: 'USD',
    category: ['Artwork', 'Prints', 'Original', 'Limited Edition'][i % 4],
    subcategory: ['Painting', 'Print', 'Drawing', 'Digital'][i % 4],
    images: [placeholderImage],
    sellerId: `placeholder-seller-${i + 1}`,
    sellerName: sellerNames[i % sellerNames.length],
    isAffiliate: false,
    isActive: true,
    stock: Math.floor(Math.random() * 10) + 1,
    rating: 4 + Math.random(),
    reviewCount: Math.floor(Math.random() * 50) + 5,
    tags: ['art', 'original', 'collectible', 'handmade'],
    createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
    updatedAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
    salesCount: Math.floor(Math.random() * 20),
    isOnSale: i % 5 === 0,
    isApproved: true,
    status: 'approved' as const,
  }));
};

const CATEGORIES = ['All', 'Painting', 'Drawing', 'Digital', 'Mixed Media', 'Photography', 'Sculpture', 'Printmaking', 'Textile'];
const MEDIUMS = ['All', 'Oil', 'Acrylic', 'Watercolor', 'Charcoal', 'Digital', 'Ink', 'Pencil', 'Pastel', 'Mixed'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'likes', label: 'Most Liked' },
  { value: 'recent', label: 'Recently Updated' }
];

export default function DiscoverPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [marketplaceProducts, setMarketplaceProducts] = useState<MarketplaceProduct[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings: discoverSettings } = useDiscoverSettings();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'artwork' | 'events' | 'market'>('artwork');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMedium, setSelectedMedium] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

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

  useEffect(() => {
    const fetchMarketplaceProducts = async () => {
      try {
        const productsQuery = query(
          collection(db, 'marketplaceProducts'),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        
        const snapshot = await getDocs(productsQuery);
        const fetchedProducts: MarketplaceProduct[] = [];
        
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const product: MarketplaceProduct = {
            id: doc.id,
            title: data.title || 'Untitled Product',
            description: data.description || '',
            price: data.price || 0,
            currency: data.currency || 'USD',
            category: data.category || '',
            subcategory: data.subcategory || '',
            images: data.images || [],
            sellerId: data.sellerId || '',
            sellerName: data.sellerName || 'Unknown Seller',
            isAffiliate: data.isAffiliate || false,
            isActive: data.isActive !== false,
            stock: data.stock || 1,
            rating: data.rating || 0,
            reviewCount: data.reviewCount || 0,
            tags: data.tags || [],
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || data.createdAt?.toDate() || new Date(),
            salesCount: data.salesCount || 0,
            isOnSale: data.isOnSale || false,
            isApproved: data.isApproved !== false,
            status: data.status || 'approved',
          };
          
          if (product.isApproved && (product.status === 'approved' || !product.status)) {
            fetchedProducts.push(product);
          }
        });
        
        // Always add placeholder products
        const placeholderProducts = generatePlaceholderMarketplaceProducts(theme, 20);
        setMarketplaceProducts([...fetchedProducts, ...placeholderProducts]);
      } catch (error) {
        console.error('Error fetching marketplace products:', error);
        // Even on error, show placeholder products
        const placeholderProducts = generatePlaceholderMarketplaceProducts(theme, 20);
        setMarketplaceProducts(placeholderProducts);
      }
    };
    
    if (activeTab === 'market') {
      fetchMarketplaceProducts();
    }
  }, [activeTab, theme]);

  useEffect(() => {
    // Always show placeholder events
    const placeholderEvents = generatePlaceholderEvents(theme, 12);
    setEvents(placeholderEvents);
  }, [theme]);

  const filteredAndSortedArtworks = useMemo(() => {
    let filtered = artworks;

    // Search filter
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase();
      filtered = filtered.filter(artwork =>
        artwork.title.toLowerCase().includes(queryLower) ||
        artwork.description?.toLowerCase().includes(queryLower) ||
        artwork.artist.name.toLowerCase().includes(queryLower) ||
        artwork.tags.some(tag => tag.toLowerCase().includes(queryLower))
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(artwork => artwork.category === selectedCategory);
    }

    // Medium filter
    if (selectedMedium !== 'All') {
      filtered = filtered.filter(artwork => artwork.medium === selectedMedium);
    }

    // Apply discover settings filters
    if (discoverSettings.hideAiAssistedArt) {
      filtered = filtered.filter(artwork => 
        artwork.aiAssistance === 'none' && !artwork.isAI
      );
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'likes':
        filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      case 'recent':
        filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
    }

    return filtered;
  }, [artworks, searchQuery, selectedCategory, selectedMedium, sortBy, discoverSettings]);

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

        {/* Tabs for Artwork/Events/Market */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'artwork' | 'events' | 'market')} className="mb-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="artwork" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Artwork
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Events
            </TabsTrigger>
            <TabsTrigger value="market" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Market
            </TabsTrigger>
          </TabsList>

          {/* Artwork Tab */}
          <TabsContent value="artwork" className="mt-6">
            {/* Search and Filter Bar */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search artworks, artists, or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  </div>
                  <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="shrink-0"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                      </Button>
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <Card className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Category</label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                        </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Medium</label>
                      <Select value={selectedMedium} onValueChange={setSelectedMedium}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEDIUMS.map((med) => (
                            <SelectItem key={med} value={med}>
                              {med}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Sort By</label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger>
                          <SelectValue />
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
                  <div className="mt-4 flex gap-2">
          <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCategory('All');
                        setSelectedMedium('All');
                        setSortBy('newest');
                        setSearchQuery('');
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                      </Button>
                  </div>
                </Card>
              )}

              {/* Active Filters Display */}
              {(selectedCategory !== 'All' || selectedMedium !== 'All' || searchQuery) && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      Search: {searchQuery}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                    </Badge>
                  )}
                  {selectedCategory !== 'All' && (
                    <Badge variant="secondary" className="gap-1">
                      Category: {selectedCategory}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCategory('All')} />
                    </Badge>
                  )}
                  {selectedMedium !== 'All' && (
                    <Badge variant="secondary" className="gap-1">
                      Medium: {selectedMedium}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedMedium('All')} />
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            {/* Artworks Grid */}
            {filteredAndSortedArtworks.length === 0 ? (
              <div className="text-center py-16">
                <Eye className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-2">No artworks found</h2>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || selectedCategory !== 'All' || selectedMedium !== 'All'
                    ? 'Try adjusting your filters to see more results.'
                    : 'Check back later for new content.'}
                </p>
                {(searchQuery || selectedCategory !== 'All' || selectedMedium !== 'All') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedCategory('All');
                      setSelectedMedium('All');
                      setSearchQuery('');
                    }}
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredAndSortedArtworks.map((artwork) => (
                  <ArtworkTile key={artwork.id} artwork={artwork} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="mt-6">
            {events.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-2">No events available</h2>
                <p className="text-muted-foreground">
                  Check back later for upcoming exhibitions, workshops, and art events.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {events.map((event) => {
                  const placeholderImage = theme === 'dark' 
                    ? '/assets/placeholder-dark.png' 
                    : '/assets/placeholder-light.png';
                  const eventImage = event.imageUrl || placeholderImage;
                  const eventDate = new Date(event.date);
                  const formattedDate = eventDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  });
                  
                  return (
                    <Card key={event.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300">
                      <div className="relative aspect-video overflow-hidden">
                        <Image
                          src={eventImage}
                          alt={event.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4">
                        <Badge variant="secondary" className="mb-2">{event.type}</Badge>
                        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{event.title}</h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formattedDate}
                          </p>
                          <p className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.venue}
                          </p>
                          <p>{event.location}</p>
                          {event.price && (
                            <p className="font-medium text-foreground">{event.price}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Market Tab */}
          <TabsContent value="market" className="mt-6">
            {marketplaceProducts.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-2">No products available</h2>
          <p className="text-muted-foreground">
                  Check back later for marketplace products.
          </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {marketplaceProducts.map((product) => {
                  const placeholderImage = theme === 'dark' 
                    ? '/assets/placeholder-dark.png' 
                    : '/assets/placeholder-light.png';
                  const productImage = product.images && product.images.length > 0 
                    ? product.images[0] 
                    : placeholderImage;
                  
                  return (
                    <Link key={product.id} href={`/marketplace/${product.id}`}>
                      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer">
                        <div className="relative aspect-square overflow-hidden">
                          <Image
                            src={productImage}
                            alt={product.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-4">
                          <h3 className="font-medium text-sm mb-1 line-clamp-2">{product.title}</h3>
                          <p className="text-xs text-muted-foreground mb-2">{product.sellerName}</p>
                          <p className="text-lg font-semibold">
                            {product.currency} ${product.price.toFixed(2)}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
