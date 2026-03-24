import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeModeContext = createContext({ mode: 'light', toggleMode: () => {} });

export const ThemeModeProvider = ({ children }) => {
  const [mode, setMode] = useState('light');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('fa_theme_mode');
      if (stored === 'light' || stored === 'dark') {
        setMode(stored);
        return;
      }
    } catch {
      // ignore localStorage errors (e.g. in private mode)
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setMode(prefersDark ? 'dark' : 'light');
  }, []);

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('fa_theme_mode', next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  const value = useMemo(() => ({ mode, toggleMode }), [mode]);

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
};

export const useThemeMode = () => {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used within ThemeModeProvider');
  }
  return ctx;
};
