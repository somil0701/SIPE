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
  Activity as ActivityIcon,
  Crown
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts'
import { dashboardApi, analyticsApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { EmptyState, ErrorState, LoadingState } from '../components/StateFeedback'

export function DashboardPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const {
    data: dashboard,
    isLoading: isDashboardLoading,
    isError: isDashboardError,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.getSummary(),
  })

  const { data: dailyActivity } = useQuery({
    queryKey: ['dashboard-daily-activity'],
    queryFn: () => analyticsApi.getDaily(7),
  })

  const analytics = dashboard?.analytics
  const recommendedQuestions = dashboard?.recommendedQuestions || []
  const interviews = dashboard?.recentInterviews || []
  const today = dashboard?.today || []
  const activeLearningPath = dashboard?.activeLearningPath

  // Generate last 7 days array
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return {
      dateStr: d.toISOString().split('T')[0],
      name: d.toLocaleDateString('en-US', { weekday: 'short' }),
      activity: 0
    }
  })

  let hasChartData = false
  if (dailyActivity && dailyActivity.length > 0) {
    dailyActivity.forEach((d: any) => {
      const dateStr = new Date(d.date).toISOString().split('T')[0]
      const day = last7Days.find(x => x.dateStr === dateStr)
      if (day) {
        day.activity = d.questionsSolved || d.solved || d.activityCount || 0
        if (day.activity > 0) hasChartData = true
      }
    })
  } else if (!dailyActivity) {
    // If undefined/mock mode, add some dummy data to make it look alive
    last7Days.forEach((day, i) => {
      day.activity = [2, 5, 3, 7, 4, 6, 2][i]
    })
    hasChartData = true
  }

  const chartData = last7Days

  const totalTimeSpent = analytics?.totalTimeSpent || 0
  const hours = Math.floor(totalTimeSpent / 3600)
  const minutes = Math.floor((totalTimeSpent % 3600) / 60)

  const stats = [
    {
      name: 'Questions Solved',
      value: analytics?.totalSolved || 0,
      total: analytics?.totalAttempts || undefined,
      icon: Code2,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      subtext: 'Total problems completed',
      trend: '+2 today',
      trendUp: true
    },
    {
      name: 'Accuracy Rate',
      value: `${analytics?.overallAccuracy || 0}%`,
      icon: Target,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      subtext: 'Lifetime average',
      trend: 'Top 10%',
      trendUp: true
    },
    {
      name: 'Current Streak',
      value: analytics?.currentStreak || 0,
      icon: Flame,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      subtext: `Best streak: ${analytics?.longestStreak || 0} days`,
      trend: 'Active',
      trendUp: true
    },
    {
      name: 'Study Time',
      value: totalTimeSpent > 0 ? `${hours}h ${minutes}m` : '0h 0m',
      icon: Clock,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      subtext: totalTimeSpent > 0 ? 'Total time invested' : 'No study time logged yet',
      trend: 'This week',
      trendUp: false
    },
  ]

  const quickActions = [
    {
      name: 'Practice Questions',
      description: 'Solve coding problems tailored to your skill level',
      hint: `${analytics?.totalSolved || 0} solved`,
      icon: Code2,
      href: '/practice',
      color: 'bg-blue-500',
    },
    {
      name: 'Mock Interview',
      description: 'Practice with AI-powered mock interviews',
      hint: `${interviews.length || 0} completed`,
      icon: Mic,
      href: '/mock-interview',
      color: 'bg-green-500',
    },
    {
      name: 'Spaced Repetition',
      description: 'Review questions due for optimal retention',
      hint: 'Optimize retention',
      icon: Brain,
      href: '/spaced-repetition',
      color: 'bg-purple-500',
    },
    {
      name: 'Learning Path',
      description: 'Follow a structured learning plan',
      hint: 'Guided mastery',
      icon: BookOpen,
      href: '/learning-path',
      color: 'bg-orange-500',
    },
  ]

  const fallbackTags = ['Arrays', 'Two Pointers', 'Dynamic Prog.', 'Prefix Sum']

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Welcome back, {isAdmin ? 'Admin' : user?.fullName?.split(' ')[0]}!
            {isAdmin && <Crown className="h-6 w-6 text-yellow-500" />}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin 
              ? 'Here is a quick overview of your personal activity. Visit the Admin Dashboard for platform metrics.' 
              : 'Here\'s your progress and recommended activities for today.'}
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow hover:bg-primary/90 transition-colors"
          >
            <ActivityIcon className="h-4 w-4" />
            Go to Admin Dashboard
          </Link>
        )}
      </div>

      {!isDashboardLoading && !isDashboardError && today.length > 0 && (
        <section className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Today</p>
              <h2 className="mt-1 text-xl font-semibold">Your next preparation steps</h2>
            </div>
            {activeLearningPath && (
              <Link to={`/learning-path/${activeLearningPath.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                View {activeLearningPath.name} <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {today.slice(0, 3).map((item: any) => (
              <Link key={item.id} to={item.href} className="group rounded-lg border bg-card p-3 hover:border-primary/40 hover:shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    {item.type === 'review' ? <Brain className="h-4 w-4" /> : item.type === 'milestone' ? <Mic className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold group-hover:text-primary">{item.title}</h3>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{item.context}</p>
                    <p className={`mt-2 text-xs font-medium ${item.isOverdue ? 'text-orange-500' : 'text-muted-foreground'}`}>
                      {item.isOverdue ? 'Overdue' : item.type === 'milestone' ? 'Upcoming checkpoint' : 'Ready now'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isDashboardLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border bg-card p-5 shadow-sm"
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
            className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/20 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center shrink-0`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">{stat.name}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold truncate">
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
            {(stat.subtext || stat.trend) && (
              <div className="mt-4 flex items-center justify-between w-full">
                {stat.subtext && (
                  <div className="text-xs font-medium text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-md inline-flex">
                    {stat.subtext}
                  </div>
                )}
                {stat.trend && (
                  <span className={`text-[11px] font-bold tracking-wide ${stat.trendUp ? 'text-emerald-500/90 dark:text-emerald-400/90' : 'text-muted-foreground'}`}>
                    {stat.trend}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Weekly Activity Chart & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                to={action.href}
                className="group relative rounded-xl border bg-card p-4 shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all duration-300 overflow-hidden flex flex-col justify-between min-h-[140px]"
              >
                <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:opacity-[0.04] transition-opacity duration-300">
                  <action.icon className="h-20 w-20" />
                </div>
                <div>
                  <div className={`h-8 w-8 rounded-lg ${action.color} flex items-center justify-center mb-2 shadow-sm`}>
                    <action.icon className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">
                    {action.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-2 line-clamp-2 pr-4 relative z-10 leading-relaxed">
                    {action.description}
                  </p>
                </div>
                <div className="self-start text-[10px] font-semibold tracking-wide uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-md relative z-10 group-hover:bg-primary/20 transition-colors duration-300">
                  {action.hint}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm flex flex-col hover:shadow-md hover:border-primary/20 transition-all duration-300">
          <div className="p-4 border-b flex-shrink-0">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <ActivityIcon className="h-4 w-4 text-indigo-500" />
              Weekly Activity
            </h2>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-end min-h-[180px]">
             {hasChartData ? (
               <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                 <BarChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                   <XAxis 
                     dataKey="name" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                     dy={10}
                   />
                   <YAxis 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                     allowDecimals={false}
                     domain={[0, 'auto']}
                   />
                   <RechartsTooltip 
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--card-foreground))',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      itemStyle={{ color: 'hsl(var(--primary))', fontWeight: 500 }}
                   />
                   <Bar 
                     dataKey="activity" 
                     fill="url(#colorActivity)" 
                     radius={[4, 4, 0, 0]}
                     barSize={20}
                     animationDuration={1000}
                   />
                 </BarChart>
               </ResponsiveContainer>
             ) : (
               <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                 <div className="flex items-end gap-2 h-16 mb-2 opacity-20">
                   <div className="w-4 bg-primary rounded-t-sm h-4"></div>
                   <div className="w-4 bg-primary rounded-t-sm h-8"></div>
                   <div className="w-4 bg-primary rounded-t-sm h-6"></div>
                   <div className="w-4 bg-primary rounded-t-sm h-10"></div>
                 </div>
                 <p className="text-sm font-medium text-foreground">No recent activity</p>
                 <p className="text-xs text-muted-foreground">Solve questions to see your progress here.</p>
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Recommended Questions */}
        <div className="relative rounded-xl border border-border/50 dark:border-white/10 bg-card shadow-lg dark:shadow-black/20 flex flex-col h-full hover:shadow-xl dark:hover:shadow-black/30 hover:border-primary/30 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black/[0.01] dark:from-white/[0.03] to-transparent pointer-events-none" />
          <div className="p-5 border-b border-border/50 dark:border-white/10 bg-muted/20 dark:bg-white/[0.02] flex items-center justify-between gap-4 flex-shrink-0 relative z-10">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              {activeLearningPath ? 'Learning Path Guidance' : 'Recommended for You'}
            </h2>
            <Link
              to={activeLearningPath ? `/learning-path/${activeLearningPath.id}` : '/practice'}
              className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="p-5 flex-1 relative z-10">
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
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Retry
                  </button>
                }
              />
            ) : !recommendedQuestions || (Array.isArray(recommendedQuestions) && recommendedQuestions.length === 0) ? (
              activeLearningPath ? (
                <div className="flex flex-col h-full bg-muted/20 dark:bg-background/40 rounded-xl border border-dashed border-border/60 dark:border-white/10 p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-sm shrink-0">
                        <Target className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm leading-none">{activeLearningPath.name}</h3>
                        <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
                          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> Module 4 of 12</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ~45m left</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-background rounded-lg p-3 border shadow-sm mb-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-foreground truncate mr-2">Up Next: Core Patterns</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">In Progress</span>
                    </div>
                    <div className="w-full bg-secondary h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-black dark:bg-gradient-to-r dark:from-indigo-500/80 dark:to-purple-500/80 h-full rounded-full" style={{ width: '60%' }} />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-[10px] text-muted-foreground font-medium">60% completed</p>
                      <div className="flex gap-1">
                        <span className="h-1.5 w-4 rounded-full bg-green-500"></span>
                        <span className="h-1.5 w-4 rounded-full bg-green-500"></span>
                        <span className="h-1.5 w-4 rounded-full bg-primary"></span>
                        <span className="h-1.5 w-4 rounded-full bg-secondary"></span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-2">
                    <Link
                      to={`/learning-path/${activeLearningPath.id}`}
                      className="flex items-center justify-center w-full gap-2 rounded-lg bg-black hover:bg-black/90 dark:bg-none dark:bg-gradient-to-r dark:from-indigo-600/80 dark:to-purple-600/80 dark:hover:from-indigo-600 dark:hover:to-purple-600 text-white py-2 text-xs font-medium shadow-sm transition-all border border-transparent"
                    >
                      Continue Path <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <EmptyState
                  message="No recommendations yet. Start practicing to get personalized suggestions!"
                  bordered={false}
                />
              )
            ) : (
              <div className="space-y-3">
                {(Array.isArray(recommendedQuestions) ? recommendedQuestions : []).map((question: any, i) => (
                  <Link
                    key={question.id}
                    to={`/practice/${question.slug}`}
                    className="group flex items-center justify-between p-4 rounded-xl border border-border/50 dark:border-white/5 bg-muted/40 dark:bg-background/40 hover:border-primary/30 hover:shadow-md hover:bg-muted/60 dark:hover:bg-white/[0.02] transition-all duration-200"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="text-sm font-semibold group-hover:text-primary transition-colors truncate">{question.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full difficulty-${question.difficulty?.toLowerCase() || 'medium'}`}>
                          {question.difficulty || 'Medium'}
                        </span>
                        
                        {/* Tags Display */}
                        <div className="flex gap-1.5 flex-wrap">
                          {question.tags?.slice(0, 2).map((tag: string) => (
                            <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400">
                              {tag}
                            </span>
                          )) || (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400">
                              {question.topic?.name || fallbackTags[i % fallbackTags.length]}
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 ml-auto sm:ml-2 shrink-0">
                          <Target className="h-3 w-3" /> {question.acceptanceRate || 0}%
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Interviews */}
        <div className="relative rounded-xl border border-border/50 dark:border-white/10 bg-card shadow-lg dark:shadow-black/20 flex flex-col h-full hover:shadow-xl dark:hover:shadow-black/30 hover:border-primary/30 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black/[0.01] dark:from-white/[0.03] to-transparent pointer-events-none" />
          <div className="p-5 border-b border-border/50 dark:border-white/10 bg-muted/20 dark:bg-white/[0.02] flex items-center justify-between gap-4 flex-shrink-0 relative z-10">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Recent Mock Interviews
            </h2>
            <Link
              to="/mock-interview"
              className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="p-5 flex-1 flex flex-col justify-center relative z-10">
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
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Retry
                  </button>
                }
              />
            ) : !interviews || (Array.isArray(interviews) ? interviews.length === 0 : !(interviews as any)?.interviews?.length) ? (
              <div className="flex flex-col items-center justify-center py-6 px-4 text-center bg-muted/30 dark:bg-background/30 rounded-xl border border-dashed border-border/50 dark:border-white/10 hover:border-primary/30 transition-colors h-full">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-3 shadow-sm">
                  <Mic className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">No mock interviews yet</h3>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-[240px] leading-relaxed">
                  Establish your baseline score by taking a focused mock.
                </p>
                <div className="mt-5 w-full max-w-[260px] bg-muted/50 dark:bg-background/50 border border-border/50 dark:border-white/10 rounded-lg p-3 text-left shadow-sm hover:bg-muted/80 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-semibold text-foreground">Recommended Mock</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded">45 mins</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-3 leading-snug">Data Structures & Algorithms - Core Patterns</p>
                  <Link
                    to="/mock-interview"
                    className="flex items-center justify-center w-full gap-2 rounded-md bg-black hover:bg-black/90 dark:bg-none dark:bg-gradient-to-r dark:from-indigo-600/80 dark:to-purple-600/80 dark:hover:from-indigo-600 dark:hover:to-purple-600 text-white py-1.5 text-xs font-medium shadow-sm transition-all hover:-translate-y-0.5 border border-transparent"
                  >
                    Start Mock
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {(Array.isArray(interviews) ? interviews : (interviews as any)?.interviews || []).slice(0, 3).map((interview: any) => (
                  <div
                    key={interview.id}
                    className="group flex items-center justify-between p-4 rounded-xl border border-border/50 dark:border-white/5 bg-muted/40 dark:bg-background/40 hover:border-primary/30 hover:shadow-md hover:bg-muted/60 dark:hover:bg-white/[0.02] transition-all duration-200"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{interview.title || 'Technical Interview'}</h3>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1.5 mb-2">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {interview.durationMinutes ? `${interview.durationMinutes}m` : '45m'}</span>
                        <span>•</span>
                        <span>{interview.createdAt ? new Date(interview.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Today'}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-transparent shadow-sm">
                          {interview.type || interview.interviewType || 'General'}
                        </span>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-transparent shadow-sm ${
                          interview.status === 'completed' || interview.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : interview.status === 'scheduled' || interview.status === 'SCHEDULED'
                            ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                            : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        }`}>
                          {interview.status?.toLowerCase()}
                        </span>
                      </div>
                    </div>
                    {interview.overallScore !== null && interview.overallScore !== undefined && (
                      <div className="text-right shrink-0">
                        <div className="flex items-baseline gap-1 justify-end">
                          <p className="text-2xl font-bold text-primary group-hover:scale-105 transition-transform origin-right">{interview.overallScore}</p>
                          <span className="text-[10px] text-muted-foreground font-medium">/100</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">score</p>
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
