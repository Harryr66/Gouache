'use client';

import React from 'react';
import { List, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as SwitchPrimitives from '@radix-ui/react-switch';

interface ViewSelectorProps {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  className?: string;
}

export function ViewSelector({ view, onViewChange, className }: ViewSelectorProps) {
  const isList = view === 'list';
  
  return (
    <SwitchPrimitives.Root
      checked={isList}
      onCheckedChange={() => onViewChange(isList ? 'grid' : 'list')}
      className={cn(
        'flex flex-1 h-10 items-center justify-center rounded-md rounded-l-none border-l-0 transition-all duration-200',
        'border-2 border-border',
        'bg-background shadow-sm',
        'hover:border-muted-foreground',
        'data-[state=checked]:switch-gradient',
        'data-[state=unchecked]:bg-background data-[state=unchecked]:border-border',
        'cursor-pointer',
        className
      )}
      aria-label={isList ? 'Switch to grid view' : 'Switch to video feed'}
    >
      <div className="flex items-center justify-center w-full h-full">
        {isList ? (
          <Square className="h-4 w-4" />
        ) : (
          <List className="h-4 w-4" />
        )}
      </div>
    </SwitchPrimitives.Root>
  );
}
