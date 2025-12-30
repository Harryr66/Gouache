'use client';

import React from 'react';
import { Grid3X3, List, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewSelectorProps {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  className?: string;
}

export function ViewSelector({ view, onViewChange, className }: ViewSelectorProps) {
  return (
    <button
      onClick={() => onViewChange(view === 'grid' ? 'list' : 'grid')}
      className={cn(
        'flex flex-1 h-10 items-center justify-center rounded-md rounded-l-none border-l-0 transition-all duration-200',
        'border-2 border-border',
        'bg-background text-foreground shadow-sm',
        'hover:border-muted-foreground',
        className
      )}
      aria-label={view === 'grid' ? 'Switch to video feed' : 'Switch to grid view'}
    >
      {view === 'grid' ? (
        <List className="h-4 w-4" />
      ) : (
        <Square className="h-4 w-4" />
      )}
    </button>
  );
}
