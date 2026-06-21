import { Sun, Moon, Monitor } from 'lucide-react'
import { useThemeStore } from '../store/themeStore'

const modes = [
  { value: 'light' as const, icon: Sun, label: 'Light mode' },
  { value: 'dark' as const, icon: Moon, label: 'Dark mode' },
  { value: 'system' as const, icon: Monitor, label: 'System theme' },
]

interface ThemeToggleProps {
  /** When true, only show the icon (no label text). */
  collapsed?: boolean
  className?: string
}

export function ThemeToggle({ collapsed = false, className = '' }: ThemeToggleProps) {
  const { theme, setTheme } = useThemeStore()

  const cycle = () => {
    const order = ['light', 'dark'] as const
    // If current theme is 'system', default to 'light' to toggle to 'dark'
    const currentIdx = order.indexOf(theme as 'light' | 'dark')
    const next = order[((currentIdx === -1 ? 0 : currentIdx) + 1) % order.length]
    setTheme(next)
  }

  const current = modes.find((m) => m.value === theme) ?? modes[0]
  const Icon = current.icon

  return (
    <button
      type="button"
      onClick={cycle}
      className={`flex items-center rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'
      } ${className || 'w-full'}`}
      title={current.label}
      aria-label={current.label}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{current.label}</span>}
    </button>
  )
}
