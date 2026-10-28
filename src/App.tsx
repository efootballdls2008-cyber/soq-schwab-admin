import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAdmin } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { ReactNode } from 'react'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import UserDetail from './pages/UserDetail'
import Deposits from './pages/Deposits'
import Withdrawals from './pages/Withdrawals'
import Orders from './pages/Orders'
import BotTrades from './pages/BotTrades'
import PlatformAccounts from './pages/PlatformAccounts'
import Settings from './pages/Settings'
import Notifications from './pages/Notifications'

function Guard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAdmin()
  // Wait for server-side token validation before making a redirect decision.
  // Without this, a valid stored session would flash to /login on every page load.
  if (isLoading) return null
  return isAuthenticated ? <>{children}</> : <Navigate to="/admin/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin/dashboard" element={<Guard><Dashboard /></Guard>} />
      <Route path="/admin/users" element={<Guard><Users /></Guard>} />
      <Route path="/admin/users/:id" element={<Guard><UserDetail /></Guard>} />
      <Route path="/admin/deposits" element={<Guard><Deposits /></Guard>} />
      <Route path="/admin/withdrawals" element={<Guard><Withdrawals /></Guard>} />
      <Route path="/admin/orders" element={<Guard><Orders /></Guard>} />
      <Route path="/admin/bot-trades" element={<Guard><BotTrades /></Guard>} />
      <Route path="/admin/accounts" element={<Guard><PlatformAccounts /></Guard>} />
      <Route path="/admin/settings" element={<Guard><Settings /></Guard>} />
      <Route path="/admin/notifications" element={<Guard><Notifications /></Guard>} />
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppRoutes />
      </NotificationProvider>
    </AuthProvider>
  )
}
