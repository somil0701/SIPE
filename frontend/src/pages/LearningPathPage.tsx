import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Map, Plus, Play, Pause, ChevronRight } from 'lucide-react'
import { learningPathApi } from '../services/api'

export function LearningPathPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPathName, setNewPathName] = useState('')

  const { data: paths, refetch } = useQuery({
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
  })

  const pauseMutation = useMutation({
    mutationFn: (id: string) => learningPathApi.pause(id),
    onSuccess: () => {
      toast.success('Path paused')
      refetch()
    },
  })

  const resumeMutation = useMutation({
    mutationFn: (id: string) => learningPathApi.resume(id),
    onSuccess: () => {
      toast.success('Path resumed')
      refetch()
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Learning Paths</h1>
          <p className="text-muted-foreground mt-1">
            Structured study plans to master specific skills
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Path
        </button>
      </div>

      {/* Paths List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(Array.isArray(paths) ? paths : []).map((path: any) => (
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
                  onClick={() => pauseMutation.mutate(path.id)}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </button>
              )}
              {path.status === 'paused' && (
                <button
                  onClick={() => resumeMutation.mutate(path.id)}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6">
            <h2 className="text-xl font-semibold mb-4">Create Learning Path</h2>
            <input
              type="text"
              value={newPathName}
              onChange={(e) => setNewPathName(e.target.value)}
              placeholder="Path name (e.g., 'Google Interview Prep')"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 rounded-lg border px-4 py-2 text-sm hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!newPathName.trim() || createMutation.isPending}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
