import { useParams, Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ChevronLeft, CheckCircle2, Circle, Clock, ExternalLink, Loader2, Play } from 'lucide-react'
import { learningPathApi } from '../services/api'

export function LearningPathDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: path, isLoading, refetch } = useQuery({
    queryKey: ['learning-path', id],
    queryFn: () => learningPathApi.getById(id!),
    enabled: Boolean(id),
  })

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: string }) =>
      learningPathApi.updateItem(id!, itemId, status),
    onSuccess: () => {
      toast.success('Progress updated')
      refetch()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update item')
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!path) {
    return <div className="text-center py-12">Learning path not found</div>
  }

  const items = path.pathItems || []

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/learning-path')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Learning Paths
      </button>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{path.name}</h1>
            {path.description && (
              <p className="text-muted-foreground mt-1">{path.description}</p>
            )}
          </div>
          <span className="w-fit rounded-full bg-muted px-3 py-1 text-sm capitalize">
            {path.status}
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{path.progressPercentage}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${path.progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">Study Items</h2>
        </div>

        <div className="divide-y">
          {items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No items have been generated for this path yet.
            </div>
          ) : (
            items.map((item: any) => (
              <div key={item.id} className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    {item.status === 'completed' ? (
                      <CheckCircle2 className="mt-1 h-5 w-5 text-green-500" />
                    ) : item.status === 'in_progress' ? (
                      <Play className="mt-1 h-5 w-5 text-blue-500" />
                    ) : (
                      <Circle className="mt-1 h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <h3 className="font-medium">{item.title || item.question?.title}</h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="capitalize">{item.itemType}</span>
                        {item.estimatedMinutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.estimatedMinutes} min
                          </span>
                        )}
                        <span className="capitalize">{item.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {item.question?.slug && (
                      <Link
                        to={`/practice/${item.question.slug}`}
                        className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                      >
                        Open
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                    {item.status !== 'completed' && (
                      <button
                        onClick={() =>
                          updateItemMutation.mutate({ itemId: item.id, status: 'completed' })
                        }
                        disabled={updateItemMutation.isPending}
                        className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
