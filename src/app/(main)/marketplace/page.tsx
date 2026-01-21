'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { ThemeLoading } from '@/components/theme-loading';
import { useRouter } from 'next/navigation';
import { Search, Package, TrendingUp, Filter } from 'lucide-react';
import { MarketplaceProduct } from '@/lib/types';
import Image from 'next/image';

export default function MarketplacePage() {
  const router = useRouter();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high' | 'popular'>('newest');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Fetch marketplace products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsQuery = query(
          collection(db, 'marketplaceProducts'),
          where('isActive', '==', true),
          where('deleted', '==', false),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        
        const snapshot = await getDocs(productsQuery);
        const fetchedProducts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MarketplaceProduct[];
        
        setProducts(fetchedProducts);
        setFilteredProducts(fetchedProducts);
      } catch (error) {
        console.error('Error fetching marketplace products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter and sort products
  useEffect(() => {
    let filtered = [...products];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.title?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return (a.price || 0) - (b.price || 0);
        case 'price-high':
          return (b.price || 0) - (a.price || 0);
        case 'popular':
          return (b.views || 0) - (a.views || 0);
        case 'newest':
        default:
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      }
    });

    setFilteredProducts(filtered);
  }, [products, searchQuery, sortBy, categoryFilter]);

  // Get unique categories
  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ThemeLoading text="Loading marketplace..." size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Package className="h-10 w-10" />
          Marketplace
        </h1>
        <p className="text-muted-foreground">
          Discover unique art products, prints, and merchandise from independent artists
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Search */}
        <div className="relative md:col-span-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger>
            <TrendingUp className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
        </p>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No products found</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery || categoryFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Be the first to list a product!'}
          </p>
          {searchQuery || categoryFilter !== 'all' ? (
            <Button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
              }}
            >
              Clear Filters
            </Button>
          ) : null}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="group cursor-pointer hover:shadow-lg transition-all duration-300"
              onClick={() => router.push(`/marketplace/${product.id}`)}
            >
              {/* Product Image */}
              <div className="relative aspect-square overflow-hidden rounded-t-lg bg-muted">
                {product.images && product.images.length > 0 ? (
                  <Image
                    src={product.images[0]}
                    alt={product.title || 'Product'}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                
                {/* Stock Badge */}
                {product.stock === 0 && (
                  <Badge variant="destructive" className="absolute top-2 right-2">
                    Sold Out
                  </Badge>
                )}
                
                {/* Category Badge */}
                {product.category && (
                  <Badge className="absolute top-2 left-2 bg-black/60 hover:bg-black/80">
                    {product.category}
                  </Badge>
                )}
              </div>

              {/* Product Info */}
              <CardContent className="p-4">
                <h3 className="font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                  {product.title || 'Untitled'}
                </h3>
                
                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {product.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    {product.price ? (
                      <p className="text-lg font-bold">
                        {product.currency || 'USD'} {product.price.toFixed(2)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Contact for price</p>
                    )}
                  </div>

                  {product.stock !== undefined && product.stock > 0 && !product.hideQuantity && (
                    <Badge variant="secondary" className="text-xs">
                      {product.stock} left
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
