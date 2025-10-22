'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface DiscoverSettings {
  hideAiAssistedArt: boolean;
}

interface DiscoverSettingsContextType {
  settings: DiscoverSettings;
  updateSettings: (newSettings: Partial<DiscoverSettings>) => void;
  toggleHideAiAssistedArt: () => void;
}

const DiscoverSettingsContext = createContext<DiscoverSettingsContextType | undefined>(undefined);

export function DiscoverSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<DiscoverSettings>({
    hideAiAssistedArt: false
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('discoverSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.error('Error parsing discover settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('discoverSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<DiscoverSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const toggleHideAiAssistedArt = () => {
    setSettings(prev => ({ ...prev, hideAiAssistedArt: !prev.hideAiAssistedArt }));
  };

  return (
    <DiscoverSettingsContext.Provider value={{
      settings,
      updateSettings,
      toggleHideAiAssistedArt
    }}>
      {children}
    </DiscoverSettingsContext.Provider>
  );
}

export function useDiscoverSettings() {
  const context = useContext(DiscoverSettingsContext);
  if (context === undefined) {
    throw new Error('useDiscoverSettings must be used within a DiscoverSettingsProvider');
  }
  return context;
}
