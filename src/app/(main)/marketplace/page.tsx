'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Star, Heart, Filter, ChevronRight, ChevronLeft, ChevronDown } from 'lucide-react';
import { ProductCard } from '@/components/shop/product-card';
import { usePlaceholder } from '@/hooks/use-placeholder';

const categories = [
  {
    id: 'art-prints',
    name: 'Art Prints',
    subcategories: [
      { id: 'fine-art-prints', name: 'Fine Art Prints' },
      { id: 'canvas-prints', name: 'Canvas Prints' },
      { id: 'framed-prints', name: 'Framed Prints' },
      { id: 'limited-editions', name: 'Limited Editions' },
      { id: 'posters', name: 'Posters' },
      { id: 'digital-prints', name: 'Digital Downloads' }
    ]
  },
  {
    id: 'art-books',
    name: 'Art Books',
    subcategories: [
      { id: 'art-history', name: 'Art History' },
      { id: 'artist-biographies', name: 'Artist Biographies' },
      { id: 'technique-books', name: 'Technique & How-To' },
      { id: 'art-theory', name: 'Art Theory' },
      { id: 'coffee-table-books', name: 'Coffee Table Books' },
      { id: 'exhibition-catalogs', name: 'Exhibition Catalogs' }
    ]
  }
];

const sortOptions = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest First' },
  { value: 'best-selling', label: 'Best Selling' }
];

const countries = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' }
];

export default function LearnPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('art-prints');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Use the placeholder hook for dynamic theme-aware placeholders
  const placeholderUrl = usePlaceholder(300, 300);

  // Mock data for marketplace - now using dynamic placeholder
  const mockProducts = useMemo(() => [
    {
      id: '1',
      title: 'The Starry Night - Fine Art Print',
      price: 89.99,
      originalPrice: 120.00,
      currency: 'USD',
      imageUrl: placeholderUrl,
      rating: 4.9,
      reviewCount: 1250,
      category: 'Art Prints',
      subcategory: 'Fine Art Prints',
      isWishlisted: false,
      isOnSale: true,
      tags: ['van gogh', 'fine art', 'museum quality', 'classic'],
      description: 'Museum-quality giclée print of Van Gogh\'s masterpiece',
      seller: {
        name: 'Fine Art Reproductions',
        rating: 4.9,
        isVerified: true
      }
    },
    {
      id: '2',
      title: 'Modern Abstract Canvas Print - Large',
      price: 149.99,
      currency: 'USD',
      imageUrl: placeholderUrl,
      rating: 4.7,
      reviewCount: 890,
      category: 'Art Prints',
      subcategory: 'Canvas Prints',
      isWishlisted: true,
      isOnSale: false,
      tags: ['abstract', 'canvas', 'modern', 'gallery wrapped'],
      description: 'Large format abstract print on gallery-wrapped canvas',
      seller: {
        name: 'Modern Art Prints',
        rating: 4.8,
        isVerified: true
      }
    },
    {
      id: '3',
      title: 'Limited Edition Banksy Print - Signed',
      price: 450.00,
      currency: 'USD',
      imageUrl: placeholderUrl,
      rating: 4.9,
      reviewCount: 320,
      category: 'Art Prints',
      subcategory: 'Limited Editions',
      isWishlisted: false,
      isOnSale: false,
      tags: ['banksy', 'limited edition', 'street art', 'signed'],
      description: 'Authenticated limited edition print, numbered and signed',
      seller: {
        name: 'Street Art Gallery',
        rating: 4.9,
        isVerified: true
      }
    },
    {
      id: '4',
      title: 'The Art Book - Phaidon',
      price: 45.99,
      currency: 'USD',
      imageUrl: placeholderUrl,
      rating: 4.8,
      reviewCount: 2100,
      category: 'Art Books',
      subcategory: 'Art History',
      isWishlisted: false,
      isOnSale: false,
      tags: ['art history', 'reference', 'comprehensive', 'phaidon'],
      description: 'Comprehensive guide to 500 great artists and their works',
      seller: {
        name: 'Art Book Publishers',
        rating: 4.8,
        isVerified: true
      }
    },
    {
      id: '5',
      title: 'Frida Kahlo: The Complete Paintings',
      price: 65.00,
      currency: 'USD',
      imageUrl: placeholderUrl,
      rating: 4.9,
      reviewCount: 780,
      category: 'Art Books',
      subcategory: 'Artist Biographies',
      isWishlisted: true,
      isOnSale: false,
      tags: ['frida kahlo', 'biography', 'paintings', 'monograph'],
      description: 'Comprehensive monograph featuring all of Kahlo\'s paintings',
      seller: {
        name: 'Taschen Books',
        rating: 4.9,
        isVerified: true
      }
    },
    {
      id: '6',
      title: 'Color Theory for Artists - Hardcover',
      price: 34.99,
      currency: 'USD',
      imageUrl: placeholderUrl,
      rating: 4.7,
      reviewCount: 1450,
      category: 'Art Books',
      subcategory: 'Technique & How-To',
      isWishlisted: false,
      isOnSale: false,
      tags: ['color theory', 'technique', 'how-to', 'educational'],
      description: 'Practical guide to understanding and applying color theory',
      seller: {
        name: 'Art Education Press',
        rating: 4.7,
        isVerified: true
      }
    }
  ], [placeholderUrl]);

  const filteredProducts = useMemo(() => {
    let filtered = [...mockProducts];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => 
        product.category.toLowerCase().replace(/\s+/g, '-') === selectedCategory
      );
    }

    // Filter by subcategory
    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter(product => 
        product.subcategory.toLowerCase().replace(/\s+/g, '-') === selectedSubcategory
      );
    }

    // Sort products
    filtered.sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
        case 'newest':
          return b.reviewCount - a.reviewCount; // Using review count as proxy for newness
        case 'best-selling':
          return b.reviewCount - a.reviewCount;
      default:
        return 0;
    }
  });

    return filtered;
  }, [searchQuery, selectedCategory, selectedSubcategory, sortBy]);

  const mostWishedFor = mockProducts.filter(p => p.isWishlisted).slice(0, 6);
  const fourStarsAndAbove = mockProducts.filter(p => p.rating >= 4.0).slice(0, 6);
  const onSale = mockProducts.filter(p => p.isOnSale).slice(0, 6);

  const toggleWishlist = (productId: string) => {
    setWishlist(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
        {/* Header */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">SOMA Learn</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="hidden sm:inline">Deliver to</span>
                <span className="sm:hidden">Country:</span>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="w-32 sm:w-40 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Shopping cart removed - monetizing via affiliate links */}
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
            <Input
                placeholder="Search SOMA Learn"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 rounded-r-none"
              />
              <Button className="absolute right-0 top-0 h-10 px-4 rounded-l-none">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2 sm:gap-4 text-sm overflow-x-auto pb-2">
            <Button variant="ghost" className="px-2 sm:px-3 py-2 h-auto font-normal whitespace-nowrap text-xs sm:text-sm">Best Sellers</Button>
            <Button variant="ghost" className="px-2 sm:px-3 py-2 h-auto font-normal whitespace-nowrap text-xs sm:text-sm">New Releases</Button>
            <Button variant="ghost" className="px-2 sm:px-3 py-2 h-auto font-normal whitespace-nowrap text-xs sm:text-sm">Art Prints</Button>
            <Button variant="ghost" className="px-2 sm:px-3 py-2 h-auto font-normal whitespace-nowrap text-xs sm:text-sm">Art Books</Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="font-semibold mb-4 text-card-foreground">Department</h3>
              <div className="space-y-2">
                {categories.map((category) => {
                  const isExpanded = expandedCategories.has(category.id);
                  const isSelected = selectedCategory === category.id;
                  
                  return (
                    <div key={category.id}>
                      <div className="flex items-center">
                        <Button
                          variant={isSelected ? "default" : "ghost"}
                          className="flex-1 justify-start h-auto p-2 text-sm"
                          onClick={() => {
                            setSelectedCategory(category.id);
                            setSelectedSubcategory('all');
                          }}
                        >
                          {category.name}
                        </Button>
                        {category.subcategories.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 ml-1"
                            onClick={() => toggleCategoryExpansion(category.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                      {isExpanded && category.subcategories.length > 0 && (
                        <div className="ml-4 mt-2 space-y-1">
                          {category.subcategories.map((subcategory) => (
                            <Button
                              key={subcategory.id}
                              variant={selectedSubcategory === subcategory.id ? "secondary" : "ghost"}
                              className="w-full justify-start h-auto p-2 text-xs"
                              onClick={() => setSelectedSubcategory(subcategory.id)}
                            >
                              {subcategory.name}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile Category Filter */}
          <div className="lg:hidden mb-4">
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="font-semibold mb-3 text-card-foreground">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setSelectedSubcategory('all');
                    }}
                    className="text-xs"
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
              {selectedCategory && selectedCategory !== 'all' && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium mb-2">Subcategories</h4>
                  <div className="flex flex-wrap gap-2">
                    {categories.find(cat => cat.id === selectedCategory)?.subcategories.map((subcategory) => (
                      <Button
                        key={subcategory.id}
                        variant={selectedSubcategory === subcategory.id ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setSelectedSubcategory(subcategory.id)}
                        className="text-xs"
                      >
                        {subcategory.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Page Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {selectedCategoryData?.name || categories[0]?.name || 'Art Prints'}
              </h2>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <p className="text-muted-foreground text-sm">
                  {filteredProducts.length} products found
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-48 text-sm">
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
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full sm:w-auto text-sm"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>
              </div>
        </div>

            {/* Featured Sections */}
            {selectedCategory === 'all' && (
              <div className="space-y-8 mb-8">
                {/* Most Wished For */}
                {mostWishedFor.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Most wished for</h3>
                      <Button variant="ghost" className="text-blue-600 hover:text-blue-700">
                        See more
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
                      {mostWishedFor.map((product) => (
                        <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                          <CardContent className="p-0">
                            <div className="relative">
                              <img
                                src={product.imageUrl}
                                alt={product.title}
                                className="w-full h-48 object-cover"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute top-2 right-2 h-8 w-8 p-0"
                                onClick={() => toggleWishlist(product.id)}
                              >
                                <Heart className={`h-4 w-4 ${wishlist.includes(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                              </Button>
                            </div>
                            <div className="p-3">
                              <h4 className="font-medium text-sm line-clamp-2 mb-2">{product.title}</h4>
                              <div className="flex items-center gap-1 mb-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs text-muted-foreground">{product.rating}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-green-600">${product.price}</span>
                                {product.originalPrice && (
                                  <span className="text-xs text-muted-foreground line-through">${product.originalPrice}</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{product.reviewCount} reviews</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4 Stars and Above */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">4 stars and above</h3>
                    <Button variant="ghost" className="text-blue-600 hover:text-blue-700">
                      See more
                    </Button>
          </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
                    {fourStarsAndAbove.map((product) => (
                      <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <CardContent className="p-0">
                          <div className="relative">
                            <img
                              src={product.imageUrl}
                              alt={product.title}
                              className="w-full h-48 object-cover"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute top-2 right-2 h-8 w-8 p-0"
                              onClick={() => toggleWishlist(product.id)}
                            >
                              <Heart className={`h-4 w-4 ${wishlist.includes(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                            </Button>
                          </div>
                          <div className="p-3">
                            <h4 className="font-medium text-sm line-clamp-2 mb-2">{product.title}</h4>
                            <div className="flex items-center gap-1 mb-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs text-muted-foreground">{product.rating}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-green-600">${product.price}</span>
                              {product.originalPrice && (
                                <span className="text-xs text-muted-foreground line-through">${product.originalPrice}</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{product.reviewCount} reviews</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
          </div>
        )}

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="relative">
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="w-full h-64 object-cover"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 h-8 w-8 p-0"
                        onClick={() => toggleWishlist(product.id)}
                      >
                        <Heart className={`h-4 w-4 ${wishlist.includes(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                      </Button>
                      {product.isOnSale && (
                        <Badge className="absolute top-2 left-2 bg-red-500">Sale</Badge>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold mb-2 line-clamp-2">{product.title}</h3>
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-muted-foreground">{product.rating}</span>
                        <span className="text-sm text-muted-foreground">({product.reviewCount})</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-lg text-green-600">${product.price}</span>
                        {product.originalPrice && (
                          <span className="text-sm text-muted-foreground line-through">${product.originalPrice}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-muted-foreground">by {product.seller.name}</span>
                        {product.seller.isVerified && (
                          <Badge variant="secondary" className="text-xs">Verified</Badge>
                        )}
                      </div>
                      <Button className="w-full">
                        View Product
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">1</Button>
              <Button variant="outline" size="sm">2</Button>
              <Button variant="outline" size="sm">3</Button>
              <Button variant="outline" size="sm">
                <ChevronRight className="h-4 w-4" />
            </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}