import { Link } from 'react-router-dom'
import { HeroPreview } from './HeroPreview'

export function HeroSection() {
  return (
    <section className="scroll-mt-20 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Text column */}
          <div className="motion-safe:animate-fade-in">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              One workspace for technical interview preparation
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              <span className="block">Practice smarter.</span>
              <span className="block">Remember your mistakes.</span>
              <span className="block">Interview with confidence.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Coding practice with secure judging, mistake tracking across attempts, mock interviews,
              AI-assisted resume analysis, spaced repetition, and adaptive learning paths — all in one
              focused workspace.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Create account
              </Link>
              <Link
                to="/login"
                className="rounded-lg border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Sign in
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2" aria-label="Supported languages">
              {['JavaScript', 'Python', 'Java', 'C++'].map((lang) => (
                <span
                  key={lang}
                  className="rounded-md border px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>

          {/* Preview column */}
          <div className="motion-safe:animate-fade-in lg:flex lg:justify-end">
            <HeroPreview />
          </div>
        </div>
      </div>
    </section>
  )
}
