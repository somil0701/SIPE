import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock3,
  ExternalLink,
  Map as MapIcon,
  MessageSquareText,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Target,
} from 'lucide-react'
import { learningPathApi } from '../services/api'
import { LearningPathItem } from '../types'
import { ErrorState, LoadingState } from '../components/StateFeedback'
import { primaryActionClass, progressFillClass } from '../lib/themeStyles'

function formatDate(value?: string) {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function isDue(value?: string) {
  return Boolean(value && new Date(value).getTime() <= Date.now())
}

export function LearningPathDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const pathQuery = useQuery({
    queryKey: ['learning-path', id],
    queryFn: () => learningPathApi.getById(id!),
    enabled: Boolean(id),
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['learning-path', id] })
    queryClient.invalidateQueries({ queryKey: ['learning-paths'] })
  }
  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: LearningPathItem['status'] }) =>
      learningPathApi.updateItem(id!, itemId, status),
    onSuccess: refresh,
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to update task'),
  })
  const pauseMutation = useMutation({ mutationFn: () => learningPathApi.pause(id!), onSuccess: refresh })
  const resumeMutation = useMutation({ mutationFn: () => learningPathApi.resume(id!), onSuccess: refresh })
  const rebalanceMutation = useMutation({
    mutationFn: async () => {
      const preview = await learningPathApi.previewRebalance(id!)
      const summary = `Keep ${preview.retainedCount} pending tasks, add ${preview.added.length}, and remove ${preview.removed.length}. Apply these changes?`
      if (!window.confirm(summary)) return null
      return learningPathApi.rebalance(id!)
    },
    onSuccess: (path) => {
      if (!path) return
      toast.success('Path rebalanced from your latest performance')
      refresh()
    },
  })

  const path = pathQuery.data
  const phases = useMemo(() => {
    const grouped = new Map<string, LearningPathItem[]>()
    for (const item of path?.pathItems || []) {
      const phase = item.phase || 'Practice'
      grouped.set(phase, [...(grouped.get(phase) || []), item])
    }
    return [...grouped.entries()]
  }, [path?.pathItems])
  const nextItem = path?.pathItems.find((item) => item.status === 'in_progress')
    || path?.pathItems.find((item) => item.status === 'pending')

  const startItem = async (item: LearningPathItem) => {
    if (!path || path.status !== 'active') return
    if (item.status === 'pending') {
      try {
        await updateItemMutation.mutateAsync({ itemId: item.id, status: 'in_progress' })
      } catch {
        return
      }
    }
    if (item.itemType === 'milestone') {
      navigate(`/assessments?pathItemId=${encodeURIComponent(item.id)}`)
    } else if (item.question?.slug) {
      navigate(`/practice/${item.question.slug}?pathItemId=${encodeURIComponent(item.id)}`)
    }
  }

  if (pathQuery.isLoading) return <LoadingState message="Loading your learning path..." />
  if (pathQuery.isError) return <ErrorState title="Unable to load this learning path" action={<button onClick={() => pathQuery.refetch()} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Retry</button>} />
  if (!path) return <ErrorState title="Learning path not found" />

  return (
    <div className="space-y-8 pb-12">
      <button onClick={() => navigate('/learning-path')} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to learning paths
      </button>

      <header className="rounded-xl border bg-card p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10"><MapIcon className="h-6 w-6 text-primary" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{path.name}</h1>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize">{path.status}</span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{path.description}</p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{path.weeklyStudyMinutes} min/week</span>
                <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Target {formatDate(path.targetCompletionDate)}</span>
                {(path.targetSkill || path.targetCompany) && <span className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5" />{path.targetSkill?.name || path.targetCompany?.name}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {path.status === 'active' && <button onClick={() => rebalanceMutation.mutate()} disabled={rebalanceMutation.isPending} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${rebalanceMutation.isPending ? 'animate-spin' : ''}`} />Rebalance</button>}
            {path.status === 'active' && <button onClick={() => pauseMutation.mutate()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"><Pause className="h-4 w-4" />Pause</button>}
            {path.status === 'paused' && <button onClick={() => resumeMutation.mutate()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"><Play className="h-4 w-4" />Resume path</button>}
          </div>
        </div>

        <div className="mt-6 border-t pt-5">
          <div className="mb-2 flex items-center justify-between text-sm"><span className="text-muted-foreground">Plan completion</span><span className="font-semibold">{path.completedItems} / {path.totalItems} tasks · {Math.round(path.progressPercentage)}%</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className={`${progressFillClass} h-full rounded-full transition-[width]`} style={{ width: `${path.progressPercentage}%` }} /></div>
          <p className="mt-2 text-xs text-muted-foreground">Completion reflects verified submissions, reviews, and interview checkpoints—not just opened tasks.</p>
        </div>
      </header>

      {nextItem && path.status === 'active' && (
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Continue where you left off</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-lg font-semibold">{nextItem.title || nextItem.question?.title}</h2><p className="mt-1 text-sm text-muted-foreground">{nextItem.phase} · {nextItem.estimatedMinutes || 30} minutes</p></div>
            <button onClick={() => startItem(nextItem)} className={`${primaryActionClass} inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium`}>{nextItem.status === 'in_progress' ? 'Continue' : 'Start task'}<ArrowRight className="h-4 w-4" /></button>
          </div>
        </section>
      )}

      <div className="space-y-8">
        {phases.map(([phase, items], phaseIndex) => (
          <section key={phase} aria-labelledby={`phase-${phaseIndex}`}>
            <div className="mb-3 flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">{phaseIndex + 1}</span><div><h2 id={`phase-${phaseIndex}`} className="font-semibold">{phase}</h2><p className="text-xs text-muted-foreground">{items.filter((item) => item.status === 'completed').length} of {items.length} completed</p></div></div>
            <div className="overflow-hidden rounded-xl border bg-card">
              {items.map((item) => {
                const completed = item.status === 'completed'
                const current = item.id === nextItem?.id
                return (
                  <article key={item.id} className={`border-b p-5 last:border-b-0 ${current ? 'bg-primary/[0.03]' : ''}`}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        {completed ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" /> : item.status === 'in_progress' ? <Play className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" /> : item.status === 'skipped' ? <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />}
                        <div>
                          <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{item.title || item.question?.title}</h3>{item.question?.difficulty && <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium difficulty-${item.question.difficulty}`}>{item.question.difficulty}</span>}</div>
                          <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                          {item.selectionReason && <p className="mt-2 flex max-w-2xl items-start gap-1.5 text-xs text-muted-foreground"><MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0" />{item.selectionReason}</p>}
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground"><span className="capitalize">{item.itemType}</span><span>{item.estimatedMinutes || 30} min</span><span className={isDue(item.scheduledDate) && !completed ? 'text-orange-500' : ''}>{isDue(item.scheduledDate) && !completed ? 'Due ' : ''}{formatDate(item.scheduledDate)}</span>{item.attempt && <span>Verified by accepted submission</span>}</div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 pl-8 sm:pl-0">
                        {!completed && item.status !== 'skipped' && path.status === 'active' && <button onClick={() => startItem(item)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${current ? primaryActionClass : 'border hover:bg-muted'}`}>{item.itemType === 'milestone' ? 'Start interview' : item.status === 'in_progress' ? 'Continue' : 'Start'}<ExternalLink className="h-3.5 w-3.5" /></button>}
                        {!completed && item.status !== 'skipped' && path.status === 'active' && <button onClick={() => updateItemMutation.mutate({ itemId: item.id, status: 'skipped' })} className="rounded-lg px-2 py-2 text-xs text-muted-foreground hover:bg-muted">Skip</button>}
                        {item.status === 'skipped' && path.status === 'active' && <button onClick={() => updateItemMutation.mutate({ itemId: item.id, status: 'pending' })} className="rounded-lg border px-3 py-2 text-sm hover:bg-muted">Restore</button>}
                        {completed && item.question?.slug && <Link to={`/practice/${item.question.slug}`} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-muted">View solution <ExternalLink className="h-3.5 w-3.5" /></Link>}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
