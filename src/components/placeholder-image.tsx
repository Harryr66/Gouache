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
  // Use CSS custom properties that will adapt to theme changes
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="var(--muted)" stroke="var(--border)" stroke-width="1"/>
      <text x="50%" y="50%" text-anchor="middle" fill="var(--muted-foreground)" font-family="Arial, sans-serif" font-size="32" font-weight="bold">SOMA</text>
    </svg>
  `)}`;
};
