import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { adminLogin, verifyAdminToken } from '../services/authService'
import type { AdminUser } from '../types'

const STORAGE_KEY = 'cs_admin_user'

interface AuthContextValue {
  admin: AdminUser | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
  /** True while the initial token validation is in progress */
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount, validate the stored token against the server before trusting it.
  // This prevents stale/expired/revoked tokens from bypassing route guards.
  useEffect(() => {
    async function validateStoredSession() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        const token = sessionStorage.getItem('admin_token')  // sessionStorage — tab-scoped
        if (!stored || !token) return

        const parsed = JSON.parse(stored) as AdminUser
        const valid = await verifyAdminToken()
        if (valid) {
          setAdmin(parsed)
        } else {
          // Token is expired or revoked — clear everything
          localStorage.removeItem(STORAGE_KEY)
          sessionStorage.removeItem('admin_token')
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
        sessionStorage.removeItem('admin_token')
      } finally {
        setIsLoading(false)
      }
    }

    validateStoredSession()
  }, [])

  useEffect(() => {
    if (admin) localStorage.setItem(STORAGE_KEY, JSON.stringify(admin))
    else localStorage.removeItem(STORAGE_KEY)
  }, [admin])

  const login = async (email: string, password: string): Promise<boolean> => {
    const result = await adminLogin(email, password)
    if (result) { setAdmin(result); return true }
    return false
  }

  const logout = () => { 
    setAdmin(null)
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem('admin_token')  // sessionStorage — tab-scoped
  }

  return (
    <AuthContext.Provider value={{ admin, login, logout, isAuthenticated: admin !== null, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAdmin() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAdmin must be used within AuthProvider')
  return ctx
}
