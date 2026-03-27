"use client"

import { useEffect, useState } from "react"

type Theme = "light" | "dark" | "system"

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("system")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem("theme") as Theme | null
    if (savedTheme) {
      setTheme(savedTheme)
      applyTheme(savedTheme)
    } else {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      applyTheme(systemTheme)
    }
  }, [])

  const applyTheme = (themeValue: Theme) => {
    const htmlElement = document.documentElement
    if (themeValue === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      htmlElement.classList.toggle("dark", systemTheme === "dark")
    } else {
      htmlElement.classList.toggle("dark", themeValue === "dark")
    }
  }

  const toggleTheme = () => {
    const newTheme: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light"
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    applyTheme(newTheme)
  }

  return { theme, toggleTheme, mounted }
}
