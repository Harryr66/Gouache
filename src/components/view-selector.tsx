'use client';

import React from 'react';
import { LayoutGrid, Play } from 'lucide-react';
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
          view === 'grid' ? 'translate-x-full' : 'translate-x-0'
        )}
      />
      
      {/* Video feed option - LEFT */}
      <button
        onClick={() => onViewChange('list')}
        className={cn(
          'flex-1 flex items-center justify-center h-full relative z-10 transition-colors',
          view === 'list' ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        <div className="relative w-4 h-4 rounded-md border-2 border-current flex items-center justify-center">
          <Play className="h-2.5 w-2.5 ml-0.5" fill="currentColor" />
        </div>
      </button>
      
      {/* Grid option - RIGHT */}
      <button
        onClick={() => onViewChange('grid')}
        className={cn(
          'flex-1 flex items-center justify-center h-full relative z-10 transition-colors',
          view === 'grid' ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}
