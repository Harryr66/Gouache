'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Grid3X3, List, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewSelectorProps {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  className?: string;
}

export function ViewSelector({ view, onViewChange, className }: ViewSelectorProps) {
  return (
    <div className={cn('relative flex items-center bg-muted rounded-md p-1', className)}>
      <button
        onClick={() => onViewChange('list')}
        className={cn(
          'relative z-10 flex items-center justify-center h-10 px-4 md:px-6 rounded-md transition-all duration-200 text-sm font-medium flex-1',
          view === 'list'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-label="Single view"
      >
        <Square className="h-4 w-4" />
      </button>
      <button
        onClick={() => onViewChange('grid')}
        className={cn(
          'relative z-10 flex items-center justify-center h-10 px-4 md:px-6 rounded-md transition-all duration-200 text-sm font-medium flex-1',
          view === 'grid'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-label="Grid view"
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}
