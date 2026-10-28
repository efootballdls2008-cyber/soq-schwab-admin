import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AdminLayout from '../components/layout/AdminLayout'
import { getAllDeposits, approveDeposit, rejectDeposit } from '../services/depositService'
import { getAllUsers } from '../services/userService'
import { getPlatformAccounts } from '../services/platformService'
import type { Deposit, AdminUser, PlatformAccount } from '../types'

// Use the user's stored currency code; fall back to USD if unknown
function fmtCurrency(n: number, currency = 'USD') {
  const code = /^[A-Z]{3}$/.test(currency) ? currency : 'USD'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(n)
  } catch {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  }
}

// Convenience: format using a user object (falls back to USD if user is undefined)
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
  return (
    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  )
}

// ── Screenshot Lightbox ───────────────────────────────────────────────────────

function ScreenshotLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
      >
        <motion.div
          className="relative max-w-3xl w-full"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute -top-10 right-0 flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: '#9ca3af' }}
          >
            <i className="fas fa-times" /> Close
          </button>
          <img
            src={src}
            alt="Payment screenshot"
            className="w-full rounded-2xl object-contain"
            style={{ maxHeight: '80vh', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <p className="text-center text-xs mt-3" style={{ color: '#4b5563' }}>
            Click outside or press Esc to close
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Deposit Detail / Approval Modal ──────────────────────────────────────────

interface DetailModalProps {
  deposit: Deposit
  user: AdminUser | undefined
  platformAccount: PlatformAccount | null
  onApprove: () => void
  onReject: (reason: string) => void
  onClose: () => void
  loading: boolean
}

function DetailModal({ deposit, user, platformAccount, onApprove, onReject, onClose, loading }: DetailModalProps) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [lightbox, setLightbox] = useState(false)
  const fmt = (n: number) => fmtUser(n, user)

  const isPending = deposit.status === 'pending'

  return (
    <>
      {lightbox && deposit.screenshot && (
        <ScreenshotLightbox src={deposit.screenshot} onClose={() => setLightbox(false)} />
      )}

      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        >
          <motion.div
            className="w-full max-w-lg rounded-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, #130d35, #1a1040)',
              border: '1px solid rgba(255,255,255,0.1)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Top accent */}
            <div className="h-0.5 flex-shrink-0" style={{ background: 'linear-gradient(90deg, transparent, #4ade80, transparent)' }} />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)' }}>
                  <i className="fas fa-arrow-down text-sm" style={{ color: '#4ade80' }} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {isPending ? 'Review Deposit' : 'Deposit Details'}
                  </h2>
                  <p className="text-xs" style={{ color: '#6b7280' }}>{deposit.txId}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={deposit.status} />
                <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10" style={{ color: '#6b7280' }}>
                  <i className="fas fa-times text-sm" />
                </button>
              </div>
            </div>

            <div className="flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />

            {/* Scrollable body */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">

              {/* User info */}
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>User Information</p>
                <div className="flex justify-between"><span className="text-xs text-gray-400">Name</span><span className="text-xs font-semibold text-white">{user ? `${user.firstName} ${user.lastName}` : `User #${deposit.userId}`}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-400">Email</span><span className="text-xs font-semibold text-white">{user?.email ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-400">Current Balance</span><span className="text-xs font-bold" style={{ color: '#4ade80' }}>{fmt(user?.balance ?? 0)}</span></div>
              </div>

              {/* Deposit details */}
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Deposit Details</p>
                <div className="flex justify-between"><span className="text-xs text-gray-400">Amount</span><span className="text-base font-bold" style={{ color: '#4ade80' }}>{fmt(deposit.amount)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-400">Method</span><span className="text-xs font-semibold text-white">{deposit.method}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-400">Date</span><span className="text-xs text-white">{deposit.date} {deposit.time}</span></div>
                {deposit.note && <div className="flex justify-between"><span className="text-xs text-gray-400">Note</span><span className="text-xs text-white">{deposit.note}</span></div>}
                {deposit.rejectionReason && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Rejection Reason</span>
                    <span className="text-xs font-semibold" style={{ color: '#f87171' }}>{deposit.rejectionReason}</span>
                  </div>
                )}
              </div>

              {/* Platform account */}
              {platformAccount && (
                <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#c9a84c' }}>
                    <i className="fas fa-university mr-1.5" />Platform Receiving Account
                  </p>
                  <div className="flex justify-between"><span className="text-xs text-gray-400">Bank</span><span className="text-xs font-semibold text-white">{platformAccount.bankName}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-gray-400">Account Name</span><span className="text-xs font-semibold text-white">{platformAccount.accountName}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-gray-400">Account No.</span><span className="text-xs font-mono text-white">{platformAccount.accountNumber}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-gray-400">Routing No.</span><span className="text-xs font-mono text-white">{platformAccount.routingNumber}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-gray-400">Reference</span><span className="text-xs font-mono font-bold" style={{ color: '#c9a84c' }}>{deposit.txId}</span></div>
                </div>
              )}

              {/* Payment Screenshot */}
              {deposit.screenshot ? (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-2">
                      <i className="fas fa-image text-xs" style={{ color: '#a78bfa' }} />
                      <span className="text-xs font-semibold" style={{ color: '#a78bfa' }}>Payment Screenshot</span>
                    </div>
                    <button
                      onClick={() => setLightbox(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                      style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}
                    >
                      <i className="fas fa-expand text-xs" /> View Full Size
                    </button>
                  </div>
                  <div
                    className="relative cursor-zoom-in group"
                    onClick={() => setLightbox(true)}
                  >
                    <img
                      src={deposit.screenshot}
                      alt="Payment screenshot"
                      className="w-full object-cover"
                      style={{ maxHeight: '220px' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.45)' }}>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(167,139,250,0.9)', color: '#fff' }}>
                        <i className="fas fa-search-plus" /> Click to enlarge
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <i className="fas fa-image text-sm" style={{ color: '#4b5563' }} />
                  <span className="text-xs" style={{ color: '#4b5563' }}>No payment screenshot provided</span>
                </div>
              )}

              {/* Reject reason input */}
              {rejecting && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>Rejection Reason</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="e.g. Invalid reference number, payment not received…"
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(248,113,113,0.3)' }}
                  />
                </div>
              )}

              {/* Actions — only for pending deposits */}
              {isPending && !rejecting && (
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setRejecting(true)}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                    style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}
                  >
                    <i className="fas fa-times mr-2" />Reject
                  </button>
                  <button
                    onClick={onApprove}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #4ade80)', color: '#fff' }}
                  >
                    {loading ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check mr-2" />Approve Deposit</>}
                  </button>
                </div>
              )}

              {isPending && rejecting && (
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setRejecting(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Back
                  </button>
                  <button
                    onClick={() => onReject(reason)}
                    disabled={loading || !reason.trim()}
                    className="flex-1 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #dc2626, #f87171)', color: '#fff' }}
                  >
                    {loading ? <i className="fas fa-spinner fa-spin" /> : 'Confirm Rejection'}
                  </button>
                </div>
              )}

            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Deposits() {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [platformAccount, setPlatformAccount] = useState<PlatformAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Deposit | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [d, u, pa] = await Promise.all([getAllDeposits(), getAllUsers(), getPlatformAccounts()])
      // Backend returns deposits ORDER BY created_at DESC — trust that order.
      // Sorting client-side by d.date (a user-supplied string) is unreliable:
      // the field can be null, malformed, or set to an arbitrary value by the user.
      setDeposits(d.filter(x => x.type === 'deposit'))
      setUsers(u)
      setPlatformAccount(pa.find(a => a.isDefault && a.status === 'active') ?? null)
    } catch { showToast('Failed to load data', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = deposits.filter(d => {
    if (filter !== 'all' && d.status !== filter) return false
    if (search) {
      const u = users.find(x => x.id === d.userId)
      const q = search.toLowerCase()
      return d.txId.toLowerCase().includes(q) || d.method.toLowerCase().includes(q) ||
        (u ? `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q) : false)
    }
    return true
  })

  const pendingCount = deposits.filter(d => d.status === 'pending').length

  async function handleApprove() {
    if (!selected) return
    setActionLoading(true)
    try {
      await approveDeposit(selected)
      showToast(`Deposit ${selected.txId} approved. ${fmtUser(selected.amount, users.find(u => u.id === selected.userId))} credited.`, 'success')
      setSelected(null)
      await load()
    } catch (e) { showToast(e instanceof Error ? e.message : 'Failed to approve', 'error') }
    finally { setActionLoading(false) }
  }

  async function handleReject(reason: string) {
    if (!selected) return
    setActionLoading(true)
    try {
      await rejectDeposit(selected, reason)
      showToast(`Deposit ${selected.txId} rejected.`, 'success')
      setSelected(null)
      await load()
    } catch { showToast('Failed to reject', 'error') }
    finally { setActionLoading(false) }
  }

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: `Pending (${pendingCount})` },
    { key: 'completed', label: 'Completed' },
    { key: 'rejected', label: 'Rejected' },
  ]

  return (
    <AdminLayout title="Deposits" subtitle="Review and approve user deposit requests">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
            style={{ background: toast.type === 'success' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)', color: toast.type === 'success' ? '#4ade80' : '#f87171', border: `1px solid ${toast.type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}` }}
          >
            <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2`} />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {selected && (
        <DetailModal
          deposit={selected}
          user={users.find(u => u.id === selected.userId)}
          platformAccount={platformAccount}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setSelected(null)}
          loading={actionLoading}
        />
      )}

      <div className="space-y-4">
        {/* Tabs + search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={filter === f.key ? { background: 'linear-gradient(135deg,#a28539,#c9a84c)', color: '#0d0824' } : { color: '#9ca3af' }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#6b7280' }} />
            <input
              type="text"
              placeholder="Search by user, ID, method…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-4 py-2 text-xs text-gray-300 rounded-xl outline-none w-56"
              style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr style={{ background: '#1a1040', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Tx ID', 'User', 'Amount', 'Method', 'Date', 'Screenshot', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: '#6b7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-16 text-center text-gray-500"><i className="fas fa-spinner fa-spin mr-2" />Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center text-gray-500">No deposits found.</td></tr>
                ) : filtered.map((d, i) => {
                  const user = users.find(u => u.id === d.userId)
                  return (
                    <tr
                      key={d.id}
                      onClick={() => setSelected(d)}
                      className="cursor-pointer hover:bg-white/[0.04] transition-colors"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                    >
                      <td className="px-4 py-3.5 font-mono text-xs" style={{ color: '#9ca3af' }}>{d.txId}</td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-semibold text-white">{user ? `${user.firstName} ${user.lastName}` : `User #${d.userId}`}</p>
                        <p className="text-xs" style={{ color: '#6b7280' }}>{user?.email}</p>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-bold" style={{ color: '#4ade80' }}>{fmtUser(d.amount, users.find(u => u.id === d.userId))}</td>
                      <td className="px-4 py-3.5 text-xs text-white">{d.method}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">{d.date} {d.time}</td>
                      <td className="px-4 py-3.5">
                        {d.screenshot ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
                            <i className="fas fa-image text-xs" /> Attached
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: '#4b5563' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={d.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#1a1040' }}>
            <p className="text-xs" style={{ color: '#6b7280' }}>
              Showing <span className="text-white font-medium">{filtered.length}</span> of <span className="text-white font-medium">{deposits.length}</span> deposits
            </p>
            {pendingCount > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
                {pendingCount} pending approval
              </span>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
