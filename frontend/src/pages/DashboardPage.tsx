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
import { analyticsApi, questionsApi, interviewsApi } from '../services/api'
import { useAuthStore } from '../store/authStore'

export function DashboardPage() {
  const { user } = useAuthStore()

  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => analyticsApi.getUserAnalytics(),
  })

  const { data: recommendedQuestions } = useQuery({
    queryKey: ['recommended-questions'],
    queryFn: () => questionsApi.getRecommended(3),
  })

  const { data: interviews } = useQuery({
    queryKey: ['recent-interviews'],
    queryFn: () => interviewsApi.getAll({ limit: 3 }),
  })

  const stats = [
    {
      name: 'Questions Solved',
      value: analytics?.totalSolved || 0,
      total: analytics?.totalAttempts || 0,
      icon: Code2,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Accuracy Rate',
      value: `${analytics?.overallAccuracy || 0}%`,
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Current Streak',
      value: analytics?.currentStreak || 0,
      icon: Flame,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      name: 'Study Time',
      value: `${Math.floor((analytics?.totalTimeSpent || 0) / 3600)}h`,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
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
        {stats.map((stat) => (
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
            <div className="flex items-center justify-between">
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
            {!recommendedQuestions || (Array.isArray(recommendedQuestions) && recommendedQuestions.length === 0) ? (
              <p className="text-muted-foreground text-center py-4">
                No recommendations yet. Start practicing to get personalized suggestions!
              </p>
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
            <div className="flex items-center justify-between">
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
            {!interviews || (Array.isArray(interviews) ? interviews.length === 0 : !interviews) ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  No mock interviews yet. Start practicing today!
                </p>
                <Link
                  to="/mock-interview"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Mic className="h-4 w-4" />
                  Start Mock Interview
                </Link>
              </div>
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
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
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