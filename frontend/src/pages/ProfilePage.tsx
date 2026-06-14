import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  User, Mail, Clock, Code2, Loader2, LogOut,
  Settings, BookOpen, Activity, Target, CheckCircle2,
  PieChart, BrainCircuit, Calendar, Pencil
} from 'lucide-react'
import { userApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'

const LANGUAGES = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'python', name: 'Python' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' },
  { id: 'csharp', name: 'C#' },
  { id: 'go', name: 'Go' },
  { id: 'rust', name: 'Rust' },
  { id: 'ruby', name: 'Ruby' },
]

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    preferredLanguage: user?.preferredLanguage || 'javascript',
    studyGoalMinutes: user?.studyGoalMinutes || 60,
  })

  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => userApi.getStats(),
  })

  const updateMutation = useMutation({
    mutationFn: () => userApi.updateProfile(formData),
    onSuccess: (data) => {
      updateUser(data)
      toast.success('Profile updated!')
      setIsEditing(false)
    },
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Format joined date if available, otherwise just use a fallback or omit
  const joinedDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently joined'

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile & Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your account settings, learning preferences, and view your progress.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: User Card & Stats */}
        <div className="space-y-8">
          {/* User Card */}
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="h-24 bg-primary/10"></div>
            <div className="px-6 pb-6 relative">
              <div className="absolute -top-12 left-6 flex h-24 w-24 items-center justify-center rounded-xl border-4 border-card bg-primary/10 shadow-sm">
                <User className="h-10 w-10 text-primary" />
              </div>
              <div className="pt-14 space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">{user?.fullName}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user?.email}</span>
                </div>
                <div className="flex items-center gap-3 pt-3">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary capitalize">
                    {user?.role || 'User'}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Joined {joinedDate}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <PieChart className="h-5 w-5 text-primary" />
              Your Stats
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <span>Total Attempts</span>
                </div>
                <span className="font-medium">{stats?.totalAttempts || 0}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Questions Solved</span>
                </div>
                <span className="font-medium">{stats?.totalSolved || 0}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BrainCircuit className="h-4 w-4 text-blue-500" />
                  <span>Accuracy</span>
                </div>
                <span className="font-medium">{stats?.accuracy || 0}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Code2 className="h-4 w-4 text-orange-500" />
                  <span>Unique Questions</span>
                </div>
                <span className="font-medium">{stats?.uniqueQuestionsAttempted || 0}</span>
              </div>
            </div>
          </div>
          
          {/* Danger Zone */}
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
            <h3 className="mb-2 text-sm font-semibold text-destructive">Danger Zone</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Sign out of your account on this device.
            </p>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-background px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Right Column: Settings & Preferences */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Account Settings */}
          <div className="rounded-xl border bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold">
                <Settings className="h-5 w-5 text-primary" />
                Account Settings
              </h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Profile
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Preferred Language</label>
                  <select
                    value={formData.preferredLanguage}
                    onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.id} value={lang.id}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Daily Study Goal (minutes)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="480"
                    value={formData.studyGoalMinutes}
                    onChange={(e) => setFormData({ ...formData, studyGoalMinutes: parseInt(e.target.value) })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                    className="flex-1 flex justify-center items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Full Name</h4>
                    <p className="mt-1 text-sm font-medium">{user?.fullName}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Email Address</h4>
                    <p className="mt-1 text-sm font-medium">{user?.email}</p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Learning Preferences
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-4 rounded-lg border bg-muted/40 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Code2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Preferred Language</p>
                        <p className="font-semibold capitalize">{user?.preferredLanguage}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 rounded-lg border bg-muted/40 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Daily Goal</p>
                        <p className="font-semibold">{user?.studyGoalMinutes} minutes</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </h3>
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
              <div className="mb-3 rounded-full bg-muted p-3">
                <Activity className="h-6 w-6 text-muted-foreground" />
              </div>
              <h4 className="font-medium">No recent activity</h4>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Your recent practice sessions and mock interviews will appear here once you start practicing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
