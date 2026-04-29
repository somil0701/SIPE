import { useQuery, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Brain, Clock, CheckCircle2, TrendingUp, Calendar } from 'lucide-react'
import { spacedRepetitionApi } from '../services/api'

const QUALITY_RATINGS = [
  { value: 0, label: 'Complete blackout', color: 'bg-red-500' },
  { value: 1, label: 'Incorrect response', color: 'bg-red-400' },
  { value: 2, label: 'Incorrect but familiar', color: 'bg-orange-400' },
  { value: 3, label: 'Correct with difficulty', color: 'bg-yellow-400' },
  { value: 4, label: 'Correct with hesitation', color: 'bg-green-400' },
  { value: 5, label: 'Perfect response', color: 'bg-green-500' },
]

export function SpacedRepetitionPage() {
  const { data: dueReviews, refetch: refetchDue } = useQuery({
    queryKey: ['due-reviews'],
    queryFn: () => spacedRepetitionApi.getDue(10),
  })

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['sr-stats'],
    queryFn: () => spacedRepetitionApi.getStats(),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) =>
      spacedRepetitionApi.review(id, rating),
    onSuccess: () => {
      toast.success('Review recorded!')
      refetchDue()
      refetchStats()
    },
  })

  // getDue returns: { data: [...], count: N } after api.get unwraps -> we get the raw route response
  // but our api.get unwraps response.data.data. The route sets data: dueReviews (array), so we get array.
  const dueList = Array.isArray(dueReviews) ? dueReviews : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Spaced Repetition</h1>
        <p className="text-muted-foreground mt-1">
          Review questions at optimal intervals for better retention
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Brain className="h-4 w-4" />
              <span className="text-sm">Total Cards</span>
            </div>
            <p className="text-2xl font-bold">{stats?.totalCards}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Mastered</span>
            </div>
            <p className="text-2xl font-bold">{stats?.masteredCards}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Due Today</span>
            </div>
            <p className="text-2xl font-bold">{stats?.dueToday}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Retention</span>
            </div>
            <p className="text-2xl font-bold">{stats?.retentionRate}%</p>
          </div>
        </div>
      )}

      {/* Due Reviews */}
      <div className="rounded-xl border bg-card">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Due for Review ({dueList.length})
          </h2>
        </div>
        <div className="p-6">
          {dueList.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">All caught up!</h3>
              <p className="text-muted-foreground">
                No questions due for review. Great job!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {dueList.map((item: any) => (
                <div key={item.id} className="border rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <Link
                        to={`/practice/${item.question?.slug}`}
                        className="text-lg font-semibold hover:text-primary"
                      >
                        {item.question?.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full difficulty-${item.question?.difficulty}`}>
                          {item.question?.difficulty}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Reviewed {item.reviewCount} times
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-2">
                    {QUALITY_RATINGS.map((rating) => (
                      <button
                        key={rating.value}
                        onClick={() => reviewMutation.mutate({ id: item.id, rating: rating.value })}
                        disabled={reviewMutation.isPending}
                        className={`p-2 rounded-lg text-xs font-medium text-white ${rating.color} hover:opacity-90 disabled:opacity-50`}
                        title={rating.label}
                      >
                        {rating.value}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Rate your recall (0 = forgot, 5 = perfect)
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
