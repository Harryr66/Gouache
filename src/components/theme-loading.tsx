'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

interface ThemeLoadingProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export function ThemeLoading({ text = '', size = 'md', fullScreen = false }: ThemeLoadingProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Default to dark until mounted
  if (!mounted) {
    const dotSize = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3';
    const Component = (
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="flex space-x-1">
          <div className={`${dotSize} bg-white rounded-full animate-pulse`} />
          <div className={`${dotSize} bg-white rounded-full animate-pulse`} />
          <div className={`${dotSize} bg-white rounded-full animate-pulse`} />
        </div>
        {text && <p className="text-white text-sm">{text}</p>}
      </div>
    );
    
    if (fullScreen) {
      return <div className="fixed inset-0 bg-black flex items-center justify-center z-50">{Component}</div>;
    }
    return Component;
  }

  const currentTheme = resolvedTheme || theme || 'dark';
  let isDark = currentTheme === 'dark';
  
  if (typeof window !== 'undefined') {
    try {
      const hasDarkClass = document.documentElement.classList.contains('dark');
      const hasLightClass = document.documentElement.classList.contains('light');
      
      if (hasDarkClass) isDark = true;
      else if (hasLightClass) isDark = false;
    } catch (error) {
      console.warn('Theme detection failed:', error);
    }
  }

  const getDotColors = (isDark: boolean) => {
    if (isDark) {
      return ['#51C4D3', '#77ACF1', '#EF88AD'];
    } else {
      return ['#1e3a8a', '#3b82f6', '#60a5fa'];
    }
  };

  const dotColors = getDotColors(isDark);
  const dotSize = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  const Component = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="flex space-x-1">
        <motion.div
          className={`${dotSize} rounded-full`}
          style={{ backgroundColor: dotColors[0] }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className={`${dotSize} rounded-full`}
          style={{ backgroundColor: dotColors[1] }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className={`${dotSize} rounded-full`}
          style={{ backgroundColor: dotColors[2] }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
        />
      </div>
      {text && <p className={`${isDark ? 'text-white' : 'text-black'} ${textSize}`}>{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center z-50 ${isDark ? 'bg-black' : 'bg-white'}`}>
        {Component}
      </div>
    );
  }

  return Component;
}

