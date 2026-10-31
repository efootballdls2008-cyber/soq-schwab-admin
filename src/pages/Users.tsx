import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import AdminLayout from '../components/layout/AdminLayout'
import { getAllUsers, getAllUsersWithPasswords, suspendUser, activateUser, deleteUser, resetUserPassword } from '../services/userService'
import type { AdminUser } from '../types'

const fmt = (n: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)

function DeleteConfirmModal({ user, onConfirm, onCancel, loading }: {
  user: AdminUser
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onCancel}
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
        style={{ background: 'linear-gradient(145deg, #130d35, #1a1040)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #f87171, transparent)' }} />
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)' }}>
              <i className="fas fa-trash text-sm" style={{ color: '#f87171' }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Delete User</h3>
              <p className="text-xs" style={{ color: '#6b7280' }}>This action cannot be undone</p>
            </div>
          </div>
          <p className="text-xs" style={{ color: '#9ca3af' }}>
            Are you sure you want to delete <span className="text-white font-semibold">{user.firstName} {user.lastName}</span>? All their data will be permanently removed.
          </p>
          <div className="flex gap-3 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #dc2626, #f87171)', color: '#fff' }}
            >
              {loading ? <i className="fas fa-spinner fa-spin" /> : 'Delete'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ResetPasswordModal({ user, password, setPassword, onConfirm, onCancel, loading }: {
  user: AdminUser
  password: string
  setPassword: (pwd: string) => void
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const [showPw, setShowPw] = useState(false)
  
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onCancel}
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
        style={{ background: 'linear-gradient(145deg, #130d35, #1a1040)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)' }} />
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)' }}>
              <i className="fas fa-key text-sm" style={{ color: '#c9a84c' }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Reset Password</h3>
              <p className="text-xs" style={{ color: '#6b7280' }}>Set new password for {user.firstName} {user.lastName}</p>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>New Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-3 pr-10 py-2.5 rounded-xl text-sm text-white outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <button 
                type="button" 
                onClick={() => setShowPw(p => !p)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <i className={`fas ${showPw ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
              </button>
            </div>
            <p className="text-xs mt-1.5" style={{ color: '#6b7280' }}>
              At least 8 characters with uppercase, lowercase, and number
            </p>
          </div>
          
          <div className="flex gap-3 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading || !password}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #a28539, #c9a84c)', color: '#0d0824' }}
            >
              {loading ? <i className="fas fa-spinner fa-spin" /> : 'Reset Password'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Users() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try { 
      // Load users with or without passwords based on toggle state
      const userData = showPasswords ? await getAllUsersWithPasswords() : await getAllUsers()
      setUsers(userData)
    }
    catch { showToast('Failed to load users', 'error') }
    finally { setLoading(false) }
  }, [showPasswords])

  useEffect(() => { load() }, [load])

  // Keyboard shortcut: Ctrl+Shift+M to toggle password display
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault()
        setShowPasswords(prev => {
          const newState = !prev
          showToast(newState ? '⚠️ Password column visible' : 'Password column hidden', newState ? 'error' : 'success')
          return newState
        })
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  const filtered = users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return `${u.firstName} ${u.lastName} ${u.email} ${u.role}`.toLowerCase().includes(q)
  })

  async function handleToggleStatus(user: AdminUser) {
    try {
      if (user.accountStatus === 'suspended') {
        await activateUser(user.id)
        showToast(`${user.firstName} ${user.lastName} activated.`, 'success')
      } else {
        await suspendUser(user.id)
        showToast(`${user.firstName} ${user.lastName} suspended.`, 'success')
      }
      await load()
    } catch { showToast('Action failed', 'error') }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteUser(deleteTarget.id)
      showToast(`${deleteTarget.firstName} ${deleteTarget.lastName} deleted.`, 'success')
      setDeleteTarget(null)
      await load()
    } catch { showToast('Failed to delete user', 'error') }
    finally { setDeleteLoading(false) }
  }

  async function handleResetPassword() {
    if (!resetTarget || !resetPassword) return
    
    // Validate password
    if (resetPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error')
      return
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(resetPassword)) {
      showToast('Password must contain uppercase, lowercase, and number', 'error')
      return
    }

    setResetLoading(true)
    try {
      await resetUserPassword(resetTarget.id, resetPassword)
      showToast(`Password reset for ${resetTarget.firstName} ${resetTarget.lastName}`, 'success')
      setResetTarget(null)
      setResetPassword('')
      await load()
    } catch { showToast('Failed to reset password', 'error') }
    finally { setResetLoading(false) }
  }

  return (
    <AdminLayout title="Users" subtitle="Manage all registered users">
      <AnimatePresence>
        {toast && (
          <motion.div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} style={{ background: toast.type === 'success' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)', color: toast.type === 'success' ? '#4ade80' : '#f87171', border: `1px solid ${toast.type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
            <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2`} />{toast.msg}
          </motion.div>
        )}
        {deleteTarget && (
          <DeleteConfirmModal
            user={deleteTarget}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            loading={deleteLoading}
          />
        )}
        {resetTarget && (
          <ResetPasswordModal
            user={resetTarget}
            password={resetPassword}
            setPassword={setResetPassword}
            onConfirm={handleResetPassword}
            onCancel={() => { setResetTarget(null); setResetPassword('') }}
            loading={resetLoading}
          />
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Users', value: users.length, color: '#60a5fa' },
            { label: 'Active', value: users.filter(u => u.accountStatus !== 'suspended').length, color: '#4ade80' },
            { label: 'Suspended', value: users.filter(u => u.accountStatus === 'suspended').length, color: '#f87171' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#6b7280' }} />
          <input type="text" placeholder="Search by name, email, role…" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 text-sm text-gray-300 rounded-xl outline-none" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.08)' }} />
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr style={{ background: '#1a1040', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['User', 'Email', 'Role', 'Balance', 'Currency', ...(showPasswords ? ['Password'] : []), 'KYC', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: '#6b7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={showPasswords ? 9 : 8} className="py-16 text-center text-gray-500"><i className="fas fa-spinner fa-spin mr-2" />Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={showPasswords ? 9 : 8} className="py-16 text-center text-gray-500">No users found.</td></tr>
                ) : filtered.map((u, i) => {
                  const isSuspended = u.accountStatus === 'suspended'
                  const initials = `${u.firstName[0]}${u.lastName[0]}`.toUpperCase()
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }} onClick={() => navigate(`/admin/users/${u.id}`)}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c' }}>{initials}</div>
                          <div>
                            <p className="text-xs font-semibold text-white">{u.firstName} {u.lastName}</p>
                            <p className="text-xs" style={{ color: '#6b7280' }}>#{u.id} · {u.memberSince ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-300">{u.email}</td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: u.role === 'Admin' ? 'rgba(201,168,76,0.12)' : 'rgba(96,165,250,0.12)', color: u.role === 'Admin' ? '#c9a84c' : '#60a5fa' }}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-bold text-white">{fmt(u.balance, u.currency || 'USD')}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-lg"
                          style={{ background: 'rgba(162,133,57,0.12)', color: '#c9a84c', border: '1px solid rgba(162,133,57,0.25)' }}
                        >
                          {u.currency || 'USD'}
                        </span>
                      </td>
                      {showPasswords && (
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-300 bg-black/20 px-2 py-1 rounded">
                              {u.plainPassword || '••••••••'}
                            </span>
                            {!u.plainPassword && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setResetTarget(u)
                                }}
                                className="px-2 py-1 rounded text-xs"
                                style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}
                                title="Reset password"
                              >
                                <i className="fas fa-key text-xs" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold" style={{ color: u.kycVerified ? '#4ade80' : '#f87171' }}>
                          <i className={`fas ${u.kycVerified ? 'fa-check-circle' : 'fa-times-circle'} mr-1`} />
                          {u.kycVerified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: isSuspended ? 'rgba(248,113,113,0.12)' : 'rgba(74,222,128,0.12)', color: isSuspended ? '#f87171' : '#4ade80' }}>
                          {isSuspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <button onClick={() => navigate(`/admin/users/${u.id}`)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }} title="View details">
                            <i className="fas fa-eye text-xs" />
                          </button>
                          <button onClick={() => { setResetTarget(u) }} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.25)' }} title="Reset password">
                            <i className="fas fa-key text-xs" />
                          </button>
                          <button onClick={() => handleToggleStatus(u)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold" style={{ background: isSuspended ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)', color: isSuspended ? '#4ade80' : '#f87171', border: `1px solid ${isSuspended ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}` }} title={isSuspended ? 'Activate' : 'Suspend'}>
                            <i className={`fas ${isSuspended ? 'fa-unlock' : 'fa-ban'} text-xs`} />
                          </button>
                          <button onClick={() => setDeleteTarget(u)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }} title="Delete user">
                            <i className="fas fa-trash text-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#1a1040' }}>
            <p className="text-xs" style={{ color: '#6b7280' }}>Showing <span className="text-white font-medium">{filtered.length}</span> of <span className="text-white font-medium">{users.length}</span> users</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
