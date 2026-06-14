import { useQuery, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Brain, Clock, CheckCircle2, TrendingUp, Calendar,
  ArrowRight, AlertCircle, RotateCcw, Target,
  Activity
} from 'lucide-react'
import { spacedRepetitionApi } from '../services/api'
import { EmptyState, ErrorState, LoadingState } from '../components/StateFeedback'

const QUALITY_RATINGS = [
  { value: 0, label: 'Forgot', color: 'text-red-600 dark:text-red-500 border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10' },
  { value: 1, label: 'Hard', color: 'text-orange-600 dark:text-orange-500 border-orange-200 dark:border-orange-500/30 hover:bg-orange-50 dark:hover:bg-orange-500/10' },
  { value: 2, label: 'Okay', color: 'text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-500/10' },
  { value: 3, label: 'Good', color: 'text-yellow-600 dark:text-yellow-500 border-yellow-200 dark:border-yellow-500/30 hover:bg-yellow-50 dark:hover:bg-yellow-500/10' },
  { value: 4, label: 'Easy', color: 'text-lime-600 dark:text-lime-500 border-lime-200 dark:border-lime-500/30 hover:bg-lime-50 dark:hover:bg-lime-500/10' },
  { value: 5, label: 'Perfect', color: 'text-green-600 dark:text-green-500 border-green-200 dark:border-green-500/30 hover:bg-green-50 dark:hover:bg-green-500/10' },
]

export function SpacedRepetitionPage() {
  const {
    data: dueReviews,
    isLoading: isDueLoading,
    isError: isDueError,
    refetch: refetchDue,
  } = useQuery({
    queryKey: ['due-reviews'],
    queryFn: () => spacedRepetitionApi.getDue(10),
  })

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['sr-stats'],
    queryFn: () => spacedRepetitionApi.getStats(),
  })

  const {
    data: allReviewsRaw,
    isLoading: isAllLoading,
    refetch: refetchAll,
  } = useQuery({
    queryKey: ['all-reviews'],
    queryFn: () => spacedRepetitionApi.getAll(),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) =>
      spacedRepetitionApi.review(id, rating),
    onSuccess: () => {
      toast.success('Review recorded!')
      refetchDue()
      refetchStats()
      refetchAll()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to record review')
    },
  })

  const dueList = Array.isArray(dueReviews) ? dueReviews : []
  const allReviews = Array.isArray(allReviewsRaw) ? allReviewsRaw : (allReviewsRaw as any)?.data || []
  
  const upcomingReviews = allReviews
    .filter((item: any) => new Date(item.nextReviewDate) > new Date())
    .sort((a: any, b: any) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime())
    .slice(0, 3)

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Spaced Repetition</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Review questions at optimal intervals to lock them into your long-term memory.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="group rounded-xl border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-sm">
            <div className="flex items-center gap-3 text-muted-foreground mb-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Brain className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">Total Cards</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">{stats?.totalCards}</p>
          </div>
          <div className="group rounded-xl border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-sm">
            <div className="flex items-center gap-3 text-muted-foreground mb-3">
              <div className="rounded-lg bg-green-500/10 p-2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">Mastered</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">{stats?.masteredCards}</p>
          </div>
          <div className="group rounded-xl border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-sm">
            <div className="flex items-center gap-3 text-muted-foreground mb-3">
              <div className="rounded-lg bg-orange-500/10 p-2 text-orange-500">
                <Clock className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">Due Today</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">{stats?.dueToday}</p>
          </div>
          <div className="group rounded-xl border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-sm">
            <div className="flex items-center gap-3 text-muted-foreground mb-3">
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">Retention</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">{stats?.retentionRate}%</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Due Reviews */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Due for Review
              <span className="ml-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {dueList.length}
              </span>
            </h2>
          </div>

          <div className="space-y-4">
            {isDueLoading ? (
              <div className="rounded-xl border bg-card p-12">
                <LoadingState message="Loading reviews..." />
              </div>
            ) : isDueError ? (
              <div className="rounded-xl border bg-card p-12">
                <ErrorState
                  title="Unable to load reviews"
                  bordered={false}
                  action={
                    <button
                      type="button"
                      onClick={() => refetchDue()}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Retry
                    </button>
                  }
                />
              </div>
            ) : dueList.length === 0 ? (
              <div className="rounded-xl border bg-card p-12">
                <EmptyState
                  title="All caught up!"
                  message="No questions due for review right now. Check back later!"
                  icon={<CheckCircle2 className="h-12 w-12 text-green-500" />}
                  bordered={false}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {dueList.map((item: any) => {
                  const lastReviewed = item.lastReviewedAt ? timeAgo(item.lastReviewedAt) : 'Never'
                  
                  return (
                    <div key={item.id} className="group relative overflow-hidden rounded-xl border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
                        <div className="space-y-1.5">
                          <Link
                            to={`/practice/${item.question?.slug}`}
                            className="text-lg font-semibold hover:text-primary transition-colors flex items-center gap-2"
                          >
                            {item.question?.title}
                            <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                          </Link>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className={`px-2 py-0.5 rounded-md border font-medium difficulty-${item.question?.difficulty}`}>
                              {item.question?.difficulty}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Interval: {item.interval} days</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><RotateCcw className="h-3.5 w-3.5" /> {item.reviewCount} reviews</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            to={`/practice/${item.question?.slug}`}
                            className="inline-flex items-center justify-center rounded-md border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            Review Problem
                          </Link>
                        </div>
                      </div>

                      {/* Recall Ratings */}
                      <div className="rounded-lg bg-muted/40 p-4 border">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Target className="h-3.5 w-3.5" />
                            Rate your recall memory
                          </p>
                          <p className="text-[11px] text-muted-foreground hidden sm:block">Last reviewed: {lastReviewed}</p>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {QUALITY_RATINGS.map((rating) => (
                            <button
                              type="button"
                              key={rating.value}
                              onClick={() => reviewMutation.mutate({ id: item.id, rating: rating.value })}
                              disabled={reviewMutation.isPending}
                              className={`flex flex-col items-center justify-center rounded-lg border bg-background px-2 py-2 transition-all ${rating.color} disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                              title={`${rating.label} (${rating.value})`}
                            >
                              <span className="text-[11px] font-bold opacity-70 mb-0.5">{rating.value}</span>
                              <span className="text-[11px] font-medium">{rating.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Context & Extra Sections */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-primary" />
              How it works
            </h3>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Spaced repetition automatically schedules questions for review right before you're likely to forget them.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <div className="mt-0.5 rounded-full bg-primary/20 p-0.5"><CheckCircle2 className="h-3 w-3 text-primary" /></div>
                  <span>Rate your recall honestly to train the algorithm.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-0.5 rounded-full bg-primary/20 p-0.5"><CheckCircle2 className="h-3 w-3 text-primary" /></div>
                  <span>Lower scores decrease the interval between reviews.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-0.5 rounded-full bg-primary/20 p-0.5"><CheckCircle2 className="h-3 w-3 text-primary" /></div>
                  <span>Higher scores increase the interval, saving you time.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Weak Topics
            </h3>
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center bg-muted/20">
              <p className="text-sm text-muted-foreground px-4">
                Keep practicing! Weak topics will appear here as we gather more data.
              </p>
            </div>
          </div>
          
          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-blue-500" />
              Upcoming
            </h3>
            {isAllLoading ? (
              <div className="py-8 flex justify-center">
                <LoadingState message="Loading upcoming..." />
              </div>
            ) : upcomingReviews.length > 0 ? (
              <div className="space-y-3">
                {upcomingReviews.map((item: any) => {
                  const daysUntil = Math.max(1, Math.ceil((new Date(item.nextReviewDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <div className="truncate pr-2">
                        <Link to={`/practice/${item.question?.slug}`} className="font-medium hover:text-primary hover:underline truncate block">
                          {item.question?.title}
                        </Link>
                        <span className="text-xs text-muted-foreground">Interval: {item.interval}d</span>
                      </div>
                      <span className="shrink-0 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">
                        in {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center bg-muted/20">
                <p className="text-sm text-muted-foreground px-4">
                  Review due questions to populate your upcoming schedule!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
