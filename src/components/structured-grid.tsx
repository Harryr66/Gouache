'use client';

import React, { useMemo, useRef } from 'react';
import { TileSize, getTileSize } from '@/lib/types';
import { ThemeLoading } from '@/components/theme-loading';

// Grid item with tile size information
export interface GridItem {
  id: string;
  tileSize: TileSize;
  aspectRatio?: number;
  [key: string]: any;
}

interface StructuredGridProps {
  items: any[];
  columnCount: number;
  gap: number;
  renderItem: (item: any, tileSize: TileSize) => React.ReactNode;
  loadMoreRef: React.RefObject<HTMLDivElement>;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  // Function to extract aspect ratio from item (for automatic tile sizing)
  getItemAspectRatio?: (item: any) => number | undefined;
  // Function to get pre-set tile size (for ads)
  getItemTileSize?: (item: any) => TileSize | undefined;
}

/**
 * StructuredGrid - A CSS Grid-based layout with mixed tile sizes
 * 
 * Grid Structure (4-column base):
 * - Portrait tiles: span 1 column, 2 rows
 * - Square tiles: span 1 column, 1 row
 * - Landscape tiles: span 2 columns, 1 row
 * 
 * The algorithm packs tiles to minimize gaps by:
 * 1. Processing items and assigning tile sizes based on aspect ratio
 * 2. Using CSS Grid's auto-placement with explicit span values
 * 3. Using grid-auto-flow: dense to fill gaps
 */
export function StructuredGrid({
  items,
  columnCount,
  gap,
  renderItem,
  loadMoreRef,
  isLoadingMore,
  hasMore = true,
  getItemAspectRatio,
  getItemTileSize,
}: StructuredGridProps) {
  
  // Process items to assign tile sizes (simplified: portrait or landscape only)
  const processedItems = useMemo(() => {
    // Alternating pattern for items without aspect ratio
    const tileSizePattern: TileSize[] = ['portrait', 'landscape', 'portrait', 'portrait', 'landscape'];
    let patternIndex = 0;
    
    return items.map((item) => {
      // Check for pre-set tile size (e.g., ads with adFormat)
      const presetSize = getItemTileSize?.(item);
      if (presetSize) {
        // Map any 'square' to 'portrait' for simplified grid
        const mappedSize = presetSize === 'square' ? 'portrait' : presetSize;
        return { item, tileSize: mappedSize as TileSize };
      }
      
      // Get aspect ratio and determine tile size
      const aspectRatio = getItemAspectRatio?.(item);
      if (aspectRatio && aspectRatio > 0) {
        return { item, tileSize: getTileSize(aspectRatio) };
      }
      
      // No aspect ratio - use alternating pattern
      const tileSize = tileSizePattern[patternIndex % tileSizePattern.length];
      patternIndex++;
      return { item, tileSize };
    });
  }, [items, getItemAspectRatio, getItemTileSize]);

  // Calculate responsive column count
  // Mobile: 2 columns, Tablet: 3-4 columns, Desktop: 4-6 columns
  const effectiveColumnCount = Math.max(2, Math.min(columnCount, 6));
  
  // For mobile (2 columns), landscape tiles span full width
  // For larger screens, landscape spans 2 of N columns
  const landscapeSpan = effectiveColumnCount <= 2 ? 2 : 2;

  // Calculate row height based on column width
  // Each column is roughly (100vw / columnCount), row height should be half that for square aspect
  // This creates a unit grid where portrait = 2 units tall, square/landscape = 1 unit tall
  const rowHeight = `calc((100vw - ${(effectiveColumnCount + 1) * gap}px) / ${effectiveColumnCount} / 2)`;

  return (
    <div className="w-full">
      {/* CSS Grid layout with dense packing and fixed row heights */}
      <div 
        className="grid"
        style={{ 
          gridTemplateColumns: `repeat(${effectiveColumnCount}, 1fr)`,
          gap: `${gap}px`,
          gridAutoFlow: 'dense', // Fill gaps automatically
          gridAutoRows: rowHeight, // Fixed row height for seamless alignment
        }}
      >
        {processedItems.map(({ item, tileSize }, index) => {
          const itemKey = 'id' in item ? item.id : ('campaign' in item ? item.campaign?.id : index);
          
          // Simplified: portrait = 1 col × 2 rows, landscape = 2 cols × 1 row
          const isLandscape = tileSize === 'landscape';
          
          return (
            <div
              key={itemKey}
              style={{
                gridColumn: isLandscape ? `span ${landscapeSpan}` : 'span 1',
                gridRow: isLandscape ? 'span 1' : 'span 2',
              }}
            >
              {renderItem(item, tileSize)}
            </div>
          );
        })}
      </div>
      
      {/* Sentinel element for infinite scroll */}
      <div 
        ref={loadMoreRef} 
        className="h-20 w-full flex items-center justify-center"
      >
        {isLoadingMore ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <ThemeLoading size="sm" />
          </div>
        ) : !hasMore && items.length > 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <div className="h-px w-16 bg-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">You&apos;ve reached the end</p>
            <p className="text-xs text-muted-foreground/70">Check back later for new content</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
