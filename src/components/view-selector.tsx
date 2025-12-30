'use client';

import React from 'react';
import { Grid3X3, List, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TabsList } from '@/components/ui/tabs';

interface ViewSelectorProps {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  className?: string;
}

export function ViewSelector({ view, onViewChange, className }: ViewSelectorProps) {
  return (
    <TabsList className={cn('flex flex-1 gap-0 rounded-l-none p-1', className)}>
      <button
        onClick={() => onViewChange(view === 'grid' ? 'list' : 'grid')}
        className={cn(
          'relative flex h-10 w-full items-center justify-center rounded-md transition-all duration-200',
          'bg-background text-foreground shadow-sm',
          'border-2 border-border',
          'hover:border-muted-foreground'
        )}
        aria-label={view === 'grid' ? 'Switch to video feed' : 'Switch to grid view'}
      >
        {view === 'grid' ? (
          <List className="h-4 w-4" />
        ) : (
          <Square className="h-4 w-4" />
        )}
      </button>
    </TabsList>
  );
}
