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
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true'
  })
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
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
              <Link
                to="/dashboard"
                className="flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => setSidebarOpen(false)}
              >
                <Brain className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">InterviewPrep</span>
              </Link>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-2 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Close navigation menu"
              >
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
              {user?.role === 'admin' && (
                <div className="pt-4 mt-4 border-t border-border">
                  <Link
                    to="/admin"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Shield className="h-5 w-5" />
                    Admin Portal
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div
        className={`hidden transition-[width] duration-200 lg:fixed lg:inset-y-0 lg:flex lg:flex-col ${
          sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
        }`}
      >
        <div className={`flex flex-col gap-2 border-r bg-background py-4 ${sidebarCollapsed ? 'px-3' : 'px-4'}`}>
          <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            <Link
              to="/dashboard"
              className={`flex min-w-0 items-center rounded-lg px-2 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                sidebarCollapsed ? 'justify-center' : 'gap-2'
              }`}
              title="InterviewPrep"
            >
              <Brain className="h-8 w-8 shrink-0 text-primary" />
              {!sidebarCollapsed && <span className="truncate text-xl font-bold">InterviewPrep</span>}
            </Link>
            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>
          {sidebarCollapsed && (
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="mx-auto rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}
          <nav className="space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                title={sidebarCollapsed ? item.name : undefined}
                className={`flex items-center rounded-lg py-2 text-sm font-medium transition-colors ${
                  location.pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                } ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'}`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && item.name}
              </Link>
            ))}
            {user?.role === 'admin' && (
              <div className="pt-4 mt-4 border-t border-border">
                <Link
                  to="/admin"
                  title={sidebarCollapsed ? 'Admin Portal' : undefined}
                  className={`flex items-center rounded-lg py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 ${
                    sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'
                  }`}
                >
                  <Shield className="h-5 w-5 shrink-0" />
                  {!sidebarCollapsed && 'Admin Portal'}
                </Link>
              </div>
            )}
          </nav>
          <div className="mt-auto">
            <div className={`flex items-center rounded-lg border p-3 ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10"
                title={sidebarCollapsed ? `${user?.fullName || 'User'} (${user?.email || ''})` : undefined}
              >
                <User className="h-5 w-5 text-primary" />
              </div>
              {!sidebarCollapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user?.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-lg p-2 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    title="Logout"
                    aria-label="Log out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
            {sidebarCollapsed && (
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                title="Logout"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-[padding-left] duration-200 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Mobile header */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Open navigation menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
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
