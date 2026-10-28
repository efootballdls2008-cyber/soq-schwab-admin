import { post, get } from '../api/client'
import type { AdminUser } from '../types'

// POST /auth/login returns { success, token, user } — no { success, data } wrapper
// so unwrap() returns the full object as-is
interface LoginResponse {
  success: boolean
  token: string
  user: {
    id: number
    email: string
    firstName: string
    lastName: string
    role: string
  }
}

export async function adminLogin(email: string, password: string): Promise<AdminUser | null> {
  try {
    const response = await post<LoginResponse>('/auth/login', { email, password })

    if (!response.success || !response.token) return null

    // Only allow Admin role
    if (response.user.role !== 'Admin') return null

    // Store in sessionStorage — tab-scoped, cleared on close, not shared across tabs.
    // See client.ts TOKEN_KEY comment for the full security rationale.
    sessionStorage.setItem('admin_token', response.token)

    return {
      id: response.user.id,
      email: response.user.email,
      firstName: response.user.firstName,
      lastName: response.user.lastName,
      role: response.user.role,
      avatar: null,
      balance: 0,
      currency: 'USD',
    }
  } catch {
    return null
  }
}

/**
 * Validates the stored admin token against the server.
 * Called on app mount to reject stale/expired/revoked tokens before
 * trusting localStorage and granting access to protected routes.
 */
export async function verifyAdminToken(): Promise<boolean> {
  try {
    await get<unknown>('/auth/me')
    return true
  } catch {
    return false
  }
}
