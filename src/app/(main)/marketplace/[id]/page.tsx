'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ShoppingCart, Heart, Package, TrendingUp, Check, X, Edit, Plus, Minus, Save, Trash2, Loader2 } from 'lucide-react';
import { MarketplaceProduct } from '@/lib/types';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { usePlaceholder } from '@/hooks/use-placeholder';
import { ThemeLoading } from '@/components/theme-loading';
import { useAuth } from '@/providers/auth-provider';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { AboutTheArtist } from '@/components/about-the-artist';
import { CheckoutForm } from '@/components/checkout-form';
import { Elements } from '@stripe/react-stripe-js';
import { getStripePromise } from '@/lib/stripe-client';
import { verifyMarketplacePurchase } from '@/lib/purchase-verification';

// Use shared Stripe promise utility

// Placeholder products generator (same as marketplace page)
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
      rating: 0,
      reviewCount: 0,
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
      rating: 0,
      reviewCount: 0,
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
      rating: 0,
      reviewCount: 0,
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
      rating: 0,
      reviewCount: 0,
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
      rating: 0,
      reviewCount: 0,
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
      rating: 0,
      reviewCount: 0,
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
      rating: 0,
      reviewCount: 0,
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
      rating: 0,
      reviewCount: 0,
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

// Generate marketplace placeholder products (matching discover page format)
const generateMarketPlaceholderProducts = (generatePlaceholderUrl: (w: number, h: number) => string): MarketplaceProduct[] => {
  const placeholderImage = generatePlaceholderUrl(400, 300);
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

  const descriptions = [
    'A beautiful piece of art perfect for collectors and art enthusiasts.',
    'Handcrafted with attention to detail and artistic excellence.',
    'Unique artwork that captures the essence of contemporary art.',
    'Premium quality piece suitable for any art collection.',
    'Exquisite work showcasing the artist\'s unique style and vision.',
    'Carefully curated piece that represents modern artistic expression.',
    'Stunning artwork that combines traditional techniques with modern aesthetics.',
    'Exceptional piece that will be a centerpiece in any collection.'
  ];

  return Array.from({ length: 50 }, (_, i) => ({
    id: `placeholder-market-${i + 1}`,
    title: productTitles[i % productTitles.length],
    description: descriptions[i % descriptions.length],
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

function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const productId = params.id as string;
  const { generatePlaceholderUrl, generateAvatarPlaceholderUrl } = usePlaceholder();
  
  const [product, setProduct] = useState<MarketplaceProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [sellerProfilePicture, setSellerProfilePicture] = useState<string | null>(null);
  
  // CRITICAL: Payment safety states
  const [isProcessingPayment, setIsProcessingPayment] = useState(false); // Prevents double-clicks
  const [isVerifying, setIsVerifying] = useState(false); // Shows verification overlay

  // ============================================
  // PAYMENT SUCCESS HANDLER - WAIT FOR WEBHOOK
  // ============================================
  const handleCheckoutSuccess = async (paymentIntentId: string) => {
    console.log('[Marketplace] Payment AUTHORIZED, updating stock...');
    
    setIsVerifying(true);
    setShowCheckout(false);
    
    try {
      toast({
        title: "Processing Purchase...",
        description: "Please wait, do not close this page.",
        duration: 30000,
      });
      
      // STEP 1: Check if purchase record created (webhook)
      console.log('[Marketplace] Step 1: Checking purchase record...');
      
      // Poll briefly to confirm webhook processed the purchase
      const verified = await verifyMarketplacePurchase(product!.id, paymentIntentId, user!.id, 5); // 10 seconds
      
      if (verified) {
        // Purchase recorded, now capture payment
        console.log('[Marketplace] Step 2: Capturing payment...');
        const captureResponse = await fetch('/api/stripe/capture-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId }),
        });

        if (!captureResponse.ok) {
          throw new Error('Failed to capture payment');
        }

        console.log('[Marketplace] ✅ Payment captured, purchase complete');
        
        toast({
          title: "Purchase Complete!",
          description: "You will receive a confirmation email shortly.",
        });
        
        window.location.reload();
      } else {
        // Webhook didn't fire yet, payment still authorized but NOT captured
        toast({
          title: "Processing...",
          description: "Your payment is being processed. Your card has NOT been charged yet. Please refresh in a moment.",
          duration: 10000,
        });
      }
    } catch (error: any) {
      console.error('[Marketplace] Error:', error);
      
      toast({
        title: "Purchase Processing",
        description: "Your card was NOT charged. Error: " + error.message,
        variant: "destructive",
        duration: 30000,
      });
    } finally {
      setIsVerifying(false);
      setIsProcessingPayment(false);
    }
  };
  
  // Edit mode state
  const isEditMode = searchParams?.get('edit') === 'true';
  const isOwner = user && product && user.id === product.sellerId;
  
  // Debug logging
  useEffect(() => {
    if (isEditMode) {
      console.log('Edit mode active:', { 
        isEditMode, 
        isOwner, 
        hasUser: !!user, 
        hasProduct: !!product, 
        userId: user?.id, 
        sellerId: product?.sellerId,
        productId: product?.id
      });
    }
  }, [isEditMode, isOwner, user, product]);
  
  // Force edit mode if URL has edit=true and user is owner
  useEffect(() => {
    if (isEditMode && product && user && user.id === product.sellerId) {
      console.log('✅ Edit mode conditions met - showing edit form');
    } else if (isEditMode) {
      console.warn('⚠️ Edit mode requested but conditions not met:', {
        hasProduct: !!product,
        hasUser: !!user,
        userId: user?.id,
        sellerId: product?.sellerId,
        isOwner: user && product && user.id === product.sellerId
      });
    }
  }, [isEditMode, product, user]);
  
  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCurrency, setEditCurrency] = useState<'USD' | 'GBP' | 'EUR' | 'CAD' | 'AUD'>('USD');
  const [editStock, setEditStock] = useState<number | 'unlimited'>(1);
  const [hideQuantity, setHideQuantity] = useState(false);
  const [showUnlimitedConfirm, setShowUnlimitedConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Check if user came from discover page via query param or referrer
  const cameFromDiscover = searchParams?.get('from') === 'discover' || 
    (typeof window !== 'undefined' && document.referrer.includes('/discover'));
  
  // Initialize edit form when product loads and edit mode is active
  useEffect(() => {
    if (product && isEditMode && isOwner) {
      setEditTitle(product.title);
      setEditDescription(product.description || '');
      // Price is already in currency units (converted during fetch)
      setEditPrice((product.price || 0).toString());
      setEditCurrency((product.currency as 'USD' | 'GBP' | 'EUR' | 'CAD' | 'AUD') || 'USD');
      // Handle stock: if stock is very large (999999), treat as unlimited
      setEditStock(product.stock >= 999999 ? 'unlimited' : (product.stock || 1));
      // Handle hideQuantity setting
      setHideQuantity((product as any).hideQuantity || false);
    }
  }, [product, isEditMode, isOwner]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        let productData: MarketplaceProduct | null = null;

        // Check if it's a placeholder product
        if (productId.startsWith('placeholder-') || productId.startsWith('placeholder-market-')) {
          // Generate both old format (placeholder-1, placeholder-2) and new format (placeholder-market-1, etc.)
          const placeholderProducts = generatePlaceholderProducts(generatePlaceholderUrl);
          const marketPlaceholderProducts = generateMarketPlaceholderProducts(generatePlaceholderUrl);
          productData = placeholderProducts.find(p => p.id === productId) || 
                       marketPlaceholderProducts.find(p => p.id === productId) || null;
        }
            // Check if it's an artwork (with prefix)
            else if (productId.startsWith('artwork-')) {
              const artworkId = productId.replace('artwork-', '');
              const artworkDoc = await getDoc(doc(db, 'artworks', artworkId));
              if (artworkDoc.exists()) {
                const data = artworkDoc.data();
                const artist = data.artist || {};
                productData = {
                  id: `artwork-${artworkDoc.id}`,
                  title: data.title || 'Untitled Artwork',
                  description: data.description || '',
                  price: data.price || 0,
                  currency: data.currency || 'USD',
              category: 'Artwork',
              subcategory: data.category || 'Original',
              images: data.imageUrl ? [data.imageUrl] : [],
              sellerId: artist.userId || artist.id || data.artistId || '',
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
            } as MarketplaceProduct;
          }
        }
        // Check if it's a book
        else if (productId.startsWith('book-')) {
          const bookId = productId.replace('book-', '');
          const bookDoc = await getDoc(doc(db, 'books', bookId));
          if (bookDoc.exists()) {
            const data = bookDoc.data();
            const author = data.author || data.seller || {};
            productData = {
              id: `book-${bookDoc.id}`,
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
            } as MarketplaceProduct;
          }
        }
        // Check if it's an artwork without prefix (try artworks collection first, then marketplaceProducts)
        else {
          // First check if it's an artwork (artworks collection)
          const artworkDoc = await getDoc(doc(db, 'artworks', productId));
          if (artworkDoc.exists()) {
            const data = artworkDoc.data();
            const artist = data.artist || {};
            productData = {
              id: `artwork-${artworkDoc.id}`,
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
            } as MarketplaceProduct;
          } else {
            // If not an artwork, check marketplaceProducts collection
            const productDoc = await getDoc(doc(db, 'marketplaceProducts', productId));
            if (productDoc.exists()) {
              const data = productDoc.data();
              // Products are always stored in cents, convert to currency units for display
              const priceInCurrency = data.price ? data.price / 100 : 0;
              productData = {
                id: productDoc.id,
                ...data,
                price: priceInCurrency, // Display price in currency units
                sellerId: data.sellerId || data.seller?.id || data.seller?.userId || '',
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now())
              } as MarketplaceProduct;
              console.log('Product loaded:', { id: productDoc.id, sellerId: productData.sellerId, userId: user?.id });
            }
          }
        }

        setProduct(productData);
      } catch (error) {
        console.error('Error fetching product:', error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  // Fetch seller profile picture
  useEffect(() => {
    const fetchSellerProfile = async () => {
      if (!product?.sellerId) {
        console.log('❌ No sellerId found for product:', product?.id);
        return;
      }
      
      console.log('🔍 Fetching seller profile for ID:', product.sellerId);
      
      try {
        const sellerDoc = await getDoc(doc(db, 'userProfiles', product.sellerId));
        if (sellerDoc.exists()) {
          const sellerData = sellerDoc.data();
          console.log('✅ Seller profile found:', { 
            sellerId: product.sellerId, 
            hasProfilePicture: !!sellerData.profilePicture,
            hasPhotoURL: !!sellerData.photoURL 
          });
          setSellerProfilePicture(sellerData.profilePicture || sellerData.photoURL || null);
        } else {
          console.log('⚠️ Seller profile not found in userProfiles for ID:', product.sellerId);
        }
      } catch (error) {
        console.error('Error fetching seller profile:', error);
      }
    };

    fetchSellerProfile();
  }, [product?.sellerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <ThemeLoading text="" size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Product Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The product you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const placeholderImage = generatePlaceholderUrl(800, 600);
  const avatarPlaceholder = generateAvatarPlaceholderUrl(64, 64);
  const images = product.images && product.images.length > 0 ? product.images : [placeholderImage];
  const mainImage = images[selectedImageIndex] || placeholderImage;

  const handlePurchase = () => {
    // ========================================
    // CRITICAL: COMPREHENSIVE PRE-PAYMENT VALIDATION
    // DO NOT PROCEED IF ANY CHECK FAILS
    // ========================================
    
    // Check 1: Affiliate products - redirect to external site
    if (product.isAffiliate && product.affiliateLink) {
      window.open(product.affiliateLink, '_blank');
      return;
    }

    // Check 2: Idempotency - prevent double clicks
    if (isProcessingPayment) {
      toast({
        title: "Please Wait",
        description: "Payment is already being processed.",
      });
      return;
    }

    // Check 3: User authentication
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(`/marketplace/${product.id}`));
      return;
    }

    // Check 4: Product data validation
    if (!product || !product.id) {
      toast({
        title: 'Error',
        description: 'Product data not loaded. Please refresh the page.',
        variant: 'destructive'
      });
      return;
    }

    // Check 5: Product price validation
    if (!product.price || product.price <= 0) {
      toast({
        title: 'Invalid Price',
        description: 'Product price is not set correctly.',
        variant: 'destructive'
      });
      return;
    }

    // Check 6: Seller information validation
    if (!product.sellerId) {
      toast({
        title: 'Seller information missing',
        description: 'Unable to process purchase. Seller information is not available.',
        variant: 'destructive'
      });
      return;
    }

    // Check 7: Stock availability
    if (product.stock !== undefined && product.stock <= 0) {
      toast({
        title: 'Out of Stock',
        description: 'This product is currently out of stock.',
        variant: 'destructive'
      });
      return;
    }

    // Check 8: Cannot purchase own product
    if (user.id === product.sellerId) {
      toast({
        title: 'Cannot Purchase Own Product',
        description: 'You cannot purchase your own product.',
        variant: 'destructive'
      });
      return;
    }

    // ========================================
    // VALIDATION PASSED - REDIRECT TO STRIPE CHECKOUT
    // Physical products require shipping address collection
    // ========================================
    setIsProcessingPayment(true);

    // Create Stripe Checkout Session for shipping address collection
    fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: product.id,
        itemType: 'merchandise',
        buyerId: user.id,
        buyerEmail: user.email, // BUYER's email for checkout
      }),
    })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }
      return response.json();
    })
    .then((data) => {
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    })
    .catch((error) => {
      console.error('Error creating checkout session:', error);
      setIsProcessingPayment(false);
      toast({
        title: 'Checkout Error',
        description: error.message || 'Failed to start checkout process.',
        variant: 'destructive'
      });
    });
  };

  const handleSaveEdit = async () => {
    if (!product || !user || user.id !== product.sellerId) return;

    setSaving(true);
    try {
      const updateData: any = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        currency: editCurrency,
        updatedAt: new Date(),
      };

      // Update price (convert to cents)
      if (editPrice.trim()) {
        updateData.price = parseFloat(editPrice) * 100;
      }

      // Update stock
      if (editStock === 'unlimited') {
        updateData.stock = 999999; // Use large number to represent unlimited
      } else {
        updateData.stock = Math.max(0, editStock);
      }

      // Update hideQuantity setting
      updateData.hideQuantity = hideQuantity;

      // Update in Firestore
      await updateDoc(doc(db, 'marketplaceProducts', product.id), updateData);

      // Update local state
      setProduct({
        ...product,
        ...updateData,
        price: updateData.price / 100, // Convert back for display
      });

      toast({
        title: 'Product updated',
        description: 'Your product has been updated successfully.',
      });

      // Remove edit mode from URL
      router.push(`/marketplace/${product.id}`);
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: 'Update failed',
        description: 'Failed to update product. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleQuantityChange = (delta: number) => {
    if (editStock === 'unlimited') return;
    const newValue = Math.max(0, (typeof editStock === 'number' ? editStock : 1) + delta);
    setEditStock(newValue);
  };

  const handleUnlimitedClick = () => {
    setShowUnlimitedConfirm(true);
  };

  const confirmUnlimited = () => {
    setEditStock('unlimited');
    setShowUnlimitedConfirm(false);
  };

  const handleDeleteProduct = async () => {
    if (!product || !user || user.id !== product.sellerId) return;

    setDeleting(true);
    try {
      // Delete product from Firestore
      await updateDoc(doc(db, 'marketplaceProducts', product.id), {
        isActive: false,
        deleted: true,
        updatedAt: new Date(),
      });

      toast({
        title: 'Product deleted',
        description: 'Your product has been deleted successfully.',
      });

      // Navigate back to shop
      router.push(`/profile/${user.id}?tab=shop`);
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete product. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Back Button and Edit Mode Indicator */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={() => {
                if (cameFromDiscover) {
                  router.push('/discover?tab=market');
                } else if (product?.sellerId) {
                  // Go to artist's profile if available
                  router.push(`/profile/${product.sellerId}`);
                } else {
                  // Try to go back in history first
                  if (typeof window !== 'undefined' && window.history.length > 1) {
                    router.back();
                  } else {
                    router.push('/marketplace');
                  }
                }
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {product?.sellerId ? 'Back to Artist Profile' : (cameFromDiscover ? 'Back to Discover' : 'Go Back')}
            </Button>
            {isEditMode && isOwner && (
              <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                <Edit className="h-3 w-3 mr-1" />
                Edit Mode
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={mainImage}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
                {product.isOnSale && (
                  <div className="absolute top-4 left-4">
                    <Badge variant="destructive" className="text-sm">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      On Sale
                    </Badge>
                  </div>
                )}
                {product.stock === 0 && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="destructive" className="text-sm">
                      Sold
                    </Badge>
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedImageIndex === index
                          ? 'border-primary'
                          : 'border-transparent hover:border-muted-foreground'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info or Edit Form */}
            <div className="space-y-6">
              {isEditMode && isOwner ? (
                /* Edit Form */
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold">Edit Product</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/marketplace/${product.id}`)}
                      >
                        Cancel
                      </Button>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-title">Title *</Label>
                      <Input
                        id="edit-title"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Enter product title"
                        required
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea
                        id="edit-description"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Describe your product..."
                        rows={4}
                      />
                    </div>

                    {/* Price & Currency */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-price">Price *</Label>
                        <Input
                          id="edit-price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-currency">Currency</Label>
                        <Select
                          value={editCurrency}
                          onValueChange={(value: 'USD' | 'GBP' | 'EUR' | 'CAD' | 'AUD') => setEditCurrency(value)}
                        >
                          <SelectTrigger id="edit-currency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="CAD">CAD (C$)</SelectItem>
                            <SelectItem value="AUD">AUD (A$)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Quantity Management */}
                    <div className="space-y-2">
                      <Label>Quantity Available</Label>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border rounded-lg">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="rounded-r-none border-r"
                            onClick={() => handleQuantityChange(-1)}
                            disabled={editStock === 'unlimited' || (typeof editStock === 'number' && editStock <= 0)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="text"
                            value={editStock === 'unlimited' ? '∞' : editStock.toString()}
                            onChange={(e) => {
                              const value = e.target.value.trim();
                              if (value === '∞' || value === '' || value.toLowerCase() === 'unlimited') {
                                setEditStock('unlimited');
                              } else {
                                const num = parseInt(value);
                                if (!isNaN(num) && num >= 0) {
                                  setEditStock(num);
                                }
                              }
                            }}
                            onBlur={(e) => {
                              if (e.target.value.trim() === '' || e.target.value.trim() === '∞') {
                                setEditStock(1);
                              }
                            }}
                            className="w-24 text-center border-0 rounded-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            placeholder="1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="rounded-l-none border-l"
                            onClick={() => handleQuantityChange(1)}
                            disabled={editStock === 'unlimited'}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleUnlimitedClick}
                          className={editStock === 'unlimited' ? 'bg-primary text-primary-foreground' : ''}
                        >
                          Unlimited
                        </Button>
                      </div>
                      {editStock === 'unlimited' && (
                        <p className="text-xs text-muted-foreground">
                          Product will show as available until quantity is set to 0
                        </p>
                      )}
                    </div>

                    {/* Hide Quantity Option */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hideQuantity"
                        checked={hideQuantity}
                        onCheckedChange={(checked) => setHideQuantity(checked === true)}
                      />
                      <Label htmlFor="hideQuantity" className="cursor-pointer font-normal">
                        Hide quantity from customers (will show as "Available" or "Sold" only)
                      </Label>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button
                        variant="gradient"
                        onClick={handleSaveEdit}
                        disabled={saving || !editTitle.trim() || !editPrice.trim()}
                        className="flex-1"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={saving || deleting}
                        className="flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                /* Product Display */
                <>
                  {/* Title */}
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <h1 className="text-3xl font-bold text-foreground">{product.title}</h1>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsWishlisted(!isWishlisted)}
                        className={isWishlisted ? 'text-red-500' : ''}
                      >
                        <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-current' : ''}`} />
                      </Button>
                    </div>

                {/* Seller Info */}
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={sellerProfilePicture || avatarPlaceholder} alt={product.sellerName} />
                    <AvatarFallback>{product.sellerName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <Link
                      href={`/profile/${product.sellerId}`}
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {product.sellerName}
                    </Link>
                    {product.sellerWebsite && (
                      <a
                        href={product.sellerWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary block"
                      >
                        Visit Website
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="border-t border-b py-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-primary">
                    {product.currency} {product.price.toFixed(2)}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <>
                      <span className="text-xl text-muted-foreground line-through">
                        {product.currency} {product.originalPrice.toFixed(2)}
                      </span>
                      <Badge variant="destructive" className="text-sm">
                        {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                      </Badge>
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className="text-xl font-semibold mb-2">Description</h2>
                <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              </div>

              {/* Product Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Availability</span>
                  <span className="font-medium">
                    {product.stock === 0 ? (
                      <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                        <X className="h-4 w-4" />
                        Sold
                      </span>
                    ) : product.stock >= 999999 ? (
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        {((product as any).hideQuantity) ? 'Available' : 'Unlimited'}
                      </span>
                    ) : product.stock > 0 ? (
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        {((product as any).hideQuantity) ? 'Available' : `${product.stock} available`}
                      </span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                        <X className="h-4 w-4" />
                        Sold
                      </span>
                    )}
                  </span>
                </div>
                {product.dimensions && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Dimensions</span>
                    <span className="font-medium">
                      {product.dimensions.width} × {product.dimensions.height}
                      {product.dimensions.depth && ` × ${product.dimensions.depth}`} {product.dimensions.unit}
                    </span>
                  </div>
                )}
                {product.weight && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Weight</span>
                    <span className="font-medium">{product.weight} kg</span>
                  </div>
                )}
                {product.shippingInfo && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Shipping</span>
                    <span className="font-medium">
                      {product.shippingInfo.freeShipping ? (
                        <span className="text-green-600 dark:text-green-400">Free Shipping</span>
                      ) : (
                        <span>{product.currency} {product.shippingInfo.shippingCost.toFixed(2)}</span>
                      )}
                      {product.shippingInfo.estimatedDays && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({product.shippingInfo.estimatedDays} days)
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <Button
                  className="w-full gradient-button"
                  size="lg"
                  onClick={handlePurchase}
                  disabled={product.stock === 0}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {product.stock === 0
                    ? 'Sold'
                    : product.isAffiliate
                    ? 'Buy Now'
                    : 'Buy Now'}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  0% platform commission • Artists keep 100% of sales
                </p>
              </div>
                </>
              )}
            </div>
          </div>

          {/* Unlimited Quantity Confirmation Dialog */}
          <Dialog open={showUnlimitedConfirm} onOpenChange={setShowUnlimitedConfirm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Unlimited Quantity?</DialogTitle>
                <DialogDescription>
                  The product will continue to show as available until you manually set the quantity to 0. 
                  This is useful for digital products or items you can continuously produce.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowUnlimitedConfirm(false)}>
                  Cancel
                </Button>
                <Button onClick={confirmUnlimited}>
                  Set Unlimited
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Product Confirmation Dialog */}
          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Product?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{product?.title}"? This action cannot be undone. 
                  The product will be permanently removed from your shop.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteProduct}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? 'Deleting...' : 'Delete Product'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* About the Artist Section */}
          {product.sellerId && (
            <div className="mt-8">
              <AboutTheArtist
                artistId={product.sellerId}
                artistName={product.sellerName}
                artistHandle={product.sellerId}
              />
            </div>
          )}
        </div>
      </div>

      {/* Checkout Dialog */}
      {product && product.price && product.price > 0 && product.sellerId && !product.isAffiliate && (
        <Dialog open={showCheckout} onOpenChange={(open) => {
          setShowCheckout(open);
          if (!open) setIsProcessingPayment(false); // Reset processing state if dialog closed
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Purchase Product</DialogTitle>
            </DialogHeader>
            {getStripePromise() ? (
              <CheckoutForm
                amount={product.price}
                currency={product.currency || 'USD'}
                artistId={product.sellerId}
                itemId={product.id}
                itemType="merchandise"
                itemTitle={product.title}
                buyerId={user?.id || ''}
                onSuccess={handleCheckoutSuccess}
                onCancel={() => {
                  setShowCheckout(false);
                  setIsProcessingPayment(false);
                }}
              />
            ) : (
              <div className="p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  Payment processing is not configured. Please contact support.
                </p>
                <Button variant="outline" onClick={() => {
                  setShowCheckout(false);
                  setIsProcessingPayment(false);
                }}>
                  Close
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
      
      {/* CRITICAL: Verification Loading Overlay */}
      {isVerifying && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-full max-w-md p-6 mx-4">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <h3 className="font-semibold text-lg text-center">Verifying Purchase</h3>
              <p className="text-sm text-muted-foreground text-center">
                Your payment was successful. We're verifying your purchase with the database...
              </p>
              <p className="text-xs text-muted-foreground text-center">
                This usually takes just a few seconds.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function ProductDetailPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <ThemeLoading text="" size="lg" />
      </div>
    }>
      <ProductDetailPage />
    </Suspense>
  );
}

export default ProductDetailPageWrapper;
