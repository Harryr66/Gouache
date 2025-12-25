'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useRef, useDeferredValue, startTransition } from 'react';
import { Eye, Filter, Search, X, Palette, Calendar, ShoppingBag, MapPin, ArrowUp } from 'lucide-react';
import { ViewSelector } from '@/components/view-selector';
import { toast } from '@/hooks/use-toast';
import { ArtworkTile } from '@/components/artwork-tile';
import { Artwork, MarketplaceProduct, Event as EventType } from '@/lib/types';
import { db } from '@/lib/firebase';
import { useLikes } from '@/providers/likes-provider';
import { fetchActiveAds, mixAdsIntoContent } from '@/lib/ad-fetcher';
import { AdTile } from '@/components/ad-tile';
import { useAuth } from '@/providers/auth-provider';
import { collection, query, getDocs, orderBy, limit, where, doc, getDoc } from 'firebase/firestore';
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
import { engagementTracker } from '@/lib/engagement-tracker';
import { engagementScorer } from '@/lib/engagement-scorer';

const generatePlaceholderArtworks = (theme: string | undefined, count: number = 12): Artwork[] => {
  // Use Pexels abstract painting as placeholder: https://www.pexels.com/photo/abstract-painting-1546249/
  const placeholderImage = 'https://images.pexels.com/photos/1546249/pexels-photo-1546249.jpeg?auto=compress&cs=tinysrgb&w=800';
  // Landscape placeholder - use same blue placeholder, fallback to taped banana
  const landscapeImage = 'https://images.pexels.com/photos/1546249/pexels-photo-1546249.jpeg?auto=compress&cs=tinysrgb&w=1200';
  const landscapeFallback = 'https://images.pexels.com/photos/1308881/pexels-photo-1308881.jpeg?auto=compress&cs=tinysrgb&w=1200'; // Taped banana placeholder
  
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
  
  const landscapeTitles = [
    'Panoramic Cityscape', 'Wide Horizon', 'Expansive Landscape', 'Urban Panorama',
    'Coastal Vista', 'Mountain Range', 'Desert Sunset', 'Forest Path'
  ];
  
  return Array.from({ length: count }, (_, i) => {
    // Every 8th item is a landscape image (roughly 12.5% landscape, majority portrait)
    const isLandscape = i % 8 === 0 && i > 0;
    // Use same blue placeholder for landscape, fallback to taped banana if needed
    const imageUrl = isLandscape 
      ? landscapeImage
      : placeholderImage;
    const title = isLandscape
      ? landscapeTitles[i % landscapeTitles.length]
      : titles[i % titles.length];
    
    return {
      id: `placeholder-${i + 1}`,
      title: title,
      description: isLandscape 
        ? 'A stunning landscape artwork showcasing the beauty of nature and urban environments.'
        : 'A beautiful artwork showcasing artistic expression and creativity.',
      imageUrl: imageUrl,
      imageAiHint: isLandscape ? 'Landscape placeholder artwork' : 'Placeholder artwork',
      isLandscape: isLandscape, // Add flag to identify landscape images
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
      tags: ['art', 'creative', 'contemporary', 'modern', '_placeholder'], // Hidden tag to identify placeholders
      aiAssistance: 'none' as const,
      isAI: false,
    };
  });
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

const MEDIUMS = ['All', 'Oil', 'Acrylic', 'Watercolor', 'Charcoal', 'Ink', 'Pencil', 'Pastel', 'Mixed'];
const ARTWORK_TYPES = ['All', 'Original', 'Print'];
const MARKET_CATEGORIES = ['All', 'Original Artworks', 'Limited Edition Prints', 'All Prints', 'Books'];
const EVENT_TYPES = ['All Events', 'Exhibition', 'Gallery', 'Meet and greet', 'Pop up event'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'likes', label: 'Most Liked' },
  { value: 'recent', label: 'Recently Updated' }
];

function DiscoverPageContent() {
  const isDev = process.env.NODE_ENV === 'development';
  const log = (...args: any[]) => { if (isDev) console.log(...args); };
  const warn = (...args: any[]) => { if (isDev) console.warn(...args); };
  const error = (...args: any[]) => { if (isDev) console.error(...args); };
  const { toggleLike, isLiked } = useLikes();
  const { user } = useAuth();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [marketplaceProducts, setMarketplaceProducts] = useState<MarketplaceProduct[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [artworkEngagements, setArtworkEngagements] = useState<Map<string, any>>(new Map());
  const { settings: discoverSettings } = useDiscoverSettings();
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams?.get?.('tab');
  const initialTab: 'artwork' | 'events' = (tabParam === 'artwork' || tabParam === 'events') ? tabParam : 'artwork';
  
  useEffect(() => {
    setMounted(true);
  }, []);
  const [activeTab, setActiveTab] = useState<'artwork' | 'events'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedium, setSelectedMedium] = useState('All');
  const [selectedArtworkType, setSelectedArtworkType] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEventLocation, setSelectedEventLocation] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('All Events');
  const [showEventFilters, setShowEventFilters] = useState(false);
  // Initialize with a reasonable default that will be adjusted based on screen size
  const [visibleCount, setVisibleCount] = useState(18); // Start with 3 rows of 6 items
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  // Default views: Artwork grid, Market list, Events grid on mobile
  const [artworkView, setArtworkView] = useState<'grid' | 'list'>('grid');
  const [marketView, setMarketView] = useState<'grid' | 'list'>('list');
  const [eventsView, setEventsView] = useState<'grid' | 'list'>('grid');
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

  // Force grid view on desktop (only artwork); events grid default on mobile too
  useEffect(() => {
    if (!isMobile) {
      setArtworkView('grid');
      setMarketView('grid');
      setEventsView('grid');
    } else {
      // On mobile, ensure correct defaults
      setArtworkView('grid');
      setMarketView('list');
      setEventsView('grid'); // Events use grid view on mobile
    }
  }, [isMobile]);

  useEffect(() => {
    const fetchArtworks = async () => {
      try {
        setLoading(true);
        log('🔍 Discover: Starting to fetch artworks from artist profiles...');
        
        // Fetch artists with portfolios (no isProfessional filter so we include all creators)
        const artistsQuery = query(
          collection(db, 'userProfiles'),
          limit(200)
        );
        
        const artistsSnapshot = await getDocs(artistsQuery);
        log(`👥 Discover: Found ${artistsSnapshot.docs.length} professional artists`);
        
        const fetchedArtworks: Artwork[] = [];
        let totalPortfolioItems = 0;
        let skippedNoPortfolio = 0;
        let skippedShowInPortfolioFalse = 0;
        let skippedNoImage = 0;
        let skippedAI = 0;
        
        // Extract portfolio items from each artist
        for (const artistDoc of artistsSnapshot.docs) {
          const artistData = artistDoc.data();
          const portfolio = artistData.portfolio || [];
          totalPortfolioItems += portfolio.length;
          
          if (portfolio.length === 0) {
            skippedNoPortfolio++;
            continue;
          }
          
          log(`🎨 Discover: Processing artist ${artistData.displayName || artistData.username || artistDoc.id} - ${portfolio.length} portfolio items`);
          
          // Process each portfolio item - use for loop to handle async
          for (const [index, item] of portfolio.entries()) {
            // Skip deleted or explicitly hidden from portfolio
            if (item.deleted === true || item.showInPortfolio === false) {
              skippedShowInPortfolioFalse++;
              continue; // Skip items explicitly marked as not for portfolio
            }
            
            // Apply discover settings filters for AI content
            if (discoverSettings.hideAiAssistedArt && (item.aiAssistance === 'assisted' || item.aiAssistance === 'generated' || item.isAI)) {
              skippedAI++;
              continue; // Skip AI-assisted/generated artworks if hidden
            }
            
            // Get media URL (support video or image)
            const videoUrl = item.videoUrl || item.mediaUrls?.[0] && item.mediaTypes?.[0] === 'video' ? item.mediaUrls[0] : null;
            const imageUrl = item.imageUrl || item.supportingImages?.[0] || item.images?.[0] || item.mediaUrls?.[0] || '';
            const mediaType = item.mediaType || (videoUrl ? 'video' : 'image');
            
            // Skip items without media
            if (!imageUrl && !videoUrl) {
              skippedNoImage++;
              log(`⚠️ Discover: Skipping item "${item.title || 'Untitled'}" from ${artistData.displayName || artistDoc.id} - no media URL`);
              continue;
            }

            // Check artworks collection for sale status
            let saleStatus: { isForSale?: boolean; sold?: boolean; price?: number; priceType?: string; contactForPrice?: boolean } = {
              isForSale: item.isForSale || false,
              sold: item.sold || false,
              price: item.price,
              priceType: item.priceType,
              contactForPrice: item.contactForPrice || item.priceType === 'contact',
            };
            
            if (item.id) {
              try {
                const artworkDoc = await getDoc(doc(db, 'artworks', item.id));
                if (artworkDoc.exists()) {
                  const artworkData = artworkDoc.data();
                  saleStatus = {
                    isForSale: artworkData.isForSale || false,
                    sold: artworkData.sold || false,
                    price: artworkData.price,
                    priceType: artworkData.priceType,
                    contactForPrice: artworkData.contactForPrice || artworkData.priceType === 'contact',
                  };
                }
              } catch (err) {
                // If artwork doesn't exist in artworks collection, use portfolio data (already set above)
                log(`⚠️ Discover: Could not fetch artwork data for ${item.id}, using portfolio data`);
              }
            }

            // Convert portfolio item to Artwork object
            const artwork: Artwork = {
              id: item.id || `${artistDoc.id}-${Date.now()}-${index}`,
              title: item.title || 'Untitled',
              description: item.description || '',
              imageUrl: imageUrl || '', // Fallback for backward compatibility
              imageAiHint: item.description || '',
              // Add video support
              ...(videoUrl && { videoUrl: videoUrl as any }),
              ...(mediaType && { mediaType: mediaType as any }),
              artist: {
                id: artistDoc.id,
                name: artistData.displayName || artistData.name || artistData.username || 'Unknown Artist',
                handle: artistData.username || artistData.handle || '',
                avatarUrl: artistData.avatarUrl || null,
                isVerified: artistData.isVerified || false,
                isProfessional: true,
                followerCount: artistData.followerCount || 0,
                followingCount: artistData.followingCount || 0,
                createdAt: artistData.createdAt?.toDate?.() || (artistData.createdAt instanceof Date ? artistData.createdAt : new Date()),
              },
              likes: item.likes || 0,
              commentsCount: item.commentsCount || 0,
              createdAt: item.createdAt?.toDate?.() || (item.createdAt instanceof Date ? item.createdAt : new Date()),
              updatedAt: item.updatedAt?.toDate?.() || item.createdAt?.toDate?.() || (item.createdAt instanceof Date ? item.createdAt : new Date()),
              category: item.category || '',
              medium: item.medium || '',
              tags: item.tags || [],
              aiAssistance: item.aiAssistance || 'none',
              isAI: item.isAI || false,
              isForSale: saleStatus.isForSale,
              sold: saleStatus.sold,
              price: saleStatus.price ? (saleStatus.price > 1000 ? saleStatus.price / 100 : saleStatus.price) : undefined,
              priceType: saleStatus.priceType as 'fixed' | 'contact' | undefined,
              contactForPrice: saleStatus.contactForPrice,
            };
            
            fetchedArtworks.push(artwork);
            log(`✅ Discover: Added artwork "${artwork.title}" from ${artwork.artist.name} (imageUrl: ${artwork.imageUrl.substring(0, 50)}...)`);
          }
        }
        
        log(`📊 Discover: Summary - Total portfolio items: ${totalPortfolioItems}, Added: ${fetchedArtworks.length}, Skipped (no portfolio): ${skippedNoPortfolio}, Skipped (showInPortfolio=false): ${skippedShowInPortfolioFalse}, Skipped (no image): ${skippedNoImage}, Skipped (AI): ${skippedAI}`);
        
        // Sort by createdAt descending (newest first)
        fetchedArtworks.sort((a, b) => {
          const dateA = a.createdAt.getTime();
          const dateB = b.createdAt.getTime();
          return dateB - dateA;
        });
        
        // No fallback: only show current portfolio items with images, skip deleted/hidden
        
        // Limit to 50 most recent after any fallback
        const safeArtworks = Array.isArray(fetchedArtworks) ? fetchedArtworks : [];
        const limitedArtworks = safeArtworks.slice(0, 50);
        
        log(`🎯 Discover: Real artworks count: ${limitedArtworks.length}`);
        
        // Always generate placeholder artworks to fill the feed
        const placeholderArtworks = generatePlaceholderArtworks(mounted ? theme : undefined, 20);
        
        // Combine real artworks with placeholders
        // If we have real artworks, mix them with placeholders. If not, show only placeholders.
        const finalArtworks = limitedArtworks.length > 0 
          ? [...limitedArtworks, ...placeholderArtworks]
          : placeholderArtworks;
        
        log(`🎯 Discover: Final artworks count (real + placeholders): ${finalArtworks.length}`);
        
        if (limitedArtworks.length === 0) {
          warn('⚠️ Discover: No real artworks found, showing only placeholders');
        } else {
          log(`✅ Discover: Showing ${limitedArtworks.length} real artworks + ${placeholderArtworks.length} placeholder artworks`);
        }
        
        setArtworks(Array.isArray(finalArtworks) ? finalArtworks : []);
        
        // Fetch engagement metrics for all artworks
        if (finalArtworks.length > 0) {
          try {
            const artworkIds = finalArtworks.map(a => a.id);
            const engagements = await engagementTracker.getArtworkEngagements(artworkIds);
            setArtworkEngagements(engagements);
            log(`📊 Discover: Loaded engagement metrics for ${engagements.size} artworks`);
          } catch (err) {
            warn('⚠️ Error fetching engagement metrics:', err);
          }
        }
      } catch (err) {
        error('❌ Error fetching artworks from artist profiles:', err);
        // Even on error, show placeholder artworks
        const placeholderArtworks = generatePlaceholderArtworks(mounted ? theme : undefined, 20);
        setArtworks(placeholderArtworks);
      } finally {
        setLoading(false);
    }
  };

    fetchArtworks();
    
    // Fetch ads for discover feed
    fetchActiveAds('discover', user?.id).then(setAds).catch(console.error);
  }, [discoverSettings, theme, mounted, user]);

  const filteredAndSortedArtworks = useMemo(() => {
    let filtered = Array.isArray(artworks) ? artworks : [];
    
    log('🔍 filteredAndSortedArtworks - Input:', {
      totalArtworks: filtered.length,
      artworkIds: filtered.slice(0, 10).map((a: any) => a.id)
    });

    // Helper function to identify placeholders by hidden tag
    const isPlaceholder = (artwork: any): boolean => {
      const tags = Array.isArray(artwork.tags) ? artwork.tags : [];
      const hasPlaceholderTag = tags.includes('_placeholder');
      // Also check by ID pattern as fallback
      const hasPlaceholderId = artwork.id?.startsWith('placeholder-');
      return hasPlaceholderTag || hasPlaceholderId;
    };
    
    // Separate real artworks from placeholders BEFORE filtering
    const allRealArtworks = filtered.filter((artwork: any) => !isPlaceholder(artwork));
    const allPlaceholderArtworks = filtered.filter((artwork: any) => isPlaceholder(artwork));
    
    log('🔍 Separated artworks:', {
      allRealArtworks: allRealArtworks.length,
      allPlaceholderArtworks: allPlaceholderArtworks.length,
      placeholderIds: allPlaceholderArtworks.slice(0, 5).map((a: any) => a.id)
    });

    // Apply filters only to real artworks
    let realArtworks = [...allRealArtworks];

    // Search filter
    if (deferredSearchQuery) {
      const queryLower = deferredSearchQuery.toLowerCase();
      realArtworks = realArtworks.filter(artwork => {
        const title = (artwork.title || '').toLowerCase();
        const description = (artwork.description || '').toLowerCase();
        const artistName = (artwork.artist?.name || '').toLowerCase();
        const tags = Array.isArray(artwork.tags) ? artwork.tags : [];
        return (
          title.includes(queryLower) ||
          description.includes(queryLower) ||
          artistName.includes(queryLower) ||
          tags.some(tag => (tag || '').toLowerCase().includes(queryLower))
        );
      });
    }

    // Medium filter
    if (selectedMedium !== 'All') {
      realArtworks = realArtworks.filter(artwork => artwork.medium === selectedMedium);
    }

    // Artwork Type filter (Original/Print) - only shows artworks for sale
    if (selectedArtworkType !== 'All') {
      realArtworks = realArtworks.filter(artwork => {
        // Only show artworks that are for sale when filtering by type
        if (!artwork.isForSale) return false;
        
        // Check tags for 'print' or 'original'
        const tags = Array.isArray(artwork.tags) ? artwork.tags : [];
        const hasPrintTag = tags.some(tag => tag.toLowerCase() === 'print');
        const hasOriginalTag = tags.some(tag => tag.toLowerCase() === 'original');
        
        if (selectedArtworkType === 'Print') {
          return hasPrintTag;
        } else if (selectedArtworkType === 'Original') {
          // If no tags found, default to original for artworks for sale
          return !hasPrintTag || hasOriginalTag;
        }
        return true;
      });
    }

    // Apply discover settings filters
    if (discoverSettings.hideAiAssistedArt) {
      realArtworks = realArtworks.filter(artwork => !artwork.isAI && artwork.aiAssistance === 'none');
    }

    // Sort using engagement-based algorithm when 'popular' is selected
    let sorted = Array.isArray(realArtworks) ? [...realArtworks] : [];
    
    if (sortBy === 'popular' && artworkEngagements.size > 0) {
      // Use engagement-based scoring algorithm
      const scoredArtworks = engagementScorer.scoreArtworks(sorted, artworkEngagements);
      const withDiversity = engagementScorer.applyDiversityBoost(scoredArtworks);
      sorted = engagementScorer.sortByScore(withDiversity);
    } else {
      // Traditional sorting for other options
      switch (sortBy) {
        case 'newest':
          sorted.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
          break;
        case 'oldest':
          sorted.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
          break;
        case 'likes':
          sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
          break;
        case 'recent':
          sorted.sort((a, b) => (b.updatedAt?.getTime() || b.createdAt?.getTime() || 0) - (a.updatedAt?.getTime() || a.createdAt?.getTime() || 0));
          break;
        default:
          // Default: Use engagement-based ranking if we have engagement data
          if (artworkEngagements.size > 0) {
            const scoredArtworks = engagementScorer.scoreArtworks(sorted, artworkEngagements);
            const withDiversity = engagementScorer.applyDiversityBoost(scoredArtworks);
            sorted = engagementScorer.sortByScore(withDiversity);
          } else {
            // Fallback to newest if no engagement data
            sorted.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
          }
          break;
      }
    }

    // Always show real artworks first, then append placeholders to fill the grid
    // Placeholders have score 0 so they'll always rank below real artworks
    log('🔍 filteredAndSortedArtworks:', {
      totalFiltered: filtered.length,
      allRealArtworks: allRealArtworks.length,
      allPlaceholderArtworks: allPlaceholderArtworks.length,
      sortedRealArtworks: sorted.length
    });
    
    if (sorted.length === 0 && allPlaceholderArtworks.length > 0) {
      // No real artworks match filters, show only placeholders
      log('📋 Discover: No real artworks match filters, showing placeholders:', allPlaceholderArtworks.length);
      return allPlaceholderArtworks;
    }
    
    // Return real artworks first, then placeholders to fill remaining space
    const result = [...sorted, ...allPlaceholderArtworks];
    log('✅ Discover: Returning', sorted.length, 'real artworks +', allPlaceholderArtworks.length, 'placeholders =', result.length, 'total');
    return result;
  }, [artworks, deferredSearchQuery, selectedMedium, selectedArtworkType, sortBy, discoverSettings.hideAiAssistedArt, artworkEngagements]);

  // Filter and sort marketplace products
  const filteredAndSortedMarketProducts = useMemo(() => {
    let filtered = Array.isArray(marketplaceProducts) ? marketplaceProducts : [];

    // Search filter
    if (marketSearchQuery) {
      const queryLower = marketSearchQuery.toLowerCase();
      filtered = filtered.filter(product => {
        const title = (product.title || '').toLowerCase();
        const description = (product.description || '').toLowerCase();
        const sellerName = (product.sellerName || '').toLowerCase();
        const tags = Array.isArray(product.tags) ? product.tags : [];
        return (
          title.includes(queryLower) ||
          description.includes(queryLower) ||
          sellerName.includes(queryLower) ||
          tags.some(tag => (tag || '').toLowerCase().includes(queryLower))
        );
      });
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
    const sorted = Array.isArray(filtered) ? [...filtered] : [];
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

    return Array.isArray(sorted) ? sorted : [];
  }, [marketplaceProducts, marketSearchQuery, selectedMarketCategory, marketSortBy]);

  // Calculate items per row based on screen size
  const getItemsPerRow = useMemo(() => {
    return () => {
      if (typeof window === 'undefined') return 6; // Default for SSR
      const width = window.innerWidth;
      if (width >= 1280) return 6; // xl:grid-cols-6
      if (width >= 1024) return 5; // lg:grid-cols-5
      if (width >= 768) return 4;  // md:grid-cols-4
      return 3; // sm:grid-cols-3 (mobile)
    };
  }, []);

  // Track items per row with state to handle window resize
  const [itemsPerRow, setItemsPerRow] = useState(6);
  
  useEffect(() => {
    const updateItemsPerRow = () => {
      const newItemsPerRow = getItemsPerRow();
      setItemsPerRow(newItemsPerRow);
      // Ensure visibleCount is a multiple of itemsPerRow when it changes
      setVisibleCount((prev) => {
        const completeRows = Math.floor(prev / newItemsPerRow);
        return Math.max(newItemsPerRow, completeRows * newItemsPerRow);
      });
    };
    
    updateItemsPerRow();
    window.addEventListener('resize', updateItemsPerRow);
    return () => window.removeEventListener('resize', updateItemsPerRow);
  }, [getItemsPerRow]);

  // Infinite scroll observer for artworks
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          startTransition(() => {
            setVisibleCount((prev) => {
              const newCount = prev + itemsPerRow; // Load one complete row at a time
              const maxCount = filteredAndSortedArtworks.length || newCount;
              // Ensure we never exceed available items, and always maintain complete rows
              return Math.min(newCount, maxCount);
            });
          });
        }
      });
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredAndSortedArtworks, itemsPerRow]);

  const visibleFilteredArtworks = useMemo(() => {
    const totalItems = Array.isArray(filteredAndSortedArtworks) ? filteredAndSortedArtworks.length : 0;
    
    // Check how many placeholders are in the array
    const placeholderCount = Array.isArray(filteredAndSortedArtworks) 
      ? filteredAndSortedArtworks.filter((a: any) => {
          const tags = Array.isArray(a.tags) ? a.tags : [];
          return tags.includes('_placeholder');
        }).length
      : 0;
    
    log('🔍 visibleFilteredArtworks calculation:', {
      totalItems,
      visibleCount,
      placeholderCount,
      filteredAndSortedArtworksLength: filteredAndSortedArtworks?.length,
      firstFewIds: filteredAndSortedArtworks?.slice(0, 5).map((a: any) => a.id)
    });
    
    if (totalItems === 0) {
      log('⚠️ visibleFilteredArtworks: No items to display');
      return [];
    }
    
    // Show items up to visibleCount, but don't require complete rows
    // This ensures items display even if there are fewer than itemsPerRow
    const finalCount = Math.min(visibleCount, totalItems);
    
    const artworksSlice = Array.isArray(filteredAndSortedArtworks)
      ? filteredAndSortedArtworks.slice(0, finalCount)
      : [];
    
    // Mix ads into artworks
    const result = mixAdsIntoContent(artworksSlice, ads, 2);
    
    // Separate real artworks from placeholders to preserve ranking
    const isPlaceholder = (item: any): boolean => {
      if ('type' in item && item.type === 'ad') return false; // Ads are not placeholders
      const tags = Array.isArray(item.tags) ? item.tags : [];
      return tags.includes('_placeholder') || item.id?.startsWith('placeholder-');
    };
    
    const realItems = result.filter(item => !isPlaceholder(item));
    const placeholderItems = result.filter(item => isPlaceholder(item));
    
    // Shuffle only real artworks to randomize landscape tile distribution (preserve ranking)
    // This ensures landscape tiles are randomly distributed while maintaining real artworks before placeholders
    const shuffledReal = [...realItems];
    for (let i = shuffledReal.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledReal[i], shuffledReal[j]] = [shuffledReal[j], shuffledReal[i]];
    }
    
    // Combine: shuffled real artworks first, then placeholders (maintains ranking)
    const final = [...shuffledReal, ...placeholderItems];
    
    const resultPlaceholderCount = placeholderItems.length;
    
    log('✅ visibleFilteredArtworks: Returning', final.length, 'items (', resultPlaceholderCount, 'placeholders)');
    return final;
  }, [filteredAndSortedArtworks, visibleCount, ads]);

  useEffect(() => {
    // Reset to initial count when filters change
    const initialCount = 18; // Start with 18 items (works for various screen sizes)
    setVisibleCount(initialCount);
  }, [searchQuery, selectedMedium, selectedArtworkType, sortBy, selectedEventLocation]);

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
        const placeholderProducts = generatePlaceholderMarketplaceProducts(mounted ? theme : undefined, 20);
        setMarketplaceProducts([...fetchedProducts, ...placeholderProducts]);
    } catch (err) {
        error('Error fetching marketplace products:', err);
        // Even on error, show placeholder products
        const placeholderProducts = generatePlaceholderMarketplaceProducts(mounted ? theme : undefined, 20);
        setMarketplaceProducts(placeholderProducts);
      }
    };
    
    // Marketplace tab is hidden; skip fetching marketplace products.
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const fetchEvents = async () => {
      try {
        const placeholderImage = theme === 'dark' ? '/assets/placeholder-dark.png' : '/assets/placeholder-light.png';
        const eventsSnapshot = await getDocs(query(collection(db, 'events'), orderBy('date', 'desc')));
        const fetchedEvents: EventType[] = eventsSnapshot.docs.map((doc) => {
          const data = doc.data() as any;
          const eventType: EventType['type'] =
            data.type === 'Auction' || data.type === 'Workshop' || data.type === 'Exhibition'
              ? data.type
              : 'Exhibition';
          return {
            id: doc.id,
            title: data.title || 'Untitled Event',
            description: data.description || '',
            imageUrl: data.imageUrl || placeholderImage,
            imageAiHint: data.imageAiHint || data.title || 'Event',
            date: data.date || new Date().toISOString(),
            endDate: data.endDate || undefined,
            type: eventType,
            artist: {
              id: data.artistId || '',
              name: data.artistName || 'Artist',
              handle: data.artistHandle || '',
              avatarUrl: data.artistAvatarUrl || '',
              followerCount: data.artistFollowerCount || 0,
              followingCount: 0,
              createdAt: new Date(),
            },
            locationType: 'In-person',
            locationName: data.venue || data.location || '',
            locationAddress: data.location || '',
            discussionId: data.discussionId || `event-${doc.id}`,
            attendees: data.attendees || [],
            maxAttendees: data.maxAttendees,
            price: data.price ?? undefined,
          };
        });
        const placeholderEvents = generatePlaceholderEvents(theme, 12);
        setEvents([...fetchedEvents, ...placeholderEvents]);
      } catch (err) {
        error('Failed to load events:', err);
        const placeholderEvents = generatePlaceholderEvents(theme, 12);
        setEvents(placeholderEvents);
      }
    };

    fetchEvents();
  }, [theme, mounted]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ThemeLoading size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 w-full max-w-full overflow-x-hidden">
        {/* Tabs for Artwork/Events/Market */}
        <Tabs
          value={activeTab}
        onValueChange={(value) => {
            startTransition(() => {
              setActiveTab(value as 'artwork' | 'events');
            });
            // Defer router update to avoid blocking UI
            setTimeout(() => {
              router.replace(`/discover?tab=${value}`, { scroll: false });
            }, 0);
          }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 w-full">
            <TabsList className="grid w-full grid-cols-2 md:flex md:flex-1 md:max-w-none md:gap-0">
              <TabsTrigger value="artwork" className="flex items-center justify-center gap-2 flex-1 md:flex-1 md:px-6">
                <Palette className="h-4 w-4" />
                Artwork
              </TabsTrigger>
              <TabsTrigger value="events" className="flex items-center justify-center gap-2 flex-1 md:flex-1 md:px-6">
                <Calendar className="h-4 w-4" />
                Events
              </TabsTrigger>
            </TabsList>
            {/* Desktop Filter Button - positioned next to tabs */}
            <div className="hidden md:flex">
              {activeTab === 'artwork' ? (
                <Button
                  variant="outline"
                  onClick={() => startTransition(() => setShowFilters(!showFilters))}
                  className="shrink-0 h-10 px-3"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => startTransition(() => setShowEventFilters(!showEventFilters))}
                  className="shrink-0 h-10 px-3"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Artwork Tab */}
          <TabsContent value="artwork" className="mt-6">
            {/* Search and Filter Bar */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
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
                  <div className="flex gap-2 md:hidden">
                    <Button
                      variant="outline"
                      onClick={() => startTransition(() => setShowFilters(!showFilters))}
                      className="shrink-0"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                    <ViewSelector view={artworkView} onViewChange={setArtworkView} className="shrink-0" />
                  </div>
                )}
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <Card className="p-4 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search artworks, artists, or tags..."
                      value={searchQuery}
                      onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
                      className="pl-10"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Medium</label>
                      <Select value={selectedMedium} onValueChange={(value) => startTransition(() => setSelectedMedium(value))}>
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
                      <label className="text-sm font-medium mb-2 block">Type</label>
                      <Select value={selectedArtworkType} onValueChange={(value) => startTransition(() => setSelectedArtworkType(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ARTWORK_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Sort By</label>
                      <Select value={sortBy} onValueChange={(value) => startTransition(() => setSortBy(value))}>
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
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        startTransition(() => {
                          setSelectedMedium('All');
                          setSelectedArtworkType('All');
                          setSortBy('newest');
                          setSearchQuery('');
                        });
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  </div>
                </Card>
              )}

              {/* Active Filters Display */}
              {(selectedMedium !== 'All' || selectedArtworkType !== 'All' || searchQuery) && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      Search: {searchQuery}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => startTransition(() => setSearchQuery(''))} />
                    </Badge>
                  )}
                  {selectedMedium !== 'All' && (
                    <Badge variant="secondary" className="gap-1">
                      Medium: {selectedMedium}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => startTransition(() => setSelectedMedium('All'))} />
                    </Badge>
                  )}
                  {selectedArtworkType !== 'All' && (
                    <Badge variant="secondary" className="gap-1">
                      Type: {selectedArtworkType}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => startTransition(() => setSelectedArtworkType('All'))} />
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
                  {(searchQuery || selectedMedium !== 'All' || selectedArtworkType !== 'All')
                    ? 'Try adjusting your filters to see more results.'
                    : 'Check back later for new content.'}
                </p>
                {(searchQuery || selectedMedium !== 'All' || selectedArtworkType !== 'All') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      startTransition(() => {
                        setSelectedMedium('All');
                        setSelectedArtworkType('All');
                        setSearchQuery('');
                      });
                    }}
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            ) : (artworkView === 'grid' || !isMobile) ? (
              <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-1" style={{ columnGap: '4px' }}>
                {visibleFilteredArtworks.map((item) => {
                  // Check if this is an ad
                  const isAd = 'type' in item && item.type === 'ad';
                  if (isAd) {
                    const campaign = item.campaign;
                    const isMaxWidth = campaign.maxWidthFormat && isMobile && campaign.mediaType === 'video';
                    return (
                      <div 
                        key={campaign.id}
                        className={isMaxWidth ? 'col-span-2 break-inside-avoid mb-1' : 'break-inside-avoid mb-1'}
                      >
                        <AdTile
                          campaign={campaign}
                          placement="discover"
                          userId={user?.id}
                        />
                      </div>
                    );
                  }
                  
                  const artwork = item as Artwork;
                  // Detect landscape images based on actual image aspect ratio
                  // For placeholders: use isLandscape flag
                  // For real artworks: check dimensions or load image to get aspect ratio
                  let isLandscape = false;
                  
                  if ((artwork as any).isLandscape === true) {
                    // Placeholder with explicit landscape flag
                    isLandscape = true;
                  } else if (artwork.dimensions && artwork.dimensions.width && artwork.dimensions.height) {
                    // Check aspect ratio from dimensions: landscape if width > height * 1.2
                    const aspectRatio = artwork.dimensions.width / artwork.dimensions.height;
                    isLandscape = aspectRatio > 1.2; // Landscape threshold (slightly lower for better detection)
                  } else {
                    // For artworks without dimensions, we'll detect from image loading
                    // This will be handled by the ArtworkTile component
                  }
                  
                  return (
                    <div key={artwork.id} className="break-inside-avoid mb-1">
                      <ArtworkTile 
                        artwork={artwork} 
                        hideBanner={isMobile && artworkView === 'grid'}
                        isLandscape={isLandscape} // Allow landscape images on both mobile and desktop
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
                <div className="space-y-3">
                {visibleFilteredArtworks.map((item) => {
                  // Check if this is an ad
                  const isAd = 'type' in item && item.type === 'ad';
                  if (isAd) {
                    return (
                      <AdTile
                        key={item.campaign.id}
                        campaign={item.campaign}
                        placement="discover"
                        userId={user?.id}
                      />
                    );
                  }
                  
                  const artwork = item as Artwork;
                  // Use Pexels abstract painting as placeholder: https://www.pexels.com/photo/abstract-painting-1546249/
                  const placeholderImage = 'https://images.pexels.com/photos/1546249/pexels-photo-1546249.jpeg?auto=compress&cs=tinysrgb&w=800';
                  const artworkImage = artwork.imageUrl || placeholderImage;
                  const avatarPlaceholder = theme === 'dark'
                    ? '/assets/placeholder-dark.png'
                    : '/assets/placeholder-light.png';
                  
                  const liked = isLiked(artwork.id);
                  
                  return (
                    <div key={artwork.id} className="relative group">
                      <Link href={`/artwork/${artwork.id}`}>
                        <Card className="relative aspect-square overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer">
                          <Image
                            src={artworkImage}
                            alt={artwork.imageAiHint || artwork.title}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-background/80 backdrop-blur-sm p-3 flex items-center gap-2">
                            <Avatar className="h-9 w-9 flex-shrink-0">
                              <AvatarImage src={artwork.artist.avatarUrl || avatarPlaceholder} />
                              <AvatarFallback>{artwork.artist.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">by {artwork.artist.name}</p>
                              {artwork.artist.location && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                  <MapPin className="h-3 w-3" />
                                  {artwork.artist.location}
                                </p>
                              )}
                            </div>
                            {artwork.sold ? (
                              <Badge variant="destructive" className="text-xs px-2 py-1 flex-shrink-0">
                                Sold
                              </Badge>
                            ) : artwork.isForSale ? (
                              <Badge className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1 flex-shrink-0">
                                {artwork.priceType === 'contact' || artwork.contactForPrice ? 'For Sale' : artwork.price ? `$${artwork.price.toLocaleString()}` : 'For Sale'}
                              </Badge>
                            ) : null}
                          </div>
                        </Card>
                      </Link>
                      {/* Upvote Button - positioned on the tile */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`absolute top-3 right-3 h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm border-2 transition-all ${
                          liked 
                            ? 'border-primary text-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50 hover:text-primary'
                        }`}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          await toggleLike(artwork.id);
                        }}
                        aria-label={liked ? 'Remove upvote' : 'Upvote artwork'}
                      >
                        <ArrowUp className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={loadMoreRef} className="h-10" />
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="mt-6">
            {/* Search and Filter Bar */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
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
                    className="shrink-0 md:hidden"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Filters Panel */}
              {showEventFilters && (
                <Card className="p-4 space-y-4">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search events by location (e.g., New York, London, Paris)..."
                      value={selectedEventLocation}
                      onChange={(e) => setSelectedEventLocation(e.target.value)}
                      className="pl-10"
                    />
                  </div>
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
                // Location filter - check tags first, then fallback to location text
                if (selectedEventLocation.trim()) {
                  const searchTerm = selectedEventLocation.toLowerCase().trim();
                  // Check tags array for location tag
                  const eventTags = Array.isArray(event.tags) ? event.tags : [];
                  const hasLocationTag = eventTags.some((tag: string) => 
                    tag.toLowerCase().includes(searchTerm)
                  );
                  // Also check locationTag field
                  const locationTagMatch = event.locationTag && 
                    event.locationTag.toLowerCase().includes(searchTerm);
                  // Fallback to location text fields
                  const eventLocation = (event.location || event.locationName || event.locationAddress || '').toLowerCase();
                  const eventVenue = ((event as any).venue || '').toLowerCase();
                  
                  if (!hasLocationTag && !locationTagMatch && 
                      !eventLocation.includes(searchTerm) && 
                      !eventVenue.includes(searchTerm)) {
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
                <div className={isMobile ? "grid grid-cols-1 gap-3" : "grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3"}>
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
                  
                  const priceLabel = event.price === undefined || event.price === null || `${event.price}`.trim() === ''
                    ? null
                    : (typeof event.price === 'number' ? `$${event.price}` : `${event.price}`);

                  return (
                    <Link key={event.id} href={`/event/${event.id}`}>
                      <Card className={`group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer h-full ${isMobile ? 'flex flex-row min-h-[140px]' : 'flex flex-col'}`}>
                        <div className={`${isMobile ? 'relative w-36 sm:w-40 h-full aspect-[3/2] flex-shrink-0' : 'relative aspect-[4/3]'} overflow-hidden`}>
                          <Image
                            src={eventImage}
                            alt={event.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-4 flex flex-col flex-grow">
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
                          {priceLabel && (
                            <p className="font-semibold text-foreground text-sm mt-auto pt-1">{priceLabel}</p>
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
                    
                    const priceLabel = event.price === undefined || event.price === null || `${event.price}`.trim() === ''
                      ? null
                      : (typeof event.price === 'number' ? `$${event.price}` : `${event.price}`);

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
                                {priceLabel && (
                                  <Badge className="bg-blue-600 hover:bg-blue-700 text-sm px-3 py-1">
                                    {priceLabel}
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
        <ThemeLoading text="" size="lg" />
      </div>
    }>
      <DiscoverPageContent />
    </Suspense>
  );
}
