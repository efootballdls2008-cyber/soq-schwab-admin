import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AdminLayout from '../components/layout/AdminLayout'
import { getAllDeposits, approveWithdrawal, rejectWithdrawal } from '../services/depositService'
import { getAllUsers } from '../services/userService'
import type { Deposit, AdminUser } from '../types'

function fmtCurrency(n: number, currency = 'USD') {
  const code = /^[A-Z]{3}$/.test(currency) ? currency : 'USD'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(n)
  } catch {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  }
}
const fmtUser = (n: number, user?: AdminUser) => fmtCurrency(n, user?.currency ?? 'USD')
type FilterKey = 'all' | 'pending' | 'completed' | 'rejected'

function StatusBadge({ status }: { status: Deposit['status'] }) {
  const map = {
    pending:   { label: 'Pending',   color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.25)'  },
    completed: { label: 'Completed', color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.25)'  },
    rejected:  { label: 'Rejected',  color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)' },
    cancelled: { label: 'Cancelled', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.25)' },
  }
  const s = map[status] ?? map.cancelled
  return <span className="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{s.label}</span>
}

function WithdrawalModal({ deposit, user, onApprove, onReject, onClose, loading }: {
  deposit: Deposit; user: AdminUser | undefined; onApprove: () => void; onReject: (r: string) => void; onClose: () => void; loading: boolean
}) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const hasWithdrawInfo = user?.withdrawBankName || user?.withdrawAccountNumber
  const fmt = (n: number) => fmtUser(n, user)

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
        <motion.div className="w-full max-w-lg rounded-2xl overflow-hidden" initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 20 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg, #130d35, #1a1040)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #a78bfa, transparent)' }} />

          <div className="flex items-center justify-between px-6 pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)' }}>
                <i className="fas fa-arrow-up text-sm" style={{ color: '#a78bfa' }} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Review Withdrawal</h2>
                <p className="text-xs" style={{ color: '#6b7280' }}>{deposit.txId}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10" style={{ color: '#6b7280' }}><i className="fas fa-times text-sm" /></button>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />

          <div className="px-6 py-5 space-y-4">
            {/* User info */}
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>User Information</p>
              <div className="flex justify-between"><span className="text-xs text-gray-400">Name</span><span className="text-xs font-semibold text-white">{user ? `${user.firstName} ${user.lastName}` : `User #${deposit.userId}`}</span></div>
              <div className="flex justify-between"><span className="text-xs text-gray-400">Email</span><span className="text-xs text-white">{user?.email ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-xs text-gray-400">Current Balance</span><span className="text-xs font-bold" style={{ color: user && user.balance >= deposit.amount ? '#4ade80' : '#f87171' }}>{fmt(user?.balance ?? 0)}</span></div>
              {user && user.balance < deposit.amount && (
                <p className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>
                  <i className="fas fa-exclamation-triangle mr-1" />Insufficient balance for this withdrawal
                </p>
              )}
            </div>

            {/* Withdrawal details */}
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Withdrawal Details</p>
              <div className="flex justify-between"><span className="text-xs text-gray-400">Amount</span><span className="text-base font-bold" style={{ color: '#a78bfa' }}>{fmt(deposit.amount)}</span></div>
              <div className="flex justify-between"><span className="text-xs text-gray-400">Method</span><span className="text-xs font-semibold text-white">{deposit.method}</span></div>
              <div className="flex justify-between"><span className="text-xs text-gray-400">Date</span><span className="text-xs text-white">{deposit.date} {deposit.time}</span></div>
              {deposit.note && <div className="flex justify-between"><span className="text-xs text-gray-400">Note</span><span className="text-xs text-white">{deposit.note}</span></div>}
            </div>

            {/* User's withdrawal account — where to SEND money TO */}
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#a78bfa' }}>
                <i className="fas fa-paper-plane mr-1.5" />Send Funds To (User's Account)
              </p>
              {hasWithdrawInfo ? (
                <>
                  <div className="flex justify-between"><span className="text-xs text-gray-400">Bank</span><span className="text-xs font-semibold text-white">{user?.withdrawBankName}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-gray-400">Account Name</span><span className="text-xs font-semibold text-white">{user?.withdrawAccountName}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-gray-400">Account No.</span><span className="text-xs font-mono text-white">{user?.withdrawAccountNumber}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-gray-400">Routing No.</span><span className="text-xs font-mono text-white">{user?.withdrawRoutingNumber}</span></div>
                  {user?.withdrawSwiftCode && <div className="flex justify-between"><span className="text-xs text-gray-400">SWIFT</span><span className="text-xs font-mono text-white">{user.withdrawSwiftCode}</span></div>}
                </>
              ) : (
                <p className="text-xs" style={{ color: '#f87171' }}>
                  <i className="fas fa-exclamation-triangle mr-1" />User has not provided withdrawal account details.
                </p>
              )}
            </div>

            {rejecting && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>Rejection Reason</label>
                <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Incomplete bank details, suspicious activity…" className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(248,113,113,0.3)' }} />
              </div>
            )}

            {!rejecting ? (
              <div className="flex gap-3 pt-1">
                <button onClick={() => setRejecting(true)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>
                  <i className="fas fa-times mr-2" />Reject
                </button>
                <button onClick={onApprove} disabled={loading || (user ? user.balance < deposit.amount : false)} className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: '#fff' }}>
                  {loading ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check mr-2" />Approve & Send</>}
                </button>
              </div>
            ) : (
              <div className="flex gap-3 pt-1">
                <button onClick={() => setRejecting(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}>Back</button>
                <button onClick={() => onReject(reason)} disabled={loading || !reason.trim()} className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #dc2626, #f87171)', color: '#fff' }}>
                  {loading ? <i className="fas fa-spinner fa-spin" /> : 'Confirm Rejection'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function Withdrawals() {
  const [withdrawals, setWithdrawals] = useState<Deposit[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Deposit | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [d, u] = await Promise.all([getAllDeposits(), getAllUsers()])
      setWithdrawals(d.filter(x => x.type === 'withdraw').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      setUsers(u)
    } catch { showToast('Failed to load', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = withdrawals.filter(d => {
    if (filter !== 'all' && d.status !== filter) return false
    if (search) {
      const u = users.find(x => x.id === d.userId)
      const q = search.toLowerCase()
      return d.txId.toLowerCase().includes(q) || (u ? `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q) : false)
    }
    return true
  })

  const pendingCount = withdrawals.filter(d => d.status === 'pending').length

  async function handleApprove() {
    if (!selected) return
    setActionLoading(true)
    try {
      await approveWithdrawal(selected)
      showToast(`Withdrawal ${selected.txId} approved. ${fmtUser(selected.amount, users.find(u => u.id === selected.userId))} deducted.`, 'success')
      setSelected(null)
      await load()
    } catch (e) { showToast(e instanceof Error ? e.message : 'Failed', 'error') }
    finally { setActionLoading(false) }
  }

  async function handleReject(reason: string) {
    if (!selected) return
    setActionLoading(true)
    try {
      await rejectWithdrawal(selected, reason)
      showToast(`Withdrawal ${selected.txId} rejected.`, 'success')
      setSelected(null)
      await load()
    } catch { showToast('Failed', 'error') }
    finally { setActionLoading(false) }
  }

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: `Pending (${pendingCount})` },
    { key: 'completed', label: 'Completed' },
    { key: 'rejected', label: 'Rejected' },
  ]

  return (
    <AdminLayout title="Withdrawals" subtitle="Review and approve user withdrawal requests">
      <AnimatePresence>
        {toast && (
          <motion.div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} style={{ background: toast.type === 'success' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)', color: toast.type === 'success' ? '#4ade80' : '#f87171', border: `1px solid ${toast.type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
            <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2`} />{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {selected && <WithdrawalModal deposit={selected} user={users.find(u => u.id === selected.userId)} onApprove={handleApprove} onReject={handleReject} onClose={() => setSelected(null)} loading={actionLoading} />}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all" style={filter === f.key ? { background: 'linear-gradient(135deg,#a28539,#c9a84c)', color: '#0d0824' } : { color: '#9ca3af' }}>{f.label}</button>
            ))}
          </div>
          <div className="relative ml-auto">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#6b7280' }} />
            <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 pr-4 py-2 text-xs text-gray-300 rounded-xl outline-none w-56" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.08)' }} />
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr style={{ background: '#1a1040', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Tx ID', 'User', 'Amount', 'Method', 'Send To', 'Date', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: '#6b7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="py-16 text-center text-gray-500"><i className="fas fa-spinner fa-spin mr-2" />Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center text-gray-500">No withdrawals found.</td></tr>
                ) : filtered.map((d, i) => {
                  const user = users.find(u => u.id === d.userId)
                  return (
                    <tr key={d.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                      <td className="px-4 py-3.5 font-mono text-xs" style={{ color: '#9ca3af' }}>{d.txId}</td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-semibold text-white">{user ? `${user.firstName} ${user.lastName}` : `User #${d.userId}`}</p>
                        <p className="text-xs" style={{ color: '#6b7280' }}>{user?.email}</p>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-bold" style={{ color: '#a78bfa' }}>{fmtUser(d.amount, users.find(u => u.id === d.userId))}</td>
                      <td className="px-4 py-3.5 text-xs text-white">{d.method}</td>
                      <td className="px-4 py-3.5">
                        {user?.withdrawBankName ? (
                          <div>
                            <p className="text-xs font-semibold text-white">{user.withdrawBankName}</p>
                            <p className="text-xs" style={{ color: '#6b7280' }}>{user.withdrawAccountNumber}</p>
                          </div>
                        ) : <span className="text-xs" style={{ color: '#f87171' }}>Not provided</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">{d.date} {d.time}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={d.status} /></td>
                      <td className="px-4 py-3.5">
                        {d.status === 'pending' ? (
                          <button onClick={() => setSelected(d)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.3)' }}>
                            <i className="fas fa-eye text-xs" />Review
                          </button>
                        ) : <span className="text-xs" style={{ color: '#4b5563' }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#1a1040' }}>
            <p className="text-xs" style={{ color: '#6b7280' }}>Showing <span className="text-white font-medium">{filtered.length}</span> of <span className="text-white font-medium">{withdrawals.length}</span> withdrawals</p>
            {pendingCount > 0 && <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>{pendingCount} pending approval</span>}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
