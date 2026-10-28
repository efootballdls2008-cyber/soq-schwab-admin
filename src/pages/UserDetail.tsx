import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import AdminLayout from '../components/layout/AdminLayout'
import { getUserById, adjustBalance, suspendUser, activateUser } from '../services/userService'
import { getDepositsByUser } from '../services/depositService'
import { getUserActiveBotTrades, updateBotTradeProfit, closeBotTrade, AdminBotTrade } from '../services/botTradeService'
import { get } from '../api/client'
import type { AdminUser, Deposit, Holding, Purchase, BotSettings } from '../types'

// Build a currency formatter based on the user's stored currency code
function makeFmt(currency: string) {
  // Use Intl if the currency code is a valid 3-letter ISO code, else fall back to USD
  const code = /^[A-Z]{3}$/.test(currency) ? currency : 'USD'
  try {
    const nf = new Intl.NumberFormat('en-US', { style: 'currency', currency: code })
    return (n: number) => nf.format(n)
  } catch {
    return (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  }
}

function InfoRow({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div className="flex items-start justify-between py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span className="text-xs" style={{ color: '#9ca3af' }}>{label}</span>
      <span className="text-xs font-semibold text-white text-right max-w-[60%]">{value || '—'}</span>
    </div>
  )
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userId = parseInt(id ?? '0')

  const [user, setUser] = useState<AdminUser | null>(null)
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [botTrades, setBotTrades] = useState<AdminBotTrade[]>([])
  const [botSettings, setBotSettings] = useState<BotSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustNote, setAdjustNote] = useState('')
  const [adjustLoading, setAdjustLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'holdings' | 'transactions' | 'bot-trading'>('info')

  const showToast = (msg: string, type: 'success' | 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [u, d, h, p, bt, bs] = await Promise.all([
        getUserById(userId),
        getDepositsByUser(userId),
        get<Holding[]>(`/holdings?userId=${userId}`),
        get<Purchase[]>(`/purchases?userId=${userId}`),
        getUserActiveBotTrades(userId),
        get<BotSettings>(`/botSettings/${userId}`).catch(() => null),
      ])
      setUser(u)
      setDeposits(d)
      setHoldings(h)
      setPurchases(p)
      setBotTrades(bt)
      setBotSettings(bs)
    } catch { showToast('Failed to load user', 'error') }
    finally { setLoading(false) }
  }, [userId])

  useEffect(() => { load() }, [load])

  async function handleAdjustBalance() {
    if (!user || !adjustAmount) return
    const amount = parseFloat(adjustAmount)
    if (isNaN(amount)) return
    setAdjustLoading(true)
    try {
      const newBalance = user.balance + amount
      if (newBalance < 0) throw new Error('Balance cannot go below zero')
      await adjustBalance(user.id, newBalance)
      showToast(`Balance ${amount >= 0 ? 'credited' : 'debited'} by ${fmt(Math.abs(amount))}`, 'success')
      setAdjustAmount('')
      setAdjustNote('')
      await load()
    } catch (e) { showToast(e instanceof Error ? e.message : 'Failed', 'error') }
    finally { setAdjustLoading(false) }
  }

  async function handleToggleStatus() {
    if (!user) return
    try {
      if (user.accountStatus === 'suspended') { await activateUser(user.id); showToast('User activated', 'success') }
      else { await suspendUser(user.id); showToast('User suspended', 'success') }
      await load()
    } catch { showToast('Failed', 'error') }
  }

  async function handleUpdateBotProfit(tradeId: string, newProfit: number, newDuration: number) {
    try {
      await updateBotTradeProfit(tradeId, newProfit, newDuration)
      showToast('Bot trade updated', 'success')
      await load()
    } catch { showToast('Failed to update bot trade', 'error') }
  }

  async function handleCloseBotTrade(tradeId: string) {
    try {
      await closeBotTrade(tradeId)
      showToast('Bot trade closed', 'success')
      await load()
    } catch { showToast('Failed to close bot trade', 'error') }
  }

  if (loading) return (
    <AdminLayout title="User Detail">
      <div className="flex items-center justify-center h-64 text-gray-500"><i className="fas fa-spinner fa-spin mr-2" />Loading…</div>
    </AdminLayout>
  )

  if (!user) return (
    <AdminLayout title="User Detail">
      <div className="text-center py-16 text-gray-500">User not found. <button onClick={() => navigate('/admin/users')} className="text-blue-400 underline">Go back</button></div>
    </AdminLayout>
  )

  const isSuspended = user.accountStatus === 'suspended'
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  const totalHoldingsValue = holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0)
  // Dynamic formatter — uses the user's stored currency (e.g. NGN, GBP, EUR)
  const fmt = makeFmt(user.currency ?? 'USD')

  return (
    <AdminLayout title="User Detail" subtitle={`${user.firstName} ${user.lastName}`}>
      <AnimatePresence>
        {toast && (
          <motion.div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} style={{ background: toast.type === 'success' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)', color: toast.type === 'success' ? '#4ade80' : '#f87171', border: `1px solid ${toast.type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
            <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2`} />{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-5">
        {/* Back + header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/users')} className="flex items-center gap-2 text-xs font-semibold" style={{ color: '#9ca3af' }}>
            <i className="fas fa-arrow-left text-xs" />Back to Users
          </button>
        </div>

        {/* Profile card */}
        <div className="rounded-2xl p-5 flex flex-wrap items-center gap-5" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0" style={{ background: 'rgba(201,168,76,0.2)', color: '#c9a84c' }}>{initials}</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white">{user.firstName} {user.lastName}</h2>
            <p className="text-sm" style={{ color: '#9ca3af' }}>{user.email}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: user.role === 'Admin' ? 'rgba(201,168,76,0.12)' : 'rgba(96,165,250,0.12)', color: user.role === 'Admin' ? '#c9a84c' : '#60a5fa' }}>{user.role}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: isSuspended ? 'rgba(248,113,113,0.12)' : 'rgba(74,222,128,0.12)', color: isSuspended ? '#f87171' : '#4ade80' }}>{isSuspended ? 'Suspended' : 'Active'}</span>
              {user.kycVerified && <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}><i className="fas fa-check-circle mr-1" />KYC Verified</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-2xl font-bold text-white">{fmt(user.balance)}</p>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-lg"
                style={{ background: 'rgba(162,133,57,0.15)', color: '#c9a84c', border: '1px solid rgba(162,133,57,0.3)' }}
              >
                {user.currency || 'USD'}
              </span>
              <p className="text-xs" style={{ color: '#6b7280' }}>Available Balance</p>
            </div>
            <button onClick={handleToggleStatus} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: isSuspended ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)', color: isSuspended ? '#4ade80' : '#f87171', border: `1px solid ${isSuspended ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}` }}>
              <i className={`fas ${isSuspended ? 'fa-unlock' : 'fa-ban'} mr-1.5`} />{isSuspended ? 'Activate Account' : 'Suspend Account'}
            </button>
          </div>
        </div>

        {/* Balance adjustment */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-sm font-bold text-white mb-4">Adjust Balance</h3>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: '#6b7280' }}>{user.currency || 'USD'}</span>
              <input type="number" step="0.01" placeholder="Amount (use - to debit)" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} className="w-full pl-14 pr-4 py-2.5 rounded-xl text-sm text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <input type="text" placeholder="Reason (optional)" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} className="flex-1 min-w-[160px] px-4 py-2.5 rounded-xl text-sm text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
            <button onClick={handleAdjustBalance} disabled={adjustLoading || !adjustAmount} className="px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#a28539,#c9a84c)', color: '#0d0824' }}>
              {adjustLoading ? <i className="fas fa-spinner fa-spin" /> : 'Apply'}
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: '#6b7280' }}>Use positive values to credit, negative to debit. Current balance: {fmt(user.balance)} ({user.currency || 'USD'})</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {(['info', 'holdings', 'transactions', 'bot-trading'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className="px-4 py-2.5 text-sm font-medium capitalize relative" style={{ color: activeTab === t ? '#fff' : '#6b7280' }}>
              {t === 'holdings' ? `Holdings (${holdings.length})` : 
               t === 'transactions' ? `Transactions (${deposits.length + purchases.length})` : 
               t === 'bot-trading' ? `Bot Trading (${botTrades.length})` :
               'Info & Banking'}
              {activeTab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: '#c9a84c' }} />}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Personal info */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-sm font-bold text-white mb-4">Personal Information</h3>
              <InfoRow label="Full Name" value={`${user.firstName} ${user.lastName}`} />
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Phone" value={user.phone} />
              <InfoRow label="Date of Birth" value={user.dateOfBirth} />
              <InfoRow label="Country" value={user.country} />
              <InfoRow label="Currency" value={user.currency || 'USD'} />
              <InfoRow label="Address" value={user.address} />
              <InfoRow label="Member Since" value={user.memberSince} />
            </div>

            {/* Banking info */}
            <div className="space-y-4">
              <div className="rounded-2xl p-5" style={{ background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.15)' }}>
                <h3 className="text-sm font-bold mb-4" style={{ color: '#4ade80' }}><i className="fas fa-arrow-down mr-2" />Deposit Account (Sends FROM)</h3>
                <InfoRow label="Bank Name" value={user.depositBankName} />
                <InfoRow label="Account Name" value={user.depositAccountName} />
                <InfoRow label="Account Number" value={user.depositAccountNumber} />
                <InfoRow label="Routing Number" value={user.depositRoutingNumber} />
                <InfoRow label="Account Type" value={user.depositAccountType} />
              </div>
              <div className="rounded-2xl p-5" style={{ background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.15)' }}>
                <h3 className="text-sm font-bold mb-4" style={{ color: '#a78bfa' }}><i className="fas fa-arrow-up mr-2" />Withdrawal Account (Send TO)</h3>
                <InfoRow label="Bank Name" value={user.withdrawBankName} />
                <InfoRow label="Account Name" value={user.withdrawAccountName} />
                <InfoRow label="Account Number" value={user.withdrawAccountNumber} />
                <InfoRow label="Routing Number" value={user.withdrawRoutingNumber} />
                <InfoRow label="Account Type" value={user.withdrawAccountType} />
                <InfoRow label="SWIFT Code" value={user.withdrawSwiftCode} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'holdings' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-sm font-bold text-white">Portfolio Holdings</h3>
              <span className="text-sm font-bold" style={{ color: '#c9a84c' }}>Total: {fmt(totalHoldingsValue)}</span>
            </div>
            {holdings.length === 0 ? (
              <p className="px-5 py-8 text-xs text-gray-500">No holdings yet.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {holdings.map(h => {
                  const value = h.quantity * h.currentPrice
                  const pnl = (h.currentPrice - h.avgBuyPrice) * h.quantity
                  return (
                    <div key={h.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${h.color}22`, color: h.color }}>{h.symbol.slice(0, 2)}</div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-white">{h.name} <span className="text-gray-500">({h.symbol})</span></p>
                        <p className="text-xs" style={{ color: '#6b7280' }}>{h.quantity} units · Avg {fmt(h.avgBuyPrice)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-white">{fmt(value)}</p>
                        <p className="text-xs font-semibold" style={{ color: pnl >= 0 ? '#4ade80' : '#f87171' }}>{pnl >= 0 ? '+' : ''}{fmt(pnl)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-4">
            {/* Deposits/Withdrawals */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-sm font-bold text-white">Deposits & Withdrawals</h3>
              </div>
              {deposits.length === 0 ? <p className="px-5 py-6 text-xs text-gray-500">No transactions.</p> : (
                <div className="divide-y divide-white/5">
                  {deposits.map(d => (
                    <div key={d.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-xs font-semibold text-white">{d.txId}</p>
                        <p className="text-xs" style={{ color: '#6b7280' }}>{d.method} · {d.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold" style={{ color: d.type === 'deposit' ? '#4ade80' : '#a78bfa' }}>{d.type === 'deposit' ? '+' : '-'}{fmt(d.amount)}</p>
                        <span className="text-xs" style={{ color: d.status === 'completed' ? '#4ade80' : d.status === 'pending' ? '#fbbf24' : '#f87171' }}>{d.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Purchases */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-sm font-bold text-white">Buy Orders</h3>
              </div>
              {purchases.length === 0 ? <p className="px-5 py-6 text-xs text-gray-500">No buy orders.</p> : (
                <div className="divide-y divide-white/5">
                  {purchases.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-xs font-semibold text-white">{p.txId} · {p.quantity} {p.symbol}</p>
                        <p className="text-xs" style={{ color: '#6b7280' }}>{p.type === 'buy_crypto' ? 'Crypto' : 'Stock'} · {p.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold" style={{ color: p.type === 'buy_crypto' ? '#f59e0b' : '#60a5fa' }}>{fmt(p.totalCost)}</p>
                        <span className="text-xs" style={{ color: p.status === 'completed' ? '#4ade80' : p.status === 'pending' ? '#fbbf24' : '#f87171' }}>{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'bot-trading' && (
          <div className="space-y-4">
            {/* Bot Settings */}
            {botSettings && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-sm font-bold text-white mb-4">Bot Settings</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <InfoRow label="Strategy" value={botSettings.strategy} />
                  <InfoRow label="Risk Level" value={botSettings.riskLevel} />
                  <InfoRow label="Timeframe" value={botSettings.timeframe} />
                  <InfoRow label="Confidence Threshold" value={`${botSettings.confidenceThreshold}%`} />
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: botSettings.isActive ? 'rgba(74,222,128,0.12)' : 'rgba(156,163,175,0.12)', color: botSettings.isActive ? '#4ade80' : '#9ca3af' }}>
                    {botSettings.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: botSettings.adminControlled ? 'rgba(201,168,76,0.12)' : 'rgba(96,165,250,0.12)', color: botSettings.adminControlled ? '#c9a84c' : '#60a5fa' }}>
                    {botSettings.adminControlled ? 'Admin Controlled' : 'User Controlled'}
                  </span>
                </div>
              </div>
            )}

            {/* Active Bot Trades */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-sm font-bold text-white">Active Bot Trades</h3>
                {botTrades.length > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                    {botTrades.length} Active
                  </span>
                )}
              </div>
              {botTrades.length === 0 ? (
                <p className="px-5 py-8 text-xs text-gray-500">No active bot trades.</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {botTrades.map(trade => {
                    const timeRemainingMin = Math.max(0, Math.floor((trade.remainingSeconds || 0) / 60))
                    const pnl = trade.finalPnl ?? trade.pnl
                    return (
                      <div key={trade.id} className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{trade.pair} · {trade.strategy}</p>
                            <p className="text-xs" style={{ color: '#6b7280' }}>{trade.timeframe} · {trade.side.toUpperCase()} · {trade.amount} units</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold" style={{ color: pnl >= 0 ? '#4ade80' : '#f87171' }}>
                              {pnl >= 0 ? '+' : ''}{fmt(pnl)}
                            </p>
                            <p className="text-xs" style={{ color: '#6b7280' }}>
                              {timeRemainingMin > 0 ? `${timeRemainingMin}m left` : 'Closing soon'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs" style={{ color: '#6b7280' }}>Entry Price</p>
                            <p className="text-xs font-semibold text-white">{fmt(trade.entryPrice)}</p>
                          </div>
                          <div>
                            <p className="text-xs" style={{ color: '#6b7280' }}>Expected Profit</p>
                            <p className="text-xs font-semibold text-white">{fmt(trade.expectedProfit || 0)}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              const newProfit = prompt('New expected profit:', (trade.expectedProfit || 0).toString())
                              const newDuration = prompt('New duration (seconds):', (trade.tradeDurationSeconds || 0).toString())
                              if (newProfit && newDuration) {
                                handleUpdateBotProfit(trade.id, parseFloat(newProfit), parseInt(newDuration))
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold" 
                            style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}
                          >
                            <i className="fas fa-edit mr-1" />Edit
                          </button>
                          <button 
                            onClick={() => handleCloseBotTrade(trade.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold" 
                            style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}
                          >
                            <i className="fas fa-times mr-1" />Close
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
