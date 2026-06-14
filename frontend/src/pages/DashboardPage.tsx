import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Code2,
  Mic,
  TrendingUp,
  Target,
  Clock,
  Flame,
  ChevronRight,
  Brain,
  Zap,
  BookOpen,
} from 'lucide-react'
import { dashboardApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { EmptyState, ErrorState, LoadingState } from '../components/StateFeedback'

export function DashboardPage() {
  const { user } = useAuthStore()

  const {
    data: dashboard,
    isLoading: isDashboardLoading,
    isError: isDashboardError,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.getSummary(),
  })

  const analytics = dashboard?.analytics
  const recommendedQuestions = dashboard?.recommendedQuestions || []
  const interviews = dashboard?.recentInterviews || []

  const stats = [
    {
      name: 'Questions Solved',
      value: analytics?.totalSolved || 0,
      total: analytics?.totalAttempts || 0,
      icon: Code2,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      name: 'Accuracy Rate',
      value: `${analytics?.overallAccuracy || 0}%`,
      icon: Target,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      name: 'Current Streak',
      value: analytics?.currentStreak || 0,
      icon: Flame,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
    {
      name: 'Study Time',
      value: `${Math.floor((analytics?.totalTimeSpent || 0) / 3600)}h`,
      icon: Clock,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
  ]

  const quickActions = [
    {
      name: 'Practice Questions',
      description: 'Solve coding problems tailored to your skill level',
      icon: Code2,
      href: '/practice',
      color: 'bg-blue-500',
    },
    {
      name: 'Mock Interview',
      description: 'Practice with AI-powered mock interviews',
      icon: Mic,
      href: '/mock-interview',
      color: 'bg-green-500',
    },
    {
      name: 'Spaced Repetition',
      description: 'Review questions due for optimal retention',
      icon: Brain,
      href: '/spaced-repetition',
      color: 'bg-purple-500',
    },
    {
      name: 'Learning Path',
      description: 'Follow a structured learning plan',
      icon: BookOpen,
      href: '/learning-path',
      color: 'bg-orange-500',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {user?.fullName?.split(' ')[0]}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's your progress and recommended activities for today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isDashboardLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                  <div className="h-7 w-16 rounded bg-muted animate-pulse" />
                </div>
              </div>
            </div>
          ))
        ) : isDashboardError ? (
          <div className="sm:col-span-2 lg:col-span-4">
            <ErrorState
              title="Unable to load progress"
              action={
                <button
                  type="button"
                  onClick={() => refetchDashboard()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Retry
                </button>
              }
            />
          </div>
        ) : stats.map((stat) => (
          <div
            key={stat.name}
            className="rounded-xl border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.name}</p>
                <p className="text-2xl font-bold">
                  {stat.value}
                  {stat.total !== undefined && (
                    <span className="text-sm text-muted-foreground font-normal">
                      {' '}/ {stat.total}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="group rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`h-12 w-12 rounded-lg ${action.color} flex items-center justify-center mb-4`}>
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold group-hover:text-primary transition-colors">
                {action.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recommended Questions */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Recommended for You
              </h2>
              <Link
                to="/practice"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View all
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="p-6">
            {isDashboardLoading ? (
              <LoadingState message="Loading recommendations..." bordered={false} />
            ) : isDashboardError ? (
              <ErrorState
                title="Unable to load recommendations"
                bordered={false}
                action={
                  <button
                    type="button"
                    onClick={() => refetchDashboard()}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Retry
                  </button>
                }
              />
            ) : !recommendedQuestions || (Array.isArray(recommendedQuestions) && recommendedQuestions.length === 0) ? (
              <EmptyState
                message="No recommendations yet. Start practicing to get personalized suggestions!"
                bordered={false}
              />
            ) : (
              <div className="space-y-4">
                {(Array.isArray(recommendedQuestions) ? recommendedQuestions : []).map((question: any) => (
                  <Link
                    key={question.id}
                    to={`/practice/${question.slug}`}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted transition-colors"
                  >
                    <div>
                      <h3 className="font-medium">{question.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full difficulty-${question.difficulty}`}>
                          {question.difficulty}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {question.acceptanceRate}% acceptance
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Interviews */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Recent Mock Interviews
              </h2>
              <Link
                to="/mock-interview"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View all
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="p-6">
            {isDashboardLoading ? (
              <LoadingState message="Loading recent interviews..." bordered={false} />
            ) : isDashboardError ? (
              <ErrorState
                title="Unable to load interviews"
                bordered={false}
                action={
                  <button
                    type="button"
                    onClick={() => refetchDashboard()}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Retry
                  </button>
                }
              />
            ) : !interviews || (Array.isArray(interviews) ? interviews.length === 0 : !interviews) ? (
              <EmptyState
                message="No mock interviews yet. Start practicing today!"
                bordered={false}
                action={
                  <Link
                    to="/mock-interview"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Mic className="h-4 w-4" />
                    Start Mock Interview
                  </Link>
                }
              />
            ) : (
              <div className="space-y-4">
                {(Array.isArray(interviews) ? interviews : (interviews as any)?.interviews || []).map((interview: any) => (
                  <div
                    key={interview.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div>
                      <h3 className="font-medium">{interview.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                          {interview.interviewType}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          interview.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                        }`}>
                          {interview.status}
                        </span>
                      </div>
                    </div>
                    {interview.overallScore && (
                      <div className="text-right">
                        <p className="text-2xl font-bold">{interview.overallScore}</p>
                        <p className="text-xs text-muted-foreground">score</p>
                      </div>
                    )}
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
