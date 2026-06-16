import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { 
  Mic, Plus, Clock, ChevronRight, Loader2, Play, 
  XCircle, Calendar, BarChart2, CheckCircle2, 
  AlertCircle, Star, Brain, ArrowRight, Activity, TrendingUp
} from 'lucide-react'
import { interviewsApi } from '../services/api'
import { EmptyState, ErrorState, LoadingState } from '../components/StateFeedback'

const INTERVIEW_TYPES = [
  { id: 'technical', name: 'Technical', description: 'Coding and algorithm questions' },
  { id: 'behavioral', name: 'Behavioral', description: 'Soft skills and experience' },
  { id: 'mixed', name: 'Mixed', description: 'Combination of both' },
  { id: 'system-design', name: 'System Design', description: 'Architecture and design' },
]

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert']

const TABS = [
  { id: 'all', label: 'All Mocks' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'completed', label: 'Completed' },
  { id: 'technical', label: 'Technical' },
  { id: 'behavioral', label: 'Behavioral' },
]

export function MockInterviewPage() {
  const navigate = useNavigate()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [interviewType, setInterviewType] = useState('technical')
  const [difficulty, setDifficulty] = useState('medium')
  const [duration, setDuration] = useState(60)
  const [activeTab, setActiveTab] = useState('all')

  const {
    data: interviewsResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
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
      navigate(`/mock-interview/${data.id}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create interview')
    },
  })

  const rawInterviews = useMemo(() => {
    if (!interviewsResponse) return []
    return Array.isArray(interviewsResponse) ? interviewsResponse : (interviewsResponse as any).interviews || []
  }, [interviewsResponse])

  const filteredInterviews = useMemo(() => {
    return rawInterviews.filter((interview: any) => {
      const status = (interview.status || '').toLowerCase()
      const type = (interview.type || interview.interviewType || '').toLowerCase()
      
      if (activeTab === 'all') return true
      if (activeTab === 'scheduled') return status === 'scheduled' || status === 'in_progress'
      if (activeTab === 'completed') return status === 'completed'
      if (activeTab === 'technical') return type === 'technical'
      if (activeTab === 'behavioral') return type === 'behavioral'
      return true
    })
  }, [rawInterviews, activeTab])

  // Aggregate stats for right panel
  const completedCount = rawInterviews.filter((i: any) => (i.status || '').toLowerCase() === 'completed').length
  const avgScore = completedCount > 0 
    ? Math.round(rawInterviews.reduce((acc: number, curr: any) => acc + (curr.overallScore || 0), 0) / completedCount) 
    : 0

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Mic className="h-8 w-8 text-primary" />
            Mock Interviews
          </h1>
          <p className="text-muted-foreground mt-2">
            Practice realistic interviews with AI, identify weak areas, and track readiness.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Schedule Mock
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Main List Area */}
        <div className="flex-1 space-y-6">
          {/* Tabs */}
          <div className="flex overflow-x-auto pb-2 -mb-2 hide-scrollbar">
            <div className="flex gap-2 p-1 bg-muted/40 rounded-xl border border-border/50">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-background text-foreground shadow-sm border border-border/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
                  }`}
                >
                  {tab.label}
                  {tab.id === 'all' && (
                     <span className="ml-2 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                       {rawInterviews.length}
                     </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 w-full rounded-xl bg-muted animate-pulse border border-border/50" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              title="Unable to load interviews"
              action={
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Retry
                </button>
              }
            />
          ) : filteredInterviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-card/50 rounded-xl border border-dashed border-border/60">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4 shadow-sm">
                <Mic className="h-8 w-8" />
              </div>
              <h3 className="font-semibold text-lg text-foreground">No {activeTab !== 'all' ? activeTab : ''} interviews found</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-[300px] leading-relaxed">
                You haven't scheduled any {activeTab !== 'all' ? activeTab : ''} mock interviews yet. Start one to build confidence.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-all hover:-translate-y-0.5"
              >
                Start Interview
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInterviews.map((interview: any) => {
                const status = (interview.status || '').toLowerCase()
                const isCompleted = status === 'completed'
                const isScheduled = status === 'scheduled' || status === 'in_progress'
                const typeLabel = interview.type || interview.interviewType || 'General'

                return (
                  <div
                    key={interview.id}
                    className="group relative rounded-xl border border-border/60 bg-card/50 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 overflow-hidden flex flex-col md:flex-row"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent pointer-events-none" />
                    
                    {/* Left Info Section */}
                    <div className="p-5 flex-1 relative z-10 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md border shadow-sm ${
                              isCompleted 
                                ? 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400'
                                : isScheduled
                                ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400'
                                : 'bg-muted text-muted-foreground border-border/50'
                            }`}>
                              {status === 'in_progress' ? 'In Progress' : status}
                            </span>
                            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-1 rounded-md bg-muted text-muted-foreground border border-border/50">
                              {typeLabel}
                            </span>
                          </div>
                          {isScheduled && (
                            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 bg-background px-2.5 py-1 rounded-md border border-border/50 shadow-sm">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(interview.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </div>
                        
                        <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{interview.title || `${typeLabel} Mock Interview`}</h3>
                        
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            {interview.durationMinutes} min
                          </span>
                          <span className="flex items-center gap-1.5 capitalize">
                            <BarChart2 className="h-4 w-4" />
                            {interview.difficulty || 'Medium'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" />
                            {interview.questions?.length || 3} Questions
                          </span>
                        </div>
                      </div>

                      {/* Dynamic Footer based on status */}
                      <div className="mt-5 pt-4 border-t border-border/50 flex flex-wrap gap-2 items-center justify-between">
                        {isCompleted ? (
                          <>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
                              <span className="font-medium text-foreground">Tip:</span> Review your feedback to improve.
                            </p>
                            <div className="flex gap-2">
                               <button 
                                  onClick={() => navigate(`/mock-interview/${interview.id}/feedback`)} // if such route exists, or just link to the interview ID
                                  className="text-xs font-medium bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-md border border-border/50 transition-colors"
                               >
                                  View Feedback
                               </button>
                               <Link
                                 to={`/mock-interview/${interview.id}`}
                                 className="flex items-center gap-1.5 rounded-md bg-primary/10 text-primary px-4 py-1.5 text-xs font-medium hover:bg-primary/20 transition-colors"
                               >
                                 Details <ChevronRight className="h-3.5 w-3.5" />
                               </Link>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Brain className="h-3.5 w-3.5 text-indigo-400" />
                              <span className="font-medium text-foreground">Prep:</span> Brush up on foundational algorithms.
                            </p>
                            <Link
                              to={`/mock-interview/${interview.id}`}
                              className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-5 py-1.5 text-sm font-medium hover:bg-primary/90 hover:shadow-md transition-all hover:-translate-y-0.5"
                            >
                              <Play className="h-3.5 w-3.5" />
                              Start Now
                            </Link>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right Score Section (only visible if completed and score exists) */}
                    {isCompleted && interview.overallScore !== undefined && (
                      <div className="p-5 md:w-48 bg-background/50 border-t md:border-t-0 md:border-l border-border/50 flex flex-col items-center justify-center text-center relative z-10 shrink-0">
                         <div className="h-20 w-20 rounded-full border-4 flex items-center justify-center shadow-sm mb-2 relative group cursor-default
                           ${interview.overallScore >= 80 ? 'border-green-500/20 text-green-500' : interview.overallScore >= 60 ? 'border-yellow-500/20 text-yellow-500' : 'border-red-500/20 text-red-500'}"
                           style={{
                              borderColor: `hsl(var(--${interview.overallScore >= 80 ? 'primary' : interview.overallScore >= 60 ? 'muted-foreground' : 'destructive'}))`
                           }}
                         >
                           <span className="text-2xl font-bold text-foreground group-hover:scale-110 transition-transform">{interview.overallScore}</span>
                         </div>
                         <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Overall Score</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-[320px] shrink-0 space-y-6">
          {/* Readiness Card */}
          <div className="rounded-xl border border-white/10 bg-card shadow-lg shadow-black/20 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            <div className="p-5 border-b border-border/50 bg-background/30 flex items-center gap-2 relative z-10">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">Interview Readiness</h2>
            </div>
            <div className="p-5 relative z-10 space-y-5">
              <div className="flex items-center justify-between">
                 <span className="text-sm font-medium text-muted-foreground">Avg Score</span>
                 <span className="text-2xl font-bold text-foreground">{avgScore}<span className="text-sm font-normal text-muted-foreground">/100</span></span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/50">
                 <div className="bg-primary h-full rounded-full" style={{ width: `${avgScore}%` }} />
              </div>
              
              <div className="pt-2">
                 <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Top Strengths</h3>
                 <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded border border-green-500/20">Communication</span>
                    <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded border border-green-500/20">Data Structures</span>
                 </div>
              </div>
              
              <div>
                 <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Areas to Review</h3>
                 <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 bg-red-500/10 text-red-600 dark:text-red-400 rounded border border-red-500/20">Dynamic Programming</span>
                    <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded border border-yellow-500/20">System Design</span>
                 </div>
              </div>
            </div>
          </div>

          {/* Recommended Next Mock */}
          <div className="rounded-xl border border-white/10 bg-card shadow-lg shadow-black/20 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
            <div className="p-5 border-b border-border/50 bg-background/30 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <h2 className="text-base font-semibold">Recommended Mock</h2>
              </div>
            </div>
            <div className="p-5 relative z-10 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                 <div>
                    <h3 className="text-sm font-semibold">System Design Core</h3>
                    <p className="text-xs text-muted-foreground mt-1">Focus on scalability & architecture</p>
                 </div>
                 <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-blue-500/20 bg-blue-500/10 text-blue-500">
                    Hard
                 </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                 <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> 45 min</span>
                 <span className="flex items-center gap-1"><Brain className="h-3 w-3" /> 1 Question</span>
              </div>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-background border border-border/80 px-4 py-2 text-sm font-medium hover:bg-muted hover:border-primary/30 transition-all"
              >
                Schedule Now <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Interview Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-card border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-interview-title"
          >
            <div className="p-6 border-b border-border/50 bg-background/50 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 id="new-interview-title" className="text-xl font-bold flex items-center gap-2">
                  <Mic className="h-5 w-5 text-primary" />
                  New Mock Interview
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Configure your practice session</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-2 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close new interview dialog"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-3">Interview Focus</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {INTERVIEW_TYPES.map((type) => (
                    <button
                      type="button"
                      key={type.id}
                      onClick={() => setInterviewType(type.id)}
                      className={`p-4 rounded-xl border text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        interviewType === type.id
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                          : 'border-border/50 bg-background/50 hover:border-primary/30 hover:bg-muted/30'
                      }`}
                    >
                      <p className="font-semibold text-sm text-foreground">{type.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3">Difficulty Level</label>
                <div className="grid grid-cols-4 gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`py-2.5 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        difficulty === d
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border/50 bg-background/50 text-muted-foreground hover:border-primary/30 hover:bg-muted/30 hover:text-foreground'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-semibold">Duration</label>
                  <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">{duration} min</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="120"
                  step="15"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2 font-medium px-1">
                   <span>15m</span>
                   <span>60m</span>
                   <span>120m</span>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-border/50 bg-background/50 flex justify-end gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Create Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
