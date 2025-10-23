'use client';

import React from 'react';

interface CountryFlagProps {
  country: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Country name to flag emoji mapping
const COUNTRY_FLAGS: { [key: string]: string } = {
  'United States': '🇺🇸',
  'United Kingdom': '🇬🇧',
  'Canada': '🇨🇦',
  'Australia': '🇦🇺',
  'Germany': '🇩🇪',
  'France': '🇫🇷',
  'Italy': '🇮🇹',
  'Spain': '🇪🇸',
  'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪',
  'Switzerland': '🇨🇭',
  'Japan': '🇯🇵',
  'South Korea': '🇰🇷',
  'China': '🇨🇳',
  'India': '🇮🇳',
  'Brazil': '🇧🇷',
  'Mexico': '🇲🇽',
  'Argentina': '🇦🇷',
  'Colombia': '🇨🇴',
  'South Africa': '🇿🇦',
  'Egypt': '🇪🇬',
  'Morocco': '🇲🇦',
  'Sweden': '🇸🇪',
  'Norway': '🇳🇴',
  'Denmark': '🇩🇰',
  'Finland': '🇫🇮',
  'Poland': '🇵🇱',
  'Portugal': '🇵🇹',
  'Greece': '🇬🇷',
  'Turkey': '🇹🇷',
  'Israel': '🇮🇱',
  'United Arab Emirates': '🇦🇪',
  'Singapore': '🇸🇬',
  'New Zealand': '🇳🇿',
  'Ireland': '🇮🇪',
  'Austria': '🇦🇹',
  'Czech Republic': '🇨🇿',
  'Russia': '🇷🇺',
  'Nigeria': '🇳🇬',
  'Kenya': '🇰🇪',
  'Ghana': '🇬🇭',
  'Chile': '🇨🇱',
  'Peru': '🇵🇪',
  'Venezuela': '🇻🇪',
  'Philippines': '🇵🇭',
  'Thailand': '🇹🇭',
  'Indonesia': '🇮🇩',
  'Malaysia': '🇲🇾',
  'Vietnam': '🇻🇳',
};

const SIZE_CLASSES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export function CountryFlag({ country, size = 'md', className = '' }: CountryFlagProps) {
  const flag = COUNTRY_FLAGS[country];
  
  if (!flag) {
    return null; // Don't render anything if country not found
  }

  return (
    <span className={`${SIZE_CLASSES[size]} ${className}`} role="img" aria-label={`Flag of ${country}`}>
      {flag}
    </span>
  );
}
