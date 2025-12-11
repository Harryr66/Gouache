'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Book, GraduationCap, Image as ImageIcon, AlertCircle, Link2, CreditCard } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { ThemeLoading } from './theme-loading';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';

interface ShopDisplayProps {
  userId: string;
  isOwnProfile: boolean;
}

interface ShopItem {
  id: string;
  type: 'original' | 'print' | 'merchandise';
  title: string;
  description?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  isAvailable: boolean;
  stock?: number;
  category?: string;
  createdAt: Date;
}

export function ShopDisplay({ userId, isOwnProfile }: ShopDisplayProps) {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();
  
  // Check if Stripe is integrated and ready
  const isStripeIntegrated = user?.stripeAccountId && 
    user?.stripeOnboardingStatus === 'complete' && 
    user?.stripeChargesEnabled && 
    user?.stripePayoutsEnabled;

  useEffect(() => {
    const fetchShopItems = async () => {
      setLoading(true);
      try {
        const results: ShopItem[] = [];

        // Fetch artworks marked for sale (originals and prints)
        const artworksQuery = query(
          collection(db, 'artworks'),
          where('artist.userId', '==', userId),
          where('isForSale', '==', true)
        );
        const artworksSnapshot = await getDocs(artworksQuery);
        
        artworksSnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Only include items where showInShop is true (or undefined for backward compatibility)
          if (data.showInShop === false) {
            return; // Skip items explicitly marked as not for shop
          }
          
          // Use the type field from Stage 2, or determine from category/legacy fields
          let itemType = data.type;
          if (!itemType) {
            // Fallback for legacy items
            const isPrint = data.category === 'print' || data.isPrint || false;
            itemType = isPrint ? 'print' : 'original';
          }
          
          results.push({
            id: doc.id,
            type: itemType === 'merchandise' ? 'merchandise' : (itemType === 'print' ? 'print' : 'original'),
            title: data.title || 'Untitled',
            description: data.description,
            price: data.price || 0,
            currency: data.currency || 'USD',
            imageUrl: data.imageUrl,
            isAvailable: !data.sold && (data.stock === undefined || data.stock > 0),
            stock: data.stock,
            category: data.category,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          });
        });

        // Fetch courses (map to merchandise)
        const coursesQuery = query(
          collection(db, 'courses'),
          where('instructor.userId', '==', userId)
        );
        const coursesSnapshot = await getDocs(coursesQuery);
        
        coursesSnapshot.forEach((doc) => {
          const data = doc.data();
          results.push({
            id: doc.id,
            type: 'merchandise',
            title: data.title || 'Untitled Course',
            description: data.description,
            price: data.price || 0,
            currency: data.currency || 'USD',
            imageUrl: data.thumbnail || data.thumbnailUrl,
            isAvailable: data.isActive !== false,
            category: data.category,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          });
        });

        // Fetch books (map to merchandise)
        try {
          const booksQuery = query(
            collection(db, 'books'),
            where('artistId', '==', userId)
          );
          const booksSnapshot = await getDocs(booksQuery);
          
          booksSnapshot.forEach((doc) => {
            const data = doc.data();
            results.push({
              id: doc.id,
              type: 'merchandise',
              title: data.title || 'Untitled Book',
              description: data.description,
              price: data.price || 0,
              currency: data.currency || 'USD',
              imageUrl: data.imageUrl || data.coverImageUrl,
              isAvailable: data.isAvailable !== false,
              stock: data.stock,
              category: data.category,
              createdAt: data.createdAt?.toDate?.() || new Date(),
            });
          });
        } catch (error) {
          // Books collection might not exist yet
          console.log('Books collection not found or error:', error);
        }

        // Sort by creation date (newest first)
        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setItems(results);
      } catch (error) {
        console.error('Error fetching shop items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShopItems();
  }, [userId]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'original':
        return <ImageIcon className="h-4 w-4" />;
      case 'print':
        return <Package className="h-4 w-4" />;
      case 'merchandise':
        return <Package className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'original':
        return 'Original';
      case 'print':
        return 'Print';
      case 'merchandise':
        return 'Merchandise';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <ThemeLoading text="Loading shop items..." size="md" />
      </div>
    );
  }

  if (items.length === 0) {
    // If it's the user's own profile and Stripe is not integrated, show integration prompt
    if (isOwnProfile && !isStripeIntegrated) {
      return (
        <Card className="p-8 text-center">
          <CardContent>
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">Connect Stripe to Start Selling</CardTitle>
            <CardDescription className="mb-4">
              Connect your Stripe account to enable sales of originals, prints, and merchandise. You'll receive payouts directly to your bank account.
            </CardDescription>
            <Button 
              variant="gradient"
              onClick={() => router.push('/settings?tab=payments')}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Connect Stripe Account
            </Button>
          </CardContent>
        </Card>
      );
    }
    
    // If Stripe is integrated but no items, show upload options
    return (
      <Card className="p-8 text-center">
        <CardContent>
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <CardTitle className="mb-2">No items for sale yet</CardTitle>
          <CardDescription className="mb-4">
            {isOwnProfile
              ? "Start selling your work! Upload artwork or products to your shop."
              : "This artist hasn't listed any items for sale yet."}
          </CardDescription>
          {isOwnProfile && isStripeIntegrated && (
            <Button asChild variant="gradient">
              <a href="/upload">
                <ImageIcon className="h-4 w-4 mr-2" />
                Upload Artwork/Product
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Group items by type - 3 categories: Original Artworks, Prints, Merchandise
  const groupedItems = {
    original: items.filter(item => item.type === 'original'),
    print: items.filter(item => item.type === 'print'),
    merchandise: items.filter(item => item.type === 'merchandise'),
  };

  return (
    <div className="space-y-8">
      {groupedItems.original.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Original Artworks
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedItems.original.map((item) => (
              <Card key={item.id} className="group hover:shadow-lg transition-shadow overflow-hidden">
                <div className="relative aspect-square">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {!item.isAvailable && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Badge variant="destructive">Sold Out</Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm line-clamp-1 flex-1">{item.title}</h4>
                    <Badge variant="secondary" className="ml-2">
                      {getTypeIcon(item.type)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg">
                      {item.currency === 'USD' ? '$' : item.currency} {item.price.toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/artwork/${item.id}`)}
                      disabled={!item.isAvailable}
                    >
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {groupedItems.print.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Prints
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedItems.print.map((item) => (
              <Card key={item.id} className="group hover:shadow-lg transition-shadow overflow-hidden">
                <div className="relative aspect-square">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {!item.isAvailable && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Badge variant="destructive">Sold Out</Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm line-clamp-1 flex-1">{item.title}</h4>
                    <Badge variant="secondary" className="ml-2">
                      {getTypeIcon(item.type)}
                    </Badge>
                  </div>
                  {item.stock !== undefined && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {item.stock} in stock
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg">
                      {item.currency === 'USD' ? '$' : item.currency} {item.price.toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/artwork/${item.id}`)}
                      disabled={!item.isAvailable}
                    >
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {groupedItems.merchandise.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Merchandise
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedItems.merchandise.map((item) => (
              <Card key={item.id} className="group hover:shadow-lg transition-shadow overflow-hidden">
                <div className="relative aspect-[3/4]">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Book className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {!item.isAvailable && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Badge variant="destructive">Sold Out</Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm line-clamp-1 flex-1">{item.title}</h4>
                    <Badge variant="secondary" className="ml-2">
                      {getTypeIcon(item.type)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg">
                      {item.currency === 'USD' ? '$' : item.currency} {item.price.toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/shop/book/${item.id}`)}
                      disabled={!item.isAvailable}
                    >
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

