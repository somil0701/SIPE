import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Mic, Send, SkipForward, Clock, Loader2, CheckCircle2 } from 'lucide-react'
import { interviewsApi } from '../services/api'

export function InterviewSessionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [answer, setAnswer] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)

  // interviewsApi.getById uses api.get which already unwraps response.data.data
  // so interview is the interview object directly (not wrapped in { data: ... })
  const { data: interview, refetch } = useQuery({
    queryKey: ['interview', id],
    queryFn: () => interviewsApi.getById(id!),
    refetchInterval: (query) => {
      const data = query.state.data as any
      return data?.status === 'in_progress' ? 5000 : false
    },
  })

  const { data: currentQuestion } = useQuery({
    queryKey: ['current-question', id],
    queryFn: () => interviewsApi.getCurrentQuestion(id!),
    enabled: (interview as any)?.status === 'in_progress',
    refetchInterval: 3000,
  })

  useEffect(() => {
    if ((interview as any)?.status === 'in_progress' && (interview as any)?.startedAt) {
      const interval = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - new Date((interview as any).startedAt).getTime()) / 1000
        )
        setElapsedTime(elapsed)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [interview])

  const startMutation = useMutation({
    mutationFn: () => interviewsApi.start(id!),
    onSuccess: () => {
      toast.success('Interview started!')
      refetch()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to start interview')
    },
  })

  const submitMutation = useMutation({
    mutationFn: () => interviewsApi.submitAnswer(id!, answer),
    onSuccess: (data) => {
      toast.success('Answer submitted!')
      setAnswer('')
      // data is the response object directly (api.post unwraps response.data.data)
      if ((data as any)?.nextQuestion) {
        refetch()
      } else {
        navigate('/mock-interview')
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to submit answer')
    },
  })

  const skipMutation = useMutation({
    mutationFn: () => interviewsApi.skipQuestion(id!),
    onSuccess: (data) => {
      toast('Question skipped')
      if (!(data as any)?.nextQuestion) {
        navigate('/mock-interview')
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to skip question')
    },
  })

  const completeMutation = useMutation({
    mutationFn: () => interviewsApi.complete(id!),
    onSuccess: () => {
      toast.success('Interview completed!')
      navigate('/mock-interview')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to complete interview')
    },
  })

  // interview and currentQuestion are unwrapped objects (not { data: ... })
  const interviewData = interview as any
  const question = currentQuestion as any

  if (!interviewData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Show results for completed interviews
  if (interviewData.status === 'completed') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold">Interview Completed!</h1>
          <p className="text-muted-foreground mt-2">
            Here's how you performed
          </p>
        </div>

        <div className="rounded-xl border bg-card p-8">
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground">Overall Score</p>
            <p className="text-6xl font-bold text-primary">
              {interviewData.overallScore}
            </p>
            <p className="text-sm text-muted-foreground">out of 100</p>
          </div>

          {interviewData.summaryFeedback && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Feedback</h3>
              <p className="text-muted-foreground">{interviewData.summaryFeedback}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            {interviewData.strengths?.length > 0 && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/10">
                <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">
                  Strengths
                </h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {interviewData.strengths.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {interviewData.areasToImprove?.length > 0 && (
              <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/10">
                <h4 className="font-semibold text-orange-700 dark:text-orange-300 mb-2">
                  Areas to Improve
                </h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {interviewData.areasToImprove.map((a: string, i: number) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/mock-interview')}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to Interviews
          </button>
        </div>
      </div>
    )
  }

  // Show start screen for scheduled interviews
  if (interviewData.status === 'scheduled') {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6">
        <Mic className="h-16 w-16 text-primary mx-auto" />
        <div>
          <h1 className="text-3xl font-bold">{interviewData.title}</h1>
          <p className="text-muted-foreground mt-2">
            {interviewData.interviewType} interview • {interviewData.difficulty} difficulty
          </p>
        </div>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {interviewData.durationMinutes} minutes
          </span>
        </div>
        <button
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending}
          className="rounded-lg bg-primary px-8 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {startMutation.isPending && <Loader2 className="h-5 w-5 animate-spin inline mr-2" />}
          Start Interview
        </button>
      </div>
    )
  }

  // Active interview
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{interviewData.title}</h1>
          <p className="text-sm text-muted-foreground">
            Question {interviewData.interviewQuestions?.length || 0 + 1}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatTime(elapsedTime)}
          </div>
          <button
            onClick={() => completeMutation.mutate()}
            className="text-sm text-red-600 hover:underline"
          >
            End Interview
          </button>
        </div>
      </div>

      {/* Question */}
      {question ? (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-medium mb-4">{question.questionText}</h2>
          {question.expectedTopics?.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">Expected topics:</p>
              <div className="flex flex-wrap gap-2">
                {question.expectedTopics.map((topic: string, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded-full bg-muted text-xs"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading next question...</p>
        </div>
      )}

      {/* Answer Input */}
      <div className="rounded-xl border bg-card p-6">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer here..."
          className="w-full h-40 rounded-lg border border-input bg-background px-4 py-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => skipMutation.mutate()}
            disabled={skipMutation.isPending}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted"
          >
            <SkipForward className="h-4 w-4" />
            Skip
          </button>
          <button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || !answer.trim()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Send className="h-4 w-4" />
            Submit Answer
          </button>
        </div>
      </div>
    </div>
  )
}
