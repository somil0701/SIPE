import { Link } from 'react-router-dom'
import { Brain } from 'lucide-react'

const PRODUCT_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Platform', href: '#platform' },
]

const ACCOUNT_LINKS = [
  { label: 'Sign in', to: '/login' },
  { label: 'Create account', to: '/register' },
]

export function LandingFooter() {
  return (
    <footer className="border-t py-10" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" aria-hidden="true" />
              <span className="text-lg font-bold">SIPE</span>
            </div>
            <p className="mt-2 max-w-xs text-xs text-muted-foreground leading-relaxed">
              Smart Interview Preparation Engine — coding practice, mistake tracking, mock interviews,
              resume analysis, and adaptive learning in one workspace.
            </p>
          </div>

          {/* Product links */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Product
            </p>
            <ul className="space-y-2">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Account links */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Account
            </p>
            <ul className="space-y-2">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/60">
            SIPE — Smart Interview Preparation Engine
          </p>
          <p className="text-xs text-muted-foreground/60">
            Made with ❤️ by Somil Choudhary
          </p>
        </div>
      </div>
    </footer>
  )
}
