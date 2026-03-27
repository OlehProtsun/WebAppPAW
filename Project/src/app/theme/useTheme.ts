import { useEffect, useEffectEvent, useState } from "react";

const THEME_STORAGE_KEY = "project-theme";
const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

type ThemeMode = "light" | "dark";

function getStoredTheme(): ThemeMode | null {
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (value === "light" || value === "dark") {
    return value;
  }

  return null;
}

function getSystemTheme(): ThemeMode {
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme() ?? getSystemTheme());

  const syncSystemTheme = useEffectEvent(() => {
    if (getStoredTheme()) {
      return;
    }

    setTheme(getSystemTheme());
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
    const handleChange = () => syncSystemTheme();

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  function toggleTheme() {
    setTheme(currentTheme => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      return nextTheme;
    });
  }

  return {
    theme,
    isDark: theme === "dark",
    toggleTheme,
  };
}
