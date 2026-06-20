import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Brain, Menu, X } from 'lucide-react'
import { ThemeToggle } from '../../components/ThemeToggle'

const NAV_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Platform', href: '#platform' },
]

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  const closeMobile = useCallback(() => {
    setMobileOpen(false)
    toggleRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!mobileOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [mobileOpen, closeMobile])

  // Focus trap: focus first link when menu opens
  useEffect(() => {
    if (mobileOpen) {
      const firstLink = menuRef.current?.querySelector('a, button') as HTMLElement | null
      firstLink?.focus()
    }
  }, [mobileOpen])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Brain className="h-7 w-7 text-primary" aria-hidden="true" />
          <span className="text-xl font-bold">SIPE</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop right */}
        <div className="hidden items-center gap-2 lg:flex xl:gap-3">
          <ThemeToggle collapsed />
          <Link
            to="/login"
            className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Create account
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-panel"
        >
          {mobileOpen ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Menu className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </nav>

      {/* Mobile panel */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-hidden="true"
            onClick={closeMobile}
          />
          <div
            ref={menuRef}
            id="mobile-nav-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="fixed inset-y-0 right-0 z-50 w-72 border-l bg-background p-6 shadow-lg lg:hidden"
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="text-lg font-bold">Menu</span>
              <button
                type="button"
                onClick={closeMobile}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMobile}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="mt-6 border-t pt-6 space-y-2">
              <ThemeToggle />
              <Link
                to="/login"
                onClick={closeMobile}
                className="flex w-full items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                onClick={closeMobile}
                className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Create account
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  )
}
