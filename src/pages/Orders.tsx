import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AdminLayout from '../components/layout/AdminLayout'
import { getAllPurchases, approvePurchase, rejectPurchase } from '../services/purchaseService'
import { getAllUsers } from '../services/userService'
import type { Purchase, AdminUser } from '../types'

function fmtCurrency(n: number, currency = 'USD') {
  const code = /^[A-Z]{3}$/.test(currency) ? currency : 'USD'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(n)
  } catch {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  }
}
const fmtUser = (n: number, user?: AdminUser) => fmtCurrency(n, user?.currency ?? 'USD')
type FilterKey = 'all' | 'pending' | 'completed' | 'cancelled'

function StatusBadge({ status }: { status: Purchase['status'] }) {
  const map = {
    pending:   { label: 'Pending',   color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.25)'  },
    completed: { label: 'Completed', color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.25)'  },
    cancelled: { label: 'Cancelled', color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)' },
  }
  const s = map[status] ?? map.cancelled
  return <span className="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{s.label}</span>
}

function OrderModal({ purchase, user, onApprove, onReject, onClose, loading }: {
  purchase: Purchase; user: AdminUser | undefined; onApprove: () => void; onReject: (r: string) => void; onClose: () => void; loading: boolean
}) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const isCrypto = purchase.type === 'buy_crypto'
  const accentColor = isCrypto ? '#f59e0b' : '#60a5fa'
  const accentBg = isCrypto ? 'rgba(245,158,11,0.12)' : 'rgba(96,165,250,0.12)'
  const accentBorder = isCrypto ? 'rgba(245,158,11,0.3)' : 'rgba(96,165,250,0.3)'
  const canAfford = user ? user.balance >= purchase.totalCost : false
  const fmt = (n: number) => fmtUser(n, user)

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
        <motion.div className="w-full max-w-lg rounded-2xl overflow-hidden" initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 20 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg, #130d35, #1a1040)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />

          <div className="flex items-center justify-between px-6 pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: accentColor }}>
                {purchase.symbol.slice(0, 2)}
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Review Buy Order</h2>
                <p className="text-xs" style={{ color: '#6b7280' }}>{purchase.txId}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10" style={{ color: '#6b7280' }}><i className="fas fa-times text-sm" /></button>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />

          <div className="px-6 py-5 space-y-4">
            {/* User info */}
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>User Information</p>
              <div className="flex justify-between"><span className="text-xs text-gray-400">Name</span><span className="text-xs font-semibold text-white">{user ? `${user.firstName} ${user.lastName}` : `User #${purchase.userId}`}</span></div>
              <div className="flex justify-between"><span className="text-xs text-gray-400">Email</span><span className="text-xs text-white">{user?.email ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-xs text-gray-400">Current Balance</span><span className="text-xs font-bold" style={{ color: canAfford ? '#4ade80' : '#f87171' }}>{fmt(user?.balance ?? 0)}</span></div>
              {!canAfford && <p className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}><i className="fas fa-exclamation-triangle mr-1" />Insufficient balance</p>}
            </div>

            {/* Order details */}
            <div className="rounded-xl p-4 space-y-2" style={{ background: accentBg, border: `1px solid ${accentBorder}` }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: accentColor }}>Order Details</p>
              <div className="flex justify-between"><span className="text-xs text-gray-400">Asset</span><span className="text-xs font-semibold text-white">{purchase.name} ({purchase.symbol})</span></div>
              <div className="flex justify-between"><span className="text-xs text-gray-400">Type</span><span className="text-xs font-semibold text-white">{isCrypto ? 'Cryptocurrency' : 'Stock'}</span></div>
              <div className="flex justify-between"><span className="text-xs text-gray-400">Quantity</span><span className="text-xs font-semibold text-white">{purchase.quantity} {purchase.symbol}</span></div>
              <div className="flex justify-between"><span className="text-xs text-gray-400">Price per unit</span><span className="text-xs font-semibold text-white">{fmt(purchase.price)}</span></div>
              <div className="flex justify-between border-t pt-2" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <span className="text-xs text-gray-400">Total Cost</span>
                <span className="text-base font-bold" style={{ color: accentColor }}>{fmt(purchase.totalCost)}</span>
              </div>
              {canAfford && (
                <div className="flex justify-between"><span className="text-xs text-gray-400">Balance After</span><span className="text-xs font-semibold" style={{ color: '#4ade80' }}>{fmt((user?.balance ?? 0) - purchase.totalCost)}</span></div>
              )}
            </div>

            {rejecting && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>Rejection Reason</label>
                <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Asset temporarily unavailable…" className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(248,113,113,0.3)' }} />
              </div>
            )}

            {!rejecting ? (
              <div className="flex gap-3 pt-1">
                <button onClick={() => setRejecting(true)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}><i className="fas fa-times mr-2" />Reject</button>
                <button onClick={onApprove} disabled={loading || !canAfford} className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-40" style={{ background: isCrypto ? 'linear-gradient(135deg,#d97706,#f59e0b)' : 'linear-gradient(135deg,#2563eb,#60a5fa)', color: '#fff' }}>
                  {loading ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check mr-2" />Approve Order</>}
                </button>
              </div>
            ) : (
              <div className="flex gap-3 pt-1">
                <button onClick={() => setRejecting(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}>Back</button>
                <button onClick={() => onReject(reason)} disabled={loading || !reason.trim()} className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#dc2626,#f87171)', color: '#fff' }}>
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

export default function Orders() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Purchase | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, u] = await Promise.all([getAllPurchases(), getAllUsers()])
      setPurchases(p.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      setUsers(u)
    } catch { showToast('Failed to load', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = purchases.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false
    if (search) {
      const u = users.find(x => x.id === p.userId)
      const q = search.toLowerCase()
      return p.txId.toLowerCase().includes(q) || p.symbol.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) ||
        (u ? `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) : false)
    }
    return true
  })

  const pendingCount = purchases.filter(p => p.status === 'pending').length

  async function handleApprove() {
    if (!selected) return
    setActionLoading(true)
    try {
      await approvePurchase(selected)
      showToast(`Order ${selected.txId} approved. ${selected.quantity} ${selected.symbol} added to portfolio.`, 'success')
      setSelected(null)
      await load()
    } catch (e) { showToast(e instanceof Error ? e.message : 'Failed', 'error') }
    finally { setActionLoading(false) }
  }

  async function handleReject(reason: string) {
    if (!selected) return
    setActionLoading(true)
    try {
      await rejectPurchase(selected, reason)
      showToast(`Order ${selected.txId} rejected.`, 'success')
      setSelected(null)
      await load()
    } catch { showToast('Failed', 'error') }
    finally { setActionLoading(false) }
  }

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: `Pending (${pendingCount})` },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <AdminLayout title="Buy Orders" subtitle="Review and approve user stock and crypto purchase requests">
      <AnimatePresence>
        {toast && (
          <motion.div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} style={{ background: toast.type === 'success' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)', color: toast.type === 'success' ? '#4ade80' : '#f87171', border: `1px solid ${toast.type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
            <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2`} />{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {selected && <OrderModal purchase={selected} user={users.find(u => u.id === selected.userId)} onApprove={handleApprove} onReject={handleReject} onClose={() => setSelected(null)} loading={actionLoading} />}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all" style={filter === f.key ? { background: 'linear-gradient(135deg,#a28539,#c9a84c)', color: '#0d0824' } : { color: '#9ca3af' }}>{f.label}</button>
            ))}
          </div>
          <div className="relative ml-auto">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#6b7280' }} />
            <input type="text" placeholder="Search by user, symbol, ID…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 pr-4 py-2 text-xs text-gray-300 rounded-xl outline-none w-56" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.08)' }} />
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px]">
              <thead>
                <tr style={{ background: '#1a1040', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Order ID', 'User', 'Asset', 'Type', 'Qty', 'Total Cost', 'Date', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: '#6b7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="py-16 text-center text-gray-500"><i className="fas fa-spinner fa-spin mr-2" />Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="py-16 text-center text-gray-500">No orders found.</td></tr>
                ) : filtered.map((p, i) => {
                  const user = users.find(u => u.id === p.userId)
                  const isCrypto = p.type === 'buy_crypto'
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                      <td className="px-4 py-3.5 font-mono text-xs" style={{ color: '#9ca3af' }}>{p.txId}</td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-semibold text-white">{user ? `${user.firstName} ${user.lastName}` : `User #${p.userId}`}</p>
                        <p className="text-xs" style={{ color: '#6b7280' }}>{user?.email}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${p.color}22`, color: p.color }}>{p.symbol.slice(0, 2)}</div>
                          <div>
                            <p className="text-xs font-semibold text-white">{p.name}</p>
                            <p className="text-xs" style={{ color: '#6b7280' }}>{p.symbol}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: isCrypto ? 'rgba(245,158,11,0.12)' : 'rgba(96,165,250,0.12)', color: isCrypto ? '#f59e0b' : '#60a5fa' }}>
                          {isCrypto ? 'Crypto' : 'Stock'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-white">{p.quantity}</td>
                      <td className="px-4 py-3.5 text-sm font-bold" style={{ color: isCrypto ? '#f59e0b' : '#60a5fa' }}>{fmtUser(p.totalCost, users.find(u => u.id === p.userId))}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">{p.date} {p.time}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3.5">
                        {p.status === 'pending' ? (
                          <button onClick={() => setSelected(p)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.3)' }}>
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
            <p className="text-xs" style={{ color: '#6b7280' }}>Showing <span className="text-white font-medium">{filtered.length}</span> of <span className="text-white font-medium">{purchases.length}</span> orders</p>
            {pendingCount > 0 && <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>{pendingCount} pending approval</span>}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
