"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "dark" | "light";

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  isReady: boolean;
}

export const ADMIN_THEME_STORAGE_KEY = "vip_barber_admin_theme_mode";

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
  isReady: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
      if (stored === "light" || stored === "dark") {
        setThemeState(stored);
        applyThemeClass(stored);
      } else {
        applyThemeClass("dark");
      }
    } catch {
      applyThemeClass("dark");
    } finally {
      setIsReady(true);
    }
  }, []);

  const applyThemeClass = (mode: ThemeMode) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (mode === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
      root.setAttribute("data-theme", "light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    }
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    applyThemeClass(mode);
    try {
      localStorage.setItem(ADMIN_THEME_STORAGE_KEY, mode);
    } catch {
      // storage quota or disabled
    }
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isReady }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
