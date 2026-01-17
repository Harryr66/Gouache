'use client';

import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewSelectorProps {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

// Images only - single grid button for symmetry
export function ViewSelector({ view, onViewChange, className, style, disabled = false }: ViewSelectorProps) {
  // Force grid view only
  React.useEffect(() => {
    if (view !== 'grid') {
      onViewChange('grid');
    }
  }, [view, onViewChange]);

  const hasExplicitWidth = className?.includes('w-[') || className?.includes('w-1/') || className?.includes('!w-') || className?.includes('flex-[') || style?.flex;
  
  return (
    <div 
      className={cn(
        'flex h-10 rounded-md border-2 border-border bg-background relative',
        !hasExplicitWidth && 'flex-1',
        !className?.includes('overflow-visible') && 'overflow-hidden',
        className
      )}
      style={style}
    >
      {/* Single grid button - images only */}
      <button
        className="flex-1 flex items-center justify-center h-full relative z-10 bg-muted rounded-[4px] m-0.5"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}
