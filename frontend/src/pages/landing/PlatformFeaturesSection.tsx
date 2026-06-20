import {
  Mic,
  FileText,
  Repeat,
  Map,
  BarChart3,
  LayoutDashboard,
} from 'lucide-react'

const FEATURES = [
  {
    title: 'Mock Interviews',
    description:
      'Technical, behavioral, mixed, and system-design sessions with answer submission and AI-generated session feedback.',
    icon: Mic,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    badges: ['Technical', 'Behavioral', 'Mixed', 'System Design'],
    span: 'lg:col-span-2',
  },
  {
    title: 'Resume Review',
    description:
      'Upload PDF or DOCX. Get ATS scoring, strengths, weaknesses, project analysis, experience feedback, and job-description matching.',
    icon: FileText,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    badges: ['ATS Score', 'Project Analysis', 'Job Match'],
    span: '',
  },
  {
    title: 'Spaced Repetition',
    description:
      'SM-2-style scheduling surfaces questions right before you forget. Rate your recall to train the algorithm.',
    icon: Repeat,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    badges: ['SM-2 Algorithm', 'Due Reviews', 'Mastery Tracking'],
    span: '',
  },
  {
    title: 'Learning Paths',
    description:
      'Structured study plans generated from weak topics. Target specific skills or companies and track completion.',
    icon: Map,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    badges: ['Weak Topics', 'Skill Targets', 'Progress'],
    span: '',
  },
  {
    title: 'Analytics',
    description:
      'Accuracy, solved and attempted questions, weekly trends, streaks, weak topics, and strong topics.',
    icon: BarChart3,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    badges: ['Weekly Trends', 'Topic Strength', 'Streaks'],
    span: '',
  },
  {
    title: 'Dashboard',
    description:
      'Daily recommendations, progress summary, recent mock interviews, and spaced-repetition status in one view.',
    icon: LayoutDashboard,
    color: 'text-primary',
    bg: 'bg-primary/10',
    badges: ['Recommendations', 'Progress', 'Due Reviews'],
    span: 'lg:col-span-2',
  },
]

export function PlatformFeaturesSection() {
  return (
    <section
      id="platform"
      className="scroll-mt-20 border-t py-16 sm:py-20"
      aria-labelledby="platform-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Platform
          </p>
          <h2 id="platform-heading" className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Everything you need in one workspace
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className={`rounded-xl border bg-card p-5 transition-colors hover:border-primary/20 ${feature.span}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${feature.bg}`}>
                  <feature.icon className={`h-4.5 w-4.5 ${feature.color}`} aria-hidden="true" />
                </div>
                <h3 className="text-sm font-semibold">{feature.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {feature.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {feature.badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
