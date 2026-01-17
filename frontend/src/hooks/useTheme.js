import { useState, useEffect, createContext, useContext } from 'react';

const ThemeContext = createContext();

export const themes = {
  minimalistic: {
    name: 'Minimalistic',
    description: 'Clean and simple',
    icon: '○',
    classes: {
      card: 'border-slate-100 shadow-sm',
      button: 'rounded-full',
      header: 'bg-white border-b border-slate-200',
      sidebar: 'bg-white border-r border-slate-200',
      accent: 'bg-primary text-white',
      tableHeader: 'bg-slate-50',
      badge: 'rounded-full',
    }
  },
  standard: {
    name: 'Standard',
    description: 'Classic professional',
    icon: '◐',
    classes: {
      card: 'border-slate-200 shadow-md rounded-lg',
      button: 'rounded-md',
      header: 'bg-slate-100 border-b-2 border-slate-300',
      sidebar: 'bg-slate-100 border-r-2 border-slate-300',
      accent: 'bg-blue-600 text-white',
      tableHeader: 'bg-slate-100',
      badge: 'rounded-md',
    }
  },
  fancy: {
    name: 'Fancy',
    description: 'Modern & vibrant',
    icon: '◉',
    classes: {
      card: 'border-0 shadow-xl bg-gradient-to-br from-white to-slate-50 rounded-2xl',
      button: 'rounded-2xl shadow-lg',
      header: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0',
      sidebar: 'bg-gradient-to-b from-slate-900 to-slate-800 text-white border-0',
      accent: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white',
      tableHeader: 'bg-gradient-to-r from-blue-50 to-indigo-50',
      badge: 'rounded-full shadow-md',
    }
  }
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('ui-theme');
    return saved && themes[saved] ? saved : 'minimalistic';
  });

  useEffect(() => {
    localStorage.setItem('ui-theme', theme);
    // Update body class for global styling
    document.body.className = `theme-${theme}`;
  }, [theme]);

  const value = {
    theme,
    setTheme,
    currentTheme: themes[theme],
    themes
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
