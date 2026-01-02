'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Book, GraduationCap, Image as ImageIcon, AlertCircle, Link2, CreditCard, Edit, Trash2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ThemeLoading } from './theme-loading';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

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
  contactEmail?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  isAvailable: boolean;
  stock?: number;
  hideQuantity?: boolean;
  category?: string;
  createdAt: Date;
}

export function ShopDisplay({ userId, isOwnProfile }: ShopDisplayProps) {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStripeIntegrated, setIsStripeIntegrated] = useState(false);
  const [checkingStripe, setCheckingStripe] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{id: string; type: 'artwork' | 'product'} | null>(null);
  const [deleting, setDeleting] = useState(false);
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

        // NEW: Fetch shop items from portfolioItems collection (primary source)
        const { PortfolioService } = await import('@/lib/database');
        
        try {
          const portfolioItems = await PortfolioService.getUserShopItems(userId, 200);
          console.log('Shop Display - Found', portfolioItems.length, 'portfolio items for shop from portfolioItems collection');
          
          portfolioItems.forEach((item) => {
            // Skip if not for sale or not showing in shop
            if (!item.isForSale || !item.showInShop) {
              return;
            }
            
            // Determine item type
            let itemType = item.artworkType || item.type || 'original';
            if (item.artworkType) {
              itemType = item.artworkType;
            } else if (item.type === 'artwork') {
              // Legacy: check tags or other fields
              const isPrint = item.tags?.some((tag: string) => tag.toLowerCase() === 'print') || false;
              itemType = isPrint ? 'print' : 'original';
            }
            
            // Only include artworks (originals and prints) - products are fetched separately
            if (itemType !== 'merchandise') {
              // Convert price from cents to dollars if stored in cents (price > 1000 suggests cents)
              const rawPrice = item.price || 0;
              const price = rawPrice > 1000 ? rawPrice / 100 : rawPrice;
              
              results.push({
                id: item.id,
                type: itemType === 'print' ? 'print' : 'original',
                title: item.title || 'Untitled',
                description: item.description,
                price: price,
                currency: item.currency || 'USD',
                priceType: item.priceType || (item.contactForPrice ? 'contact' : 'fixed'),
                contactForPrice: item.contactForPrice || item.priceType === 'contact',
                imageUrl: item.imageUrl || item.supportingImages?.[0] || item.images?.[0] || '',
                isAvailable: !item.sold && (item.stock === undefined || item.stock > 0),
                stock: item.stock,
                category: item.category || item.medium,
                createdAt: item.createdAt instanceof Date ? item.createdAt : (item.createdAt as any)?.toDate?.() || new Date(),
              });
              
              console.log('Shop Display - Added portfolio item to results:', item.id, item.title);
            }
          });
        } catch (portfolioItemsError) {
          console.error('Error fetching from portfolioItems collection:', portfolioItemsError);
        }
        
        // BACKWARD COMPATIBILITY: Fallback to artworks collection if no portfolioItems found
        if (results.length === 0) {
          console.log('Shop Display - No items in portfolioItems, checking artworks collection (backward compatibility)...');
          try {
            const allArtworksQuery = query(
              collection(db, 'artworks'),
              where('isForSale', '==', true)
            );
            const allArtworks = await getDocs(allArtworksQuery);
            console.log('Shop Display - Found', allArtworks.size, 'total artworks with isForSale=true');
            
            allArtworks.forEach((doc) => {
              const data = doc.data();
              // Check if this artwork belongs to the user
              const belongsToUser = 
                data.artist?.userId === userId || 
                data.artistId === userId || 
                data.artist?.id === userId ||
                (typeof data.artist === 'string' && data.artist === userId);
              
              // Skip deleted items
              if (data.deleted === true) return;
              
              if (belongsToUser && data.isForSale === true) {
                let itemType = data.type || (data.category === 'print' ? 'print' : 'original');
                if (itemType !== 'merchandise') {
                  const rawPrice = data.price || 0;
                  const price = rawPrice > 1000 ? rawPrice / 100 : rawPrice;
                  
                  results.push({
                    id: doc.id,
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
                }
              }
            });
          } catch (queryError) {
            console.error('Error querying artworks (backward compatibility):', queryError);
          }
        }
        
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
            // Convert price from cents to currency units (products are always stored in cents)
            const rawPrice = data.price || 0;
            // Products are always stored in cents, so always divide by 100
            const price = rawPrice / 100;
            
            results.push({
              id: doc.id,
              type: 'merchandise',
              title: data.title || 'Untitled Product',
              description: data.description,
              price: price,
              currency: data.currency || 'USD',
              priceType: data.priceType || (data.contactForPrice ? 'contact' : 'fixed'),
              contactForPrice: data.contactForPrice || data.priceType === 'contact',
              contactEmail: data.contactEmail,
              imageUrl: data.images?.[0] || data.imageUrl,
              isAvailable: data.isActive !== false && (data.stock === undefined || data.stock > 0),
              hideQuantity: (data as any).hideQuantity || false,
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
    <>
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
          // Always show grid view - 3 columns on all devices
          <div className="grid grid-cols-3 gap-1">
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
                      <Badge variant="destructive" className="text-xs">Sold</Badge>
                    </div>
                  )}
                  {/* Edit and Delete buttons overlay - only for owner */}
                  {isOwnProfile && (
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background/90"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/profile?editArtwork=${item.id}`);
                        }}
                        title="Edit artwork"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm({ id: item.id, type: 'artwork' });
                        }}
                        title="Delete artwork"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <CardContent className="p-2">
                  <h4 className="font-semibold text-xs mb-1 line-clamp-1">{item.title}</h4>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-xs">
                      {item.priceType === 'contact' || item.contactForPrice ? (
                        <span className="text-muted-foreground text-xs">Contact</span>
                      ) : (
                        <>{item.currency === 'USD' ? '$' : item.currency} {item.price.toFixed(2)}</>
                      )}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs py-1 h-7"
                    onClick={() => router.push(`/artwork/${item.id}`)}
                    disabled={!item.isAvailable}
                  >
                    View
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
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
          // Always show grid view - 3 columns on all devices
          <div className="grid grid-cols-3 gap-1">
            {products.map((item) => (
              <Card key={item.id} className="group hover:shadow-lg transition-shadow overflow-hidden">
                <div className="relative aspect-[4/5]">
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
                      <Badge variant="destructive" className="text-xs">Sold</Badge>
                    </div>
                  )}
                  {/* Edit and Delete buttons overlay - only for owner */}
                  {isOwnProfile && (
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/marketplace/${item.id}?edit=true`);
                        }}
                        title="Edit product"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm({ id: item.id, type: 'product' });
                        }}
                        title="Delete product"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <CardContent className="p-2">
                  <h4 className="font-semibold text-xs mb-1 line-clamp-1">{item.title}</h4>
                  <p className="text-xs font-bold mb-1">
                    {item.currency === 'USD' ? '$' : item.currency} {item.price.toFixed(2)}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs py-1 h-7"
                    onClick={() => router.push(`/marketplace/${item.id}`)}
                    disabled={!item.isAvailable}
                  >
                    View
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
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

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={showDeleteConfirm !== null} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {showDeleteConfirm?.type === 'artwork' ? 'Artwork' : 'Product'}?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this {showDeleteConfirm?.type === 'artwork' ? 'artwork' : 'product'}? This action cannot be undone. 
            The {showDeleteConfirm?.type === 'artwork' ? 'artwork' : 'product'} will be permanently removed from your shop.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              if (!showDeleteConfirm || !user) return;
              setDeleting(true);
              try {
                if (showDeleteConfirm.type === 'artwork') {
                  // Delete artwork - mark as deleted
                  await updateDoc(doc(db, 'artworks', showDeleteConfirm.id), {
                    deleted: true,
                    isForSale: false,
                    updatedAt: new Date(),
                  });
                } else {
                  // Delete product
                  await updateDoc(doc(db, 'marketplaceProducts', showDeleteConfirm.id), {
                    isActive: false,
                    deleted: true,
                    updatedAt: new Date(),
                  });
                }
                
                // Remove from local state
                setItems(prev => prev.filter(item => item.id !== showDeleteConfirm.id));
                
                toast({
                  title: showDeleteConfirm.type === 'artwork' ? 'Artwork deleted' : 'Product deleted',
                  description: `Your ${showDeleteConfirm.type} has been deleted successfully.`,
                });
                setShowDeleteConfirm(null);
              } catch (error) {
                console.error(`Error deleting ${showDeleteConfirm.type}:`, error);
                toast({
                  title: 'Delete failed',
                  description: `Failed to delete ${showDeleteConfirm.type}. Please try again.`,
                  variant: 'destructive',
                });
              } finally {
                setDeleting(false);
              }
            }}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

