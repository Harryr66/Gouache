'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';

interface VirtualGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  columns?: number; // Number of columns (default: responsive)
  itemHeight?: number; // Estimated item height for virtual scrolling (optional)
  bufferSize?: number; // Number of items to render outside viewport (default: 5)
  className?: string;
  getItemId: (item: T) => string;
}

/**
 * Virtual scrolling grid component
 * Only renders items in viewport + buffer for better performance with large lists
 */
export function VirtualGrid<T>({
  items,
  renderItem,
  columns = 5,
  itemHeight,
  bufferSize = 5,
  className = '',
  getItemId,
}: VirtualGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.min(items.length, 20) });
  const [containerHeight, setContainerHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible items based on scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateVisibleRange = () => {
      const containerRect = container.getBoundingClientRect();
      const containerTop = containerRect.top + window.scrollY;
      const containerBottom = containerTop + containerRect.height;
      const viewportTop = window.scrollY;
      const viewportBottom = window.scrollY + window.innerHeight;

      // Calculate which items are visible
      // For masonry grid, we approximate based on item index
      const itemsPerRow = columns;
      const estimatedRowHeight = itemHeight || 400; // Default estimated height
      
      // Calculate visible rows
      const topOffset = Math.max(0, viewportTop - containerTop - bufferSize * estimatedRowHeight);
      const bottomOffset = viewportBottom - containerTop + bufferSize * estimatedRowHeight;
      
      const startRow = Math.floor(topOffset / estimatedRowHeight);
      const endRow = Math.ceil(bottomOffset / estimatedRowHeight);
      
      const start = Math.max(0, startRow * itemsPerRow - bufferSize * itemsPerRow);
      const end = Math.min(items.length, endRow * itemsPerRow + bufferSize * itemsPerRow);

      setVisibleRange({ start, end });
      setScrollTop(window.scrollY);
    };

    updateVisibleRange();
    
    const handleScroll = () => {
      updateVisibleRange();
    };

    const handleResize = () => {
      if (container) {
        setContainerHeight(container.offsetHeight);
      }
      updateVisibleRange();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    
    // Use IntersectionObserver for more accurate viewport detection
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            updateVisibleRange();
          }
        });
      },
      { rootMargin: `${bufferSize * (itemHeight || 400)}px` }
    );

    if (container) {
      observer.observe(container);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [items.length, columns, itemHeight, bufferSize]);

  // Memoize visible items to avoid unnecessary re-renders
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end);
  }, [items, visibleRange.start, visibleRange.end]);

  // Calculate spacer heights for items before and after visible range
  const spacerBefore = visibleRange.start * (itemHeight || 400) / columns;
  const spacerAfter = (items.length - visibleRange.end) * (itemHeight || 400) / columns;

  return (
    <div ref={containerRef} className={className}>
      {/* Spacer before visible items */}
      {visibleRange.start > 0 && (
        <div style={{ height: spacerBefore, width: '100%' }} aria-hidden="true" />
      )}
      
      {/* Render visible items */}
      <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-5 gap-1" style={{ columnFill: 'auto', alignContent: 'start' }}>
        {visibleItems.map((item, index) => {
          const actualIndex = visibleRange.start + index;
          return (
            <div key={getItemId(item)} data-index={actualIndex}>
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>

      {/* Spacer after visible items */}
      {visibleRange.end < items.length && (
        <div style={{ height: spacerAfter, width: '100%' }} aria-hidden="true" />
      )}
    </div>
  );
}
