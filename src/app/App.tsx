import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '../features/auth/components/RequireAuth'
import { RequireConfigured } from '../features/auth/components/RequireConfigured'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RequireConfigured>
            <LoginPage />
          </RequireConfigured>
        }
      />
      <Route
        path="/"
        element={
          <RequireConfigured>
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          </RequireConfigured>
        }
      />
      <Route
        path="/transactions"
        element={
          <RequireConfigured>
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          </RequireConfigured>
        }
      />
      <Route
        path="/accounts"
        element={
          <RequireConfigured>
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          </RequireConfigured>
        }
      />
      <Route
        path="/categories"
        element={
          <RequireConfigured>
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          </RequireConfigured>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
