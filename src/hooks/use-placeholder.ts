import { useMemo, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export const usePlaceholder = () => {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before using theme
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const generatePlaceholderUrl = useMemo(() => {
    return (width: number = 400, height: number = 600) => {
      // Don't generate placeholder until mounted to avoid hydration mismatch
      if (!mounted) {
        return `data:image/svg+xml;base64,${btoa(`
          <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f5f5f5" stroke="#e5e7eb" stroke-width="1"/>
            <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#000000" font-family="Arial, sans-serif" font-size="20" font-weight="bold">SOMA</text>
          </svg>
        `)}`;
      }

      // Determine the actual theme being used
      const currentTheme = resolvedTheme || theme || 'light';
      
      console.log('🎨 Placeholder theme detection:', { theme, resolvedTheme, currentTheme, mounted });
      
      let backgroundColor: string;
      let textColor: string;
      
      if (currentTheme === 'dark') {
        backgroundColor = '#0f172a'; // darker slate grey with blue tint for dark mode
        textColor = '#ffffff'; // white
        console.log('🌙 Using DARK mode colors:', backgroundColor, textColor);
      } else {
        backgroundColor = '#f5f5f5'; // slightly more off-white for better contrast
        textColor = '#000000'; // black
        console.log('☀️ Using LIGHT mode colors:', backgroundColor, textColor);
      }
      
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${backgroundColor}" stroke="#e5e7eb" stroke-width="1"/>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-family="Arial, sans-serif" font-size="20" font-weight="bold">SOMA</text>
        </svg>
      `)}`;
    };
  }, [theme, resolvedTheme, mounted]);
  
  const generateAvatarPlaceholderUrl = useMemo(() => {
    return (width: number = 150, height: number = 150) => {
      // Don't generate placeholder until mounted to avoid hydration mismatch
      if (!mounted) {
        return `data:image/svg+xml;base64,${btoa(`
          <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f5f5f5" stroke="#e5e7eb" stroke-width="1"/>
            <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#000000" font-family="Arial, sans-serif" font-size="16" font-weight="bold">SOMA</text>
          </svg>
        `)}`;
      }

      // Determine the actual theme being used
      const currentTheme = resolvedTheme || theme || 'light';
      
      let backgroundColor: string;
      let textColor: string;
      
      if (currentTheme === 'dark') {
        backgroundColor = '#0f172a'; // darker slate grey with blue tint for dark mode
        textColor = '#ffffff'; // white
      } else {
        backgroundColor = '#f5f5f5'; // slightly more off-white for better contrast
        textColor = '#000000'; // black
      }
      
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${backgroundColor}" stroke="#e5e7eb" stroke-width="1"/>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-family="Arial, sans-serif" font-size="16" font-weight="bold">SOMA</text>
        </svg>
      `)}`;
    };
  }, [theme, resolvedTheme, mounted]);
  
  return {
    generatePlaceholderUrl,
    generateAvatarPlaceholderUrl
  };
};