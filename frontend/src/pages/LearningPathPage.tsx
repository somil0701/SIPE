import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Map, Plus, Play, Pause, ChevronRight, XCircle } from 'lucide-react'
import { learningPathApi } from '../services/api'
import { EmptyState, ErrorState, LoadingState } from '../components/StateFeedback'

export function LearningPathPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPathName, setNewPathName] = useState('')

  const {
    data: paths,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['learning-paths'],
    queryFn: () => learningPathApi.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: () => learningPathApi.create({ name: newPathName }),
    onSuccess: () => {
      toast.success('Learning path created!')
      setShowCreateModal(false)
      setNewPathName('')
      refetch()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create learning path')
    },
  })

  const pauseMutation = useMutation({
    mutationFn: (id: string) => learningPathApi.pause(id),
    onSuccess: () => {
      toast.success('Path paused')
      refetch()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to pause path')
    },
  })

  const resumeMutation = useMutation({
    mutationFn: (id: string) => learningPathApi.resume(id),
    onSuccess: () => {
      toast.success('Path resumed')
      refetch()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to resume path')
    },
  })

  const pathList = Array.isArray(paths) ? paths : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Learning Paths</h1>
          <p className="text-muted-foreground mt-1">
            Structured study plans to master specific skills
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Create Path
        </button>
      </div>

      {/* Paths List */}
      {isLoading ? (
        <LoadingState message="Loading learning paths..." />
      ) : isError ? (
        <ErrorState
          title="Unable to load learning paths"
          action={
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Retry
            </button>
          }
        />
      ) : pathList.length === 0 ? (
        <EmptyState
          title="No learning paths yet"
          message="Create a path to organize your practice around a specific goal."
          icon={<Map className="h-12 w-12 text-muted-foreground" />}
          action={
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Create Path
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pathList.map((path: any) => (
            <div
              key={path.id}
              className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  path.status === 'completed'
                    ? 'bg-green-100'
                    : path.status === 'active'
                    ? 'bg-blue-100'
                    : 'bg-gray-100'
                }`}>
                  <Map className={`h-5 w-5 ${
                    path.status === 'completed'
                      ? 'text-green-600'
                      : path.status === 'active'
                      ? 'text-blue-600'
                      : 'text-gray-600'
                  }`} />
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  path.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : path.status === 'active'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {path.status}
                </span>
              </div>

              <h3 className="font-semibold">{path.name}</h3>
              {path.description && (
                <p className="text-sm text-muted-foreground mt-1">{path.description}</p>
              )}

              <div className="mt-4">
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
                <p className="text-xs text-muted-foreground mt-1">
                  {path.completedItems} / {path.totalItems} items completed
                </p>
              </div>

              <div className="mt-4 flex gap-2">
                {path.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => pauseMutation.mutate(path.id)}
                    disabled={pauseMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                  >
                    <Pause className="h-4 w-4" />
                    Pause
                  </button>
                )}
                {path.status === 'paused' && (
                  <button
                    type="button"
                    onClick={() => resumeMutation.mutate(path.id)}
                    disabled={resumeMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                  >
                    <Play className="h-4 w-4" />
                    Resume
                  </button>
                )}
                <Link
                  to={`/learning-path/${path.id}`}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
                >
                  View
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-lg dark:bg-gray-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-path-title"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="create-path-title" className="text-xl font-semibold">
                Create Learning Path
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Close create learning path dialog"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <label htmlFor="learning-path-name" className="block text-sm font-medium mb-2">
              Path name
            </label>
            <input
              id="learning-path-name"
              type="text"
              value={newPathName}
              onChange={(e) => setNewPathName(e.target.value)}
              placeholder="Path name (e.g., 'Google Interview Prep')"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 rounded-lg border px-4 py-2 text-sm hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={!newPathName.trim() || createMutation.isPending}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
