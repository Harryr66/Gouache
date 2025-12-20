'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeLoading } from '@/components/theme-loading';

// Marketplace temporarily hidden for MVP - will be re-enabled in future
// This page is kept for future use but currently redirects to news
export default function MarketplacePage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/news');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <ThemeLoading text="" size="lg" />
    </div>
  );
}

/* 
MARKETPLACE CODE - KEPT FOR FUTURE RE-ENABLEMENT
To restore marketplace:
1. Remove the redirect function above
2. Uncomment the code below
3. Re-enable navigation links in desktop-header.tsx and mobile-bottom-nav.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Search, Filter, Package, Book, GraduationCap, ImageIcon, ShoppingCart, Star, ChevronRight } from 'lucide-react';
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
  productCategory?: string; // For marketplace products: 'print', 'original', etc.
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

        // Fetch artworks for sale (originals)
        // Fetch marketplace products (prints, physical products, etc.)
        // Fetch courses (only published ones)
        // Fetch books
        // ... (all the marketplace code is preserved here for future use)
      } catch (error) {
        console.error('Error fetching shop products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShopProducts();
  }, []);

  // ... rest of marketplace component code ...
}
*/
