'use client';

import React from 'react';
import { useTheme } from 'next-themes';

interface PlaceholderImageProps {
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
}

export function PlaceholderImage({ 
  width = 400, 
  height = 600, 
  className = '', 
  alt = 'SOMA Placeholder' 
}: PlaceholderImageProps) {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || 'light';
  
  const isDark = currentTheme === 'dark';
  
  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{ 
        width, 
        height,
        backgroundColor: isDark ? '#475569' : '#f5f5f5'
      }}
    >
      <div className="text-center">
        <h2 
          className="text-2xl font-bold mb-2"
          style={{ color: isDark ? '#ffffff' : '#000000' }}
        >
          SOMA
        </h2>
        <p 
          className="text-sm"
          style={{ color: isDark ? '#d1d5db' : '#6b7280' }}
        >
          Content Loading
        </p>
      </div>
    </div>
  );
}

// Generate placeholder URLs for data
export const generatePlaceholderUrl = (width: number = 400, height: number = 600) => {
  // Default to light mode colors, will be overridden by theme detection
  let backgroundColor = '#f5f5f5'; // slightly more off-white for better contrast
  let textColor = '#000000'; // black
  
  // Try to detect theme if we're in a browser environment
  if (typeof window !== 'undefined') {
    try {
      // Check for explicit light/dark class
      if (document.documentElement.classList.contains('dark')) {
        backgroundColor = '#475569'; // darker slate grey for dark mode
        textColor = '#ffffff'; // white
      } else if (document.documentElement.classList.contains('light')) {
        backgroundColor = '#f5f5f5'; // slightly more off-white for better contrast
        textColor = '#000000'; // black
      } else {
        // No explicit theme class, check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          backgroundColor = '#475569'; // darker slate grey for dark mode
          textColor = '#ffffff'; // white
        }
        // Otherwise keep light mode defaults
      }
    } catch (error) {
      // If theme detection fails, keep light mode defaults
      console.warn('Theme detection failed, using light mode defaults:', error);
    }
  }
  
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}" stroke="#e5e7eb" stroke-width="1"/>
      <text x="50%" y="50%" text-anchor="middle" fill="${textColor}" font-family="Arial, sans-serif" font-size="32" font-weight="bold">SOMA</text>
    </svg>
  `)}`;
};
