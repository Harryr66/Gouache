'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Book, GraduationCap, Image as ImageIcon, AlertCircle, Link2, CreditCard, Edit } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
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
  priceType?: 'fixed' | 'contact';
  contactForPrice?: boolean;
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
  const [isStripeIntegrated, setIsStripeIntegrated] = useState(false);
  const [checkingStripe, setCheckingStripe] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Fetch Stripe status directly from Firestore and verify with Stripe API
  useEffect(() => {
    const checkStripeStatus = async () => {
      if (!userId) {
        setCheckingStripe(false);
        return;
      }
      
      try {
        const userDoc = await getDoc(doc(db, 'userProfiles', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const accountId = userData.stripeAccountId;
          
          if (accountId) {
            // Verify status with Stripe API for most up-to-date information
            try {
              const response = await fetch(`/api/stripe/connect/account-status?accountId=${accountId}`);
              if (response.ok) {
                const accountData = await response.json();
                const isComplete = accountData.onboardingStatus === 'complete' &&
                  accountData.chargesEnabled === true &&
                  accountData.payoutsEnabled === true;
                
                console.log('Shop Display - Stripe status from API:', {
                  accountId,
                  onboardingStatus: accountData.onboardingStatus,
                  chargesEnabled: accountData.chargesEnabled,
                  payoutsEnabled: accountData.payoutsEnabled,
                  isComplete
                });
                
                setIsStripeIntegrated(isComplete);
              } else {
                // Fallback to Firestore data if API call fails
                const isComplete = userData.stripeOnboardingStatus === 'complete' &&
                  userData.stripeChargesEnabled === true &&
                  userData.stripePayoutsEnabled === true;
                setIsStripeIntegrated(isComplete);
              }
            } catch (apiError) {
              // Fallback to Firestore data if API call fails
              console.warn('Failed to verify Stripe status via API, using Firestore data:', apiError);
              const isComplete = userData.stripeOnboardingStatus === 'complete' &&
                userData.stripeChargesEnabled === true &&
                userData.stripePayoutsEnabled === true;
              setIsStripeIntegrated(isComplete);
            }
          } else {
            setIsStripeIntegrated(false);
          }
        } else {
          setIsStripeIntegrated(false);
        }
      } catch (error) {
        console.error('Error checking Stripe status:', error);
        setIsStripeIntegrated(false);
      } finally {
        setCheckingStripe(false);
      }
    };
    
    if (isOwnProfile) {
      checkStripeStatus();
    } else {
      // For other users' profiles, assume Stripe is integrated if they have items
      // This allows viewing other artists' shops
      setIsStripeIntegrated(true);
      setCheckingStripe(false);
    }
  }, [userId, isOwnProfile]);

  useEffect(() => {
    const fetchShopItems = async () => {
      setLoading(true);
      try {
        const results: ShopItem[] = [];
        
        console.log('Shop Display - Starting fetch for userId:', userId, 'isOwnProfile:', isOwnProfile);

        // Fetch artworks marked for sale (originals and prints)
        // Try multiple query patterns to handle different data structures
        let artworksFound: any[] = [];
        
        // Strategy 1: Query all artworks with isForSale=true and filter client-side
        // This is more reliable than nested field queries
        try {
          const allArtworksQuery = query(
            collection(db, 'artworks'),
            where('isForSale', '==', true)
          );
          const allArtworks = await getDocs(allArtworksQuery);
          console.log('Shop Display - Found', allArtworks.size, 'total artworks with isForSale=true');
          
          allArtworks.forEach((doc) => {
            const data = doc.data();
            // Check if this artwork belongs to the user - try multiple field patterns
            const belongsToUser = 
              data.artist?.userId === userId || 
              data.artistId === userId || 
              data.artist?.id === userId ||
              (typeof data.artist === 'string' && data.artist === userId);
            
            if (belongsToUser) {
              artworksFound.push({ id: doc.id, data });
              console.log('Shop Display - Found artwork for user:', {
                id: doc.id,
                title: data.title,
                isForSale: data.isForSale,
                showInShop: data.showInShop,
                artistUserId: data.artist?.userId,
                artistId: data.artistId,
                artist: data.artist
              });
            }
          });
        } catch (queryError) {
          console.error('Error querying artworks:', queryError);
        }
        
        // Strategy 2: If no artworks found, check portfolio directly and sync missing ones
        if (artworksFound.length === 0) {
          console.log('Shop Display - No artworks found in artworks collection, checking portfolio...');
          try {
            const userDoc = await getDoc(doc(db, 'userProfiles', userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const portfolio = Array.isArray(userData.portfolio) ? userData.portfolio : [];
              const portfolioItemsForSale = portfolio.filter((item: any) => item.isForSale === true);
              
              console.log('Shop Display - Found', portfolioItemsForSale.length, 'portfolio items marked for sale');
              
              // For each portfolio item marked for sale, check if it exists in artworks collection
              for (const portfolioItem of portfolioItemsForSale) {
                if (!portfolioItem.id) continue;
                
                try {
                  const artworkDoc = await getDoc(doc(db, 'artworks', portfolioItem.id));
                  if (artworkDoc.exists()) {
                    const artworkData = artworkDoc.data();
                    artworksFound.push({ id: portfolioItem.id, data: artworkData });
                    console.log('Shop Display - Found artwork from portfolio check:', portfolioItem.id);
                  } else {
                    // Artwork doesn't exist in artworks collection - this is a sync issue
                    console.warn('Shop Display - Portfolio item marked for sale but not in artworks collection:', portfolioItem.id);
                    // We could sync it here, but for now just log it
                  }
                } catch (err) {
                  console.error('Error checking artwork for portfolio item:', err);
                }
              }
            }
          } catch (portfolioError) {
            console.error('Error checking portfolio:', portfolioError);
          }
        }
        
        console.log('Shop Display - Total artworks found for userId', userId, ':', artworksFound.length);
        
        artworksFound.forEach(({ id, data }) => {
          console.log('Shop Display - Processing artwork:', {
            id,
            title: data.title,
            isForSale: data.isForSale,
            showInShop: data.showInShop,
            artistUserId: data.artist?.userId,
            artistId: data.artistId
          });
          
          // Skip if not for sale
          if (data.isForSale !== true) {
            console.log('Shop Display - Skipping artwork (isForSale is not true):', id, 'isForSale:', data.isForSale);
            return;
          }
          
          // If isForSale is true, include it in shop (showInShop=false is ignored if isForSale=true)
          // This ensures artworks marked for sale always appear in shop
          // Also auto-fix the showInShop field if it's incorrectly set to false
          if (data.showInShop === false && data.isForSale === true) {
            console.log('Shop Display - Including artwork despite showInShop=false because isForSale=true:', id);
            // Auto-fix: update showInShop to true in the background (don't wait for it)
            updateDoc(doc(db, 'artworks', id), { showInShop: true }).catch((err) => {
              console.warn('Failed to auto-fix showInShop field:', err);
            });
          }
          
          // Use the type field from Stage 2, or determine from category/legacy fields
          let itemType = data.type;
          if (!itemType) {
            // Fallback for legacy items
            const isPrint = data.category === 'print' || data.isPrint || false;
            itemType = isPrint ? 'print' : 'original';
          }
          
          // Only include artworks (originals and prints) - products are fetched separately
          if (itemType !== 'merchandise') {
            // Convert price from cents to dollars if stored in cents (price > 1000 suggests cents)
            const rawPrice = data.price || 0;
            const price = rawPrice > 1000 ? rawPrice / 100 : rawPrice;
            
            results.push({
              id: id,
              type: itemType === 'print' ? 'print' : 'original',
              title: data.title || 'Untitled',
              description: data.description,
              price: price,
              currency: data.currency || 'USD',
              priceType: data.priceType || (data.contactForPrice ? 'contact' : 'fixed'),
              contactForPrice: data.contactForPrice || data.priceType === 'contact',
              imageUrl: data.imageUrl,
              isAvailable: !data.sold && (data.stock === undefined || data.stock > 0),
              stock: data.stock,
              category: data.category,
              createdAt: data.createdAt?.toDate?.() || new Date(),
            });
            
            console.log('Shop Display - Added artwork to results:', id, data.title);
          }
        });
        
        console.log('Shop Display - Total artworks added to results:', results.length);

        // Fetch products from marketplaceProducts collection
        try {
          const productsQuery = query(
            collection(db, 'marketplaceProducts'),
            where('sellerId', '==', userId),
            where('isActive', '==', true)
          );
          const productsSnapshot = await getDocs(productsQuery);
          
          productsSnapshot.forEach((doc) => {
            const data = doc.data();
            results.push({
              id: doc.id,
              type: 'merchandise',
              title: data.title || 'Untitled Product',
              description: data.description,
              price: data.price || 0,
              currency: data.currency || 'USD',
              imageUrl: data.images?.[0] || data.imageUrl,
              isAvailable: data.isActive !== false && (data.stock === undefined || data.stock > 0),
              stock: data.stock,
              category: data.category,
              createdAt: data.createdAt?.toDate?.() || new Date(),
            });
          });
        } catch (error) {
          // marketplaceProducts collection might not exist yet
          console.log('marketplaceProducts collection not found or error:', error);
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

  // Group items: Artworks (originals + prints) and Products (merchandise)
  const artworks = items.filter(item => item.type === 'original' || item.type === 'print');
  const products = items.filter(item => item.type === 'merchandise');

  if (loading || checkingStripe) {
    return (
      <div className="flex justify-center py-12">
        <ThemeLoading text="" size="md" />
      </div>
    );
  }

  if (items.length === 0) {
    // If it's the user's own profile and Stripe is not integrated, show integration prompt
    // Only show this if we've checked Stripe status and it's confirmed not integrated
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
              onClick={() => router.push('/settings?tab=business')}
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
        <CardContent className="space-y-4">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <CardTitle className="mb-2">No items for sale yet</CardTitle>
          <CardDescription className="mb-4">
            {isOwnProfile
              ? "Start selling your work! Upload artwork to your portfolio and mark it as 'For Sale' to list it here. Products (prints, merchandise) are managed separately through the marketplace."
              : "This artist hasn't listed any items for sale yet."}
          </CardDescription>
          {isOwnProfile && (
            <div className="space-y-3">
              {!isStripeIntegrated && (
                <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  <p className="font-medium mb-1">💡 Connect Stripe to start selling</p>
                  <p>You'll need to connect your Stripe account in Profile Settings → Payment Setup before you can accept payments.</p>
                </div>
              )}
              {isStripeIntegrated && (
                <div className="space-y-2">
                  <Button asChild variant="gradient">
                    <a href="/profile">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Add Artwork to Portfolio
                    </a>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Go to your Portfolio tab, click "Add New Artwork", and toggle "Mark as For Sale"
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="artworks" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="artworks" className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Artworks
        </TabsTrigger>
        <TabsTrigger value="products" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Products
        </TabsTrigger>
      </TabsList>

      {/* Artworks Tab */}
      <TabsContent value="artworks" className="space-y-4">
        {artworks.length > 0 ? (
          isMobile ? (
            // Mobile: List view (like discover events)
            <div className="space-y-4">
              {artworks.map((item) => (
                <Card key={item.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => router.push(`/artwork/${item.id}`)}>
                  <div className="flex flex-col md:flex-row gap-4 p-4">
                    <div className="relative w-full md:w-48 h-48 flex-shrink-0 rounded-lg overflow-hidden">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          className="object-cover"
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
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {getTypeIcon(item.type)}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                          )}
                          {item.stock !== undefined && (
                            <p className="text-xs text-muted-foreground mb-2">
                              {item.stock} in stock
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="font-bold text-lg">
                            {item.priceType === 'contact' || item.contactForPrice ? (
                              <span className="text-muted-foreground text-sm">Contact for pricing</span>
                            ) : (
                              <>{item.currency === 'USD' ? '$' : item.currency} {item.price.toFixed(2)}</>
                            )}
                          </span>
                          {isOwnProfile && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/profile?editArtwork=${item.id}`);
                              }}
                              title="Edit artwork"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            // Desktop: Grid view
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {artworks.map((item) => (
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
                    {item.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    {item.stock !== undefined && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {item.stock} in stock
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-lg">
                        {item.priceType === 'contact' || item.contactForPrice ? (
                          <span className="text-muted-foreground">Contact for pricing</span>
                        ) : (
                          <>{item.currency === 'USD' ? '$' : item.currency} {item.price.toFixed(2)}</>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {isOwnProfile && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/profile?editArtwork=${item.id}`);
                            }}
                            title="Edit artwork"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/artwork/${item.id}`)}
                          disabled={!item.isAvailable}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <Card className="p-8 text-center">
            <CardContent>
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No artworks for sale yet</CardTitle>
              <CardDescription>
                {isOwnProfile
                  ? "Mark artworks as 'For Sale' in your portfolio to list them here."
                  : "This artist hasn't listed any artworks for sale yet."}
              </CardDescription>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Products Tab */}
      <TabsContent value="products" className="space-y-4">
        {products.length > 0 ? (
          isMobile ? (
            // Mobile: List view (like discover events)
            <div className="space-y-4">
              {products.map((item) => (
                <Card key={item.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => router.push(`/shop/book/${item.id}`)}>
                  <div className="flex flex-col md:flex-row gap-4 p-4">
                    <div className="relative w-full md:w-48 h-48 flex-shrink-0 rounded-lg overflow-hidden">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          className="object-cover"
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
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {getTypeIcon(item.type)}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                          )}
                          {item.stock !== undefined && (
                            <p className="text-xs text-muted-foreground mb-2">
                              {item.stock} in stock
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="font-bold text-lg">
                            {item.currency === 'USD' ? '$' : item.currency} {item.price.toFixed(2)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/shop/book/${item.id}`);
                            }}
                            disabled={!item.isAvailable}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            // Desktop: Grid view
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((item) => (
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
          )
        ) : (
          <Card className="p-8 text-center">
            <CardContent>
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No products for sale yet</CardTitle>
              <CardDescription>
                {isOwnProfile
                  ? "Add products through the marketplace to list them here."
                  : "This artist hasn't listed any products for sale yet."}
              </CardDescription>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}

