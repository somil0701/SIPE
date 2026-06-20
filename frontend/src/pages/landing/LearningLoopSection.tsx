import {
  Code2,
  CheckCircle2,
  Brain,
  TrendingUp,
  Mic,
  BarChart3,
} from 'lucide-react'

const STEPS = [
  {
    number: 1,
    title: 'Practice',
    description: 'Solve targeted coding questions in the Monaco workspace.',
    icon: Code2,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  {
    number: 2,
    title: 'Diagnose',
    description: 'Receive judge results, failing-test evidence, and AI-assisted feedback.',
    icon: CheckCircle2,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
  {
    number: 3,
    title: 'Remember',
    description: 'Use Submission Timeline and Mistake Memory to recognize recurring errors.',
    icon: Brain,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
  },
  {
    number: 4,
    title: 'Improve',
    description: 'Revisit material through spaced repetition and learning paths generated from weak topics.',
    icon: TrendingUp,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
  {
    number: 5,
    title: 'Rehearse',
    description: 'Complete technical, behavioral, mixed, and system-design mock interviews.',
    icon: Mic,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  {
    number: 6,
    title: 'Measure',
    description: 'Follow accuracy, streaks, topic strength, and weekly progress.',
    icon: BarChart3,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
]

export function LearningLoopSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-t bg-muted/20 py-16 sm:py-20"
      aria-labelledby="learning-loop-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            The SIPE learning loop
          </p>
          <h2 id="learning-loop-heading" className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            A connected system, not a collection of tools
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground leading-relaxed">
            Each step feeds information into the next. Your attempts reveal weak topics, weak topics shape
            recommendations, missed concepts return through spaced repetition, and analytics shows whether
            the plan is working.
          </p>
        </div>

        {/* Desktop: horizontal stepper */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-6 gap-4">
            {STEPS.map((step, index) => (
              <div key={step.number} className="flex flex-col items-center text-center">
                {/* Connector + step circle */}
                <div className="relative flex w-full items-center justify-center mb-4">
                  {/* Left connector line */}
                  {index > 0 && (
                    <div className="absolute left-0 top-1/2 h-px w-[calc(50%-20px)] bg-border" aria-hidden="true" />
                  )}
                  {/* Right connector line */}
                  {index < STEPS.length - 1 && (
                    <div className="absolute right-0 top-1/2 h-px w-[calc(50%-20px)] bg-border" aria-hidden="true" />
                  )}
                  {/* Step circle */}
                  <div
                    className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border ${step.bg} ${step.border}`}
                  >
                    <step.icon className={`h-5 w-5 ${step.color}`} aria-hidden="true" />
                  </div>
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {step.number}. {step.title}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile/tablet: vertical stepper */}
        <div className="lg:hidden space-y-0">
          {STEPS.map((step, index) => (
            <div key={step.number} className="flex gap-4">
              {/* Vertical line + circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${step.bg} ${step.border}`}
                >
                  <step.icon className={`h-4 w-4 ${step.color}`} aria-hidden="true" />
                </div>
                {index < STEPS.length - 1 && (
                  <div className="w-px flex-1 bg-border my-1" aria-hidden="true" />
                )}
              </div>
              {/* Content */}
              <div className={`pb-6 ${index === STEPS.length - 1 ? 'pb-0' : ''}`}>
                <p className="text-sm font-semibold">
                  {step.number}. {step.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Callout combining the connected-system concept */}
        <div className="mt-16 rounded-xl border bg-card p-6 text-center shadow-sm lg:mx-auto lg:max-w-3xl">
          <h3 className="text-base font-semibold">Your data flows between every feature</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            This is more valuable than simply having many features. Every practice attempt, review, and
            interview contributes to a shared understanding of what you need to improve next.
          </p>
        </div>
      </div>
    </section>
  )
}
