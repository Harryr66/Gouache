import { useMemo, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export const usePlaceholder = () => {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before using theme
  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper function to get theme colors
  const getThemeColors = (currentTheme: string) => {
    // More robust theme detection
    const isDarkMode = currentTheme === 'dark' || 
                      (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ||
                      (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    console.log('🎨 Theme detection:', { currentTheme, isDarkMode, documentClass: typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : 'N/A' });
    
    if (isDarkMode) {
      return {
        backgroundColor: '#0f172a', // darker slate grey with blue tint for dark mode
        textColor: '#ffffff', // white
        strokeColor: '#374151' // darker stroke for dark mode
      };
    } else {
      return {
        backgroundColor: '#f5f5f5', // light grey for light mode
        textColor: '#000000', // black
        strokeColor: '#e5e7eb' // light stroke for light mode
      };
    }
  };
  
  const generatePlaceholderUrl = useMemo(() => {
    return (width: number = 400, height: number = 600) => {
      // Determine the actual theme being used
      const currentTheme = resolvedTheme || theme || 'light';
      const colors = getThemeColors(currentTheme);
      
      console.log('🎨 Placeholder theme detection:', { theme, resolvedTheme, currentTheme, mounted, colors });
      
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${colors.backgroundColor}" stroke="${colors.strokeColor}" stroke-width="1"/>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="${colors.textColor}" font-family="Arial, sans-serif" font-size="20" font-weight="bold">SOMA</text>
        </svg>
      `)}`;
    };
  }, [theme, resolvedTheme, mounted]);
  
  const generateAvatarPlaceholderUrl = useMemo(() => {
    return (width: number = 150, height: number = 150) => {
      // Determine the actual theme being used
      const currentTheme = resolvedTheme || theme || 'light';
      const colors = getThemeColors(currentTheme);
      
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${colors.backgroundColor}" stroke="${colors.strokeColor}" stroke-width="1"/>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="${colors.textColor}" font-family="Arial, sans-serif" font-size="16" font-weight="bold">SOMA</text>
        </svg>
      `)}`;
    };
  }, [theme, resolvedTheme, mounted]);
  
  return {
    generatePlaceholderUrl,
    generateAvatarPlaceholderUrl
  };
};