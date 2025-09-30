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
  // Check if we're in light mode by looking at the document's class or theme
  const isLightMode = typeof window !== 'undefined' && 
    (document.documentElement.classList.contains('light') || 
     !document.documentElement.classList.contains('dark'));
  
  const backgroundColor = isLightMode ? '#f3f4f6' : '#1f2937'; // light gray or dark gray
  const textColor = isLightMode ? '#000000' : '#ffffff'; // black or white
  
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}"/>
      <text x="50%" y="50%" text-anchor="middle" fill="${textColor}" font-family="Arial, sans-serif" font-size="32" font-weight="bold">SOMA</text>
    </svg>
  `)}`;
};
