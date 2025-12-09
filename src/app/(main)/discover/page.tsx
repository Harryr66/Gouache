'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Eye, Filter, Search, X, Palette, Calendar, ShoppingBag, MapPin } from 'lucide-react';
import { ViewSelector } from '@/components/view-selector';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

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

const generatePlaceholderMarketplaceProducts = (theme: string | undefined, count: number = 50): MarketplaceProduct[] => {
  const placeholderImage = theme === 'dark' 
    ? '/assets/placeholder-dark.png' 
    : '/assets/placeholder-light.png';
  
  const productTitles = [
    'Original Artwork',
    'Print',
    'Limited Edition Print',
    'Book'
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

const generatePlaceholderProducts = (theme: string | undefined, count: number = 12): MarketplaceProduct[] => {
  const placeholderImage = theme === 'dark'
    ? '/assets/placeholder-dark.png'
    : '/assets/placeholder-light.png';

  const titles = [
    'Limited Edition Print',
    'Original Canvas Painting',
    'Monotype Series',
    'Charcoal Portrait',
    'Watercolor Landscape',
    'Abstract Study'
  ];

  const sellers = [
    'Studio Rivera',
    'Atelier Laurent',
    'Gallery Chen',
    'Artist Collective',
    'Maison d’Art',
    'Urban Canvas'
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `market-placeholder-${i + 1}`,
    title: titles[i % titles.length],
    description: 'Placeholder product to preview the market layout.',
    price: 120 + i * 5,
    currency: 'USD',
    category: 'Artwork',
    subcategory: 'Prints',
    images: [placeholderImage],
    sellerId: `seller-${i + 1}`,
    sellerName: sellers[i % sellers.length],
    isAffiliate: false,
    isActive: true,
    stock: 1,
    rating: 0,
    reviewCount: 0,
    tags: ['art', 'print', 'placeholder'],
    createdAt: new Date(),
    updatedAt: new Date(),
    salesCount: 0,
    isOnSale: false,
    isApproved: true,
    status: 'approved',
  }));
};

const CATEGORIES = ['All', 'Painting', 'Drawing', 'Digital', 'Mixed Media', 'Photography', 'Sculpture', 'Printmaking', 'Textile'];
const MEDIUMS = ['All', 'Oil', 'Acrylic', 'Watercolor', 'Charcoal', 'Digital', 'Ink', 'Pencil', 'Pastel', 'Mixed'];
const MARKET_CATEGORIES = ['All', 'Original Artworks', 'Limited Edition Prints', 'All Prints', 'Books'];
const EVENT_TYPES = ['All Events', 'Exhibition', 'Gallery', 'Meet and greet', 'Pop up event'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'likes', label: 'Most Liked' },
  { value: 'recent', label: 'Recently Updated' }
];

function DiscoverPageContent() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [marketplaceProducts, setMarketplaceProducts] = useState<MarketplaceProduct[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { settings: discoverSettings } = useDiscoverSettings();
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams?.get?.('tab') as 'artwork' | 'events' | 'market') || 'artwork';
  
  useEffect(() => {
    setMounted(true);
  }, []);
  const [activeTab, setActiveTab] = useState<'artwork' | 'events' | 'market'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMedium, setSelectedMedium] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEventLocation, setSelectedEventLocation] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('All Events');
  const [showEventFilters, setShowEventFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(15);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  // Default views: Artwork grid, Market & Events list (single tile) on mobile
  const [artworkView, setArtworkView] = useState<'grid' | 'list'>('grid');
  const [marketView, setMarketView] = useState<'grid' | 'list'>('list');
  const [eventsView, setEventsView] = useState<'grid' | 'list'>('list');
  const [isMobile, setIsMobile] = useState(false);
  const [marketSearchQuery, setMarketSearchQuery] = useState('');
  const [selectedMarketCategory, setSelectedMarketCategory] = useState('All');
  const [marketSortBy, setMarketSortBy] = useState('newest');
  const [showMarketFilters, setShowMarketFilters] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Force grid view on desktop
  useEffect(() => {
    if (!isMobile) {
      setArtworkView('grid');
      setMarketView('grid');
      setEventsView('grid');
    }
  }, [isMobile]);

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
        
        const placeholderArtworks = generatePlaceholderArtworks(mounted ? theme : undefined, 20);
        const finalArtworks = fetchedArtworks.length > 0 ? fetchedArtworks : placeholderArtworks;
        setArtworks(finalArtworks);
      } catch (error) {
        console.error('Error fetching artworks:', error);
        // Even on error, show placeholder artworks
        const placeholderArtworks = generatePlaceholderArtworks(mounted ? theme : undefined, 20);
        setArtworks(placeholderArtworks);
      } finally {
        setLoading(false);
      }
    };
    
    fetchArtworks();
  }, [discoverSettings, theme, mounted]);

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
      filtered = filtered.filter(artwork => !artwork.isAI && artwork.aiAssistance === 'none');
    }

    // Sort
    const sorted = [...filtered];
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        break;
      case 'oldest':
        sorted.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
        break;
      case 'popular':
        sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      default:
        break;
    }

    return sorted;
  }, [artworks, searchQuery, selectedCategory, selectedMedium, sortBy, discoverSettings.hideAiAssistedArt]);

  // Filter and sort marketplace products
  const filteredAndSortedMarketProducts = useMemo(() => {
    let filtered = marketplaceProducts;

    // Search filter
    if (marketSearchQuery) {
      const queryLower = marketSearchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(queryLower) ||
        product.description?.toLowerCase().includes(queryLower) ||
        product.sellerName.toLowerCase().includes(queryLower) ||
        product.tags.some(tag => tag.toLowerCase().includes(queryLower))
      );
    }

    // Category filter
    if (selectedMarketCategory !== 'All') {
      if (selectedMarketCategory === 'Limited Edition Prints') {
        filtered = filtered.filter(product => 
          product.tags?.some(tag => tag.toLowerCase().includes('limited')) ||
          product.subcategory?.toLowerCase().includes('limited') ||
          product.title.toLowerCase().includes('limited')
        );
      } else if (selectedMarketCategory === 'All Prints') {
        filtered = filtered.filter(product => 
          product.category?.toLowerCase().includes('print') ||
          product.subcategory?.toLowerCase().includes('print') ||
          product.title.toLowerCase().includes('print')
        );
      } else if (selectedMarketCategory === 'Original Artworks') {
        filtered = filtered.filter(product => 
          product.category?.toLowerCase().includes('artwork') ||
          product.category?.toLowerCase().includes('original') ||
          (!product.category?.toLowerCase().includes('print') && !product.subcategory?.toLowerCase().includes('print'))
        );
      } else if (selectedMarketCategory === 'Books') {
        filtered = filtered.filter(product => 
          product.category?.toLowerCase().includes('book') ||
          product.title.toLowerCase().includes('book')
        );
      }
    }

    // Sort
    const sorted = [...filtered];
    switch (marketSortBy) {
      case 'newest':
        sorted.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        break;
      case 'oldest':
        sorted.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
        break;
      case 'price-low':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        sorted.sort((a, b) => b.price - a.price);
        break;
      default:
        break;
    }

    return sorted;
  }, [marketplaceProducts, marketSearchQuery, selectedMarketCategory, marketSortBy]);

  // Infinite scroll observer for artworks
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 15, filteredAndSortedArtworks.length || prev + 15));
        }
      });
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredAndSortedArtworks]);

  const visibleFilteredArtworks = useMemo(() => {
    const limitCount = Math.max(visibleCount, 15);
    return filteredAndSortedArtworks.slice(0, limitCount);
  }, [filteredAndSortedArtworks, visibleCount]);

  useEffect(() => {
    setVisibleCount(15);
  }, [searchQuery, selectedCategory, selectedMedium, sortBy, selectedEventLocation]);

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
        
        // Always add placeholder products to simulate marketplace
        const placeholderProducts = generatePlaceholderMarketplaceProducts(mounted ? theme : undefined, 50);
        setMarketplaceProducts([...fetchedProducts, ...placeholderProducts]);
    } catch (error) {
        console.error('Error fetching marketplace products:', error);
        // Even on error, show placeholder products
        const placeholderProducts = generatePlaceholderMarketplaceProducts(mounted ? theme : undefined, 50);
        setMarketplaceProducts(placeholderProducts);
      }
    };
    
    if (activeTab === 'market') {
      fetchMarketplaceProducts();
    }
  }, [activeTab, theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    // Always show placeholder events
    const placeholderEvents = generatePlaceholderEvents(theme, 12);
    setEvents(placeholderEvents);
  }, [theme, mounted]);

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
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as 'artwork' | 'events' | 'market');
            router.replace(`/discover?tab=${value}`);
          }}
          className="mb-6"
        >
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="artwork" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Artwork
            </TabsTrigger>
            <TabsTrigger value="market" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Market
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Events
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
                  {isMobile ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex-1"
                      >
                        <Filter className="h-4 w-4" />
                      </Button>
                      <ViewSelector view={artworkView} onViewChange={setArtworkView} className="flex-1 justify-center" />
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setShowFilters(!showFilters)}
                      className="shrink-0"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  )}
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
            ) : (artworkView === 'grid' || !isMobile) ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {visibleFilteredArtworks.map((artwork) => (
                  <ArtworkTile key={artwork.id} artwork={artwork} hideBanner={isMobile && artworkView === 'grid'} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {visibleFilteredArtworks.map((artwork) => {
                  const placeholderImage = theme === 'dark' 
                    ? '/assets/placeholder-dark.png' 
                    : '/assets/placeholder-light.png';
                  const artworkImage = artwork.imageUrl || placeholderImage;
                  const avatarPlaceholder = theme === 'dark'
                    ? '/assets/placeholder-dark.png'
                    : '/assets/placeholder-light.png';
                  
                  return (
                    <Link key={artwork.id} href={`/artwork/${artwork.id}`}>
                      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer">
                        <div className="flex flex-col md:flex-row gap-4 p-4">
                          <div className="relative w-full md:w-48 h-48 flex-shrink-0 rounded-lg overflow-hidden">
                            <Image
                              src={artworkImage}
                              alt={artwork.imageAiHint || artwork.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 flex flex-col">
                            <div className="flex items-start gap-3 mb-3">
                              <Avatar className="h-10 w-10 flex-shrink-0">
                                <AvatarImage src={artwork.artist.avatarUrl || avatarPlaceholder} />
                                <AvatarFallback>{artwork.artist.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg mb-1">{artwork.title}</h3>
                                <p className="text-sm text-muted-foreground">by {artwork.artist.name}</p>
                                {artwork.artist.location && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    {artwork.artist.location}
                                  </p>
                                )}
                              </div>
                              {artwork.isForSale && artwork.price && (
                                <Badge className="bg-green-600 hover:bg-green-700 text-sm px-3 py-1">
                                  ${artwork.price.toLocaleString()}
                                </Badge>
                              )}
                            </div>
                            {artwork.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{artwork.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-auto">
                              <Badge variant="outline" className="text-xs">{artwork.category}</Badge>
                              <Badge variant="secondary" className="text-xs">{artwork.medium}</Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
            <div ref={loadMoreRef} className="h-10" />
          </TabsContent>

          {/* Market Tab */}
          <TabsContent value="market" className="mt-6">
            {/* Search and Filter Bar */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search products, artist names, or tags..."
                    value={marketSearchQuery}
                    onChange={(e) => setMarketSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {isMobile ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowMarketFilters(!showMarketFilters)}
                      className="flex-1"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                    <ViewSelector view={marketView} onViewChange={setMarketView} className="flex-1 justify-center" />
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowMarketFilters(!showMarketFilters)}
                    className="shrink-0"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Filters Panel */}
              {showMarketFilters && (
                <Card className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Category</label>
                      <Select value={selectedMarketCategory} onValueChange={setSelectedMarketCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MARKET_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Sort By</label>
                      <Select value={marketSortBy} onValueChange={setMarketSortBy}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest First</SelectItem>
                          <SelectItem value="oldest">Oldest First</SelectItem>
                          <SelectItem value="price-low">Price: Low to High</SelectItem>
                          <SelectItem value="price-high">Price: High to Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              )}

              {/* Active Filters */}
              {(marketSearchQuery || selectedMarketCategory !== 'All') && (
                <div className="flex flex-wrap gap-2 items-center">
                  {(marketSearchQuery || selectedMarketCategory !== 'All') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMarketSearchQuery('');
                        setSelectedMarketCategory('All');
                      }}
                    >
                      Clear All Filters
                    </Button>
                  )}
                  {marketSearchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      Search: {marketSearchQuery}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setMarketSearchQuery('')} />
                    </Badge>
                  )}
                  {selectedMarketCategory !== 'All' && (
                    <Badge variant="secondary" className="gap-1">
                      Category: {selectedMarketCategory}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedMarketCategory('All')} />
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {filteredAndSortedMarketProducts.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-2">No products available</h2>
          <p className="text-muted-foreground">
                  Check back later for marketplace products.
          </p>
              </div>
            ) : (marketView === 'grid' || !isMobile) ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3">
                {filteredAndSortedMarketProducts.map((product) => {
                  const placeholderImage = theme === 'dark' 
                    ? '/assets/placeholder-dark.png' 
                    : '/assets/placeholder-light.png';
                  const productImage = product.images && product.images.length > 0 
                    ? product.images[0] 
                    : placeholderImage;
                  
                  return (
                    <Link key={product.id} href={`/marketplace/${product.id}?from=discover`}>
                      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col h-full">
                        <div className="relative aspect-square overflow-hidden">
                          <Image
                            src={productImage}
                            alt={product.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-4 flex flex-col flex-grow min-h-[100px]">
                          <h3 className="font-medium text-sm mb-1 line-clamp-2">{product.title}</h3>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{product.sellerName}</p>
                          <p className="text-sm font-semibold mt-auto">
                            {product.currency} ${product.price.toFixed(2)}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAndSortedMarketProducts.map((product) => {
                  const placeholderImage = theme === 'dark' 
                    ? '/assets/placeholder-dark.png' 
                    : '/assets/placeholder-light.png';
                  const productImage = product.images && product.images.length > 0 
                    ? product.images[0] 
                    : placeholderImage;
                  const avatarPlaceholder = theme === 'dark'
                    ? '/assets/placeholder-dark.png'
                    : '/assets/placeholder-light.png';
                  
                  return (
                    <Link key={product.id} href={`/marketplace/${product.id}?from=discover`}>
                      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer">
                        <div className="flex flex-col md:flex-row gap-4 p-4">
                          <div className="relative w-full md:w-48 h-48 flex-shrink-0 rounded-lg overflow-hidden">
                            <Image
                              src={productImage}
                              alt={product.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 flex flex-col">
                            <div className="flex items-start gap-3 mb-3">
                              <Avatar className="h-10 w-10 flex-shrink-0">
                                <AvatarImage src={avatarPlaceholder} />
                                <AvatarFallback>{product.sellerName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg mb-1">{product.title}</h3>
                                <p className="text-sm text-muted-foreground">by {product.sellerName}</p>
                              </div>
                              <Badge className="bg-green-600 hover:bg-green-700 text-sm px-3 py-1">
                                {product.currency} ${product.price.toFixed(2)}
                              </Badge>
                            </div>
                            {product.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{product.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-auto">
                              <Badge variant="outline" className="text-xs">{product.category}</Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="mt-6">
            {/* Search and Filter Bar */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search events by location (e.g., New York, London, Paris)..."
                    value={selectedEventLocation}
                    onChange={(e) => setSelectedEventLocation(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {isMobile ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowEventFilters(!showEventFilters)}
                      className="flex-1"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                    <ViewSelector view={eventsView} onViewChange={setEventsView} className="flex-1 justify-center" />
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowEventFilters(!showEventFilters)}
                    className="shrink-0"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Filters Panel */}
              {showEventFilters && (
                <Card className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Event Type</label>
                      <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EVENT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              )}

              {/* Active Filters */}
              {(selectedEventLocation || selectedEventType !== 'All Events') && (
                <div className="flex flex-wrap gap-2 items-center">
                  {(selectedEventLocation || selectedEventType !== 'All Events') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEventLocation('');
                        setSelectedEventType('All Events');
                      }}
                    >
                      Clear All Filters
                    </Button>
                  )}
                  {selectedEventLocation && (
                    <Badge variant="secondary" className="gap-1">
                      Location: {selectedEventLocation}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedEventLocation('')} />
                    </Badge>
                  )}
                  {selectedEventType !== 'All Events' && (
                    <Badge variant="secondary" className="gap-1">
                      Type: {selectedEventType}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedEventType('All Events')} />
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Filtered Events */}
            {(() => {
              const filteredEvents = events.filter((event: any) => {
                // Location filter
                if (selectedEventLocation.trim()) {
                  const searchTerm = selectedEventLocation.toLowerCase().trim();
                  const eventLocation = (event.location || event.locationName || event.locationAddress || '').toLowerCase();
                  const eventVenue = ((event as any).venue || '').toLowerCase();
                  if (!eventLocation.includes(searchTerm) && !eventVenue.includes(searchTerm)) {
                    return false;
                  }
                }

                // Event type filter
                if (selectedEventType !== 'All Events') {
                  const eventType = (event.type || '').toLowerCase();
                  const selectedType = selectedEventType.toLowerCase();
                  
                  // Map filter options to event types
                  if (selectedType === 'exhibition') {
                    if (!eventType.includes('exhibition')) return false;
                  } else if (selectedType === 'gallery') {
                    if (!eventType.includes('gallery') && !eventType.includes('opening')) return false;
                  } else if (selectedType === 'meet and greet') {
                    if (!eventType.includes('meet') && !eventType.includes('greet')) return false;
                  } else if (selectedType === 'pop up event') {
                    if (!eventType.includes('pop') && !eventType.includes('popup')) return false;
                  }
                }

                return true;
              });

              if (filteredEvents.length === 0) {
                return (
                  <div className="text-center py-16">
                    <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-2xl font-semibold mb-2">No events found</h2>
                    <p className="text-muted-foreground mb-4">
                      {(selectedEventLocation.trim() || selectedEventType !== 'All Events')
                        ? 'No events found matching your filters. Try adjusting your filters or clear them to see all events.'
                        : 'Check back later for upcoming exhibitions, workshops, and art events.'}
                    </p>
                    {(selectedEventLocation.trim() || selectedEventType !== 'All Events') && (
                      <Button variant="outline" onClick={() => {
                        setSelectedEventLocation('');
                        setSelectedEventType('All Events');
                      }}>
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                );
              }

              return (eventsView === 'grid' || !isMobile) ? (
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3">
                  {filteredEvents.map((event: any) => {
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
                    <Link key={event.id} href={`/event/${event.id}`}>
                      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col h-full">
                        <div className="relative aspect-square overflow-hidden">
                          <Image
                            src={eventImage}
                            alt={event.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-4 flex flex-col flex-grow min-h-[100px]">
                          <Badge variant="secondary" className="mb-2 text-xs w-fit">{event.type}</Badge>
                          <h3 className="font-medium text-sm mb-1 line-clamp-2">{event.title}</h3>
                          <div className="space-y-1 text-xs text-muted-foreground flex-grow">
                            <p className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{formattedDate}</span>
                            </p>
                          {((event as any).location || event.locationName) && (
                            <p className="flex items-center gap-1 line-clamp-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{(event as any).location || event.locationName}</span>
                            </p>
                          )}
                          {(event as any).venue && (
                            <p className="text-xs text-muted-foreground line-clamp-1 truncate">{(event as any).venue}</p>
                          )}
                          </div>
                            {event.price && (
                              <p className="font-semibold text-foreground text-sm mt-auto pt-1">{event.price}</p>
                            )}
                        </div>
                      </Card>
                    </Link>
                  );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEvents.map((event: any) => {
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
                    const avatarPlaceholder = theme === 'dark'
                      ? '/assets/placeholder-dark.png'
                      : '/assets/placeholder-light.png';
                    
                    return (
                      <Link key={event.id} href={`/event/${event.id}`}>
                        <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer">
                          <div className="flex flex-col md:flex-row gap-4 p-4">
                            <div className="relative w-full md:w-48 h-48 flex-shrink-0 rounded-lg overflow-hidden">
                              <Image
                                src={eventImage}
                                alt={event.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 flex flex-col">
                              <div className="flex items-start gap-3 mb-3">
                                <Avatar className="h-10 w-10 flex-shrink-0">
                                  <AvatarImage src={event.artist?.avatarUrl || avatarPlaceholder} />
                                  <AvatarFallback>{event.artist?.name?.charAt(0) || 'E'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary" className="text-xs">{event.type}</Badge>
                                  </div>
                                  <h3 className="font-semibold text-lg mb-1">{event.title}</h3>
                                  <p className="text-sm text-muted-foreground">by {event.artist?.name || 'Event Organizer'}</p>
                                </div>
                                {event.price && (
                                  <Badge className="bg-blue-600 hover:bg-blue-700 text-sm px-3 py-1">
                                    {event.price}
                                  </Badge>
                                )}
                              </div>
                              {event.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{event.description}</p>
                              )}
                              <div className="space-y-1 text-sm text-muted-foreground mt-auto">
                                <p className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {formattedDate}
                                </p>
                                {((event as any).location || event.locationName) && (
                                  <p className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {(event as any).location || event.locationName}
                                  </p>
                                )}
                                {(event as any).venue && (
                                  <p className="text-sm text-muted-foreground">{(event as any).venue}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <ThemeLoading text="Loading discover feed..." size="lg" />
      </div>
    }>
      <DiscoverPageContent />
    </Suspense>
  );
}
