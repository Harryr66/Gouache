'use client';

import React from 'react';
import { DollarSign, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewSelectorProps {
  view: 'grid' | 'list'; // 'list' = art market (priced items only), 'grid' = all content
  onViewChange: (view: 'grid' | 'list') => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

/**
 * View Selector Toggle
 * Left: Art Market (artworks with set price only)
 * Right: All (discover all content) - DEFAULT
 */
export function ViewSelector({ view, onViewChange, className, style, disabled = false }: ViewSelectorProps) {
  const hasExplicitWidth = className?.includes('w-[') || className?.includes('w-1/') || className?.includes('!w-') || className?.includes('flex-[') || style?.flex;
  
  return (
    <div 
      className={cn(
        'flex h-10 rounded-md border-2 border-border bg-background relative p-0',
        !hasExplicitWidth && 'flex-1',
        !className?.includes('overflow-visible') && 'overflow-hidden',
        className
      )}
      style={style}
    >
      {/* Art Market button (left) - priced items only */}
      <button
        onClick={() => !disabled && onViewChange('list')}
        disabled={disabled}
        className={cn(
          'flex-1 flex items-center justify-center h-full relative z-10 transition-colors',
          view === 'list' ? 'bg-muted rounded-l-[4px]' : 'bg-transparent hover:bg-muted/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        title="Art Market - Priced artworks"
      >
        <DollarSign className="h-4 w-4" />
      </button>
      
      {/* All content button (right) - default */}
      <button
        onClick={() => !disabled && onViewChange('grid')}
        disabled={disabled}
        className={cn(
          'flex-1 flex items-center justify-center h-full relative z-10 transition-colors',
          view === 'grid' ? 'bg-muted rounded-r-[4px]' : 'bg-transparent hover:bg-muted/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        title="All content"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}
