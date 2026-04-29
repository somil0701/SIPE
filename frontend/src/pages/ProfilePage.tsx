import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { User, Mail, Clock, Code2, Loader2, LogOut } from 'lucide-react'
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user?.fullName}</h2>
              <p className="text-muted-foreground flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {user?.email}
              </p>
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                {user?.role}
              </span>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Preferred Language</label>
                <select
                  value={formData.preferredLanguage}
                  onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Daily Study Goal (minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="480"
                  value={formData.studyGoalMinutes}
                  onChange={(e) => setFormData({ ...formData, studyGoalMinutes: parseInt(e.target.value) })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 rounded-lg border px-4 py-2 text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin inline mr-2" />}
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Preferred Language</p>
                  <p className="font-medium capitalize flex items-center gap-2">
                    <Code2 className="h-4 w-4" />
                    {user?.preferredLanguage}
                  </p>
                </div>
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Daily Goal</p>
                  <p className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {user?.studyGoalMinutes} minutes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="w-full rounded-lg border px-4 py-2 text-sm hover:bg-muted"
              >
                Edit Profile
              </button>
            </div>
          )}
        </div>

        {/* Stats Card */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4">Your Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Attempts</span>
              <span className="font-medium">{stats?.totalAttempts || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Questions Solved</span>
              <span className="font-medium">{stats?.totalSolved || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Accuracy</span>
              <span className="font-medium">{stats?.accuracy || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unique Questions</span>
              <span className="font-medium">{stats?.uniqueQuestionsAttempted || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/10 p-6">
        <h3 className="font-semibold text-red-600 mb-2">Danger Zone</h3>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-100"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  )
}
