import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Activity,
  Code2,
  Mic,
  FileText,
  DollarSign,
  UserPlus,
  AlertTriangle,
  Cpu,
  Gauge,
  TimerReset
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { adminApi } from '../../services/adminApi';

type JudgeReliability = {
  summary: {
    totalSubmissions: number;
    acceptedSubmissions: number;
    failureSubmissions: number;
    inProgressSubmissions: number;
    successRate: number;
    failureRate: number;
    timeoutRate: number;
    compilationErrorRate: number;
    runtimeErrorRate: number;
    averageExecutionTimeMs: number;
    maxExecutionTimeMs: number;
  };
  verdictBreakdown: Array<{
    status: string;
    label: string;
    count: number;
    rate: number;
  }>;
  languageBreakdown: Array<{
    language: string;
    submissions: number;
    averageExecutionTimeMs: number;
    averagePassedTests: number;
    averageTotalTests: number;
    averagePassRate: number;
  }>;
  topErrorSignatures: Array<{
    signature: string;
    count: number;
    statuses: string[];
    languages: string[];
  }>;
  recentFailures: Array<{
    id: string;
    label: string;
    language: string;
    executionTime: number | null;
    testCasesPassed: number;
    testCasesTotal: number;
    submittedAt: string;
    questionTitle: string;
    userName: string;
    userEmail: string;
    firstFailedTestIndex: number | null;
    errorMessage: string | null;
  }>;
};

function formatPercent(value?: number) {
  return `${value ?? 0}%`;
}

function formatMs(value?: number | null) {
  return `${value ?? 0} ms`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function verdictTone(status: string) {
  if (status === 'ACCEPTED') return 'bg-green-500';
  if (status === 'PENDING' || status === 'RUNNING') return 'bg-blue-500';
  if (status === 'TIME_LIMIT_EXCEEDED') return 'bg-amber-500';
  if (status === 'COMPILATION_ERROR' || status === 'RUNTIME_ERROR') return 'bg-red-500';
  return 'bg-zinc-500';
}

export function AdminDashboardPage() {

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
  });

  const { data: chartData } = useQuery({
    queryKey: ['admin-growth-chart'],
    queryFn: () => adminApi.getGrowthChart(),
  });

  const { data: judgeReliability } = useQuery<JudgeReliability>({
    queryKey: ['admin-judge-reliability', 7],
    queryFn: () => adminApi.getJudgeReliability(7),
  });

  const statCards = [
    {
      name: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'New Signups Today',
      value: stats?.newSignupsToday || 0,
      icon: UserPlus,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Daily Active Users (DAU)',
      value: stats?.dau || 0,
      icon: Activity,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      name: 'Monthly Active Users',
      value: stats?.mau || 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'Problems Solved Today',
      value: stats?.problemsSolvedToday || 0,
      icon: Code2,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      name: 'Mock Interviews Today',
      value: stats?.mockInterviewsToday || 0,
      icon: Mic,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      name: 'Resumes Uploaded Today',
      value: stats?.resumesToday || 0,
      icon: FileText,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
    },
    {
      name: 'Total Revenue',
      value: `$${stats?.totalRevenue || 0}`,
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
  ];

  const judgeCards = [
    {
      name: 'Judge Success Rate',
      value: formatPercent(judgeReliability?.summary.successRate),
      detail: `${judgeReliability?.summary.acceptedSubmissions || 0} accepted`,
      icon: Gauge,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Failure Rate',
      value: formatPercent(judgeReliability?.summary.failureRate),
      detail: `${judgeReliability?.summary.failureSubmissions || 0} failed`,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      name: 'Avg Runtime',
      value: formatMs(judgeReliability?.summary.averageExecutionTimeMs),
      detail: `Peak ${formatMs(judgeReliability?.summary.maxExecutionTimeMs)}`,
      icon: Cpu,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      name: 'Timeout Rate',
      value: formatPercent(judgeReliability?.summary.timeoutRate),
      detail: `${formatPercent(judgeReliability?.summary.compilationErrorRate)} compile errors`,
      icon: TimerReset,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">
          Admin Overview
        </h1>
        <p className="text-muted-foreground mt-1">
          Platform statistics and daily metrics.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
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
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Growth Chart */}
        <div className="rounded-xl border bg-card shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-6">User Growth (Last 7 Days)</h2>
          <div className="h-72 w-full">
            {!chartData ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">Loading chart...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="newUsers" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Judge Reliability */}
        <div className="rounded-xl border bg-card shadow-sm p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Judge Reliability</h2>
              <p className="text-sm text-muted-foreground">Last 7 days of code-run health.</p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              {judgeReliability?.summary.totalSubmissions || 0} submissions
            </span>
          </div>

          {!judgeReliability ? (
            <div className="h-72 flex items-center justify-center text-muted-foreground">Loading judge metrics...</div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {judgeCards.map((card) => (
                  <div key={card.name} className="rounded-lg border p-4">
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                        <card.icon className={`h-5 w-5 ${card.color}`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{card.name}</p>
                        <p className="text-xl font-bold">{card.value}</p>
                        <p className="text-xs text-muted-foreground">{card.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold">Verdict Mix</h3>
                <div className="space-y-3">
                  {judgeReliability.verdictBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No judge submissions in this window.</p>
                  ) : (
                    judgeReliability.verdictBreakdown.map((item) => (
                      <div key={item.status}>
                        <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                          <span>{item.label}</span>
                          <span className="text-muted-foreground">{item.count} · {formatPercent(item.rate)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full ${verdictTone(item.status)}`}
                            style={{ width: `${Math.max(item.rate, item.count > 0 ? 4 : 0)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Judge Details */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="rounded-xl border bg-card shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-6">Language Health</h2>
          {!judgeReliability ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">Loading languages...</div>
          ) : judgeReliability.languageBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No language data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Language</th>
                    <th className="pb-3 font-medium">Runs</th>
                    <th className="pb-3 font-medium">Pass Rate</th>
                    <th className="pb-3 font-medium">Avg Runtime</th>
                  </tr>
                </thead>
                <tbody>
                  {judgeReliability.languageBreakdown.map((language) => (
                    <tr key={language.language} className="border-b last:border-0">
                      <td className="py-3 font-medium capitalize">{language.language}</td>
                      <td className="py-3">{language.submissions}</td>
                      <td className="py-3">{formatPercent(language.averagePassRate)}</td>
                      <td className="py-3">{formatMs(language.averageExecutionTimeMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-6">Common Judge Errors</h2>
          {!judgeReliability ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">Loading errors...</div>
          ) : judgeReliability.topErrorSignatures.length === 0 ? (
            <p className="text-sm text-muted-foreground">No captured failing testcase errors in this window.</p>
          ) : (
            <div className="space-y-4">
              {judgeReliability.topErrorSignatures.map((error) => (
                <div key={error.signature} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{error.signature}</p>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                      {error.count}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {error.statuses.join(', ')} · {error.languages.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-6">Recent Judge Failures</h2>
          {!judgeReliability ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">Loading failures...</div>
          ) : judgeReliability.recentFailures.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent failed submissions.</p>
          ) : (
            <div className="space-y-4">
              {judgeReliability.recentFailures.map((failure) => (
                <div key={failure.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{failure.questionTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {failure.userName || failure.userEmail} · {formatDateTime(failure.submittedAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                      {failure.label}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="capitalize">{failure.language}</span>
                    <span>{failure.testCasesPassed}/{failure.testCasesTotal} tests</span>
                    <span>{formatMs(failure.executionTime)}</span>
                    {failure.firstFailedTestIndex !== null && (
                      <span>Failed test {failure.firstFailedTestIndex + 1}</span>
                    )}
                  </div>
                  {failure.errorMessage && (
                    <pre className="mt-3 max-h-20 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-2 text-xs">
                      {failure.errorMessage}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
    </div>
  );
}
