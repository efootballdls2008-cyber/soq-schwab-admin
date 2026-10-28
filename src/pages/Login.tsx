import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAdmin } from '../context/AuthContext'

export default function AdminLogin() {
  const { login, isAuthenticated } = useAdmin()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated) navigate('/admin/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const ok = await login(email, password)
    if (!ok) setError('Invalid credentials or insufficient permissions.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0a0720 0%, #130d35 50%, #0a0720 100%)' }}>
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #c9a84c, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)' }} />
      </div>

      <motion.div
        className="w-full max-w-md relative"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(145deg, #130d35, #1a1040)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {/* Top accent */}
          <div className="h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)' }} />

          <div className="px-8 py-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #a28539, #c9a84c)' }}>
                <i className="fas fa-shield-alt text-2xl" style={{ color: '#0d0824' }} />
              </div>
              <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
              <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Charles Schwab Trading</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>Admin Email</label>
                <div className="relative">
                  <i className="fas fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#6b7280' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>Password</label>
                <div className="relative">
                  <i className="fas fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#6b7280' }} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-white outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    <i className={`fas ${showPw ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <i className="fas fa-exclamation-circle" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60 mt-2"
                style={{ background: 'linear-gradient(135deg, #a28539, #c9a84c)', color: '#0d0824' }}
              >
                {loading ? <span><i className="fas fa-spinner fa-spin mr-2" />Signing in…</span> : 'Sign In to Admin Panel'}
              </button>
            </form>

          </div>
        </div>
      </motion.div>
    </div>
  )
}
