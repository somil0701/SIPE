import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { initVimMode } from 'monaco-vim'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Keyboard,
  Loader2,
  Play,
  Send,
  ShieldCheck,
  SkipForward,
  Target,
  Terminal,
  X,
} from 'lucide-react'
import { assessmentApi, learningPathApi } from '../services/api'
import { AssessmentQuestion, AssessmentSession, LearningPathOptions } from '../types'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { ErrorState, LoadingState } from '../components/StateFeedback'
import { primaryActionClass } from '../lib/themeStyles'

const LANGUAGES = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'python', name: 'Python' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' },
]

type CreateAssessmentInput = {
  learningPathItemId?: string
  targetSkillId?: string
  targetCompanyId?: string
  questionCount?: number
  durationMinutes?: number
}

function starterCode(question: AssessmentQuestion['question'], language: string) {
  const stored = question.starterCode?.[language]
  if (typeof stored === 'string' && stored.trim()) return stored
  if (language === 'python') return 'import sys\n\ndata = sys.stdin.read()\n\n# Write your solution and print the answer.\n'
  if (language === 'java') return 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your solution.\n    }\n}\n'
  if (language === 'cpp') return '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution.\n    return 0;\n}\n'
  return "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8');\n\n// Write your solution.\n"
}

function formatClock(seconds: number) {
  const safe = Math.max(0, seconds)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const remainder = safe % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`
}

function statusLabel(value?: string) {
  if (!value) return 'Unknown'
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function statusTone(status?: string) {
  const normalized = status?.toLowerCase()
  if (normalized === 'accepted') return 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300'
  if (normalized === 'running' || normalized === 'pending') return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300'
  return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'
}

function resultTone(status: string) {
  if (status === 'completed') return 'text-emerald-600 dark:text-emerald-400'
  if (status === 'needs_practice') return 'text-amber-600 dark:text-amber-400'
  return 'text-muted-foreground'
}

function consoleText(runResult: any) {
  if (!runResult) return 'No run yet — run your code to see output, errors, and test results.'
  const output = runResult.output?.trim() || ''
  if (runResult.error) return output ? `${runResult.error}\n\nstdout:\n${output}` : runResult.error
  return output || '(program finished with no output)'
}

function assessmentFocus(assessment: AssessmentSession) {
  if (assessment.targetCompany && assessment.targetSkill) return `${assessment.targetCompany.name} · ${assessment.targetSkill.name}`
  return assessment.targetCompany?.name || assessment.targetSkill?.name || 'Mixed DSA'
}

function CreateAssessmentDialog({
  options,
  creating,
  onClose,
  onCreate,
}: {
  options?: LearningPathOptions
  creating: boolean
  onClose: () => void
  onCreate: (input: CreateAssessmentInput) => void
}) {
  const [focus, setFocus] = useState<'mixed' | 'skill' | 'company'>('mixed')
  const [targetSkillId, setTargetSkillId] = useState('')
  const [targetCompanyId, setTargetCompanyId] = useState('')
  const [questionCount, setQuestionCount] = useState(3)
  const [durationMinutes, setDurationMinutes] = useState(60)
  const missingTarget = (focus === 'skill' && !targetSkillId) || (focus === 'company' && !targetCompanyId)

  const submit = () => {
    if (missingTarget) return
    onCreate({
      targetSkillId: focus === 'skill' ? targetSkillId : undefined,
      targetCompanyId: focus === 'company' ? targetCompanyId : undefined,
      questionCount,
      durationMinutes,
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="assessment-dialog-title">
      <div className="w-full max-w-xl rounded-xl border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="assessment-dialog-title" className="text-xl font-semibold">Create DSA assessment</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose a broad mix or a focused assessment. Questions always come from the existing database.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {([
            ['mixed', 'Mixed DSA', 'Multiple skills'],
            ['skill', 'By skill', 'Choose one topic'],
            ['company', 'By company', 'Company-tagged mix'],
          ] as const).map(([value, label, description]) => {
            const active = focus === value;
            return (
              <div key={value} className={`rounded-lg transition-all ${active ? 'bg-black dark:bg-gradient-to-r dark:from-purple-500 dark:to-blue-500 p-[1px] shadow-sm' : ''}`}>
                <button type="button" onClick={() => setFocus(value)} className={`h-full w-full rounded-[7px] p-3 text-left transition-colors ${active ? 'bg-card dark:bg-[#18182b] text-foreground dark:text-white' : 'border border-border hover:bg-muted/50'}`}>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                </button>
              </div>
            )
          })}
        </div>

        {focus === 'skill' && (
          <label className="mt-5 block text-sm font-medium">Skill
            <select value={targetSkillId} onChange={(event) => setTargetSkillId(event.target.value)} className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5">
              <option value="">Choose a skill</option>
              {options?.skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
            </select>
          </label>
        )}
        {focus === 'company' && (
          <label className="mt-5 block text-sm font-medium">Company
            <select value={targetCompanyId} onChange={(event) => setTargetCompanyId(event.target.value)} className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5">
              <option value="">Choose a company</option>
              {options?.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
          </label>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Questions
            <select value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))} className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5">
              <option value={2}>2 questions</option>
              <option value={3}>3 questions</option>
            </select>
          </label>
          <label className="text-sm font-medium">Duration
            <select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5">
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
            </select>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
          <button type="button" onClick={submit} disabled={creating || missingTarget} className={`${primaryActionClass} inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium`}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Create assessment
          </button>
        </div>
      </div>
    </div>
  )
}

function AssessmentList({
  assessments,
  options,
  onCreate,
  creating,
}: {
  assessments: AssessmentSession[]
  options?: LearningPathOptions
  onCreate: (input: CreateAssessmentInput) => void
  creating: boolean
}) {
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  
  const tabs = ['All', 'Scheduled', 'Completed', 'Needs Practice', 'Abandoned'] as const
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('All')

  const filteredAssessments = assessments.filter((a) => {
    if (activeTab === 'All') return true
    if (activeTab === 'Scheduled') return a.status === 'scheduled'
    if (activeTab === 'Completed') return a.status === 'completed'
    if (activeTab === 'Needs Practice') return a.status === 'needs_practice'
    if (activeTab === 'Abandoned') return a.status === 'abandoned'
    return true
  })

  const totalCounts: Record<string, number> = {}
  assessments.forEach((a) => {
    const t = assessmentFocus(a)
    totalCounts[t] = (totalCounts[t] || 0) + 1
  })

  const currentCounts: Record<string, number> = {}
  const titleMap = new Map<string, string>()
  
  // Assessments are generally newest first. Reverse to number chronologically.
  ;[...assessments].reverse().forEach((a) => {
    const t = assessmentFocus(a)
    currentCounts[t] = (currentCounts[t] || 0) + 1
    if (totalCounts[t] > 1) {
      titleMap.set(a.id, `${t} Practice #${currentCounts[t]}`)
    } else {
      titleMap.set(a.id, t)
    }
  })

  const counts = {
    All: assessments.length,
    Scheduled: assessments.filter((a) => a.status === 'scheduled').length,
    Completed: assessments.filter((a) => a.status === 'completed').length,
    'Needs Practice': assessments.filter((a) => a.status === 'needs_practice').length,
    Abandoned: assessments.filter((a) => a.status === 'abandoned').length,
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col gap-5 rounded-xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck className="h-4 w-4" /> Objective DSA readiness</div>
          <h1 className="text-3xl font-bold tracking-tight">Timed DSA Assessments</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Choose Mixed DSA, a specific skill, or a company-focused assessment. Judge results determine the score.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className={`${primaryActionClass} inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium`}><Play className="h-4 w-4" /> New assessment</button>
      </header>

      {assessments.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Target className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">No assessments yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Start with Mixed DSA or choose a focus.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => {
              const active = activeTab === tab;
              return (
                <div key={tab} className={`rounded-lg transition-all ${active ? 'bg-black dark:bg-gradient-to-r dark:from-purple-500 dark:to-blue-500 p-[1px] shadow-sm' : ''}`}>
                  <button
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center justify-center rounded-[7px] px-3 py-1.5 text-sm font-medium transition-colors ${active ? 'bg-card dark:bg-[#18182b] text-foreground dark:text-white' : 'border border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                  >
                    {tab} ({counts[tab]})
                  </button>
                </div>
              )
            })}
          </div>

          {filteredAssessments.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <Target className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-semibold">No {activeTab === 'All' ? '' : activeTab} assessments yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">Start a new one to practice your skills.</p>
              <button onClick={() => setShowCreate(true)} className={`${primaryActionClass} mt-6 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium`}><Play className="h-4 w-4" /> Create assessment</button>
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
              {filteredAssessments.map((assessment) => {
                const isScored = assessment.status === 'completed' || assessment.status === 'needs_practice'
                const displayScore = isScored ? `${assessment.overallScore ?? 0}% score` : 'No score yet'

                let metaText = 'General practice'
                if (assessment.status === 'scheduled') metaText = 'Scheduled'
                else if (assessment.completedAt || assessment.startedAt) metaText = `Last attempted: ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date((assessment.completedAt || assessment.startedAt)!))}`
                else if (assessment.targetCompany) metaText = 'Company focused'

                let badgeClass = 'bg-muted/50 text-muted-foreground'
                if (assessment.status === 'completed') badgeClass = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                if (assessment.status === 'needs_practice') badgeClass = 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                if (assessment.status === 'scheduled') badgeClass = 'bg-slate-500/10 text-slate-700 dark:text-slate-400'
                if (assessment.status === 'abandoned') badgeClass = 'bg-red-500/10 text-red-700 dark:text-red-400'

                return (
                  <button key={assessment.id} onClick={() => navigate(`/assessments/${assessment.id}`)} className="flex flex-col justify-between rounded-xl border bg-card p-5 text-left transition hover:border-primary/50 hover:shadow-sm">
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <p className="font-semibold">{titleMap.get(assessment.id) || assessmentFocus(assessment)}</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${badgeClass}`}>{statusLabel(assessment.status)}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{assessment.questionCount} questions · {assessment.durationMinutes} minutes</p>
                      <p className="mt-1.5 text-xs text-muted-foreground/80">{metaText}</p>
                    </div>
                    <div className="mt-5 flex items-center justify-between text-sm">
                      <span className={isScored ? 'font-medium' : 'text-muted-foreground'}>{displayScore}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {showCreate && <CreateAssessmentDialog options={options} creating={creating} onClose={() => setShowCreate(false)} onCreate={onCreate} />}
    </div>
  )
}

function AssessmentResults({ assessment }: { assessment: AssessmentSession }) {
  const navigate = useNavigate()
  const passed = assessment.status === 'completed'
  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-xl border bg-card p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className={`flex items-center gap-2 font-medium ${passed ? 'text-emerald-600' : 'text-amber-600'}`}>
              {passed ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              {passed ? 'Assessment passed' : assessment.status === 'abandoned' ? 'Assessment abandoned' : 'More practice recommended'}
            </div>
            <h1 className="mt-2 text-3xl font-bold">{assessment.overallScore ?? 0}%</h1>
            <p className="mt-1 text-muted-foreground">Passing threshold: {assessment.passingThreshold}%</p>
          </div>
          <button onClick={() => navigate('/assessments')} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">All assessments</button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-emerald-500/10 p-4"><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Strong skills</p><p className="mt-1 text-sm">{assessment.result?.strengths.length ? assessment.result.strengths.join(', ') : 'Keep building consistency'}</p></div>
          <div className="rounded-lg bg-amber-500/10 p-4"><p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Skills to reinforce</p><p className="mt-1 text-sm">{assessment.result?.weakSkills.length ? assessment.result.weakSkills.join(', ') : 'No major weakness detected'}</p></div>
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Question report</h2>
        {assessment.questions.map((selected) => (
          <article key={selected.id} className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Question {selected.orderIndex} · {selected.question.difficulty}</p><h3 className="mt-1 font-semibold">{selected.question.title}</h3><p className="mt-1 text-sm text-muted-foreground">{selected.question.skill.name} · {formatClock(selected.timeSpentSeconds)} spent</p></div>
              <div className="text-right"><p className={`font-semibold ${selected.verdict === 'accepted' ? 'text-emerald-600' : 'text-amber-600'}`}>{statusLabel(selected.verdict || selected.status)}</p><p className="text-sm text-muted-foreground">{selected.testCasesPassed}/{selected.testCasesTotal} tests · {Math.round(selected.weightedScore)} points</p></div>
            </div>
            {selected.submittedCode ? <details className="mt-4 rounded-lg border bg-muted/20"><summary className="cursor-pointer px-4 py-3 text-sm font-medium">Submitted code ({selected.language})</summary><pre className="max-h-80 overflow-auto border-t p-4 text-xs"><code>{selected.submittedCode}</code></pre></details> : <p className="mt-4 rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">No code submitted.</p>}
          </article>
        ))}
      </section>
    </div>
  )
}

function AssessmentWorkspace({ assessment }: { assessment: AssessmentSession }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const appTheme = useThemeStore((state) => state.theme)
  const initialLanguage = LANGUAGES.some((item) => item.id === user?.preferredLanguage) ? user!.preferredLanguage : 'javascript'
  const [language, setLanguage] = useState(initialLanguage)
  const [vimMode, setVimMode] = useState(() => localStorage.getItem('editor-vim-mode') === 'true')
  const [codeMap, setCodeMap] = useState<Record<string, string>>({})
  const [customInput, setCustomInput] = useState('')
  const [runResult, setRunResult] = useState<any>(null)
  const [remaining, setRemaining] = useState(() => assessment.expiresAt ? Math.max(0, Math.ceil((new Date(assessment.expiresAt).getTime() - Date.now()) / 1000)) : assessment.durationMinutes * 60)
  const [splitPercent, setSplitPercent] = useState(() => Math.min(65, Math.max(35, Number(localStorage.getItem('practice-split-percent')) || 45)))
  const [verticalSplitPercent, setVerticalSplitPercent] = useState(() => Math.min(80, Math.max(25, Number(localStorage.getItem('practice-vertical-split-percent')) || 55)))
  const initializedQuestion = useRef<string | null>(null)
  const completionRequested = useRef(false)
  const splitContainerRef = useRef<HTMLDivElement | null>(null)
  const verticalContainerRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<any>(null)
  const vimAdapterRef = useRef<any>(null)
  const runActionRef = useRef<() => void>(() => {})
  const submitActionRef = useRef<() => void>(() => {})
  const firstActive = assessment.questions.find((q) => q.status === 'in_progress' || q.status === 'pending') || assessment.questions[0]
  const [viewedQuestionIdState, setViewedQuestionIdState] = useState(firstActive.id)
  
  const viewedQuestion = assessment.questions.find((question) => question.id === viewedQuestionIdState) || firstActive
  const isViewingCurrent = viewedQuestion.status === 'in_progress' || viewedQuestion.status === 'pending'
  const displayedLanguage = isViewingCurrent ? language : viewedQuestion.language || language
  
  const currentCode = codeMap[viewedQuestion.id] ?? starterCode(viewedQuestion.question, language)
  const displayedCode = isViewingCurrent ? currentCode : viewedQuestion.submittedCode || ''
  
  // Synchronously reset code when the viewed question changes
  if (initializedQuestion.current !== viewedQuestion.id) {
    initializedQuestion.current = viewedQuestion.id;
    setCustomInput(viewedQuestion.question.examples?.[0]?.input || '');
    setRunResult(null);
  }
  const editorTheme = appTheme === 'dark' || (appTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'custom-dark' : 'light'

  useEffect(() => {
    if (editorRef.current && typeof displayedCode === 'string') {
      if (editorRef.current.getValue() !== displayedCode) {
        editorRef.current.setValue(displayedCode)
      }
    }
  }, [displayedCode])

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['assessment', assessment.id] })
    queryClient.invalidateQueries({ queryKey: ['assessments'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['learning-paths'] })
  }, [assessment.id, queryClient])

  const completeMutation = useMutation({ mutationFn: () => assessmentApi.complete(assessment.id), onSuccess: refresh, onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Could not finish assessment') })
  const runMutation = useMutation({
    mutationFn: () => assessmentApi.run(assessment.id, viewedQuestion.id, { code: currentCode, language, input: customInput }),
    onMutate: () => setRunResult(null),
    onSuccess: (result) => {
      setRunResult(result)
      toast.success(`Run finished: ${statusLabel(result.status)}`)
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Run failed'),
  })
  const submitMutation = useMutation({
    mutationFn: () => assessmentApi.submit(assessment.id, viewedQuestion.id, { code: currentCode, language, submissionKey: crypto.randomUUID() }),
    onSuccess: (result) => { toast.success(`Submitted: ${statusLabel(result.verdict)}`); setRunResult(null); refresh() },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Submission failed'),
  })
  const skipMutation = useMutation({ mutationFn: () => assessmentApi.skip(assessment.id, viewedQuestion.id), onSuccess: () => { toast('Question skipped'); setRunResult(null); refresh() }, onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Could not skip question') })

  const handleRun = useCallback(() => {
    if (!isViewingCurrent || !currentCode.trim() || runMutation.isPending) return
    runMutation.mutate()
  }, [currentCode, isViewingCurrent, runMutation])
  const handleSubmit = useCallback(() => {
    if (!isViewingCurrent || !currentCode.trim() || submitMutation.isPending) return
    submitMutation.mutate()
  }, [currentCode, isViewingCurrent, submitMutation])

  useEffect(() => {
    runActionRef.current = handleRun
    submitActionRef.current = handleSubmit
  }, [handleRun, handleSubmit])

  // Code initialization and viewed question ID derivation is now handled during render

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!assessment.expiresAt) return
      const next = Math.max(0, Math.ceil((new Date(assessment.expiresAt).getTime() - Date.now()) / 1000))
      setRemaining(next)
      if (next === 0 && !completionRequested.current) { completionRequested.current = true; completeMutation.mutate() }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [assessment.expiresAt, completeMutation])

  useEffect(() => {
    localStorage.setItem('practice-split-percent', String(splitPercent))
    localStorage.setItem('practice-vertical-split-percent', String(verticalSplitPercent))
  }, [splitPercent, verticalSplitPercent])

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (event.buttons === 0) return
      if (splitContainerRef.current?.dataset.dragging) {
        const bounds = splitContainerRef.current.getBoundingClientRect()
        setSplitPercent(Math.min(65, Math.max(35, ((event.clientX - bounds.left) / bounds.width) * 100)))
      }
      if (verticalContainerRef.current?.dataset.dragging) {
        const bounds = verticalContainerRef.current.getBoundingClientRect()
        setVerticalSplitPercent(Math.min(80, Math.max(25, ((event.clientY - bounds.top) / bounds.height) * 100)))
      }
    }
    const stop = () => {
      if (splitContainerRef.current) delete splitContainerRef.current.dataset.dragging
      if (verticalContainerRef.current) delete verticalContainerRef.current.dataset.dragging
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); stop() }
  }, [])

  useEffect(() => {
    localStorage.setItem('editor-vim-mode', String(vimMode))
    if (!editorRef.current) return
    if (vimMode) vimAdapterRef.current = initVimMode(editorRef.current, document.getElementById('assessment-vim-status'))
    else if (vimAdapterRef.current) { vimAdapterRef.current.dispose(); vimAdapterRef.current = null }
    return () => { if (vimAdapterRef.current) { vimAdapterRef.current.dispose(); vimAdapterRef.current = null } }
  }, [vimMode])

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey
      if (modifier && event.key === 'Enter') { event.preventDefault(); handleSubmit() }
      else if (modifier && (event.key === "'" || event.code === 'Quote')) { event.preventDefault(); handleRun() }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [handleRun, handleSubmit])

  const changeLanguage = (next: string) => {
    if (currentCode.trim() && !window.confirm('Changing language replaces the current code. Continue?')) return
    setLanguage(next)
    if (isViewingCurrent) setCodeMap((prev) => ({ ...prev, [viewedQuestion.id]: starterCode(viewedQuestion.question, next) }))
    setRunResult(null)
  }

  if (!viewedQuestion) return <LoadingState message="Preparing assessment results..." />
  const busy = runMutation.isPending || submitMutation.isPending || skipMutation.isPending
  const viewQuestion = (question: AssessmentQuestion) => {
    setViewedQuestionIdState(question.id)
    setCustomInput(question.question.examples?.[0]?.input || '')
    setRunResult(null)
  }

  return (
    <div className="space-y-2 -mt-2 sm:-mt-3">
      <div className="sticky top-0 z-30 -mx-4 border-b bg-background/95 px-4 pt-1 pb-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <button type="button" onClick={() => navigate('/assessments')} className="mb-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /> Assessments</button>
            <div className="flex items-center gap-3">
              {!isViewingCurrent && <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-300">Read-only review</span>}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:gap-8">
            <div className={`flex items-center gap-2 text-sm ${remaining < 300 ? 'text-red-500' : 'text-muted-foreground'}`}><Clock3 className="h-4 w-4" /><span className="font-mono text-base font-semibold tabular-nums">{formatClock(remaining)}</span></div>
            {isViewingCurrent ? <div className="grid grid-cols-3 gap-2 sm:flex">
              <button type="button" onClick={handleRun} disabled={busy || !currentCode.trim()} className="flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50">{runMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run</button>
              <button type="button" onClick={() => skipMutation.mutate()} disabled={busy} className="flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"><SkipForward className="h-4 w-4" /> Skip</button>
              <button type="button" onClick={handleSubmit} disabled={busy || !currentCode.trim()} className={`${primaryActionClass} flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium`}>{submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit</button>
            </div> : <button type="button" onClick={() => viewQuestion(firstActive)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 border border-blue-600"><ArrowRight className="h-4 w-4" /> Return to unanswered question</button>}
          </div>
        </div>
      </div>

      <nav className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Assessment questions">
        {assessment.questions.map((question) => {
          const selected = question.id === viewedQuestion.id
          const active = question.status === 'in_progress' || question.status === 'pending'
          return (
            <button
              key={question.id}
              type="button"
              onClick={() => viewQuestion(question)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium transition ${selected ? 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-300' : active ? 'border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10' : 'hover:bg-muted/60 opacity-60'}`}
            >
              <span>Q{question.orderIndex}</span>
              <span className="text-[10px] uppercase tracking-wider opacity-70">{active ? 'Active' : question.status.replace(/_/g, ' ')}</span>
            </button>
          )
        })}
      </nav>

      <div ref={splitContainerRef} className="grid grid-cols-1 gap-4 lg:grid-cols-[var(--assessment-grid)] lg:h-[calc(100vh-150px)]" style={{ '--assessment-grid': `${splitPercent}% 4px minmax(0, 1fr)` } as any}>
        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card">
          <div className="flex-none border-b px-5 py-3">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-lg font-bold sm:text-xl">{viewedQuestion.question.title}</h1>
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Question {viewedQuestion.orderIndex} of {assessment.questionCount}</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-5 sm:p-8">
            <div className="space-y-6">
              <div className="prose dark:prose-invert max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: viewedQuestion.question.problemStatement || viewedQuestion.question.description || '' }} />
              {viewedQuestion.question.examples?.length ? (
                <div><h3 className="mb-2 font-semibold">Examples:</h3><div className="space-y-4">{viewedQuestion.question.examples.map((example, index) => <div key={index} className="rounded-lg border bg-muted/20 p-4 text-sm"><p className="font-medium">Example {index + 1}</p><pre className="mt-3 overflow-auto rounded-md bg-muted/50 p-4 text-xs leading-relaxed">{`Input:\n${example.input}\n\nOutput:\n${example.expectedOutput}`}</pre>{isViewingCurrent && <button type="button" onClick={() => setCustomInput(example.input)} className="mt-3 text-xs font-medium text-blue-500 hover:text-blue-600 hover:underline">Use this input for Run</button>}</div>)}</div></div>
              ) : <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No public example is available for this question. Enter custom stdin before running.</div>}
              {viewedQuestion.question.constraints?.length ? <div><h3 className="mb-2 font-semibold">Constraints:</h3><ul className="list-inside list-disc space-y-1 text-muted-foreground">{viewedQuestion.question.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}</ul></div> : null}
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-200">Hints, solutions, AI review, and hidden test inputs are unavailable during assessment.</div>
            </div>
          </div>
        </div>

        <button type="button" className="hidden cursor-col-resize items-center justify-center lg:flex" aria-label="Resize problem and editor panels" onPointerDown={(event) => { event.preventDefault(); if (splitContainerRef.current) splitContainerRef.current.dataset.dragging = 'true'; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none' }}><div className="h-24 w-1 rounded-full bg-border hover:bg-primary" /></button>

        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card">
          <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <select value={displayedLanguage} disabled={!isViewingCurrent} onChange={(event) => changeLanguage(event.target.value)} className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm disabled:opacity-60">{LANGUAGES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={vimMode} disabled={!isViewingCurrent} onChange={(event) => setVimMode(event.target.checked)} className="rounded border-input" /> Vim Mode</label>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Keyboard className="h-3.5 w-3.5" /><span>Ctrl/⌘+' Run · Ctrl/⌘+Enter Submit</span></div>
          </div>
          <div ref={verticalContainerRef} className="flex min-h-0 flex-1 flex-col" style={{ display: 'grid', gridTemplateRows: `${verticalSplitPercent}% 4px minmax(0, 1fr)` }}>
            <div className="min-h-0">
              <Editor path={viewedQuestion.id} height="100%" language={displayedLanguage} value={displayedCode} onChange={(value) => { if (isViewingCurrent) setCodeMap((prev) => ({ ...prev, [viewedQuestion.id]: value || '' })) }} theme={editorTheme} beforeMount={(monaco) => monaco.editor.defineTheme('custom-dark', { base: 'vs-dark', inherit: true, rules: [], colors: { 'editor.background': '#0B1120', 'editorGutter.background': '#111827' } })} onMount={(editor, monaco) => { if (vimAdapterRef.current) { vimAdapterRef.current.dispose(); vimAdapterRef.current = null; } editorRef.current = editor; editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => submitActionRef.current()); const quote = (monaco.KeyCode as any).Quote ?? (monaco.KeyCode as any).US_QUOTE; if (quote) editor.addCommand(monaco.KeyMod.CtrlCmd | quote, () => runActionRef.current()); if (vimMode) vimAdapterRef.current = initVimMode(editor, document.getElementById('assessment-vim-status')) }} options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on', roundedSelection: false, scrollBeyondLastLine: false, readOnly: !isViewingCurrent, automaticLayout: true }} />
            </div>
            <button type="button" className="flex h-1 cursor-row-resize items-center justify-center hover:bg-primary/20" aria-label="Resize editor and console" onPointerDown={(event) => { event.preventDefault(); if (verticalContainerRef.current) verticalContainerRef.current.dataset.dragging = 'true'; document.body.style.cursor = 'row-resize'; document.body.style.userSelect = 'none' }}><span className="h-0.5 w-8 rounded-full bg-border" /></button>
            <div className="flex min-h-0 flex-col border-t bg-background">
              <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
                <div className="flex min-h-0 flex-col border-b md:border-b-0 md:border-r"><div className="flex h-10 flex-none items-center justify-between border-b px-3"><span className="text-sm font-medium">Custom Input</span><span className="text-xs text-muted-foreground">{isViewingCurrent ? 'Public example or custom stdin' : 'Read-only review'}</span></div><textarea value={customInput} disabled={!isViewingCurrent} onChange={(event) => setCustomInput(event.target.value)} className="min-h-0 flex-1 resize-none bg-background p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-inset focus:ring-ring disabled:opacity-60" spellCheck={false} aria-label="Custom input" /></div>
                <div className="flex min-h-0 flex-col"><div className="flex h-10 flex-none items-center justify-between gap-2 border-b px-3"><div className="flex items-center gap-2 text-sm font-medium"><Terminal className="h-4 w-4" /> Run Result</div>{runResult && <span className={`rounded-full border px-2 py-0.5 text-xs ${statusTone(runResult.status)}`}>{statusLabel(runResult.status)} · {runResult.executionTime} ms</span>}</div><pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap bg-background p-3 font-mono text-sm text-foreground" aria-live="polite">{runMutation.isPending ? 'Running code…' : consoleText(runResult)}</pre></div>
              </div>
              <div className="min-h-[36px] flex-none border-t p-2"><div id="assessment-vim-status" className="ml-2 font-mono text-xs text-muted-foreground" /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AssessmentPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const pathItemId = searchParams.get('pathItemId') || undefined
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const createRequested = useRef(false)
  const listQuery = useQuery({ queryKey: ['assessments'], queryFn: assessmentApi.getAll, enabled: !id && !pathItemId })
  const optionsQuery = useQuery({ queryKey: ['learning-path-options'], queryFn: learningPathApi.getOptions, enabled: !id && !pathItemId })
  const assessmentQuery = useQuery({ queryKey: ['assessment', id], queryFn: () => assessmentApi.getById(id!), enabled: Boolean(id), refetchInterval: 15_000 })
  const createMutation = useMutation({
    mutationFn: (input: CreateAssessmentInput = {}) => assessmentApi.create(input),
    onSuccess: (assessment) => { queryClient.invalidateQueries({ queryKey: ['assessments'] }); navigate(`/assessments/${assessment.id}`, { replace: Boolean(pathItemId) }) },
    onError: (error: any) => { createRequested.current = false; toast.error(error.response?.data?.error?.message || 'Could not create assessment') },
  })
  const startMutation = useMutation({ mutationFn: () => assessmentApi.start(id!), onSuccess: (assessment) => queryClient.setQueryData(['assessment', id], assessment), onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Could not start assessment') })

  useEffect(() => {
    if (!id && pathItemId && !createRequested.current) { createRequested.current = true; createMutation.mutate({ learningPathItemId: pathItemId }) }
  }, [id, pathItemId, createMutation])

  if (!id) {
    if (pathItemId || listQuery.isLoading) return <LoadingState message="Preparing your DSA assessment..." />
    if (listQuery.isError) return <ErrorState title="Unable to load assessments" action={<button onClick={() => listQuery.refetch()} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">Retry</button>} />
    return <AssessmentList assessments={listQuery.data || []} options={optionsQuery.data} onCreate={(input) => createMutation.mutate(input)} creating={createMutation.isPending} />
  }

  if (assessmentQuery.isLoading) return <LoadingState message="Loading assessment..." />
  if (assessmentQuery.isError || !assessmentQuery.data) return <ErrorState title="Unable to load assessment" action={<button onClick={() => assessmentQuery.refetch()} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">Retry</button>} />
  const assessment = assessmentQuery.data
  if (assessment.status === 'scheduled') return <div className="mx-auto max-w-2xl rounded-xl border bg-card p-8 text-center"><ShieldCheck className="mx-auto h-12 w-12 text-primary" /><h1 className="mt-4 text-3xl font-bold">DSA Assessment</h1><p className="mt-3 text-muted-foreground">{assessment.questionCount} sequential coding questions in {assessment.durationMinutes} minutes. The server timer starts when you begin.</p><div className="mx-auto mt-6 grid max-w-lg gap-3 text-left sm:grid-cols-3"><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Focus</p><p className="font-medium">{assessmentFocus(assessment)}</p></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Questions</p><p className="font-medium">{assessment.questionCount}</p></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Pass mark</p><p className="font-medium">{assessment.passingThreshold}%</p></div></div><button onClick={() => startMutation.mutate()} disabled={startMutation.isPending} className="mt-7 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:opacity-60">{startMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />} Start timed assessment</button></div>
  if (assessment.status === 'in_progress') return <AssessmentWorkspace assessment={assessment} />
  return <AssessmentResults assessment={assessment} />
}
