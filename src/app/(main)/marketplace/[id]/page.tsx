'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Star, ShoppingCart, Heart, Share2, Package, TrendingUp, Check, X } from 'lucide-react';
import { MarketplaceProduct } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { usePlaceholder } from '@/hooks/use-placeholder';
import { ThemeLoading } from '@/components/theme-loading';
import { useAuth } from '@/providers/auth-provider';
import Link from 'next/link';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const productId = params.id as string;
  const { generatePlaceholderUrl, generateAvatarPlaceholderUrl } = usePlaceholder();
  
  const [product, setProduct] = useState<MarketplaceProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        let productData: MarketplaceProduct | null = null;

        // Check if it's a marketplace product (starts with marketplace- or doesn't have prefix)
        if (!productId.startsWith('artwork-') && !productId.startsWith('book-')) {
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
        <ThemeLoading text="Loading product..." size="lg" />
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
          <Button onClick={() => router.push('/marketplace')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Market
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
    if (product.isAffiliate && product.affiliateLink) {
      window.open(product.affiliateLink, '_blank');
    } else {
      // TODO: Implement purchase flow with Stripe
      alert('Purchase functionality coming soon!');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => router.push('/marketplace')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Market
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
              {/* Title and Rating */}
              <div>
                <div className="flex items-start justify-between mb-2">
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
                
                {product.rating > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="ml-1 font-semibold">{product.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      ({product.reviewCount} review{product.reviewCount !== 1 ? 's' : ''})
                    </span>
                  </div>
                )}

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
                  <span className="text-sm text-muted-foreground">Category</span>
                  <span className="font-medium">{product.category}</span>
                </div>
                {product.subcategory && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Subcategory</span>
                    <span className="font-medium">{product.subcategory}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Stock</span>
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

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

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
                    : 'Add to Cart'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: product.title,
                        text: product.description,
                        url: window.location.href,
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Link copied to clipboard!');
                    }
                  }}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Product
                </Button>
              </div>

              {/* Sales Info */}
              {product.salesCount > 0 && (
                <div className="text-sm text-muted-foreground text-center pt-4 border-t">
                  {product.salesCount} {product.salesCount === 1 ? 'sale' : 'sales'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

