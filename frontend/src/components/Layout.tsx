import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import {
  LayoutDashboard,
  Code2,
  Mic,
  BarChart3,
  FileText,
  Repeat,
  Map,
  User,
  LogOut,
  Menu,
  X,
  Brain,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Practice', href: '/practice', icon: Code2 },
  { name: 'Mock Interview', href: '/mock-interview', icon: Mic },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Resume', href: '/resume', icon: FileText },
  { name: 'Spaced Repetition', href: '/spaced-repetition', icon: Repeat },
  { name: 'Learning Path', href: '/learning-path', icon: Map },
  { name: 'Profile', href: '/profile', icon: User },
]

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-gray-900/80"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-900">
            <div className="flex h-16 items-center justify-between px-4">
              <Link to="/dashboard" className="flex items-center gap-2">
                <Brain className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">InterviewPrep</span>
              </Link>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="space-y-1 px-2 py-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                    location.pathname === item.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col gap-2 border-r bg-background px-4 py-4">
          <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
            <Brain className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">InterviewPrep</span>
          </Link>
          <nav className="space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  location.pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="mt-auto">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-muted rounded-lg"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <span className="font-bold">InterviewPrep</span>
          </Link>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}