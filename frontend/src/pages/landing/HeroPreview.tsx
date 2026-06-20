import { useState } from 'react'
import {
  Code2,
  ChevronDown,
  Play,
  Send,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Target,
  Flame,
  FileText,
  BarChart3,
} from 'lucide-react'

const TABS = [
  { id: 'practice', label: 'Practice' },
  { id: 'mistakes', label: 'Mistake Memory' },
  { id: 'resume', label: 'Resume' },
  { id: 'analytics', label: 'Analytics' },
] as const

type TabId = (typeof TABS)[number]['id']

/* ---------- static sample code ---------- */
const SAMPLE_CODE = `import sys

data = list(map(int, sys.stdin.read().split()))
n, target = data[0], data[-1]
nums = data[1:1 + n]
seen = {}
for i, num in enumerate(nums):
    diff = target - num
    if diff in seen:
        print(seen[diff], i)
        break
    seen[num] = i`

export function HeroPreview() {
  const [activeTab, setActiveTab] = useState<TabId>('practice')

  return (
    <div className="w-full max-w-xl">
      {/* Tab bar — accessible role="tablist" */}
      <div
        role="tablist"
        aria-label="Product preview tabs"
        className="mb-3 flex gap-1 rounded-lg bg-muted/50 p-1 border border-border/50"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`preview-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`preview-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => {
              const idx = TABS.findIndex((t) => t.id === activeTab)
              if (e.key === 'ArrowRight') {
                e.preventDefault()
                const next = TABS[(idx + 1) % TABS.length]
                setActiveTab(next.id)
                document.getElementById(`preview-tab-${next.id}`)?.focus()
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault()
                const prev = TABS[(idx - 1 + TABS.length) % TABS.length]
                setActiveTab(prev.id)
                document.getElementById(`preview-tab-${prev.id}`)?.focus()
              }
            }}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {/* Practice panel */}
        <div
          role="tabpanel"
          id="preview-panel-practice"
          aria-labelledby="preview-tab-practice"
          hidden={activeTab !== 'practice'}
        >
          {activeTab === 'practice' && <PracticePreview />}
        </div>

        {/* Mistakes panel */}
        <div
          role="tabpanel"
          id="preview-panel-mistakes"
          aria-labelledby="preview-tab-mistakes"
          hidden={activeTab !== 'mistakes'}
        >
          {activeTab === 'mistakes' && <MistakesPreview />}
        </div>

        {/* Resume panel */}
        <div
          role="tabpanel"
          id="preview-panel-resume"
          aria-labelledby="preview-tab-resume"
          hidden={activeTab !== 'resume'}
        >
          {activeTab === 'resume' && <ResumePreview />}
        </div>

        {/* Analytics panel */}
        <div
          role="tabpanel"
          id="preview-panel-analytics"
          aria-labelledby="preview-tab-analytics"
          hidden={activeTab !== 'analytics'}
        >
          {activeTab === 'analytics' && <AnalyticsPreview />}
        </div>
      </div>

      <p className="mt-2 text-center text-[11px] text-muted-foreground/60">
        Sample preview — not connected to live data
      </p>
    </div>
  )
}

/* ============================================================
   Practice Preview
   ============================================================ */
function PracticePreview() {
  return (
    <div>
      {/* Title bar */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Code2 className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold truncate">Two Sum</span>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider difficulty-medium">
            Medium
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <span className="rounded-md border px-2 py-0.5 font-medium flex items-center gap-1">
            Python <ChevronDown className="h-3 w-3" aria-hidden="true" />
          </span>
        </div>
      </div>

      {/* Code area */}
      <div className="bg-[#1e1e1e] px-4 py-3 font-mono text-[11px] leading-[1.6] text-[#d4d4d4] overflow-x-auto">
        <pre aria-label="Sample Python solution for Two Sum">{SAMPLE_CODE}</pre>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between border-t px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
            aria-label="Sample result: 8 of 10 test cases passed"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            8/10 test cases passed
          </span>
        </div>
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Play className="h-3.5 w-3.5" /> Run
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
            <Send className="h-3.5 w-3.5" /> Submit
          </span>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Mistake Memory Preview
   ============================================================ */
function MistakesPreview() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Brain className="h-4 w-4 text-orange-500" aria-hidden="true" />
        <span className="text-sm font-semibold">Mistake Memory</span>
        <span className="text-[10px] text-muted-foreground">(sample data)</span>
      </div>

      {/* Recurring pattern card */}
      <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3 dark:border-orange-900 dark:bg-orange-950/20">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                Wrong Answer on edge cases
              </span>
              <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600 dark:bg-orange-900/40 dark:text-orange-300">
                3×
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
              Test case #7 failed 3 times — empty array input not handled.
            </p>
          </div>
        </div>
      </div>

      {/* Weakness card */}
      <div className="rounded-lg border p-3">
        <div className="flex items-start gap-2">
          <Target className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <span className="text-xs font-semibold">AI-identified weakness</span>
            <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
              Off-by-one error in boundary checks. Consider testing with arrays of length 0 and 1.
            </p>
          </div>
        </div>
      </div>

      {/* Coaching */}
      <div className="rounded-lg bg-muted/50 px-3 py-2.5">
        <p className="text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">Suggestion:</span> Add explicit edge-case
          handling before the main loop. Review your last 3 attempts to identify the pattern.
        </p>
      </div>
    </div>
  )
}

/* ============================================================
   Resume Preview
   ============================================================ */
function ResumePreview() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-sm font-semibold">Resume Review</span>
        <span className="text-[10px] text-muted-foreground">(sample data)</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Score ring — static SVG */}
        <div className="relative h-16 w-16 shrink-0" aria-label="Sample ATS score: 72 out of 100">
          <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90" aria-hidden="true">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              strokeDasharray={`${72 * 0.975} 100`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold">72</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Good</p>
          <p className="text-xs text-muted-foreground">ATS score — room for improvement in keywords and formatting</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'].map((skill) => (
          <span
            key={skill}
            className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
          >
            {skill}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border p-2.5">
          <p className="font-medium text-green-600 dark:text-green-400">4 strengths</p>
          <p className="text-muted-foreground">identified</p>
        </div>
        <div className="rounded-lg border p-2.5">
          <p className="font-medium text-amber-600 dark:text-amber-400">3 improvements</p>
          <p className="text-muted-foreground">suggested</p>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Analytics Preview
   ============================================================ */
function AnalyticsPreview() {
  const bars = [
    { day: 'Mon', h: 30 },
    { day: 'Tue', h: 55 },
    { day: 'Wed', h: 40 },
    { day: 'Thu', h: 75 },
    { day: 'Fri', h: 45 },
    { day: 'Sat', h: 65 },
    { day: 'Sun', h: 25 },
  ]

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-sm font-semibold">Analytics</span>
        <span className="text-[10px] text-muted-foreground">(sample data)</span>
      </div>

      {/* Mini bar chart — decorative static SVG */}
      <div
        className="flex h-24 items-end gap-1 px-2 pt-4"
        role="img"
        aria-label="Sample weekly activity chart showing questions solved each day"
      >
        {bars.map((bar) => (
          <div key={bar.day} className="flex flex-1 flex-col items-center h-full justify-end group">
            <div
              className="w-full max-w-[20px] rounded-t-[4px] bg-primary/80 transition-all group-hover:bg-primary"
              style={{ height: `${bar.h}%` }}
              aria-hidden="true"
            />
            <span className="text-[10px] text-muted-foreground mt-1.5">{bar.day}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg border p-2.5 text-center">
          <p className="text-lg font-bold">74%</p>
          <p className="text-muted-foreground">Accuracy</p>
        </div>
        <div className="rounded-lg border p-2.5 text-center">
          <p className="text-lg font-bold">42</p>
          <p className="text-muted-foreground">Solved</p>
        </div>
        <div className="rounded-lg border p-2.5 text-center">
          <div className="flex items-center justify-center gap-1">
            <Flame className="h-3.5 w-3.5 text-orange-500" aria-hidden="true" />
            <p className="text-lg font-bold">12</p>
          </div>
          <p className="text-muted-foreground">Streak</p>
        </div>
      </div>
    </div>
  )
}
