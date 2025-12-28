'use client';

import { useEffect, useRef, useState, useCallback, ReactNode } from 'react';

interface VirtualListProps {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: any, index: number) => ReactNode;
  overscan?: number; // Number of items to render outside viewport
  className?: string;
}

/**
 * Lightweight Virtual Scrolling Component
 * 
 * Only renders visible items + small buffer to handle 1000+ items efficiently.
 * Reduces DOM nodes from 1000+ to ~20-30, dramatically improving performance.
 * 
 * Usage:
 * <VirtualList
 *   items={artworks}
 *   itemHeight={400}
 *   containerHeight={800}
 *   renderItem={(item, index) => <ArtworkTile artwork={item} />}
 * />
 */
export function VirtualList({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className = '',
}: VirtualListProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  // Get visible items
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Auto-scroll to top when items change (e.g., filter applied)
  useEffect(() => {
    if (scrollRef.current) {
      // Only reset scroll if we're at the top (user hasn't scrolled)
      if (scrollTop < 100) {
        scrollRef.current.scrollTop = 0;
        setScrollTop(0);
      }
    }
  }, [items.length, scrollTop]); // Only when item count changes, not on every render

  return (
    <div
      ref={scrollRef}
      className={`relative ${className}`}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      {/* Spacer for items above viewport */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            return (
              <div
                key={item.id || item.campaign?.id || actualIndex}
                style={{ height: itemHeight }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

