import { Routes, Route, Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'
import DashboardPage from './pages/Dashboard'
import SearchesPage from './pages/Searches'
import SearchDetailPage from './pages/SearchDetail'
import SettingsPage from './pages/Settings'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('access_token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/searches"
        element={
          <ProtectedRoute>
            <SearchesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/searches/:id"
        element={
          <ProtectedRoute>
            <SearchDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
