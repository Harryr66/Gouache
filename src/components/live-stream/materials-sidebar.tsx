'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, ShoppingBag, Package } from 'lucide-react';
import { StreamMaterial } from '@/lib/live-stream-types';
import { useLiveStream } from '@/providers/live-stream-provider';

interface MaterialsSidebarProps {
  materials: StreamMaterial[];
  streamId: string;
}

export function MaterialsSidebar({ materials, streamId }: MaterialsSidebarProps) {
  const { clickMaterial } = useLiveStream();

  const handleMaterialClick = async (material: StreamMaterial) => {
    // Track the click for analytics
    await clickMaterial(material.id);
    
    // Open affiliate link in new tab
    window.open(material.affiliateUrl, '_blank', 'noopener,noreferrer');
  };

  if (materials.length === 0) {
    return null;
  }

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          Materials & Supplies
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Supplies used in this stream. Click to purchase.
        </p>
        
        {materials.map((material) => (
          <div
            key={material.id}
            className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              {material.imageUrl ? (
                <img
                  src={material.imageUrl}
                  alt={material.name}
                  className="w-12 h-12 rounded object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm line-clamp-1">{material.name}</h4>
                {material.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {material.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {material.price && (
                    <Badge variant="secondary" className="text-xs">
                      ${material.price.toFixed(2)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-2"
              onClick={() => handleMaterialClick(material)}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Buy Now
            </Button>
          </div>
        ))}

        <p className="text-[10px] text-muted-foreground text-center pt-2 border-t">
          These are affiliate links. The artist may earn a commission.
        </p>
      </CardContent>
    </Card>
  );
}
