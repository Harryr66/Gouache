'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/lib/types';
import { ProductService } from '@/lib/database';
import { ShoppingCart, Heart, Star, Truck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
  onRemoveFromCart: (productId: string) => void;
  isInCart?: boolean;
  currentUserId?: string;
}

export function ProductCard({ 
  product, 
  onAddToCart, 
  onRemoveFromCart, 
  isInCart = false,
  currentUserId 
}: ProductCardProps) {
  const [loading, setLoading] = useState(false);

  const handleCartAction = async () => {
    if (!currentUserId) return;
    
    setLoading(true);
    try {
      if (isInCart) {
        await ProductService.removeFromCart(currentUserId, product.id);
        onRemoveFromCart(product.id);
      } else {
        await ProductService.addToCart(currentUserId, product.id, 1);
        onAddToCart(product.id);
      }
    } catch (error) {
      console.error('Error updating cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <Card className="hover:shadow-md transition-shadow group">
      <div className="relative">
        <div className="aspect-square relative overflow-hidden rounded-t-lg">
          <Image
            src={product.images[0]}
            alt={product.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
          />
          <div className="absolute top-4 left-4">
            <Badge variant="secondary">
              {product.category}
            </Badge>
          </div>
          <div className="absolute top-4 right-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="line-clamp-1 text-lg">{product.title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {product.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Price */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">${product.price.toLocaleString()}</p>
            {product.shippingInfo?.freeShipping && (
              <p className="text-sm text-green-600 flex items-center">
                <Truck className="h-3 w-3 mr-1" />
                Free shipping
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-1">
              {renderStars(product.rating)}
              <span className="text-sm text-muted-foreground ml-1">
                ({product.reviewCount})
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {product.salesCount} sold
            </p>
          </div>
        </div>

        {/* Stock */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Stock</span>
          <span className={`font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
          </span>
        </div>

        {/* Dimensions */}
        {product.dimensions && (
          <div className="text-sm text-muted-foreground">
            <p>
              {product.dimensions.width} × {product.dimensions.height} × {product.dimensions.depth} {product.dimensions.unit}
            </p>
          </div>
        )}

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {product.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{product.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button
            onClick={handleCartAction}
            disabled={loading || product.stock === 0}
            className="flex-1"
            variant={isInCart ? "outline" : "default"}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {loading ? 'Updating...' : isInCart ? 'Remove from Cart' : 'Add to Cart'}
          </Button>
          <Button
            variant="outline"
            disabled={product.stock === 0}
            className="px-3"
          >
            Contact Seller
          </Button>
        </div>

        {/* Created Date */}
        <p className="text-xs text-muted-foreground">
          Listed {formatDistanceToNow(product.createdAt, { addSuffix: true })}
        </p>
      </CardContent>
    </Card>
  );
}
