import { create } from 'zustand'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

let transitionTimeout: number | undefined;

function applyTheme(theme: Theme, animate = false) {
  const resolved = theme === 'system' ? getSystemPreference() : theme
  const root = document.documentElement

  if (transitionTimeout !== undefined) {
    window.clearTimeout(transitionTimeout)
    transitionTimeout = undefined
  }

  if (animate) {
    root.classList.add('theme-transition')
  }

  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  if (animate) {
    // Remove transition class after animation completes to avoid perf overhead
    transitionTimeout = window.setTimeout(() => {
      root.classList.remove('theme-transition')
      transitionTimeout = undefined
    }, 150)
  }
}

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // localStorage unavailable
  }
  return 'system'
}

export const useThemeStore = create<ThemeState>()((set) => {
  const initial = getStoredTheme()

  // Apply immediately on store creation (no animation on first load)
  applyTheme(initial, false)

  // Listen for OS preference changes while in system mode
  if (typeof window !== 'undefined') {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    mql.addEventListener('change', () => {
      const current = useThemeStore.getState().theme
      if (current === 'system') {
        applyTheme('system', true)
      }
    })
  }

  return {
    theme: initial,
    setTheme: (theme: Theme) => {
      try {
        localStorage.setItem('theme', theme)
      } catch {
        // localStorage unavailable
      }
      applyTheme(theme, true)
      set({ theme })
    },
  }
})
