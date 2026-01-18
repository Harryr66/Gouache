'use client';

import React from 'react';
import { Users, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LearnViewSelectorProps {
  view: 'all' | 'following';
  onViewChange: (view: 'all' | 'following') => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

/**
 * Learn View Selector Toggle
 * Left: All artists (all courses/streams)
 * Right: Following only (from followed artists)
 */
export function LearnViewSelector({ view, onViewChange, className, style, disabled = false }: LearnViewSelectorProps) {
  const hasExplicitWidth = className?.includes('w-[') || className?.includes('w-1/') || className?.includes('!w-') || className?.includes('flex-[') || style?.flex;
  
  return (
    <div 
      className={cn(
        'flex h-10 rounded-md border-2 border-border bg-background relative p-0',
        !hasExplicitWidth && 'flex-1',
        !className?.includes('overflow-visible') && 'overflow-hidden',
        className
      )}
      style={style}
    >
      {/* All button (left) - default */}
      <button
        onClick={() => !disabled && onViewChange('all')}
        disabled={disabled}
        className={cn(
          'flex-1 flex items-center justify-center h-full relative z-10 transition-colors',
          view === 'all' ? 'bg-muted rounded-l-[4px]' : 'bg-transparent hover:bg-muted/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        title="All artists"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      
      {/* Following button (right) */}
      <button
        onClick={() => !disabled && onViewChange('following')}
        disabled={disabled}
        className={cn(
          'flex-1 flex items-center justify-center h-full relative z-10 transition-colors',
          view === 'following' ? 'bg-muted rounded-r-[4px]' : 'bg-transparent hover:bg-muted/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        title="Following only"
      >
        <Users className="h-4 w-4" />
      </button>
    </div>
  );
}
