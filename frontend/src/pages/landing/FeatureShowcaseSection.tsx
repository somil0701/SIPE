import {
  Code2,
  CheckCircle2,
  Play,
  Send,
  ChevronDown,
  Brain,
  AlertTriangle,
  Target,
  Clock,
  RotateCcw,
} from 'lucide-react'

export function FeatureShowcaseSection() {
  return (
    <section
      id="features"
      className="scroll-mt-20 border-t py-16 sm:py-20"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Core capabilities
          </p>
          <h2 id="features-heading" className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Practice, judge, and learn from every attempt
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* ---------- Coding Practice & Judging ---------- */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="border-b px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <Code2 className="h-4 w-4 text-blue-500" aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold">Coding Practice &amp; Secure Judging</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <ul className="space-y-2.5 text-sm text-muted-foreground" aria-label="Coding practice features">
                {[
                  'Searchable questions with difficulty and type filtering',
                  'Monaco editor with starter code, custom input, Run, and Submit',
                  'JavaScript, Python, Java, and C++ support',
                  'Isolated Docker-based code judge',
                  'Test-case results and AI-assisted feedback',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Mini editor preview — decorative */}
              <div className="rounded-lg border overflow-hidden" aria-hidden="true">
                <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Code2 className="h-3 w-3" />
                    <span className="font-medium">solution.py</span>
                  </div>
                  <span className="flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Python <ChevronDown className="h-2.5 w-2.5" />
                  </span>
                </div>
                <div className="bg-[#1e1e1e] px-3 py-2 font-mono text-[10px] text-[#d4d4d4] leading-relaxed">
                  <div><span className="text-[#c586c0]">for</span> i, num <span className="text-[#c586c0]">in</span> <span className="text-[#dcdcaa]">enumerate</span>(nums):</div>
                  <div>    diff = target - num</div>
                  <div>    <span className="text-[#c586c0]">if</span> diff <span className="text-[#c586c0]">in</span> seen:</div>
                  <div>        <span className="text-[#dcdcaa]">print</span>(seen[diff], i)</div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t px-3 py-1.5">
                  <span className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    <Play className="h-3 w-3" /> Run
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                    <Send className="h-3 w-3" /> Submit
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ---------- Mistake Memory ---------- */}
          <div className="rounded-xl border-2 border-orange-200 bg-card shadow-sm overflow-hidden dark:border-orange-900/50">
            <div className="border-b border-orange-200 bg-orange-50/30 px-5 py-4 dark:border-orange-900/50 dark:bg-orange-950/10">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                  <Brain className="h-4 w-4 text-orange-500" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Mistake Memory</h3>
                  <p className="text-[11px] text-muted-foreground">
                    What makes SIPE different from a question bank
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <ul className="space-y-2.5 text-sm text-muted-foreground" aria-label="Mistake Memory features">
                {[
                  'Submission history for each question with code snapshots',
                  'Failed-test evidence: input, expected vs. actual output',
                  'Recurring verdict and weakness detection across attempts',
                  'Restore any earlier solution directly into the editor',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Mistake Memory preview — decorative */}
              <div className="space-y-2.5" aria-hidden="true">
                <div className="rounded-lg border border-orange-200 bg-orange-50/40 p-3 dark:border-orange-900 dark:bg-orange-950/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                          Runtime Error
                        </span>
                        <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600 dark:bg-orange-900/40 dark:text-orange-300">
                          2×
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Array index out of bounds on test #4
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold">Weakness detected</span>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Off-by-one in boundary checks across 3 recent submissions
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> 5 attempts
                  </span>
                  <span className="flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Code snapshots saved
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
