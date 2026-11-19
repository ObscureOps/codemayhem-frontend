import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AuthLayout from './components/auth/AuthLayout'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import TutorialPage from './pages/TutorialPage'
import BattlePage from './pages/BattlePage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProblemsPage from './pages/ProblemsPage'
import ProblemPage from './pages/ProblemPage'
import CreateProblemPage from './pages/CreateProblemPage'
import EditProblemPage from './pages/EditProblemPage'
import SecurityPage from './pages/SecurityPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tutorial" element={<TutorialPage />} />
            <Route path="/problems" element={<ProblemsPage />} />
            <Route path="/problems/new" element={<CreateProblemPage />} />
            <Route path="/problems/:id" element={<ProblemPage />} />
            <Route path="/problems/:id/edit" element={<EditProblemPage />} />
            <Route path="/battle" element={<BattlePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/security" element={<SecurityPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}
