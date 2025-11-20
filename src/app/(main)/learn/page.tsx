'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Package, Book, GraduationCap, ImageIcon, ShoppingCart, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { ThemeLoading } from '@/components/theme-loading';

interface ShopProduct {
  id: string;
  type: 'artwork' | 'course' | 'book';
  title: string;
  description?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  sellerId: string;
  sellerName: string;
  isAvailable: boolean;
  stock?: number;
  category?: string;
  createdAt: Date;
  rating?: number;
  reviewCount?: number;
}

const productTypes = [
  { value: 'all', label: 'All Products' },
  { value: 'artwork', label: 'Artworks' },
  { value: 'course', label: 'Courses' },
  { value: 'book', label: 'Books' }
];

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' }
];

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShopProducts = async () => {
      setLoading(true);
      try {
        const allProducts: ShopProduct[] = [];

        // Fetch artworks for sale
        try {
          // Try with orderBy first, fallback to just where if index doesn't exist
          let artworksSnapshot;
          try {
            const artworksQuery = query(
              collection(db, 'artworks'),
              where('isForSale', '==', true),
              orderBy('createdAt', 'desc')
            );
            artworksSnapshot = await getDocs(artworksQuery);
          } catch (indexError: any) {
            // If index doesn't exist, query without orderBy
            console.warn('Firestore index may not exist, querying without orderBy:', indexError);
            const artworksQuery = query(
              collection(db, 'artworks'),
              where('isForSale', '==', true)
            );
            artworksSnapshot = await getDocs(artworksQuery);
          }
          
          artworksSnapshot.forEach((doc: any) => {
            const data = doc.data();
            // Only add artworks that are for sale and have required fields
            if (data.isForSale === true && data.imageUrl) {
              allProducts.push({
                id: doc.id,
                type: 'artwork',
                title: data.title || 'Untitled',
                description: data.description,
                price: data.price || 0,
                currency: data.currency || 'USD',
                imageUrl: data.imageUrl,
                sellerId: data.artist?.userId || data.userId || '',
                sellerName: data.artist?.name || data.artistName || 'Unknown Artist',
                isAvailable: !data.sold && (data.stock === undefined || data.stock > 0),
                stock: data.stock,
                category: data.category,
                createdAt: data.createdAt?.toDate?.() || new Date(),
              });
            }
          });
        } catch (error) {
          console.error('Error fetching artworks:', error);
        }

        // Fetch courses (only published ones)
        try {
          let coursesSnapshot;
          try {
            const coursesQuery = query(
              collection(db, 'courses'),
              where('isPublished', '==', true),
              orderBy('createdAt', 'desc')
            );
            coursesSnapshot = await getDocs(coursesQuery);
          } catch (indexError: any) {
            console.warn('Firestore index may not exist for courses, querying without orderBy:', indexError);
            const coursesQuery = query(
              collection(db, 'courses'),
              where('isPublished', '==', true)
            );
            coursesSnapshot = await getDocs(coursesQuery);
          }
          
          coursesSnapshot.forEach((doc: any) => {
            const data = doc.data();
            // Only add published courses
            if (data.isPublished === true) {
              allProducts.push({
                id: doc.id,
                type: 'course',
                title: data.title || 'Untitled Course',
                description: data.description,
                price: data.price || 0,
                currency: data.currency || 'USD',
                imageUrl: data.thumbnail || data.thumbnailUrl,
                sellerId: data.instructor?.userId || data.userId || '',
                sellerName: data.instructor?.name || 'Unknown Instructor',
                isAvailable: data.isActive !== false,
                category: data.category,
                createdAt: data.createdAt?.toDate?.() || new Date(),
                rating: data.rating,
                reviewCount: data.reviewCount,
              });
            }
          });
        } catch (error) {
          console.error('Error fetching courses:', error);
        }

        // Fetch books
        try {
          let booksSnapshot;
          try {
            const booksQuery = query(
              collection(db, 'books'),
              orderBy('createdAt', 'desc')
            );
            booksSnapshot = await getDocs(booksQuery);
          } catch (indexError: any) {
            console.warn('Firestore index may not exist for books, querying without orderBy:', indexError);
            const booksQuery = query(collection(db, 'books'));
            booksSnapshot = await getDocs(booksQuery);
          }
          
          booksSnapshot.forEach((doc: any) => {
            const data = doc.data();
            allProducts.push({
              id: doc.id,
              type: 'book',
              title: data.title || 'Untitled Book',
              description: data.description,
              price: data.price || 0,
              currency: data.currency || 'USD',
              imageUrl: data.imageUrl || data.coverImageUrl,
              sellerId: data.artistId || data.userId || '',
              sellerName: data.artistName || 'Unknown Author',
              isAvailable: data.isAvailable !== false,
              stock: data.stock,
              category: data.category,
              createdAt: data.createdAt?.toDate?.() || new Date(),
            });
          });
        } catch (error) {
          console.error('Error fetching books:', error);
        }

        // Sort by creation date (newest first) - client-side sort as fallback
        allProducts.sort((a, b) => {
          const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
          const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
          return timeB - timeA;
        });
        setProducts(allProducts);
        console.log(`✅ Marketplace: Loaded ${allProducts.length} products (${allProducts.filter(p => p.type === 'artwork').length} artworks, ${allProducts.filter(p => p.type === 'course').length} courses, ${allProducts.filter(p => p.type === 'book').length} books)`);
      } catch (error) {
        console.error('Error fetching shop products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShopProducts();
  }, []);

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(p => p.type === selectedType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.sellerName.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered = [...filtered].sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered = [...filtered].sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered = [...filtered].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
      default:
        filtered = [...filtered].sort((a, b) => {
          const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
          const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
          return timeB - timeA;
        });
        break;
    }

    return filtered;
  }, [products, selectedType, searchQuery, sortBy]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'artwork':
        return <ImageIcon className="h-4 w-4" />;
      case 'course':
        return <GraduationCap className="h-4 w-4" />;
      case 'book':
        return <Book className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'artwork':
        return 'Artwork';
      case 'course':
        return 'Course';
      case 'book':
        return 'Book';
      default:
        return type;
    }
  };

  const getProductLink = (product: ShopProduct) => {
    switch (product.type) {
      case 'artwork':
        return `/artwork/${product.id}`;
      case 'course':
        return `/learn/${product.id}`;
      case 'book':
        return `/learn/${product.id}`;
      default:
        return '#';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ThemeLoading text="Loading marketplace..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                <ShoppingCart className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary flex-shrink-0" />
                <span>Marketplace</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Shop products from artists and creators
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="flex-1 relative">
              <Input
                placeholder="Search products, artists, or creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 sm:h-12 rounded-r-none pl-3 sm:pl-4 pr-10 sm:pr-12 text-sm sm:text-base"
              />
              <Button className="absolute right-0 top-0 h-10 sm:h-12 px-3 sm:px-4 rounded-l-none" size="sm">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="h-10 sm:h-12 px-3 sm:px-4 flex-shrink-0 text-sm sm:text-base"
              size="sm"
            >
              <Filter className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline sm:inline">Filters</span>
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 p-3 sm:p-4 bg-muted/50 rounded-lg">
              <div>
                <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">Product Type</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="h-9 sm:h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-9 sm:h-10 text-sm">
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
              <div className="flex items-end sm:col-span-2 md:col-span-1">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedType('all');
                    setSortBy('newest');
                    setSearchQuery('');
                  }}
                  className="w-full h-9 sm:h-10 text-sm"
                  size="sm"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold truncate">
                {filteredAndSortedProducts.length} {filteredAndSortedProducts.length === 1 ? 'Product' : 'Products'} Found
                {selectedType !== 'all' && (
                  <span className="hidden sm:inline"> in {getTypeLabel(selectedType)}s</span>
                )}
              </h2>
              {selectedType !== 'all' && (
                <span className="sm:hidden text-sm text-muted-foreground">
                  in {getTypeLabel(selectedType)}s
                </span>
              )}
              {searchQuery && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                  Results for "{searchQuery}"
                </p>
              )}
            </div>
            {filteredAndSortedProducts.length > 0 && (
              <div className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">
                <span className="hidden sm:inline">Showing all </span>
                {filteredAndSortedProducts.length} {filteredAndSortedProducts.length === 1 ? 'product' : 'products'}
              </div>
            )}
          </div>
        </div>

        {filteredAndSortedProducts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
              <ShoppingCart className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 text-center">No products found</h3>
              <p className="text-xs sm:text-sm text-muted-foreground text-center max-w-sm">
                {searchQuery ? 'Try adjusting your search or filters.' : 'No products available at the moment.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {filteredAndSortedProducts.map((product) => (
              <Card key={product.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer">
                <Link href={getProductLink(product)} className="block" prefetch={false}>
                  <div className="relative aspect-square">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          const target = e.target as HTMLImageElement;
                          if (target && target.parentElement) {
                            target.style.display = 'none';
                            const placeholder = target.parentElement.querySelector('.image-placeholder-fallback');
                            if (!placeholder) {
                              const placeholderDiv = document.createElement('div');
                              placeholderDiv.className = 'image-placeholder-fallback w-full h-full bg-muted flex items-center justify-center absolute inset-0';
                              placeholderDiv.innerHTML = `<div class="text-muted-foreground">${getTypeIcon(product.type).props.children}</div>`;
                              target.parentElement.appendChild(placeholderDiv);
                            }
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <div className="text-muted-foreground">
                          {getTypeIcon(product.type)}
                        </div>
                      </div>
                    )}
                    {!product.isAvailable && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                        <Badge variant="destructive" className="text-sm">Sold Out</Badge>
                      </div>
                    )}
                    <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-10">
                      <Badge variant="secondary" className="flex items-center gap-0.5 sm:gap-1 bg-background/90 backdrop-blur-sm px-1.5 sm:px-2 py-0.5 sm:py-1">
                        <span className="h-3 w-3 sm:h-4 sm:w-4">{getTypeIcon(product.type)}</span>
                        <span className="text-[10px] sm:text-xs">{getTypeLabel(product.type)}</span>
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                      <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 flex-1 leading-tight">{product.title}</h3>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2 line-clamp-2 leading-relaxed">
                      {product.description || 'No description available'}
                    </p>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground mb-2 flex-wrap">
                      <span className="truncate">by {product.sellerName}</span>
                      {product.rating && product.rating > 0 && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <div className="flex items-center gap-0.5 sm:gap-1">
                            <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                            <span>{product.rating.toFixed(1)}</span>
                            {product.reviewCount && product.reviewCount > 0 && (
                              <span className="text-muted-foreground">({product.reviewCount})</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-bold text-base sm:text-lg text-primary truncate">
                          {product.currency === 'USD' ? '$' : product.currency} {product.price > 0 ? product.price.toFixed(2) : 'Free'}
                        </span>
                        {product.stock !== undefined && product.stock > 0 && (
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            {product.stock} in stock
                          </span>
                        )}
                      </div>
                      {!product.isAvailable && (
                        <Badge variant="destructive" className="text-[10px] sm:text-xs flex-shrink-0">
                          Unavailable
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
