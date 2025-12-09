'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Grid3X3, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewSelectorProps {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  className?: string;
}

export function ViewSelector({ view, onViewChange, className }: ViewSelectorProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onViewChange('grid')}
        className={cn(
          'h-9 px-3 rounded-md transition-all',
          view === 'grid' 
            ? 'bg-background text-foreground border-2' 
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Grid3X3 className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onViewChange('list')}
        className={cn(
          'h-9 px-3 rounded-md transition-all',
          view === 'list' 
            ? 'bg-background text-foreground border-2' 
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}
