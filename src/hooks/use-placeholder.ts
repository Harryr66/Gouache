import { useMemo, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export const usePlaceholder = () => {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before using theme
  useEffect(() => {
    setMounted(true);
  }, []);

  // SEPARATE LIGHT THEME PLACEHOLDER - SLIGHTLY OFF WHITE WITH BLACK TEXT
  const generateLightThemePlaceholderUrl = useMemo(() => {
    return (width: number = 400, height: number = 600) => {
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#fafafa" stroke="#e5e5e5" stroke-width="1"/>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#000000" font-family="Arial, sans-serif" font-size="20" font-weight="bold">SOMA</text>
        </svg>
      `)}`;
    };
  }, []);

  // SEPARATE DARK THEME PLACEHOLDER - DARK SLATE BLUE GREY WITH WHITE TEXT
  const generateDarkThemePlaceholderUrl = useMemo(() => {
    return (width: number = 400, height: number = 600) => {
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#1e293b" stroke="#334155" stroke-width="1"/>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="20" font-weight="bold">SOMA</text>
        </svg>
      `)}`;
    };
  }, []);

  // LIGHT THEME AVATAR PLACEHOLDER - SLIGHTLY OFF WHITE WITH BLACK TEXT
  const generateLightThemeAvatarPlaceholderUrl = useMemo(() => {
    return (width: number = 150, height: number = 150) => {
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#fafafa" stroke="#e5e5e5" stroke-width="1"/>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#000000" font-family="Arial, sans-serif" font-size="16" font-weight="bold">SOMA</text>
        </svg>
      `)}`;
    };
  }, []);

  // DARK THEME AVATAR PLACEHOLDER - DARK SLATE BLUE GREY WITH WHITE TEXT
  const generateDarkThemeAvatarPlaceholderUrl = useMemo(() => {
    return (width: number = 150, height: number = 150) => {
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#1e293b" stroke="#334155" stroke-width="1"/>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="16" font-weight="bold">SOMA</text>
        </svg>
      `)}`;
    };
  }, []);

  // Main function that chooses the correct placeholder
  const generatePlaceholderUrl = useMemo(() => {
    return (width: number = 400, height: number = 600) => {
      if (!mounted) {
        // Return a neutral placeholder during SSR
        return `data:image/svg+xml;base64,${btoa(`
          <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#6b7280" stroke="#4b5563" stroke-width="1"/>
            <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="20" font-weight="bold">SOMA</text>
          </svg>
        `)}`;
      }
      
      // FORCE THEME DETECTION - Check document class directly
      const isDarkMode = typeof document !== 'undefined' && 
        (document.documentElement.classList.contains('dark') || 
         document.documentElement.getAttribute('data-theme') === 'dark');
      
      const currentTheme = resolvedTheme || theme || 'light';
      
      console.log('🎨 FORCE Theme detection:', { 
        theme, 
        resolvedTheme, 
        currentTheme,
        isDarkMode,
        documentClass: typeof document !== 'undefined' ? document.documentElement.className : 'N/A',
        mounted 
      });
      
      if (isDarkMode || currentTheme === 'dark') {
        console.log('🌙 FORCE Using DARK theme placeholder - #1e293b');
        return generateDarkThemePlaceholderUrl(width, height);
      } else {
        console.log('☀️ FORCE Using LIGHT theme placeholder - #fafafa');
        return generateLightThemePlaceholderUrl(width, height);
      }
    };
  }, [theme, resolvedTheme, generateLightThemePlaceholderUrl, generateDarkThemePlaceholderUrl, mounted]);
  
  const generateAvatarPlaceholderUrl = useMemo(() => {
    return (width: number = 150, height: number = 150) => {
      if (!mounted) {
        // Return a neutral placeholder during SSR
        return `data:image/svg+xml;base64,${btoa(`
          <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#6b7280" stroke="#4b5563" stroke-width="1"/>
            <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="16" font-weight="bold">SOMA</text>
          </svg>
        `)}`;
      }
      
      // FORCE THEME DETECTION - Check document class directly
      const isDarkMode = typeof document !== 'undefined' && 
        (document.documentElement.classList.contains('dark') || 
         document.documentElement.getAttribute('data-theme') === 'dark');
      
      const currentTheme = resolvedTheme || theme || 'light';
      
      if (isDarkMode || currentTheme === 'dark') {
        return generateDarkThemeAvatarPlaceholderUrl(width, height);
      } else {
        return generateLightThemeAvatarPlaceholderUrl(width, height);
      }
    };
  }, [theme, resolvedTheme, generateLightThemeAvatarPlaceholderUrl, generateDarkThemeAvatarPlaceholderUrl, mounted]);
  
  return {
    generatePlaceholderUrl,
    generateAvatarPlaceholderUrl,
    generateLightThemePlaceholderUrl,
    generateDarkThemePlaceholderUrl,
    generateLightThemeAvatarPlaceholderUrl,
    generateDarkThemeAvatarPlaceholderUrl
  };
};