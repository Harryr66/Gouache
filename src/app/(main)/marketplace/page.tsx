'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Heart, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MarketplaceProduct } from '@/lib/types';
import { usePlaceholder } from '@/hooks/use-placeholder';
import { ThemeLoading } from '@/components/theme-loading';

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' }
];

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'Artwork', label: 'Original Artworks' },
  { value: 'limited-prints', label: 'Limited Edition Prints' },
  { value: 'all-prints', label: 'All Prints' },
  { value: 'Books', label: 'Books' },
  { value: 'Supplies', label: 'Supplies' },
  { value: 'Other', label: 'Other' }
];

// Placeholder products for demonstration
const generatePlaceholderProducts = (generatePlaceholderUrl: (w: number, h: number) => string): MarketplaceProduct[] => {
  const placeholderImage = generatePlaceholderUrl(400, 300);
  return [
    {
      id: 'placeholder-1',
      title: 'Abstract Expressionist Painting',
      description: 'A vibrant abstract painting featuring bold colors and dynamic brushstrokes. Perfect for modern interiors.',
      price: 450.00,
      originalPrice: 600.00,
      currency: 'USD',
      category: 'Artwork',
      subcategory: 'Painting',
      images: [placeholderImage],
      sellerId: 'placeholder-seller-1',
      sellerName: 'Sarah Martinez',
      isAffiliate: false,
      isActive: true,
      stock: 1,
      rating: 4.8,
      reviewCount: 24,
      tags: ['abstract', 'painting', 'modern', 'colorful'],
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      salesCount: 12,
      isOnSale: true,
      isApproved: true,
      status: 'approved'
    },
    {
      id: 'placeholder-2',
      title: 'Limited Edition Art Print',
      description: 'High-quality giclee print on premium paper. Signed and numbered edition of 50.',
      price: 85.00,
      currency: 'USD',
      category: 'Prints',
      subcategory: 'Fine Art Print',
      images: [placeholderImage],
      sellerId: 'placeholder-seller-2',
      sellerName: 'James Chen',
      isAffiliate: false,
      isActive: true,
      stock: 15,
      rating: 4.9,
      reviewCount: 47,
      tags: ['print', 'limited edition', 'giclee', 'signed'],
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      salesCount: 28,
      isOnSale: false,
      isApproved: true,
      status: 'approved'
    },
    {
      id: 'placeholder-3',
      title: 'Watercolor Landscape Collection',
      description: 'Set of three original watercolor paintings depicting serene mountain landscapes.',
      price: 320.00,
      currency: 'USD',
      category: 'Artwork',
      subcategory: 'Watercolor',
      images: [placeholderImage],
      sellerId: 'placeholder-seller-3',
      sellerName: 'Emma Thompson',
      isAffiliate: false,
      isActive: true,
      stock: 1,
      rating: 5.0,
      reviewCount: 8,
      tags: ['watercolor', 'landscape', 'nature', 'set'],
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      salesCount: 3,
      isOnSale: false,
      isApproved: true,
      status: 'approved'
    },
    {
      id: 'placeholder-4',
      title: 'Art Supplies Starter Kit',
      description: 'Complete starter kit for beginners including brushes, paints, canvas, and palette.',
      price: 65.00,
      originalPrice: 90.00,
      currency: 'USD',
      category: 'Supplies',
      subcategory: 'Starter Kit',
      images: [placeholderImage],
      sellerId: 'placeholder-seller-4',
      sellerName: 'Art Supply Co.',
      isAffiliate: true,
      affiliateLink: '#',
      isActive: true,
      stock: 50,
      rating: 4.6,
      reviewCount: 132,
      tags: ['supplies', 'starter kit', 'beginner', 'tools'],
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      salesCount: 89,
      isOnSale: true,
      isApproved: true,
      status: 'approved'
    },
    {
      id: 'placeholder-5',
      title: 'Contemporary Sculpture',
      description: 'Handcrafted ceramic sculpture exploring themes of nature and form. Unique one-of-a-kind piece.',
      price: 750.00,
      currency: 'USD',
      category: 'Artwork',
      subcategory: 'Sculpture',
      images: [placeholderImage],
      sellerId: 'placeholder-seller-5',
      sellerName: 'Michael Rodriguez',
      isAffiliate: false,
      isActive: true,
      stock: 1,
      rating: 4.7,
      reviewCount: 15,
      tags: ['sculpture', 'ceramic', 'contemporary', 'unique'],
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      salesCount: 5,
      isOnSale: false,
      isApproved: true,
      status: 'approved'
    },
    {
      id: 'placeholder-6',
      title: 'Digital Art Tutorial Book',
      description: 'Comprehensive guide to digital art techniques with step-by-step tutorials and artist interviews.',
      price: 29.99,
      currency: 'USD',
      category: 'Books',
      subcategory: 'Tutorial',
      images: [placeholderImage],
      sellerId: 'placeholder-seller-6',
      sellerName: 'Digital Arts Publishing',
      isAffiliate: false,
      isActive: true,
      stock: 200,
      rating: 4.5,
      reviewCount: 67,
      tags: ['book', 'tutorial', 'digital art', 'guide'],
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      salesCount: 156,
      isOnSale: false,
      isApproved: true,
      status: 'approved'
    },
    {
      id: 'placeholder-7',
      title: 'Portrait Commission',
      description: 'Custom portrait commission service. Professional artist will create a personalized portrait from your photo.',
      price: 250.00,
      currency: 'USD',
      category: 'Other',
      subcategory: 'Commission',
      images: [placeholderImage],
      sellerId: 'placeholder-seller-7',
      sellerName: 'Portrait Studio',
      isAffiliate: false,
      isActive: true,
      stock: 10,
      rating: 4.9,
      reviewCount: 34,
      tags: ['commission', 'portrait', 'custom', 'personalized'],
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      salesCount: 22,
      isOnSale: false,
      isApproved: true,
      status: 'approved'
    },
    {
      id: 'placeholder-8',
      title: 'Mixed Media Collage',
      description: 'Unique mixed media artwork combining paper, fabric, and paint. One-of-a-kind statement piece.',
      price: 380.00,
      originalPrice: 450.00,
      currency: 'USD',
      category: 'Artwork',
      subcategory: 'Mixed Media',
      images: [placeholderImage],
      sellerId: 'placeholder-seller-8',
      sellerName: 'Lisa Anderson',
      isAffiliate: false,
      isActive: true,
      stock: 1,
      rating: 4.8,
      reviewCount: 19,
      tags: ['mixed media', 'collage', 'unique', 'statement'],
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      salesCount: 7,
      isOnSale: true,
      isApproved: true,
      status: 'approved'
    }
  ];
};

export default function MarketplacePage() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();
  const { generatePlaceholderUrl } = usePlaceholder();
  const placeholderUrl = generatePlaceholderUrl(400, 300);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const allProducts: MarketplaceProduct[] = [];

        // 1. Fetch from marketplaceProducts collection
        try {
          const marketplaceQuery = query(
            collection(db, 'marketplaceProducts'),
            where('isActive', '==', true),
            orderBy('createdAt', 'desc')
          );
          
          const marketplaceSnapshot = await getDocs(marketplaceQuery);
          const marketplaceProducts = marketplaceSnapshot.docs
            .map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now())
              } as MarketplaceProduct;
            })
            .filter(product => product.isApproved !== false && (product.status === 'approved' || !product.status));
          
          allProducts.push(...marketplaceProducts);
        } catch (error) {
          console.error('Error fetching marketplace products:', error);
        }

        // 2. Fetch artworks for sale from artist profiles
        try {
          const artworksQuery = query(
            collection(db, 'artworks'),
            where('isForSale', '==', true),
            orderBy('createdAt', 'desc')
          );
          
          const artworksSnapshot = await getDocs(artworksQuery);
          artworksSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const artist = data.artist || {};
            
            // Convert artwork to MarketplaceProduct format
            const product: MarketplaceProduct = {
              id: `artwork-${doc.id}`,
              title: data.title || 'Untitled Artwork',
              description: data.description || '',
              price: data.price || 0,
              currency: data.currency || 'USD',
              category: 'Artwork',
              subcategory: data.category || 'Original',
              images: data.imageUrl ? [data.imageUrl] : [],
              sellerId: artist.userId || artist.id || '',
              sellerName: artist.name || 'Unknown Artist',
              sellerWebsite: artist.website,
              isAffiliate: false,
              isActive: !data.sold && (data.stock === undefined || data.stock > 0),
              stock: data.stock || 1,
              rating: 0,
              reviewCount: 0,
              tags: data.tags || [],
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
              salesCount: 0,
              isOnSale: false,
              isApproved: true,
              status: 'approved',
              dimensions: data.dimensions
            };
            
            allProducts.push(product);
          });
        } catch (error) {
          console.error('Error fetching artworks for sale:', error);
        }

        // 3. Fetch books from artist profiles (if books collection exists)
        try {
          const booksQuery = query(
            collection(db, 'books'),
            where('isActive', '==', true),
            orderBy('createdAt', 'desc')
          );
          
          const booksSnapshot = await getDocs(booksQuery);
          booksSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const author = data.author || data.seller || {};
            
            // Convert book to MarketplaceProduct format
            const product: MarketplaceProduct = {
              id: `book-${doc.id}`,
              title: data.title || 'Untitled Book',
              description: data.description || '',
              price: data.price || 0,
              originalPrice: data.originalPrice,
              currency: data.currency || 'USD',
              category: 'Books',
              subcategory: data.subcategory || data.category || 'General',
              images: data.thumbnail ? [data.thumbnail] : (data.thumbnailUrl ? [data.thumbnailUrl] : (data.imageUrl ? [data.imageUrl] : [])),
              sellerId: author.userId || author.id || data.sellerId || '',
              sellerName: author.name || data.sellerName || 'Unknown Author',
              sellerWebsite: author.website || data.sellerWebsite,
              isAffiliate: data.isAffiliate || false,
              affiliateLink: data.affiliateLink || data.externalUrl,
              isActive: true,
              stock: data.stock || 999,
              rating: data.rating || 0,
              reviewCount: data.reviewCount || 0,
              tags: data.tags || [],
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
              salesCount: data.salesCount || 0,
              isOnSale: data.isOnSale || false,
              isApproved: true,
              status: 'approved'
            };
            
            allProducts.push(product);
          });
        } catch (error) {
          console.error('Error fetching books:', error);
        }

        // Sort all products by creation date (newest first)
        allProducts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        setProducts(allProducts);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Always show placeholder products for demonstration
  const displayProducts = useMemo(() => {
    const placeholders = generatePlaceholderProducts(generatePlaceholderUrl);
    // Combine real products with placeholders
    return [...products, ...placeholders];
  }, [products, generatePlaceholderUrl]);

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = displayProducts;

    // Search filter - includes title, description, tags, and artist names
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(queryLower) ||
        product.description.toLowerCase().includes(queryLower) ||
        product.sellerName.toLowerCase().includes(queryLower) ||
        product.tags.some(tag => tag.toLowerCase().includes(queryLower))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'limited-prints') {
        // Filter for limited edition prints (check tags or subcategory)
        filtered = filtered.filter(product => 
          product.category === 'Prints' && 
          (product.tags.some(tag => tag.toLowerCase().includes('limited')) ||
           product.subcategory?.toLowerCase().includes('limited') ||
           product.title.toLowerCase().includes('limited edition'))
        );
      } else if (selectedCategory === 'all-prints') {
        // Filter for all prints
        filtered = filtered.filter(product => product.category === 'Prints');
      } else {
        // Filter for other categories
        filtered = filtered.filter(product => product.category === selectedCategory);
      }
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'popular':
        filtered.sort((a, b) => b.salesCount - a.salesCount);
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
    }

    return filtered;
  }, [displayProducts, searchQuery, selectedCategory, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <ThemeLoading text="Loading marketplace..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
        {/* Header */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Gouache Market
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{filteredAndSortedProducts.length} product{filteredAndSortedProducts.length !== 1 ? 's' : ''} available</span>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-6">
            <div className="flex-1 relative">
            <Input
                placeholder="Search products, artist names, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 rounded-r-none pl-4 pr-12"
              />
              <Button className="absolute right-0 top-0 h-12 px-4 rounded-l-none" variant="ghost" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="h-12 px-4 flex-shrink-0"
            >
              <Filter className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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
                      {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
              </div>
              <div className="flex items-end">
                  <Button
                    variant="outline"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSortBy('newest');
                    setSearchQuery('');
                  }}
                  className="w-full"
                >
                  Clear Filters
                  </Button>
        </div>
          </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {filteredAndSortedProducts.length === 0 ? (
            <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground text-center">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'No products are currently available in the marketplace.'}
              </p>
                          </CardContent>
                        </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedProducts.map((product) => (
              <Card key={product.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
                          <div className="relative">
                            <img
                    src={product.images && product.images.length > 0 ? product.images[0] : placeholderUrl}
                    alt={product.title}
                    className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                    {product.isOnSale && (
                      <Badge variant="destructive">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Sale
                        </Badge>
                      )}
                    {product.stock === 0 && (
                      <Badge variant="secondary">Out of Stock</Badge>
                              )}
                          </div>
                  </div>
                  
                  <CardContent className="p-4 flex flex-col flex-1">
                  <div className="mb-2 flex-1">
                    <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors mb-1">
                      {product.title}
                      </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {product.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <span>by {product.sellerName}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-primary">
                        {product.currency} {product.price.toFixed(2)}
                        </span>
                      {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-sm text-muted-foreground line-through">
                          {product.currency} {product.originalPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                  </div>

                  {product.tags && product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {product.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-auto">
                    <Button
                      className="flex-1 gradient-button"
                      onClick={() => {
                        router.push(`/marketplace/${product.id}`);
                      }}
                      disabled={product.stock === 0}
                    >
                      {product.stock === 0 ? 'Out of Stock' : 'View'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
        )}
      </div>
    </div>
  );
}
