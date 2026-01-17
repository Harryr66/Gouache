'use client';

import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewSelectorProps {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

// SIMPLIFIED: Video feed hidden - images only for now
export function ViewSelector({ view, onViewChange, className, style, disabled = false }: ViewSelectorProps) {
  // Force grid view only - video feed disabled
  React.useEffect(() => {
    if (view !== 'grid') {
      onViewChange('grid');
    }
  }, [view, onViewChange]);

  // Hidden component - just render nothing visible but maintain the space
  return null;
}
