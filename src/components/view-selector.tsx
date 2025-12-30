'use client';

import React from 'react';
import { List, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewSelectorProps {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  className?: string;
  style?: React.CSSProperties;
}

export function ViewSelector({ view, onViewChange, className, style }: ViewSelectorProps) {
  const hasExplicitWidth = className?.includes('w-[') || className?.includes('w-1/') || className?.includes('!w-') || className?.includes('flex-[') || style?.flex;
  return (
    <div 
      className={cn(
        'flex h-10 rounded-l-md rounded-r-md border-l-0 border-2 border-border bg-background relative overflow-hidden',
        // Only use flex-1 if no explicit width/flex-basis is provided in className or style
        !hasExplicitWidth && 'flex-1',
        className
      )}
      style={style}
    >
      {/* Shaded background indicator - pill shaped */}
      <div
        className={cn(
          'absolute inset-y-0 w-1/2 bg-muted transition-transform duration-200 ease-in-out rounded-md',
          view === 'list' ? 'translate-x-full' : 'translate-x-0'
        )}
      />
      
      {/* Grid option */}
      <button
        onClick={() => onViewChange('grid')}
        className={cn(
          'flex-1 flex items-center justify-center h-full relative z-10 transition-colors',
          view === 'grid' ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        <Square className="h-4 w-4" />
      </button>
      
      {/* List option */}
      <button
        onClick={() => onViewChange('list')}
        className={cn(
          'flex-1 flex items-center justify-center h-full relative z-10 transition-colors',
          view === 'list' ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}
