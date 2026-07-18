'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSessionUser } from '@/app/actions/auth';

type Theme = 'light' | 'dark';

interface UserData {
  id: string;
  email: string;
  name: string | null;
  preferences: {
    theme: string;
    aiSummaries: boolean;
    resurfacingEnabled: boolean;
  } | null;
}

interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  isCmdPaletteOpen: boolean;
  setCmdPaletteOpen: (open: boolean) => void;
  user: UserData | null;
  setUser: (user: UserData | null) => void;
  loadingUser: boolean;
  refreshUser: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [isCmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Fetch current user on mount
  const refreshUser = async () => {
    try {
      const u = await getSessionUser();
      setUser(u as any);
    } catch (err) {
      console.error('Failed to fetch user session:', err);
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  // Theme Sync on mount & changes
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemTheme;
    setTheme(initialTheme);
    
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Keyboard Shortcuts (Ctrl/Cmd + K for Command Palette)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdPaletteOpen(prev => !prev);
      }
      
      // Escape closes dialogs/modals
      if (e.key === 'Escape') {
        setCmdPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        isCmdPaletteOpen,
        setCmdPaletteOpen,
        user,
        setUser,
        loadingUser,
        refreshUser
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider (Providers component).');
  }
  return context;
}
