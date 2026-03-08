"use client"

/**
 * ThemeProvider — manages dark/light mode.
 * ONE color scheme only per spec — no accent variants.
 * Default: light mode. Persists to localStorage.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"

export type ThemeMode = "dark" | "light"

interface ThemeContextValue {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>")
  return ctx
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light")

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme-mode") as ThemeMode | null
      if (saved === "light" || saved === "dark") {
        setModeState(saved)
      }
    } catch {
      // SSR guard
    }
  }, [])

  // Apply class to <html>
  useEffect(() => {
    const html = document.documentElement
    if (mode === "dark") {
      html.classList.add("dark")
    } else {
      html.classList.remove("dark")
    }
  }, [mode])

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode)
    try { localStorage.setItem("theme-mode", newMode) } catch { /* */ }
  }, [])

  const toggleMode = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark")
  }, [mode, setMode])

  return (
    <ThemeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  )
}
