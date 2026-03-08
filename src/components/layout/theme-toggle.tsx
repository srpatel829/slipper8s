"use client"

/**
 * ThemeToggle — simple dark/light mode toggle button.
 * Shows Sun icon in dark mode (click for light), Moon icon in light mode (click for dark).
 */

import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/layout/theme-provider"

export function ThemeToggle() {
  const { mode, toggleMode } = useTheme()

  return (
    <button
      onClick={toggleMode}
      className="h-7 w-7 rounded-md border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {mode === "dark"
        ? <Sun className="h-3.5 w-3.5" />
        : <Moon className="h-3.5 w-3.5" />
      }
    </button>
  )
}
