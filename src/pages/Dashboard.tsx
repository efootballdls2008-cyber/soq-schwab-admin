import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AdminLayout from '../components/layout/AdminLayout'
import { getAllUsers } from '../services/userService'
import { getAllDeposits } from '../services/depositService'
import { getAllPurchases } from '../services/purchaseService'
import { getAllActiveBotTrades, AdminBotTrade } from '../services/botTradeService'
import { get } from '../api/client'
import type { AdminUser, Deposit, Purchase, AdminAction } from '../types'

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function fmtCurrency(n: number, currency = 'USD') {
  const code = /^[A-Z]{3}$/.test(currency) ? currency : 'USD'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(n)
  } catch {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  }
}

function StatCard({ icon, label, value, color, bg, onClick, badge }: {
  icon: string; label: string; value: string | number; color: string; bg: string; onClick?: () => void; badge?: number
}) {
  return (
    <motion.div
      className={`rounded-2xl p-5 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''} transition-transform`}
      style={{ background: bg, border: `1px solid ${color}33` }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
        <i className={`${icon} text-lg`} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs" style={{ color: '#9ca3af' }}>{label}</p>
        <p className="text-xl font-bold text-white mt-0.5">{value}</p>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: '#ef4444', color: '#fff' }}>{badge}</span>
      )}
    </motion.div>
  )
}

function ActionBadge({ action }: { action: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    approve_deposit:    { color: '#4ade80', bg: 'rgba(74,222,128,0.12)',   label: 'Deposit Approved' },
    reject_deposit:     { color: '#f87171', bg: 'rgba(248,113,113,0.12)',  label: 'Deposit Rejected' },
    approve_withdrawal: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', label: 'Withdrawal Approved' },
    reject_withdrawal:  { color: '#f87171', bg: 'rgba(248,113,113,0.12)',  label: 'Withdrawal Rejected' },
    approve_purchase:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   label: 'Order Approved' },
    reject_purchase:    { color: '#f87171', bg: 'rgba(248,113,113,0.12)',  label: 'Order Rejected' },
    adjust_balance:     { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',   label: 'Balance Adjusted' },
    suspend_user:       { color: '#f87171', bg: 'rgba(248,113,113,0.12)',  label: 'User Suspended' },
    activate_user:      { color: '#4ade80', bg: 'rgba(74,222,128,0.12)',   label: 'User Activated' },
  }
  const m = map[action] ?? { color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', label: action }
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap" style={{ background: m.bg, color: m.color }}>
      {m.label}
    </span>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [botTrades, setBotTrades] = useState<AdminBotTrade[]>([])
  const [actions, setActions] = useState<AdminAction[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [u, d, p, bt, a] = await Promise.all([
        getAllUsers(),
        getAllDeposits(),
        getAllPurchases(),
        getAllActiveBotTrades(),
        get<AdminAction[]>('/adminActions'),
      ])
      setUsers(u)
      setDeposits(d)
      setPurchases(p)
      setBotTrades(bt)
      setActions(a.sort((x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime()).slice(0, 10))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const pendingDeps = deposits.filter(d => d.type === 'deposit' && d.status === 'pending').length
  const pendingWith = deposits.filter(d => d.type === 'withdraw' && d.status === 'pending').length
  const pendingOrds = purchases.filter(p => p.status === 'pending').length
  const totalBalance = users.reduce((s, u) => s + u.balance, 0)
  const totalDeposited = deposits.filter(d => d.type === 'deposit' && d.status === 'completed').reduce((s, d) => s + d.amount, 0)
  const totalWithdrawn = deposits.filter(d => d.type === 'withdraw' && d.status === 'completed').reduce((s, d) => s + d.amount, 0)

  return (
    <AdminLayout title="Dashboard" subtitle="Platform overview and pending approvals">
      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <i className="fas fa-spinner fa-spin mr-2" /> Loading…
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard icon="fas fa-users" label="Total Users" value={users.length} color="#60a5fa" bg="rgba(96,165,250,0.06)" onClick={() => navigate('/admin/users')} />
            <StatCard icon="fas fa-arrow-down" label="Pending Deposits" value={pendingDeps} color="#4ade80" bg="rgba(74,222,128,0.06)" onClick={() => navigate('/admin/deposits')} badge={pendingDeps} />
            <StatCard icon="fas fa-arrow-up" label="Pending Withdrawals" value={pendingWith} color="#a78bfa" bg="rgba(167,139,250,0.06)" onClick={() => navigate('/admin/withdrawals')} badge={pendingWith} />
            <StatCard icon="fas fa-shopping-cart" label="Pending Orders" value={pendingOrds} color="#f59e0b" bg="rgba(245,158,11,0.06)" onClick={() => navigate('/admin/orders')} badge={pendingOrds} />
            <StatCard icon="fas fa-robot" label="Active Bot Trades" value={botTrades.length} color="#c9a84c" bg="rgba(201,168,76,0.06)" onClick={() => navigate('/admin/bot-trades')} badge={botTrades.length} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <StatCard icon="fas fa-wallet" label="Total Platform Balance" value={fmt(totalBalance)} color="#c9a84c" bg="rgba(201,168,76,0.06)" />
            <StatCard icon="fas fa-plus-circle" label="Total Deposited" value={fmt(totalDeposited)} color="#4ade80" bg="rgba(74,222,128,0.06)" />
            <StatCard icon="fas fa-minus-circle" label="Total Withdrawn" value={fmt(totalWithdrawn)} color="#f87171" bg="rgba(248,113,113,0.06)" />
          </div>

          {/* Pending queues quick view */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Pending deposits */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-sm font-bold text-white">Pending Deposits</h3>
                <button onClick={() => navigate('/admin/deposits')} className="text-xs font-semibold" style={{ color: '#c9a84c' }}>View All →</button>
              </div>
              <div className="divide-y divide-white/5">
                {deposits.filter(d => d.type === 'deposit' && d.status === 'pending').slice(0, 4).map(d => {
                  const user = users.find(u => u.id === d.userId)
                  return (
                    <div key={d.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-xs font-semibold text-white">{user ? `${user.firstName} ${user.lastName}` : `User #${d.userId}`}</p>
                        <p className="text-xs" style={{ color: '#6b7280' }}>{d.txId} · {d.method}</p>
                      </div>
                      <span className="text-sm font-bold" style={{ color: '#4ade80' }}>{fmtCurrency(d.amount, users.find(u => u.id === d.userId)?.currency)}</span>
                    </div>
                  )
                })}
                {deposits.filter(d => d.type === 'deposit' && d.status === 'pending').length === 0 && (
                  <p className="px-5 py-4 text-xs text-gray-500">No pending deposits</p>
                )}
              </div>
            </div>

            {/* Pending withdrawals */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-sm font-bold text-white">Pending Withdrawals</h3>
                <button onClick={() => navigate('/admin/withdrawals')} className="text-xs font-semibold" style={{ color: '#c9a84c' }}>View All →</button>
              </div>
              <div className="divide-y divide-white/5">
                {deposits.filter(d => d.type === 'withdraw' && d.status === 'pending').slice(0, 4).map(d => {
                  const user = users.find(u => u.id === d.userId)
                  return (
                    <div key={d.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-xs font-semibold text-white">{user ? `${user.firstName} ${user.lastName}` : `User #${d.userId}`}</p>
                        <p className="text-xs" style={{ color: '#6b7280' }}>{d.txId} · {d.method}</p>
                      </div>
                      <span className="text-sm font-bold" style={{ color: '#f87171' }}>-{fmtCurrency(d.amount, users.find(u => u.id === d.userId)?.currency)}</span>
                    </div>
                  )
                })}
                {deposits.filter(d => d.type === 'withdraw' && d.status === 'pending').length === 0 && (
                  <p className="px-5 py-4 text-xs text-gray-500">No pending withdrawals</p>
                )}
              </div>
            </div>

            {/* Pending orders */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-sm font-bold text-white">Pending Buy Orders</h3>
                <button onClick={() => navigate('/admin/orders')} className="text-xs font-semibold" style={{ color: '#c9a84c' }}>View All →</button>
              </div>
              <div className="divide-y divide-white/5">
                {purchases.filter(p => p.status === 'pending').slice(0, 4).map(p => {
                  const user = users.find(u => u.id === p.userId)
                  return (
                    <div key={p.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-xs font-semibold text-white">{user ? `${user.firstName} ${user.lastName}` : `User #${p.userId}`}</p>
                        <p className="text-xs" style={{ color: '#6b7280' }}>{p.quantity} {p.symbol} · {p.type === 'buy_stock' ? 'Stock' : 'Crypto'}</p>
                      </div>
                      <span className="text-sm font-bold" style={{ color: '#f59e0b' }}>{fmtCurrency(p.totalCost, users.find(u => u.id === p.userId)?.currency)}</span>
                    </div>
                  )
                })}
                {purchases.filter(p => p.status === 'pending').length === 0 && (
                  <p className="px-5 py-4 text-xs text-gray-500">No pending orders</p>
                )}
              </div>
            </div>

            {/* Active bot trades */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-sm font-bold text-white">Active Bot Trades</h3>
                <button onClick={() => navigate('/admin/bot-trades')} className="text-xs font-semibold" style={{ color: '#c9a84c' }}>View All →</button>
              </div>
              <div className="divide-y divide-white/5">
                {botTrades.slice(0, 4).map(bt => (
                  <div key={bt.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-xs font-semibold text-white">{bt.userName}</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>{bt.pair} · {bt.strategy} · {bt.timeframe}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold" style={{ color: bt.pnl >= 0 ? '#4ade80' : '#f87171' }}>
                        {bt.pnl >= 0 ? '+' : ''}{fmtCurrency(bt.pnl, users.find(u => u.id === bt.userId)?.currency)}
                      </span>
                      <p className="text-xs" style={{ color: '#6b7280' }}>
                        {Math.max(0, Math.floor((bt.remainingSeconds || 0) / 60))}m left
                      </p>
                    </div>
                  </div>
                ))}
                {botTrades.length === 0 && (
                  <p className="px-5 py-4 text-xs text-gray-500">No active bot trades</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent admin actions */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-sm font-bold text-white">Recent Admin Actions</h3>
            </div>
            {actions.length === 0 ? (
              <p className="px-5 py-6 text-xs text-gray-500">No admin actions yet. Approve or reject requests to see activity here.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {actions.map(a => (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-3">
                    <ActionBadge action={a.action} />
                    <p className="flex-1 text-xs text-gray-300 truncate">{a.details}</p>
                    <p className="text-xs flex-shrink-0" style={{ color: '#6b7280' }}>
                      {new Date(a.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
