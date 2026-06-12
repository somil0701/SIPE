import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { Layout } from './components/Layout'
import { AdminLayout } from './components/AdminLayout'

const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((module) => ({ default: module.RegisterPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const PracticePage = lazy(() => import('./pages/PracticePage').then((module) => ({ default: module.PracticePage })))
const QuestionPage = lazy(() => import('./pages/QuestionPage').then((module) => ({ default: module.QuestionPage })))
const MockInterviewPage = lazy(() => import('./pages/MockInterviewPage').then((module) => ({ default: module.MockInterviewPage })))
const InterviewSessionPage = lazy(() => import('./pages/InterviewSessionPage').then((module) => ({ default: module.InterviewSessionPage })))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })))
const ResumePage = lazy(() => import('./pages/ResumePage').then((module) => ({ default: module.ResumePage })))
const SpacedRepetitionPage = lazy(() => import('./pages/SpacedRepetitionPage').then((module) => ({ default: module.SpacedRepetitionPage })))
const LearningPathPage = lazy(() => import('./pages/LearningPathPage').then((module) => ({ default: module.LearningPathPage })))
const LearningPathDetailPage = lazy(() => import('./pages/LearningPathDetailPage').then((module) => ({ default: module.LearningPathDetailPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })))
const AdminQuestionsPage = lazy(() => import('./pages/admin/AdminQuestionsPage').then((module) => ({ default: module.AdminQuestionsPage })))
const AdminInterviewsPage = lazy(() => import('./pages/admin/AdminInterviewsPage').then((module) => ({ default: module.AdminInterviewsPage })))
const AdminResumesPage = lazy(() => import('./pages/admin/AdminResumesPage').then((module) => ({ default: module.AdminResumesPage })))

function PageLoader() {
  return (
    <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
      Loading...
    </div>
  )
}

function App() {
  // const { isAuthenticated } = useAuthStore()
  // const isHydrated = useAuthStore((state) => state.isHydrated)

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isHydrated = useAuthStore((state) => state.isHydrated)
  const user = useAuthStore((state) => state.user)


  if (!isHydrated) {
  return (
    <div className="flex items-center justify-center h-screen">
      Loading...
    </div>
  )
}

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />}
        />

        {/* Protected Routes */}
        <Route element={<Layout />}>
          <Route
            path="/dashboard"
            element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/practice"
            element={isAuthenticated ? <PracticePage /> : <Navigate to="/login" />}
          />
          <Route
            path="/practice/:slug"
            element={isAuthenticated ? <QuestionPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/mock-interview"
            element={isAuthenticated ? <MockInterviewPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/mock-interview/:id"
            element={isAuthenticated ? <InterviewSessionPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/analytics"
            element={isAuthenticated ? <AnalyticsPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/resume"
            element={isAuthenticated ? <ResumePage /> : <Navigate to="/login" />}
          />
          <Route
            path="/spaced-repetition"
            element={isAuthenticated ? <SpacedRepetitionPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/learning-path"
            element={isAuthenticated ? <LearningPathPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/learning-path/:id"
            element={isAuthenticated ? <LearningPathDetailPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/profile"
            element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" />}
          />
        </Route>

        {/* Admin Routes */}
        <Route element={<AdminLayout />}>
          <Route
            path="/admin"
            element={(isAuthenticated && user?.role === 'admin') ? <AdminDashboardPage /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/admin/users"
            element={(isAuthenticated && user?.role === 'admin') ? <AdminUsersPage /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/admin/questions"
            element={(isAuthenticated && user?.role === 'admin') ? <AdminQuestionsPage /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/admin/mock-interviews"
            element={(isAuthenticated && user?.role === 'admin') ? <AdminInterviewsPage /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/admin/resumes"
            element={(isAuthenticated && user?.role === 'admin') ? <AdminResumesPage /> : <Navigate to="/dashboard" />}
          />
        </Route>

        {/* Default Redirect */}
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />}
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  )
}

export default App
