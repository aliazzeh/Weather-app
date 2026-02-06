"use client";

import React, { useEffect, useState } from "react";

type Theme = "light" | "dark";
const KEY = "weather-theme";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY) as Theme | null;
    const systemDark =
      window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;

    const theme: Theme = saved ?? (systemDark ? "dark" : "light");

    document.documentElement.classList.toggle("dark", theme === "dark");
    setReady(true);
  }, []);

  if (!ready) return <div className="min-h-screen bg-(--bg)" />;

  return <>{children}</>;
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  const next: Theme = isDark ? "light" : "dark";
  document.documentElement.classList.toggle("dark", next === "dark");
  localStorage.setItem(KEY, next);
}

export function getTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
