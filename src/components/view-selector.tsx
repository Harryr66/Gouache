'use client';

import React from 'react';
import { Grid3X3, List, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ViewSelectorProps {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  className?: string;
}

export function ViewSelector({ view, onViewChange, className }: ViewSelectorProps) {
  return (
    <TabsList className={cn('flex flex-1 gap-0 rounded-l-none', className)}>
      <button
        onClick={() => onViewChange('list')}
        data-state={view === 'list' ? 'active' : 'inactive'}
        className={cn(
          'inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md px-4 md:px-6 text-sm font-medium transition-colors flex-1',
          'ring-offset-background focus-visible:outline-none focus-visible:ring-transparent',
          'border-2 border-border',
          'hover:border-muted-foreground',
          view === 'list'
            ? 'border-primary text-foreground'
            : 'text-muted-foreground'
        )}
        aria-label="Video feed"
      >
        <Square className="h-4 w-4" />
      </button>
      <button
        onClick={() => onViewChange('grid')}
        data-state={view === 'grid' ? 'active' : 'inactive'}
        className={cn(
          'inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md px-4 md:px-6 text-sm font-medium transition-colors flex-1',
          'ring-offset-background focus-visible:outline-none focus-visible:ring-transparent',
          'border-2 border-border',
          'hover:border-muted-foreground',
          view === 'grid'
            ? 'border-primary text-foreground'
            : 'text-muted-foreground'
        )}
        aria-label="Grid view"
      >
        <List className="h-4 w-4" />
      </button>
    </TabsList>
  );
}
