import { useMemo, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export const usePlaceholder = () => {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before using theme
  useEffect(() => {
    setMounted(true);
  }, []);

  // SEPARATE LIGHT THEME PLACEHOLDER - COMPLETELY INDEPENDENT
  const generateLightThemePlaceholderUrl = useMemo(() => {
    return (width: number = 400, height: number = 600) => {
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f8f9fa" stroke="#e9ecef" stroke-width="1"/>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#6c757d" font-family="Arial, sans-serif" font-size="20" font-weight="bold">SOMA</text>
        </svg>
      `)}`;
    };
  }, []);

  // SEPARATE DARK THEME PLACEHOLDER - UNCHANGED
  const generateDarkThemePlaceholderUrl = useMemo(() => {
    return (width: number = 400, height: number = 600) => {
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#0f172a" stroke="#374151" stroke-width="1"/>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="20" font-weight="bold">SOMA</text>
        </svg>
      `)}`;
    };
  }, []);

  // LIGHT THEME AVATAR PLACEHOLDER - SEPARATE
  const generateLightThemeAvatarPlaceholderUrl = useMemo(() => {
    return (width: number = 150, height: number = 150) => {
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f8f9fa" stroke="#e9ecef" stroke-width="1"/>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#6c757d" font-family="Arial, sans-serif" font-size="16" font-weight="bold">SOMA</text>
        </svg>
      `)}`;
    };
  }, []);

  // DARK THEME AVATAR PLACEHOLDER - UNCHANGED
  const generateDarkThemeAvatarPlaceholderUrl = useMemo(() => {
    return (width: number = 150, height: number = 150) => {
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#0f172a" stroke="#374151" stroke-width="1"/>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="16" font-weight="bold">SOMA</text>
        </svg>
      `)}`;
    };
  }, []);

  // Main function that chooses the correct placeholder
  const generatePlaceholderUrl = useMemo(() => {
    return (width: number = 400, height: number = 600) => {
      const currentTheme = resolvedTheme || theme || 'light';
      
      console.log('🎨 Theme detection:', { theme, resolvedTheme, currentTheme });
      
      if (currentTheme === 'dark') {
        return generateDarkThemePlaceholderUrl(width, height);
      } else {
        return generateLightThemePlaceholderUrl(width, height);
      }
    };
  }, [theme, resolvedTheme, generateLightThemePlaceholderUrl, generateDarkThemePlaceholderUrl]);
  
  const generateAvatarPlaceholderUrl = useMemo(() => {
    return (width: number = 150, height: number = 150) => {
      const currentTheme = resolvedTheme || theme || 'light';
      
      if (currentTheme === 'dark') {
        return generateDarkThemeAvatarPlaceholderUrl(width, height);
      } else {
        return generateLightThemeAvatarPlaceholderUrl(width, height);
      }
    };
  }, [theme, resolvedTheme, generateLightThemeAvatarPlaceholderUrl, generateDarkThemeAvatarPlaceholderUrl]);
  
  return {
    generatePlaceholderUrl,
    generateAvatarPlaceholderUrl,
    generateLightThemePlaceholderUrl,
    generateDarkThemePlaceholderUrl,
    generateLightThemeAvatarPlaceholderUrl,
    generateDarkThemeAvatarPlaceholderUrl
  };
};