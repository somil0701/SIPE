import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { TrendingUp, Target, Clock, Award, Zap, AlertTriangle, ArrowRight } from 'lucide-react'
import { analyticsApi } from '../services/api'
import { EmptyState, ErrorState, LoadingState } from '../components/StateFeedback'

export function AnalyticsPage() {
  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
    isError: isAnalyticsError,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => analyticsApi.getUserAnalytics(),
  })

  const {
    data: weakTopics,
    isLoading: isWeakTopicsLoading,
    isError: isWeakTopicsError,
    refetch: refetchWeakTopics,
  } = useQuery({
    queryKey: ['weak-topics'],
    queryFn: () => analyticsApi.getWeakTopics(5),
  })

  const {
    data: strongTopics,
    isLoading: isStrongTopicsLoading,
    isError: isStrongTopicsError,
    refetch: refetchStrongTopics,
  } = useQuery({
    queryKey: ['strong-topics'],
    queryFn: () => analyticsApi.getStrongTopics(5),
  })

  const data = analytics

  const difficultyData = data?.difficultyBreakdown
    ? [
        { name: 'Easy', solved: data.difficultyBreakdown.easy.solved, attempted: data.difficultyBreakdown.easy.attempted },
        { name: 'Medium', solved: data.difficultyBreakdown.medium.solved, attempted: data.difficultyBreakdown.medium.attempted },
        { name: 'Hard', solved: data.difficultyBreakdown.hard.solved, attempted: data.difficultyBreakdown.hard.attempted },
        { name: 'Expert', solved: data.difficultyBreakdown.expert.solved, attempted: data.difficultyBreakdown.expert.attempted },
      ]
    : []

  const weeklyData = data?.weeklyProgress?.slice(-12) || []
  const hasWeeklyData = weeklyData.length > 0
  const hasDifficultyData = difficultyData.some(
    (item) => item.solved > 0 || item.attempted > 0
  )

  const formatStudyTime = (seconds: number) => {
    if (!seconds) return '0m'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Track your learning progress, identify weak points, and measure your growth over time.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isAnalyticsLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-muted animate-pulse" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                  <div className="h-6 w-12 rounded bg-muted animate-pulse" />
                </div>
              </div>
            </div>
          ))
        ) : isAnalyticsError ? (
          <div className="sm:col-span-2 lg:col-span-4">
            <ErrorState
              title="Unable to load analytics"
              action={
                <button
                  type="button"
                  onClick={() => refetchAnalytics()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Retry
                </button>
              }
            />
          </div>
        ) : (
          <>
            <div className="group rounded-xl border bg-card p-5 transition-all hover:border-blue-500/50 hover:shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center transition-colors group-hover:bg-blue-500/20">
                  <Target className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Accuracy</p>
                  <p className="text-2xl font-bold tracking-tight">{analytics?.overallAccuracy || 0}%</p>
                </div>
              </div>
            </div>
            <div className="group rounded-xl border bg-card p-5 transition-all hover:border-green-500/50 hover:shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center transition-colors group-hover:bg-green-500/20">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Solved</p>
                  <p className="text-2xl font-bold tracking-tight">{analytics?.totalSolved || 0}</p>
                </div>
              </div>
            </div>
            <div className="group rounded-xl border bg-card p-5 transition-all hover:border-purple-500/50 hover:shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center transition-colors group-hover:bg-purple-500/20">
                  <Clock className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Study Time</p>
                  <p className="text-2xl font-bold tracking-tight">
                    {formatStudyTime(analytics?.totalTimeSpent || 0)}
                  </p>
                </div>
              </div>
            </div>
            <div className="group rounded-xl border bg-card p-5 transition-all hover:border-orange-500/50 hover:shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center transition-colors group-hover:bg-orange-500/20">
                  <Award className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Best Streak</p>
                  <p className="text-2xl font-bold tracking-tight">{analytics?.longestStreak || 0} <span className="text-base font-normal text-muted-foreground">days</span></p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Progress Chart */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Weekly Progress</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Questions solved vs attempted over time</p>
            </div>
          </div>
          <div className="h-[280px]">
            {isAnalyticsLoading ? (
              <LoadingState message="Loading weekly progress..." bordered={false} />
            ) : isAnalyticsError ? (
              <ErrorState
                title="Unable to load weekly progress"
                bordered={false}
                action={
                  <button
                    type="button"
                    onClick={() => refetchAnalytics()}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Retry
                  </button>
                }
              />
            ) : !hasWeeklyData ? (
              <EmptyState
                message="Complete a few questions this week to see your trends graph."
                bordered={false}
              />
            ) : (
              <>
                <p className="sr-only">
                  Weekly progress chart comparing questions solved and attempted over the last {weeklyData.length} weeks.
                </p>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} vertical={false} />
                    <XAxis dataKey="week" tickFormatter={(value) => value.slice(5)} stroke="hsl(var(--border))" tick={{ fill: 'hsl(var(--foreground))', opacity: 0.7 }} fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="hsl(var(--border))" tick={{ fill: 'hsl(var(--foreground))', opacity: 0.7 }} fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                      itemStyle={{ fontSize: '13px', fontWeight: 500 }}
                      labelStyle={{ color: 'hsl(var(--foreground))', opacity: 0.8, fontSize: '12px', marginBottom: '4px' }} 
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', paddingBottom: '20px', color: 'hsl(var(--foreground))' }} />
                    <Line type="monotone" dataKey="questionsSolved" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Questions Solved" />
                    <Line type="monotone" dataKey="questionsAttempted" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Questions Attempted" />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        </div>

        {/* Difficulty Breakdown */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Difficulty Breakdown</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Success rate across different challenge levels</p>
            </div>
          </div>
          <div className="h-[280px]">
            {isAnalyticsLoading ? (
              <LoadingState message="Loading difficulty breakdown..." bordered={false} />
            ) : isAnalyticsError ? (
              <ErrorState
                title="Unable to load difficulty breakdown"
                bordered={false}
                action={
                  <button
                    type="button"
                    onClick={() => refetchAnalytics()}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Retry
                  </button>
                }
              />
            ) : !hasDifficultyData ? (
              <EmptyState
                message="Solve questions to see your success rate by difficulty level."
                bordered={false}
              />
            ) : (
              <>
                <p className="sr-only">
                  Difficulty breakdown chart comparing solved and attempted questions by difficulty.
                </p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={difficultyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} vertical={false} />
                    <XAxis dataKey="name" stroke="hsl(var(--border))" tick={{ fill: 'hsl(var(--foreground))', opacity: 0.7 }} fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="hsl(var(--border))" tick={{ fill: 'hsl(var(--foreground))', opacity: 0.7 }} fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                      itemStyle={{ fontSize: '13px', fontWeight: 500 }}
                      labelStyle={{ color: 'hsl(var(--foreground))', opacity: 0.8, fontSize: '12px', marginBottom: '4px' }} 
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', paddingBottom: '20px', color: 'hsl(var(--foreground))' }} />
                    <Bar dataKey="solved" name="Solved Successfully" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="attempted" name="Total Attempts" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weak Topics */}
        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-1.5 bg-orange-500/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Areas to Improve</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Topics where your accuracy is lowest</p>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            {isWeakTopicsLoading ? (
              <LoadingState message="Loading improvement areas..." bordered={false} />
            ) : isWeakTopicsError ? (
              <ErrorState
                title="Unable to load improvement areas"
                bordered={false}
                action={
                  <button
                    type="button"
                    onClick={() => refetchWeakTopics()}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Retry
                  </button>
                }
              />
            ) : (weakTopics?.length === 0 || !weakTopics) ? (
              <EmptyState
                message="Great job! You don't have any significant weak areas yet."
                bordered={false}
              />
            ) : (
              <div className="space-y-3">
                {(weakTopics || []).map((topic: any) => (
                  <div key={topic.skillId} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card hover:border-orange-500/30 hover:bg-muted/10 transition-all gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="font-semibold text-[15px] group-hover:text-foreground transition-colors">{topic.skillName}</p>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-500 border border-orange-500/20">Needs Practice</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2.5">
                        <span>{topic.solved} of {topic.attempted} correct</span>
                        <span className="font-semibold text-foreground">{topic.accuracy}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 transition-all rounded-full"
                          style={{ width: `${Math.max(2, topic.accuracy)}%` }}
                        />
                      </div>
                    </div>
                    <div className="shrink-0 flex w-full sm:w-auto mt-2 sm:mt-0">
                      <Link to="/practice" className="flex-1 flex items-center justify-center gap-1.5 text-center px-3.5 py-2 bg-background border shadow-sm rounded-lg text-xs font-medium hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary">
                        Practice <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Strong Topics */}
        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-1.5 bg-green-500/10 rounded-lg">
              <Zap className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Your Strengths</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Topics you've mastered with high accuracy</p>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            {isStrongTopicsLoading ? (
              <LoadingState message="Loading strengths..." bordered={false} />
            ) : isStrongTopicsError ? (
              <ErrorState
                title="Unable to load strengths"
                bordered={false}
                action={
                  <button
                    type="button"
                    onClick={() => refetchStrongTopics()}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Retry
                  </button>
                }
              />
            ) : (strongTopics?.length === 0 || !strongTopics) ? (
              <EmptyState
                message="Start practicing questions consistently to build your strengths!"
                bordered={false}
              />
            ) : (
              <div className="space-y-3">
                {(strongTopics || []).map((topic: any) => (
                  <div key={topic.skillId} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card hover:border-green-500/30 hover:bg-muted/10 transition-all gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="font-semibold text-[15px] group-hover:text-foreground transition-colors">{topic.skillName}</p>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-green-500/10 text-green-500 border border-green-500/20">Strong</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2.5">
                        <span>{topic.solved} of {topic.attempted} correct</span>
                        <span className="font-semibold text-foreground">{topic.accuracy}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all rounded-full"
                          style={{ width: `${Math.max(2, topic.accuracy)}%` }}
                        />
                      </div>
                    </div>
                    <div className="shrink-0 flex w-full sm:w-auto mt-2 sm:mt-0">
                      <Link to="/practice" className="flex-1 flex items-center justify-center gap-1.5 text-center px-3.5 py-2 bg-background border shadow-sm rounded-lg text-xs font-medium hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary">
                        View Questions <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
