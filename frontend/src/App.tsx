import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { PracticePage } from './pages/PracticePage'
import { QuestionPage } from './pages/QuestionPage'
import { MockInterviewPage } from './pages/MockInterviewPage'
import { InterviewSessionPage } from './pages/InterviewSessionPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { ResumePage } from './pages/ResumePage'
import { SpacedRepetitionPage } from './pages/SpacedRepetitionPage'
import { LearningPathPage } from './pages/LearningPathPage'
import { LearningPathDetailPage } from './pages/LearningPathDetailPage'
import { ProfilePage } from './pages/ProfilePage'

function App() {
  // const { isAuthenticated } = useAuthStore()
  // const isHydrated = useAuthStore((state) => state.isHydrated)

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isHydrated = useAuthStore((state) => state.isHydrated)


  if (!isHydrated) {
  return (
    <div className="flex items-center justify-center h-screen">
      Loading...
    </div>
  )
}

  return (
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

      {/* Default Redirect */}
      <Route 
        path="/" 
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} 
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
