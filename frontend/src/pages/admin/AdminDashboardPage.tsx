import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Activity,
  Code2,
  Mic,
  FileText,
  DollarSign,
  UserPlus
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
export function AdminDashboardPage() {

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
  });

  const { data: chartData } = useQuery({
    queryKey: ['admin-growth-chart'],
    queryFn: () => adminApi.getGrowthChart(),
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

        {/* Placeholder for feature usage */}
        <div className="rounded-xl border bg-card shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-6">System Health</h2>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="font-medium">Database (PostgreSQL)</span>
                </div>
                <span className="text-sm text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Operational</span>
             </div>
             <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="font-medium">Cache (Redis)</span>
                </div>
                <span className="text-sm text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Operational</span>
             </div>
             <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="font-medium">API Endpoints</span>
                </div>
                <span className="text-sm text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Operational</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
