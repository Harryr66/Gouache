'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

export function LoadingTransition() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          <div className="mb-6">
            <img
              src="/assets/gouache-logo-dark-20241111.png"
              alt="Gouache"
              className="mx-auto h-12 md:h-16 w-auto"
            />
            <span className="sr-only">Gouache</span>
          </div>
          <div className="flex items-center justify-center space-x-2 mt-4">
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Try multiple methods to detect theme
  const currentTheme = resolvedTheme || theme || 'dark';
  
  // Fallback: Check DOM directly for theme class
  let isDark = currentTheme === 'dark';
  if (typeof window !== 'undefined') {
    try {
      const hasDarkClass = document.documentElement.classList.contains('dark');
      const hasLightClass = document.documentElement.classList.contains('light');
      
      if (hasDarkClass) {
        isDark = true;
      } else if (hasLightClass) {
        isDark = false;
      }
    } catch (error) {
      console.warn('Theme detection from DOM failed:', error);
    }
  }

  // Define gradient colors for each theme
  const getDotColors = (isDark: boolean) => {
    if (isDark) {
      // Dark theme gradient colors: #51C4D3, #77ACF1, #EF88AD
      return ['#51C4D3', '#77ACF1', '#EF88AD'];
    } else {
      // Light theme gradient colors: #1e3a8a, #3b82f6, #60a5fa
      return ['#1e3a8a', '#3b82f6', '#60a5fa'];
    }
  };

  const dotColors = getDotColors(isDark);

  console.log('🎨 LoadingTransition theme detection:', { 
    theme, 
    resolvedTheme, 
    currentTheme, 
    isDark,
    dotColors,
    domClasses: typeof window !== 'undefined' ? document.documentElement.className : 'N/A'
  });

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 ${isDark ? 'bg-black' : 'bg-white'}`}>
      <div className="text-center">
        {/* Gouache Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <img
            src={isDark ? '/assets/gouache-logo-dark-20241111.png' : '/assets/gouache-logo-light-20241111.png'}
            alt="Gouache"
            className="mx-auto h-12 md:h-16 w-auto drop-shadow-lg"
          />
          <span className="sr-only">Gouache</span>
        </motion.div>
        
        {/* Loading Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex items-center justify-center space-x-2"
        >
          <div className="flex space-x-1">
            <motion.div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: dotColors[0] }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: dotColors[1] }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: dotColors[2] }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
