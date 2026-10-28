import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AdminLayout from '../components/layout/AdminLayout'
import { 
  getActiveBotTrades, 
  executeAdminBotTrade, 
  updateTradeProfit, 
  forceCloseTrade,
  type AdminBotTrade,
  type ExecuteTradePayload 
} from '../services/botTradeService'
import { getAllUsers } from '../services/userService'
import type { AdminUser } from '../types'

function fmtCurrency(n: number, currency = 'USD') {
  const code = /^[A-Z]{3}$/.test(currency) ? currency : 'USD'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(n)
  } catch {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatTimeLeft(seconds: number | null): string {
  if (!seconds || seconds <= 0) return 'Closing...'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function StrategyBadge({ strategy }: { strategy: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    'AI Scalper Pro': { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
    'Trend Follower': { bg: 'rgba(74,222,128,0.12)', color: '#4ade80' },
    'Mean Reversion': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
    'Grid Bot': { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
    'DCA Strategy': { bg: 'rgba(248,113,113,0.12)', color: '#f87171' },
  }
  const c = colors[strategy] || { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af' }
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap" style={{ background: c.bg, color: c.color }}>
      {strategy}
    </span>
  )
}

function SideBadge({ side }: { side: 'buy' | 'sell' }) {
  return (
    <span className="px-2 py-0.5 rounded text-xs font-bold uppercase"
      style={{ color: side === 'buy' ? '#4ade80' : '#f87171', background: side === 'buy' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)' }}>
      {side}
    </span>
  )
}

function EditProfitModal({ 
  trade, 
  onClose, 
  onSave 
}: { 
  trade: AdminBotTrade; 
  onClose: () => void; 
  onSave: (profit: number, loss: number, duration: number) => void 
}) {
  const [profit, setProfit] = useState(String(trade.expectedProfit || ''))
  const [loss, setLoss] = useState('')
  const [duration, setDuration] = useState(String(trade.tradeDurationSeconds || ''))
  const [saving, setSaving] = useState(false)

  // Generate a realistic profit: 0.5%–4% of (entryPrice × amount)
  const generateProfit = () => {
    const base = trade.entryPrice * trade.amount
    const pct = 0.5 + Math.random() * 3.5
    setProfit((base * pct / 100).toFixed(2))
    setLoss('') // clear loss when profit is generated
  }

  // Generate a realistic loss: 0.3%–2.5% of (entryPrice × amount)
  const generateLoss = () => {
    const base = trade.entryPrice * trade.amount
    const pct = 0.3 + Math.random() * 2.2
    setLoss((base * pct / 100).toFixed(2))
    setProfit('') // clear profit when loss is generated
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const profitNum = parseFloat(profit) || 0
      const lossNum   = parseFloat(loss)   || 0
      const durationNum = parseInt(duration) || 0
      await onSave(profitNum, lossNum, durationNum)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-md rounded-2xl p-6"
          style={{ background: 'rgba(22,15,53,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-bold text-white mb-1">Edit Trade Parameters</h3>
          <p className="text-xs mb-5" style={{ color: '#6b7280' }}>
            Set profit <span style={{ color: '#4ade80' }}>or</span> loss — only one applies at close.
          </p>

          <div className="space-y-4">
            {/* Expected Profit */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium" style={{ color: '#9ca3af' }}>Expected Profit ($)</label>
                <button
                  onClick={generateProfit}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                  style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}
                >
                  <i className="fas fa-bolt text-xs" />
                  Generate Profit
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={profit}
                onChange={(e) => { setProfit(e.target.value); if (e.target.value) setLoss('') }}
                className={inputCls}
                style={{ ...inputStyle, borderColor: profit ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)' }}
                placeholder="Leave empty for random"
              />
            </div>

            {/* Expected Loss */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium" style={{ color: '#9ca3af' }}>Expected Loss ($)</label>
                <button
                  onClick={generateLoss}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                  style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}
                >
                  <i className="fas fa-bolt text-xs" />
                  Generate Loss
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={loss}
                onChange={(e) => { setLoss(e.target.value); if (e.target.value) setProfit('') }}
                className={inputCls}
                style={{ ...inputStyle, borderColor: loss ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.1)' }}
                placeholder="Leave empty for random"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs mb-1.5 block font-medium" style={{ color: '#9ca3af' }}>Duration (seconds)</label>
              <input
                type="number"
                min="10"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className={inputCls}
                style={inputStyle}
                placeholder="Leave empty for timeframe default"
              />
            </div>
          </div>

          {/* Active indicator */}
          {(profit || loss) && (
            <div
              className="mt-4 px-3 py-2 rounded-xl flex items-center gap-2 text-xs"
              style={{
                background: profit ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                border: `1px solid ${profit ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
                color: profit ? '#4ade80' : '#f87171',
              }}
            >
              <i className={`fas ${profit ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'} text-xs`} />
              Trade will close as a <strong>{profit ? 'profit' : 'loss'}</strong> of{' '}
              <strong>${profit || loss}</strong>
            </div>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#9ca3af' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function ExecuteTradeModal({ 
  users, 
  onClose, 
  onExecute 
}: { 
  users: AdminUser[]; 
  onClose: () => void; 
  onExecute: (payload: ExecuteTradePayload) => void 
}) {
  const [payload, setPayload] = useState<ExecuteTradePayload>({
    userId: 0,
    pair: 'BTC/USDT',
    side: 'buy',
    entryPrice: 50000,
    amount: 0.001,
    strategy: 'AI Scalper Pro',
    timeframe: '1h',
  })
  const [profit, setProfit] = useState('')
  const [loss, setLoss]     = useState('')
  const [duration, setDuration] = useState('')
  const [executing, setExecuting] = useState(false)

  // Generate profit: 0.5%–4% of position value
  const generateProfit = () => {
    const base = (payload.entryPrice || 50000) * (payload.amount || 0.001)
    const pct = 0.5 + Math.random() * 3.5
    setProfit((base * pct / 100).toFixed(2))
    setLoss('')
  }

  // Generate loss: 0.3%–2.5% of position value
  const generateLoss = () => {
    const base = (payload.entryPrice || 50000) * (payload.amount || 0.001)
    const pct = 0.3 + Math.random() * 2.2
    setLoss((base * pct / 100).toFixed(2))
    setProfit('')
  }

  const handleExecute = async () => {
    if (!payload.userId) return
    setExecuting(true)
    try {
      const profitNum   = parseFloat(profit)   || undefined
      const lossNum     = parseFloat(loss)     || undefined
      const durationNum = parseInt(duration)   || undefined
      await onExecute({
        ...payload,
        expectedProfit: profitNum,
        expectedLoss:   lossNum,
        tradeDurationSeconds: durationNum,
      })
      onClose()
    } finally {
      setExecuting(false)
    }
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-lg rounded-2xl p-6 overflow-y-auto"
          style={{ background: 'rgba(22,15,53,0.95)', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh' }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-bold text-white mb-4">Execute Bot Trade</h3>

          {/* ── Core trade fields ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs mb-1.5 block" style={{ color: '#9ca3af' }}>User</label>
              <select
                value={payload.userId}
                onChange={(e) => setPayload(p => ({ ...p, userId: parseInt(e.target.value) }))}
                className={inputCls} style={inputStyle}
              >
                <option value={0}>Select user...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: '#9ca3af' }}>Pair</label>
              <select value={payload.pair} onChange={(e) => setPayload(p => ({ ...p, pair: e.target.value }))} className={inputCls} style={inputStyle}>
                {['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: '#9ca3af' }}>Side</label>
              <select value={payload.side} onChange={(e) => setPayload(p => ({ ...p, side: e.target.value as 'buy' | 'sell' }))} className={inputCls} style={inputStyle}>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: '#9ca3af' }}>Entry Price</label>
              <input type="number" step="0.01" value={payload.entryPrice}
                onChange={(e) => setPayload(p => ({ ...p, entryPrice: parseFloat(e.target.value) || 0 }))}
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: '#9ca3af' }}>Amount</label>
              <input type="number" step="0.000001" value={payload.amount}
                onChange={(e) => setPayload(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: '#9ca3af' }}>Strategy</label>
              <select value={payload.strategy} onChange={(e) => setPayload(p => ({ ...p, strategy: e.target.value }))} className={inputCls} style={inputStyle}>
                {['AI Scalper Pro', 'Trend Follower', 'Mean Reversion', 'Grid Bot', 'DCA Strategy'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: '#9ca3af' }}>Timeframe</label>
              <select value={payload.timeframe} onChange={(e) => setPayload(p => ({ ...p, timeframe: e.target.value }))} className={inputCls} style={inputStyle}>
                {['1m', '5m', '15m', '30m', '1h', '4h', '1d'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Outcome section ── */}
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: '#9ca3af' }}>
              Trade Outcome <span style={{ color: '#6b7280', fontWeight: 400 }}>— set profit or loss (only one applies)</span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              {/* Expected Profit */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium" style={{ color: '#9ca3af' }}>Expected Profit ($)</label>
                  <button
                    onClick={generateProfit}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                    style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}
                  >
                    <i className="fas fa-bolt text-xs" /> Generate
                  </button>
                </div>
                <input
                  type="number" step="0.01" min="0" value={profit}
                  onChange={(e) => { setProfit(e.target.value); if (e.target.value) setLoss('') }}
                  className={inputCls}
                  style={{ ...inputStyle, borderColor: profit ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)' }}
                  placeholder="Random if empty"
                />
              </div>

              {/* Expected Loss */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium" style={{ color: '#9ca3af' }}>Expected Loss ($)</label>
                  <button
                    onClick={generateLoss}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                    style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}
                  >
                    <i className="fas fa-bolt text-xs" /> Generate
                  </button>
                </div>
                <input
                  type="number" step="0.01" min="0" value={loss}
                  onChange={(e) => { setLoss(e.target.value); if (e.target.value) setProfit('') }}
                  className={inputCls}
                  style={{ ...inputStyle, borderColor: loss ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.1)' }}
                  placeholder="Random if empty"
                />
              </div>

              {/* Duration */}
              <div className="col-span-2">
                <label className="text-xs mb-1.5 block font-medium" style={{ color: '#9ca3af' }}>Duration (seconds)</label>
                <input
                  type="number" min="10" value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className={inputCls} style={inputStyle}
                  placeholder="Leave empty for timeframe default"
                />
              </div>
            </div>

            {/* Active outcome indicator */}
            {(profit || loss) && (
              <div
                className="mt-3 px-3 py-2 rounded-xl flex items-center gap-2 text-xs"
                style={{
                  background: profit ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                  border: `1px solid ${profit ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
                  color: profit ? '#4ade80' : '#f87171',
                }}
              >
                <i className={`fas ${profit ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'} text-xs`} />
                Trade will close as a <strong className="mx-1">{profit ? 'profit' : 'loss'}</strong> of{' '}
                <strong>${profit || loss}</strong>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-5">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#9ca3af' }}
            >
              Cancel
            </button>
            <button
              onClick={handleExecute}
              disabled={executing || !payload.userId}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}
            >
              {executing ? 'Executing...' : 'Execute Trade'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function BotTrades() {
  const [trades, setTrades] = useState<AdminBotTrade[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTrade, setEditingTrade] = useState<AdminBotTrade | null>(null)
  const [showExecuteModal, setShowExecuteModal] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, u] = await Promise.all([
        getActiveBotTrades(),
        getAllUsers(),
      ])
      setTrades(t)
      setUsers(u)
    } catch (e) {
      showToast('Failed to load bot trades', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [load])

  const handleEditProfit = async (profit: number, loss: number, duration: number) => {
    if (!editingTrade) return
    try {
      // If loss is set, pass a negative expectedProfit so the backend forces a loss outcome
      const effectiveProfit = loss > 0 ? -loss : profit || undefined
      await updateTradeProfit(editingTrade.id, effectiveProfit ?? undefined, duration || undefined)
      showToast('Trade parameters updated', 'success')
      await load()
    } catch (e) {
      showToast('Failed to update trade', 'error')
    }
  }

  const handleForceClose = async (tradeId: string) => {
    try {
      await forceCloseTrade(tradeId)
      showToast('Trade force-closed', 'success')
      await load()
    } catch (e) {
      showToast('Failed to close trade', 'error')
    }
  }

  const handleExecuteTrade = async (payload: ExecuteTradePayload) => {
    try {
      await executeAdminBotTrade(payload)
      showToast('Bot trade executed', 'success')
      await load()
    } catch (e) {
      showToast('Failed to execute trade', 'error')
    }
  }

  return (
    <AdminLayout title="Bot Trades" subtitle="Real-time active bot trades across all users">
      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            style={{
              background: toast.type === 'success' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
              color: toast.type === 'success' ? '#4ade80' : '#f87171',
              border: `1px solid ${toast.type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`
            }}
          >
            <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2`} />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {/* Header with execute button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.15)' }}>
              <i className="fas fa-robot text-lg" style={{ color: '#a78bfa' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Active Bot Trades</h2>
              <p className="text-sm" style={{ color: '#9ca3af' }}>
                {trades.length} active trade{trades.length !== 1 ? 's' : ''} · auto-refreshes every 10s
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowExecuteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}
          >
            <i className="fas fa-plus text-xs" />
            Execute Trade
          </button>
        </div>

        {/* Active trades table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-500">
              <i className="fas fa-spinner fa-spin mr-2" />
              Loading active trades...
            </div>
          ) : trades.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(167,139,250,0.1)' }}>
                <i className="fas fa-robot text-2xl" style={{ color: '#a78bfa', opacity: 0.5 }} />
              </div>
              <p className="text-sm font-semibold text-white">No active bot trades</p>
              <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                Execute a trade or wait for users to start their bots
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-sm">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['User', 'Strategy', 'Pair', 'Side', 'Entry', 'Amount', 'Expected P&L', 'Time Left', 'Opened', 'Actions'].map(col => (
                      <th key={col} className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade, i) => (
                    <tr key={trade.id} style={{ borderBottom: i === trades.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="text-sm font-semibold text-white">{trade.userName}</p>
                          <p className="text-xs" style={{ color: '#6b7280' }}>{trade.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <StrategyBadge strategy={trade.strategy} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{trade.pair}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>
                            {trade.timeframe}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <SideBadge side={trade.side} />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-white">{fmtCurrency(trade.entryPrice, users.find(u => u.id === trade.userId)?.currency)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-white">{trade.amount}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
                          {trade.expectedProfit ? fmtCurrency(trade.expectedProfit, users.find(u => u.id === trade.userId)?.currency) : 'Random'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4ade80' }} />
                          <span className="text-xs font-mono" style={{ color: '#4ade80' }}>
                            {formatTimeLeft(trade.remainingSeconds)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs" style={{ color: '#6b7280' }}>{timeAgo(trade.openedAt)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingTrade(trade)}
                            className="px-2 py-1 rounded text-xs font-semibold transition-all hover:opacity-90"
                            style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleForceClose(trade.id)}
                            className="px-2 py-1 rounded text-xs font-semibold transition-all hover:opacity-90"
                            style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}
                          >
                            Close
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit profit modal */}
      {editingTrade && (
        <EditProfitModal
          trade={editingTrade}
          onClose={() => setEditingTrade(null)}
          onSave={handleEditProfit}
        />
      )}

      {/* Execute trade modal */}
      {showExecuteModal && (
        <ExecuteTradeModal
          users={users}
          onClose={() => setShowExecuteModal(false)}
          onExecute={handleExecuteTrade}
        />
      )}
    </AdminLayout>
  )
}