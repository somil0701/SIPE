import { Link } from 'react-router-dom'

export function FinalCTASection() {
  return (
    <section
      className="scroll-mt-20 border-t py-16 sm:py-20"
      aria-labelledby="cta-heading"
    >
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
        <h2 id="cta-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
          Turn every attempt into a better next attempt.
        </h2>
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed sm:text-base">
          Build a preparation routine that remembers what you need to improve.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
      </div>
    </section>
  )
}
