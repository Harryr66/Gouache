import { useMemo, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export const usePlaceholder = () => {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Ensure component is mounted before using theme
  useEffect(() => {
    setMounted(true);
  }, []);

  // Force refresh when theme changes
  useEffect(() => {
    if (mounted) {
      setRefreshKey(prev => prev + 1);
    }
  }, [theme, resolvedTheme, mounted]);

  // SIMPLE DIRECT FUNCTIONS - NO COMPLEX THEME DETECTION
  const generateDarkPlaceholder = (width: number = 400, height: number = 600) => {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#0a0f1a" stroke="#1e293b" stroke-width="1"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="20" font-weight="bold">Gouache</text>
      </svg>
    `)}`;
  };

  const generateLightPlaceholder = (width: number = 400, height: number = 600) => {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#fafafa" stroke="#e5e5e5" stroke-width="1"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#000000" font-family="Arial, sans-serif" font-size="20" font-weight="bold">Gouache</text>
      </svg>
    `)}`;
  };

  const generateDarkAvatarPlaceholder = (width: number = 150, height: number = 150) => {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#0a0f1a" stroke="#1e293b" stroke-width="1"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="16" font-weight="bold">Gouache</text>
      </svg>
    `)}`;
  };

  const generateLightAvatarPlaceholder = (width: number = 150, height: number = 150) => {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#fafafa" stroke="#e5e5e5" stroke-width="1"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#000000" font-family="Arial, sans-serif" font-size="16" font-weight="bold">Gouache</text>
      </svg>
    `)}`;
  };

  // SIMPLE THEME DETECTION - JUST CHECK DOCUMENT CLASS
  const generatePlaceholderUrl = useMemo(() => {
    return (width: number = 400, height: number = 600) => {
      if (!mounted) {
        return generateDarkPlaceholder(width, height); // Default to dark during SSR
      }
      
      // SIMPLE CHECK - Just look at document class
      const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      
      console.log('🎨 SIMPLE Theme check:', { 
        isDark,
        documentClass: typeof document !== 'undefined' ? document.documentElement.className : 'N/A',
        refreshKey
      });
      
      return isDark ? generateDarkPlaceholder(width, height) : generateLightPlaceholder(width, height);
    };
  }, [mounted, refreshKey]);
  
  const generateAvatarPlaceholderUrl = useMemo(() => {
    return (width: number = 150, height: number = 150) => {
      if (!mounted) {
        return generateDarkAvatarPlaceholder(width, height); // Default to dark during SSR
      }
      
      // SIMPLE CHECK - Just look at document class
      const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      
      return isDark ? generateDarkAvatarPlaceholder(width, height) : generateLightAvatarPlaceholder(width, height);
    };
  }, [mounted, refreshKey]);
  
  return {
    generatePlaceholderUrl,
    generateAvatarPlaceholderUrl,
    generateDarkPlaceholder,
    generateLightPlaceholder,
    generateDarkAvatarPlaceholder,
    generateLightAvatarPlaceholder
  };
};