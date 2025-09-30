'use client';

import React from 'react';

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
  return (
    <div 
      className={`bg-gray-800 flex items-center justify-center ${className}`}
      style={{ width, height }}
    >
      <div className="text-center">
        <h2 className="text-white text-2xl font-bold mb-2">SOMA</h2>
        <p className="text-gray-400 text-sm">Content Loading</p>
      </div>
    </div>
  );
}

// Generate placeholder URLs for data
export const generatePlaceholderUrl = (width: number = 400, height: number = 600) => {
  // Default to light mode colors, will be overridden by theme detection
  let backgroundColor = '#f8f9fa'; // very light gray
  let textColor = '#6b7280'; // medium gray
  
  // Try to detect theme if we're in a browser environment
  if (typeof window !== 'undefined') {
    try {
      // Check for explicit light/dark class
      if (document.documentElement.classList.contains('dark')) {
        backgroundColor = '#1f2937'; // dark gray
        textColor = '#ffffff'; // white
      } else if (document.documentElement.classList.contains('light')) {
        backgroundColor = '#f8f9fa'; // very light gray
        textColor = '#6b7280'; // medium gray
      } else {
        // No explicit theme class, check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          backgroundColor = '#1f2937'; // dark gray
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
