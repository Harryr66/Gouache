'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, ShoppingCart, Heart, Package, TrendingUp, Check, X } from 'lucide-react';
import { MarketplaceProduct } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { usePlaceholder } from '@/hooks/use-placeholder';
import { ThemeLoading } from '@/components/theme-loading';
import { useAuth } from '@/providers/auth-provider';
import Link from 'next/link';
import { AboutTheArtist } from '@/components/about-the-artist';

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
  
  // Check if user came from discover page via query param or referrer
  const cameFromDiscover = searchParams?.get('from') === 'discover' || 
    (typeof window !== 'undefined' && document.referrer.includes('/discover'));

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
        // Check if it's an artwork (try artworks collection first if no prefix)
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
              productData = {
                id: productDoc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now())
              } as MarketplaceProduct;
            }
          }
        }
        // Check if it's an artwork
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

  const handlePurchase = async () => {
    if (product.isAffiliate && product.affiliateLink) {
      window.open(product.affiliateLink, '_blank');
      return;
    }

    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(`/marketplace/${product.id}`));
      return;
    }

    try {
      const productPriceInCents = Math.round(product.price * 100);
      
      // Create payment intent
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: productPriceInCents,
          currency: product.currency.toLowerCase(),
          artistId: product.sellerId,
          itemId: product.id,
          itemType: product.category === 'Books' ? 'book' : (product.category === 'Prints' ? 'print' : 'original'),
          buyerId: user.id,
          description: `Purchase: ${product.title}`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment');
      }

      const { clientSecret } = await response.json();
      
      // TODO: Integrate Stripe Elements or Checkout to complete payment
      // For now, show success message
      alert(`Payment intent created! Total: ${product.currency} ${product.price.toFixed(2)}`);
    } catch (error: any) {
      console.error('Purchase error:', error);
      alert(error.message || 'Failed to process purchase. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
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
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {product?.sellerId ? 'Back to Artist Profile' : (cameFromDiscover ? 'Back to Discover' : 'Go Back')}
          </Button>

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
                    <Badge variant="secondary" className="text-sm">
                      Out of Stock
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

            {/* Product Info */}
            <div className="space-y-6">
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
                    <AvatarImage src={avatarPlaceholder} alt={product.sellerName} />
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
                    {product.stock > 0 ? (
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        {product.stock} available
                      </span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                        <X className="h-4 w-4" />
                        Out of Stock
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
                    ? 'Out of Stock'
                    : product.isAffiliate
                    ? 'Buy Now'
                    : 'Buy Now'}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  5% platform commission • Artists keep 95% of sales
                </p>
              </div>

            </div>
          </div>

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
