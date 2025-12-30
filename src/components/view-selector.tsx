'use client';

import React from 'react';
import { List, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ViewSelectorProps {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  className?: string;
}

export function ViewSelector({ view, onViewChange, className }: ViewSelectorProps) {
  return (
    <TabsList className={cn('flex flex-1 gap-0 rounded-l-none border-l-0 h-10 p-0', className)}>
      <TabsTrigger
        value="grid"
        onClick={() => onViewChange('grid')}
        className={cn(
          'flex-1 h-10 rounded-r-none border-r-0',
          view === 'grid' ? 'gradient-border' : ''
        )}
      >
        <Square className="h-4 w-4" />
      </TabsTrigger>
      <TabsTrigger
        value="list"
        onClick={() => onViewChange('list')}
        className={cn(
          'flex-1 h-10 rounded-l-none border-l-0',
          view === 'list' ? 'gradient-border' : ''
        )}
      >
        <List className="h-4 w-4" />
      </TabsTrigger>
    </TabsList>
  );
}
