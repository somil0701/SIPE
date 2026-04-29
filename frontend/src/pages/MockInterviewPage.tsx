import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mic, Plus, Clock, ChevronRight, Loader2, Play, XCircle } from 'lucide-react'
import { interviewsApi } from '../services/api'

const INTERVIEW_TYPES = [
  { id: 'technical', name: 'Technical', description: 'Coding and algorithm questions' },
  { id: 'behavioral', name: 'Behavioral', description: 'Soft skills and experience' },
  { id: 'mixed', name: 'Mixed', description: 'Combination of both' },
  { id: 'system-design', name: 'System Design', description: 'Architecture and design' },
]

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert']

export function MockInterviewPage() {
  const navigate = useNavigate()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [interviewType, setInterviewType] = useState('technical')
  const [difficulty, setDifficulty] = useState('medium')
  const [duration, setDuration] = useState(60)

  const { data: interviews, isLoading } = useQuery({
    queryKey: ['interviews'],
    queryFn: () => interviewsApi.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      interviewsApi.create({
        interviewType,
        difficulty,
        durationMinutes: duration,
      }),
    onSuccess: (data) => {
      toast.success('Interview created!')
      // data is the interview object directly (api.post already unwraps response.data.data)
      navigate(`/mock-interview/${data.id}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create interview')
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mock Interviews</h1>
          <p className="text-muted-foreground mt-1">
            Practice with AI-powered interviews
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Interview
        </button>
      </div>

      {/* Interview List */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </div>
      ) : interviews?.length === 0 ? (
        <div className="text-center py-12 rounded-xl border bg-card">
          <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No interviews yet</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            Start your first mock interview to practice
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start Interview
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Array.isArray(interviews) ? interviews : []).map((interview: any) => (
            <div
              key={interview.id}
              className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  interview.status === 'completed'
                    ? 'bg-green-100'
                    : interview.status === 'in_progress'
                    ? 'bg-blue-100'
                    : 'bg-gray-100'
                }`}>
                  <Mic className={`h-5 w-5 ${
                    interview.status === 'completed'
                      ? 'text-green-600'
                      : interview.status === 'in_progress'
                      ? 'text-blue-600'
                      : 'text-gray-600'
                  }`} />
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  interview.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : interview.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {interview.status}
                </span>
              </div>
              <h3 className="font-semibold">{interview.title}</h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {interview.durationMinutes} min
                </span>
                <span className="capitalize">{interview.difficulty}</span>
              </div>
              {interview.overallScore !== undefined && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Score</span>
                    <span className="text-2xl font-bold">{interview.overallScore}</span>
                  </div>
                </div>
              )}
              <div className="mt-4">
                <Link
                  to={`/mock-interview/${interview.id}`}
                  className="flex items-center justify-center gap-2 w-full rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  {interview.status === 'scheduled' && <Play className="h-4 w-4" />}
                  {interview.status === 'in_progress' && <Play className="h-4 w-4" />}
                  {interview.status === 'completed' && <ChevronRight className="h-4 w-4" />}
                  {interview.status === 'scheduled'
                    ? 'Start'
                    : interview.status === 'in_progress'
                    ? 'Continue'
                    : 'View Results'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Interview Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">New Mock Interview</h2>
              <button onClick={() => setShowCreateModal(false)}>
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Interview Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {INTERVIEW_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setInterviewType(type.id)}
                      className={`p-3 rounded-lg border text-left ${
                        interviewType === type.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <p className="font-medium text-sm">{type.name}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Difficulty</label>
                <div className="flex gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 py-2 rounded-lg border text-sm capitalize ${
                        difficulty === d
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                <input
                  type="range"
                  min="15"
                  max="120"
                  step="15"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-center text-sm text-muted-foreground mt-1">{duration} minutes</p>
              </div>

              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Start Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
