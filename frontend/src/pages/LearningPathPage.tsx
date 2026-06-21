import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Clock3,
  Map as MapIcon,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react'
import { learningPathApi } from '../services/api'
import { LearningPath, LearningPathInput, LearningPathPreview } from '../types'
import { EmptyState, ErrorState, LoadingState } from '../components/StateFeedback'

type FormState = {
  name: string
  description: string
  goalType: LearningPathInput['goalType']
  targetSkillId: string
  targetCompanyId: string
  weeklyStudyMinutes: number
  targetCompletionDate: string
}

const initialForm: FormState = {
  name: '',
  description: '',
  goalType: 'general',
  targetSkillId: '',
  targetCompanyId: '',
  weeklyStudyMinutes: 300,
  targetCompletionDate: '',
}

const goalChoices = [
  { id: 'general' as const, label: 'Improve weak areas', icon: Sparkles, help: 'Use your recent performance' },
  { id: 'skill' as const, label: 'Master a skill', icon: Target, help: 'Focus on one technical skill' },
  { id: 'company' as const, label: 'Target a company', icon: Briefcase, help: 'Prioritize company-relevant questions' },
  { id: 'interview' as const, label: 'Interview readiness', icon: CalendarDays, help: 'Work toward an interview date' },
]

function toPayload(form: FormState): LearningPathInput {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    goalType: form.goalType,
    targetSkillId: form.targetSkillId || undefined,
    targetCompanyId: form.targetCompanyId || undefined,
    weeklyStudyMinutes: form.weeklyStudyMinutes,
    targetCompletionDate: form.targetCompletionDate
      ? new Date(`${form.targetCompletionDate}T23:59:59`).toISOString()
      : undefined,
  }
}

function formatDate(value?: string) {
  if (!value) return 'Flexible'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function PathStatus({ status, isCurrent }: { status: LearningPath['status'], isCurrent?: boolean }) {
  const displayStatus = isCurrent ? 'current' : status
  const tone = displayStatus === 'completed'
    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
    : displayStatus === 'current'
    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
    : displayStatus === 'active'
    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
    : 'bg-muted text-muted-foreground'
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${tone}`}>{displayStatus}</span>
}

export function LearningPathPage() {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [form, setForm] = useState<FormState>(initialForm)
  const [preview, setPreview] = useState<LearningPathPreview | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const pathsQuery = useQuery({
    queryKey: ['learning-paths'],
    queryFn: learningPathApi.getAll,
  })
  const optionsQuery = useQuery({
    queryKey: ['learning-path-options'],
    queryFn: learningPathApi.getOptions,
    enabled: showCreateModal,
  })

  const refreshPaths = () => queryClient.invalidateQueries({ queryKey: ['learning-paths'] })
  const previewMutation = useMutation({
    mutationFn: () => learningPathApi.preview(toPayload(form)),
    onSuccess: setPreview,
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Could not generate this plan'),
  })
  const createMutation = useMutation({
    mutationFn: () => learningPathApi.create(toPayload(form)),
    onSuccess: (path) => {
      toast.success('Learning path created')
      setShowCreateModal(false)
      setForm(initialForm)
      setPreview(null)
      refreshPaths()
      queryClient.setQueryData(['learning-path', path.id], path)
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to create learning path'),
  })
  const pauseMutation = useMutation({ mutationFn: learningPathApi.pause, onSuccess: refreshPaths })
  const resumeMutation = useMutation({ mutationFn: learningPathApi.resume, onSuccess: refreshPaths })
  const rebalanceMutation = useMutation({
    mutationFn: async (pathId: string) => {
      const preview = await learningPathApi.previewRebalance(pathId)
      const summary = `Keep ${preview.retainedCount} pending tasks, add ${preview.added.length}, and remove ${preview.removed.length}. Apply these changes?`
      if (!window.confirm(summary)) return null
      return learningPathApi.rebalance(pathId)
    },
    onSuccess: (path) => {
      if (!path) return
      toast.success('Path updated from your latest performance')
      refreshPaths()
    },
  })
  const deleteMutation = useMutation({
    mutationFn: learningPathApi.delete,
    onSuccess: () => { toast.success('Learning path deleted'); refreshPaths() },
  })

  const paths = useMemo(() => pathsQuery.data || [], [pathsQuery.data])
  const activePath = paths.find((path) => path.status === 'active')
  const otherPaths = useMemo(() => paths.filter((path) => path.id !== activePath?.id), [paths, activePath?.id])
  const formValid = form.name.trim().length >= 2
    && (form.goalType !== 'skill' || Boolean(form.targetSkillId))
    && (form.goalType !== 'company' || Boolean(form.targetCompanyId))

  const closeModal = () => {
    if (previewMutation.isPending || createMutation.isPending) return
    setShowCreateModal(false)
    setPreview(null)
  }

  const pathCard = (path: LearningPath, featured = false) => {
    const nextItem = path.pathItems?.[0]
    return (
      <article key={path.id} className={`group relative rounded-xl border bg-card ${featured ? 'p-6 shadow-sm' : 'p-5'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <MapIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={`${featured ? 'text-xl' : 'text-base'} font-semibold`}>{path.name}</h2>
                <PathStatus status={path.status} isCurrent={featured} />
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{path.description}</p>
            </div>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenuId(openMenuId === path.id ? null : path.id)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`Actions for ${path.name}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {openMenuId === path.id && (
              <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border bg-popover p-1 shadow-lg">
                {path.status === 'active' && (
                  <button onClick={() => pauseMutation.mutate(path.id)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
                    <Pause className="h-4 w-4" /> Pause
                  </button>
                )}
                {path.status === 'paused' && (
                  <button onClick={() => resumeMutation.mutate(path.id)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
                    <Play className="h-4 w-4" /> Resume
                  </button>
                )}
                {path.status === 'active' && (
                  <button onClick={() => rebalanceMutation.mutate(path.id)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
                    <RefreshCw className="h-4 w-4" /> Rebalance
                  </button>
                )}
                <button
                  onClick={() => window.confirm(`Delete “${path.name}”?`) && deleteMutation.mutate(path.id)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{path.completedItems} of {path.totalItems} tasks</span>
            <span className="font-semibold">{Math.round(path.progressPercentage)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-black dark:bg-gradient-to-r dark:from-indigo-500/80 dark:to-purple-500/80 transition-[width]" style={{ width: `${path.progressPercentage}%` }} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{path.weeklyStudyMinutes} min/week</span>
          <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Target {formatDate(path.targetCompletionDate)}</span>
          {(path.targetSkill || path.targetCompany) && (
            <span className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5" />{path.targetSkill?.name || path.targetCompany?.name}</span>
          )}
        </div>

        {featured && nextItem && (
          <div className="mt-4 rounded-lg border bg-muted/30 py-3 px-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Up next</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium leading-none">{nextItem.title || nextItem.question?.title}</p>
                  <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${nextItem.question?.difficulty === 'Hard' ? 'text-red-500 bg-red-500/10' : nextItem.question?.difficulty === 'Medium' ? 'text-yellow-500 bg-yellow-500/10' : 'text-green-500 bg-green-500/10'}`}>
                    {nextItem.question?.difficulty || 'Medium'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span>{nextItem.phase || 'Practice'}</span>
                  <span>·</span>
                  <span>{nextItem.estimatedMinutes || 30} min</span>
                  <span>·</span>
                  <span className="text-indigo-500/90 dark:text-indigo-400/90">Due today</span>
                </p>
              </div>
              <Link to={`/learning-path/${path.id}`} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-black hover:bg-black/90 dark:bg-none dark:bg-gradient-to-r dark:from-indigo-600/80 dark:to-purple-600/80 dark:hover:from-indigo-600 dark:hover:to-purple-600 text-white px-3 py-1.5 text-xs font-medium transition-all border border-transparent shadow-sm shrink-0">
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}

        {!featured && (
          <div className="mt-5 pt-4 border-t border-border/50">
            {nextItem ? (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Up next</p>
                    <p className="text-sm font-medium line-clamp-1">{nextItem.title || nextItem.question?.title || 'Next module'}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">{nextItem.estimatedMinutes || 30} min</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-medium">{nextItem.phase || 'Practice'}</span>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 px-1.5 py-0.5 rounded-md font-medium">Core Concepts</span>
                  </div>
                  <Link to={`/learning-path/${path.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all duration-200 opacity-0 group-hover:opacity-100 focus-visible:opacity-100">
                    Continue <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Link to={`/learning-path/${path.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline text-indigo-600 dark:text-indigo-400 transition-all duration-200 opacity-0 group-hover:opacity-100 focus-visible:opacity-100">
                  View path <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        )}
      </article>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Adaptive preparation</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Learning Paths</h1>
          <p className="mt-1 text-muted-foreground">A plan that changes with what you solve, miss, and review.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-black hover:bg-black/90 dark:bg-none dark:bg-gradient-to-r dark:from-indigo-600/80 dark:to-purple-600/80 dark:hover:from-indigo-600 dark:hover:to-purple-600 text-white transition-all border border-transparent shadow-sm px-4 py-2.5 text-sm font-medium">
          <Plus className="h-4 w-4" /> Create path
        </button>
      </header>

      {pathsQuery.isLoading ? <LoadingState message="Loading learning paths..." />
        : pathsQuery.isError ? <ErrorState title="Unable to load learning paths" action={<button onClick={() => pathsQuery.refetch()} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Retry</button>} />
        : paths.length === 0 ? <EmptyState title="Build your first focused plan" message="Choose a goal and SIPE will turn your performance into a paced sequence of practice, reviews, and checkpoints." icon={<MapIcon className="h-12 w-12 text-muted-foreground" />} action={<button onClick={() => setShowCreateModal(true)} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Create learning path</button>} />
        : (
          <>
            {activePath && <section><h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Current path</h2>{pathCard(activePath, true)}</section>}
            <section>
              <h2 className="mb-3 text-lg font-semibold">Other paths</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {otherPaths.map((path) => pathCard(path))}
                <div onClick={() => setShowCreateModal(true)} className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/30 p-8 text-center hover:bg-muted/30 hover:border-primary/40 transition-all cursor-pointer min-h-[220px]">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 shadow-sm"><Plus className="h-6 w-6" /></div>
                  <h3 className="text-base font-semibold text-foreground">Create a new path</h3>
                  <p className="mt-1 text-sm text-muted-foreground max-w-[240px]">Target a specific company, master a new skill, or prep for an interview.</p>
                </div>
              </div>
            </section>
          </>
        )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="create-path-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl border bg-card shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-6 py-4">
              <div><h2 id="create-path-title" className="text-xl font-semibold">{preview ? 'Review your path' : 'Create a learning path'}</h2><p className="text-sm text-muted-foreground">{preview ? 'Confirm the pace and first tasks.' : 'Tell SIPE what you are preparing for.'}</p></div>
              <button onClick={closeModal} className="rounded-lg p-2 hover:bg-muted" aria-label="Close dialog"><X className="h-5 w-5" /></button>
            </div>

            {!preview ? (
              <div className="space-y-6 p-6">
                <div>
                  <label className="mb-2 block text-sm font-medium">Goal</label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {goalChoices.map((goal) => <button key={goal.id} type="button" onClick={() => setForm({ ...form, goalType: goal.id })} className={`flex items-start gap-3 rounded-lg border p-3 text-left ${form.goalType === goal.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}><goal.icon className="mt-0.5 h-4 w-4" /><span><span className="block text-sm font-medium">{goal.label}</span><span className="text-xs text-muted-foreground">{goal.help}</span></span></button>)}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2"><label htmlFor="path-name" className="mb-1.5 block text-sm font-medium">Path name</label><input id="path-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Backend interview readiness" className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  {(form.goalType === 'skill' || form.goalType === 'interview') && <div><label className="mb-1.5 block text-sm font-medium">Target skill {form.goalType === 'interview' && <span className="text-muted-foreground">(optional)</span>}</label><select value={form.targetSkillId} onChange={(e) => setForm({ ...form, targetSkillId: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"><option value="">Select a skill</option>{optionsQuery.data?.skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></div>}
                  {(form.goalType === 'company' || form.goalType === 'interview') && <div><label className="mb-1.5 block text-sm font-medium">Target company {form.goalType === 'interview' && <span className="text-muted-foreground">(optional)</span>}</label><select value={form.targetCompanyId} onChange={(e) => setForm({ ...form, targetCompanyId: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"><option value="">Select a company</option>{optionsQuery.data?.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></div>}
                  <div><label className="mb-1.5 block text-sm font-medium">Weekly study time</label><select value={form.weeklyStudyMinutes} onChange={(e) => setForm({ ...form, weeklyStudyMinutes: Number(e.target.value) })} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"><option value={120}>2 hours/week</option><option value={300}>5 hours/week</option><option value={420}>7 hours/week</option><option value={600}>10 hours/week</option></select></div>
                  <div><label className="mb-1.5 block text-sm font-medium">Target date <span className="text-muted-foreground">(optional)</span></label><input type="date" min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} value={form.targetCompletionDate} onChange={(e) => setForm({ ...form, targetCompletionDate: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm" /></div>
                  <div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-medium">Notes <span className="text-muted-foreground">(optional)</span></label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm" placeholder="Anything SIPE should account for?" /></div>
                </div>
              </div>
            ) : (
              <div className="space-y-5 p-6">
                <div className="rounded-lg border bg-muted/30 p-4"><p className="font-medium">{preview.summary}</p><div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground"><span>{preview.items.length} tasks</span><span>{preview.estimatedHours} estimated hours</span><span>Target {formatDate(preview.targetCompletionDate)}</span></div></div>
                <div className="space-y-2">{preview.items.slice(0, 6).map((item, index) => <div key={`${item.title}-${index}`} className="flex items-start gap-3 rounded-lg border p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold">{index + 1}</span><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{item.title}</p><span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{item.phase}</span></div><p className="mt-1 text-xs text-muted-foreground">{item.selectionReason}</p></div></div>)}{preview.items.length > 6 && <p className="text-center text-xs text-muted-foreground">+ {preview.items.length - 6} more scheduled tasks</p>}</div>
              </div>
            )}

            <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-card px-6 py-4">
              {preview && <button onClick={() => setPreview(null)} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Back</button>}
              {!preview ? <button disabled={!formValid || previewMutation.isPending} onClick={() => previewMutation.mutate()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{previewMutation.isPending ? 'Building plan…' : 'Preview plan'}</button>
                : <button disabled={createMutation.isPending} onClick={() => createMutation.mutate()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{createMutation.isPending ? 'Creating…' : 'Create path'}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
