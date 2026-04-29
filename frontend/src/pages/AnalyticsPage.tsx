import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { TrendingUp, Target, Clock, Award, Zap, AlertTriangle } from 'lucide-react'
import { analyticsApi } from '../services/api'

export function AnalyticsPage() {
  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => analyticsApi.getUserAnalytics(),
  })

  const { data: weakTopics } = useQuery({
    queryKey: ['weak-topics'],
    queryFn: () => analyticsApi.getWeakTopics(5),
  })

  const { data: strongTopics } = useQuery({
    queryKey: ['strong-topics'],
    queryFn: () => analyticsApi.getStrongTopics(5),
  })

  const data = analytics

  const difficultyData = data?.difficultyBreakdown
    ? [
        { name: 'Easy', value: data.difficultyBreakdown.easy.solved, attempted: data.difficultyBreakdown.easy.attempted },
        { name: 'Medium', value: data.difficultyBreakdown.medium.solved, attempted: data.difficultyBreakdown.medium.attempted },
        { name: 'Hard', value: data.difficultyBreakdown.hard.solved, attempted: data.difficultyBreakdown.hard.attempted },
        { name: 'Expert', value: data.difficultyBreakdown.expert.solved, attempted: data.difficultyBreakdown.expert.attempted },
      ]
    : []

  const weeklyData = data?.weeklyProgress?.slice(-12) || []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Track your progress and identify areas for improvement
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Accuracy</p>
              <p className="text-2xl font-bold">{analytics?.overallAccuracy || 0}%</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Solved</p>
              <p className="text-2xl font-bold">{analytics?.totalSolved || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Study Time</p>
              <p className="text-2xl font-bold">
                {Math.floor((analytics?.totalTimeSpent || 0) / 3600)}h
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <Award className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Best Streak</p>
              <p className="text-2xl font-bold">{analytics?.longestStreak || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Progress Chart */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Weekly Progress</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tickFormatter={(value) => value.slice(5)} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="questionsSolved" stroke="#22c55e" name="Solved" />
                <Line type="monotone" dataKey="questionsAttempted" stroke="#3b82f6" name="Attempted" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Difficulty Breakdown */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Difficulty Breakdown</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={difficultyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Solved" fill="#22c55e" />
                <Bar dataKey="attempted" name="Attempted" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weak Topics */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Areas to Improve
          </h2>
          {(weakTopics?.length === 0 || !weakTopics) ? (
            <p className="text-muted-foreground">Great job! No weak areas identified.</p>
          ) : (
            <div className="space-y-3">
              {(weakTopics || []).map((topic: any) => (
                <div key={topic.skillId} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{topic.skillName}</p>
                    <p className="text-sm text-muted-foreground">
                      {topic.solved}/{topic.attempted} correct ({topic.accuracy}%)
                    </p>
                  </div>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500"
                      style={{ width: `${topic.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Strong Topics */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Your Strengths
          </h2>
          {(strongTopics?.length === 0 || !strongTopics) ? (
            <p className="text-muted-foreground">Start practicing to build your strengths!</p>
          ) : (
            <div className="space-y-3">
              {(strongTopics || []).map((topic: any) => (
                <div key={topic.skillId} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{topic.skillName}</p>
                    <p className="text-sm text-muted-foreground">
                      {topic.solved}/{topic.attempted} correct ({topic.accuracy}%)
                    </p>
                  </div>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${topic.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
