import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AdminLayout from '../components/layout/AdminLayout'
import { getPlatformSettings, updatePlatformSettings } from '../services/platformService'
import { resetAllData, deleteAllUsers } from '../services/resetService'
import { get, patch } from '../api/client'
import { API } from '../api/endpoints'
import type { PlatformSettings } from '../types'

// ── Shared primitives ────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{ background: 'rgba(22,15,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {children}
    </div>
  )
}

function CardTitle({ icon, iconColor, children }: { icon: string; iconColor: string; children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
      <i className={`${icon} text-xs`} style={{ color: iconColor }} />
      {children}
    </h3>
  )
}

function NumField({ label, value, onChange, min, max, step, hint }: {
  label: string; value: number; onChange: (v: number) => void
  min?: number; max?: number; step?: number; hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>{label}</label>
      <input
        type="number" value={value} min={min} max={max} step={step ?? 1}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
      />
      {hint && <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{hint}</p>}
    </div>
  )
}

function TextField({ label, value, onChange, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>{label}</label>
      <input
        type="text" value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
      />
      {hint && <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{hint}</p>}
    </div>
  )
}

function SelectField({ label, value, onChange, options, hint }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {options.map(o => <option key={o} value={o} style={{ background: '#1a1040' }}>{o}</option>)}
      </select>
      {hint && <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{hint}</p>}
    </div>
  )
}

function ToggleRow({ label, desc, value, onChange, color = '#4ade80', last = false }: {
  label: string; desc: string; value: boolean; onChange: () => void; color?: string; last?: boolean
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 py-3"
      style={last ? {} : { borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{desc}</p>
      </div>
      <button
        onClick={onChange}
        className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
        style={{ background: value ? color : 'rgba(255,255,255,0.1)' }}
        aria-pressed={value}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
          style={{ left: value ? '22px' : '2px' }}
        />
      </button>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

type Tab = 'general' | 'features' | 'security' | 'danger'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'general',  label: 'General',  icon: 'fas fa-sliders' },
  { key: 'features', label: 'Features', icon: 'fas fa-toggle-on' },
  { key: 'security', label: 'Security', icon: 'fas fa-shield-halved' },
  { key: 'danger',   label: 'Danger',   icon: 'fas fa-triangle-exclamation' },
]

export default function Settings() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try { setSettings(await getPlatformSettings()) }
    catch { showToast('Failed to load settings', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    try {
      await updatePlatformSettings(settings.id, settings)
      showToast('Settings saved successfully', 'success')
    } catch { showToast('Failed to save settings', 'error') }
    finally { setSaving(false) }
  }

  function update<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) {
    setSettings(p => p ? { ...p, [key]: value } : p)
  }

  // Danger zone
  const [showResetModal,      setShowResetModal]      = useState(false)
  const [resetConfirmText,    setResetConfirmText]    = useState('')
  const [resetting,           setResetting]           = useState(false)
  const [showDeleteModal,     setShowDeleteModal]     = useState(false)
  const [deleteConfirmText,   setDeleteConfirmText]   = useState('')
  const [deletingUsers,       setDeletingUsers]       = useState(false)

  // User Defaults — apply to existing users
  const [applyingDefaults, setApplyingDefaults] = useState(false)
  const [showApplyModal,   setShowApplyModal]   = useState(false)

  async function handleApplyDefaults() {
    if (!settings) return
    setApplyingDefaults(true)
    try {
      // First save settings
      await updatePlatformSettings(settings.id, settings)

      // Fetch all Member users
      const users = await get<{ id: number; balance: number; role: string }[]>(API.users)
      const members = users.filter(u => u.role === 'Member')

      const bonus = settings.welcomeBonusEnabled ? (settings.welcomeBonusAmount ?? 0) : 0
      const starting = settings.defaultStartingBalance ?? 0
      const toAdd = starting + bonus

      if (toAdd > 0) {
        await Promise.all(
          members.map(u =>
            patch(API.user(u.id), { balance: u.balance + toAdd })
          )
        )
      }

      setShowApplyModal(false)
      showToast(`Settings saved and $${toAdd.toLocaleString()} added to ${members.length} user${members.length !== 1 ? 's' : ''}.`, 'success')
    } catch {
      showToast('Failed to apply defaults to users.', 'error')
    } finally {
      setApplyingDefaults(false)
    }
  }

  async function handleReset() {
    setResetting(true)
    try {
      await resetAllData()
      setShowResetModal(false)
      setResetConfirmText('')
      showToast('All platform data has been reset.', 'success')
    } catch { showToast('Reset failed. Please try again.', 'error') }
    finally { setResetting(false) }
  }

  async function handleDeleteUsers() {
    setDeletingUsers(true)
    try {
      const { deleted } = await deleteAllUsers()
      setShowDeleteModal(false)
      setDeleteConfirmText('')
      showToast(`${deleted} user${deleted !== 1 ? 's' : ''} deleted. Admin accounts preserved.`, 'success')
    } catch { showToast('Delete failed. Please try again.', 'error') }
    finally { setDeletingUsers(false) }
  }

  if (loading || !settings) return (
    <AdminLayout title="Settings">
      <div className="flex items-center justify-center h-64 text-gray-500">
        <i className="fas fa-spinner fa-spin mr-2" />Loading…
      </div>
    </AdminLayout>
  )

  return (
    <AdminLayout title="Platform Settings" subtitle="Configure platform-wide rules and limits">

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold shadow-2xl"
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            style={{
              background: toast.type === 'success' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
              color:      toast.type === 'success' ? '#4ade80' : '#f87171',
              border:     `1px solid ${toast.type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
              backdropFilter: 'blur(8px)',
            }}
          >
            <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} flex-shrink-0`} />
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 mb-6 p-1 rounded-xl w-full sm:w-fit overflow-x-auto"
        style={{ background: 'rgba(13,8,36,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all"
            style={activeTab === t.key
              ? { background: t.key === 'danger' ? 'rgba(248,113,113,0.2)' : 'linear-gradient(135deg,#a28539,#c9a84c)', color: t.key === 'danger' ? '#f87171' : '#0d0824' }
              : { color: '#6b7280' }
            }
          >
            <i className={`${t.icon} text-xs`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── GENERAL TAB ── */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Branding */}
          <Card className="lg:col-span-2">
            <CardTitle icon="fas fa-building" iconColor="#c9a84c">Platform Branding</CardTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <TextField
                label="Platform Name"
                value={settings.platformName}
                onChange={v => update('platformName', v)}
                placeholder="Charles Schwab"
                hint="Shown in emails and user messages"
              />
              <TextField
                label="Support Email"
                value={settings.supportEmail}
                onChange={v => update('supportEmail', v)}
                placeholder="support@schwab.com"
              />
              <TextField
                label="Support Phone"
                value={settings.supportPhone}
                onChange={v => update('supportPhone', v)}
                placeholder="+1 (800) 435-4000"
              />
            </div>
          </Card>

          {/* Deposit Limits */}
          <Card>
            <CardTitle icon="fas fa-arrow-down" iconColor="#4ade80">Deposit Limits</CardTitle>
            <div className="grid grid-cols-2 gap-4">
              <NumField label="Minimum ($)" value={settings.minDepositAmount} onChange={v => update('minDepositAmount', v)} min={0} />
              <NumField label="Maximum ($)" value={settings.maxDepositAmount} onChange={v => update('maxDepositAmount', v)} min={0} />
            </div>
          </Card>

          {/* Withdrawal Limits */}
          <Card>
            <CardTitle icon="fas fa-arrow-up" iconColor="#a78bfa">Withdrawal Limits</CardTitle>
            <div className="grid grid-cols-2 gap-4">
              <NumField label="Minimum ($)" value={settings.minWithdrawalAmount} onChange={v => update('minWithdrawalAmount', v)} min={0} />
              <NumField label="Maximum ($)" value={settings.maxWithdrawalAmount} onChange={v => update('maxWithdrawalAmount', v)} min={0} />
            </div>
          </Card>

          {/* Fees */}
          <Card>
            <CardTitle icon="fas fa-percentage" iconColor="#c9a84c">Fees</CardTitle>
            <div className="grid grid-cols-2 gap-4">
              <NumField label="Trading Fee (%)" value={settings.tradingFeePercent} onChange={v => update('tradingFeePercent', v)} min={0} max={10} step={0.01} hint="Per buy order" />
              <NumField label="Withdrawal Fee (%)" value={settings.withdrawalFeePercent} onChange={v => update('withdrawalFeePercent', v)} min={0} max={10} step={0.01} hint="Per withdrawal" />
            </div>
          </Card>

          {/* User Defaults */}
          <Card>
            <CardTitle icon="fas fa-user-plus" iconColor="#34d399">User Defaults</CardTitle>
            <div className="grid grid-cols-2 gap-4">
              <NumField label="Starting Balance ($)" value={settings.defaultStartingBalance} onChange={v => update('defaultStartingBalance', v)} min={0} hint="Credited on signup" />
              {/* Welcome Bonus — read-only when bonus toggle is off */}
              <div>
                <label className="block text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#9ca3af' }}>
                  Welcome Bonus ($)
                  {!settings.welcomeBonusEnabled && (
                    <span
                      className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium"
                      style={{ background: 'rgba(156,163,175,0.1)', color: '#6b7280', border: '1px solid rgba(156,163,175,0.15)' }}
                    >
                      <i className="fas fa-lock text-xs" />
                      Disabled
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.welcomeBonusAmount}
                    min={0}
                    onChange={e => settings.welcomeBonusEnabled && update('welcomeBonusAmount', parseFloat(e.target.value))}
                    readOnly={!settings.welcomeBonusEnabled}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                    style={{
                      background: settings.welcomeBonusEnabled
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(255,255,255,0.02)',
                      border: settings.welcomeBonusEnabled
                        ? '1px solid rgba(255,255,255,0.1)'
                        : '1px solid rgba(255,255,255,0.05)',
                      color: settings.welcomeBonusEnabled ? '#ffffff' : '#4b5563',
                      cursor: settings.welcomeBonusEnabled ? 'text' : 'not-allowed',
                    }}
                  />
                  {!settings.welcomeBonusEnabled && (
                    <div className="absolute inset-0 rounded-xl flex items-center justify-end pr-3 pointer-events-none">
                      <i className="fas fa-lock text-xs" style={{ color: '#374151' }} />
                    </div>
                  )}
                </div>
                <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                  {settings.welcomeBonusEnabled
                    ? 'Credited on first login'
                    : (
                      <span>
                        Enable <span className="font-medium" style={{ color: '#c9a84c' }}>Welcome Bonus</span> in Features to edit
                      </span>
                    )
                  }
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs mb-3" style={{ color: '#6b7280' }}>
                Apply these amounts to all existing Member accounts (adds to their current balance).
              </p>
              <button
                onClick={() => setShowApplyModal(true)}
                className="w-full py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}
              >
                <i className="fas fa-users mr-1.5" />Apply to All Existing Users
              </button>
            </div>
          </Card>

          {/* Bot Defaults */}
          <Card className="lg:col-span-2">
            <CardTitle icon="fas fa-robot" iconColor="#818cf8">Bot Trading Defaults</CardTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <SelectField
                label="Default Strategy"
                value={settings.botDefaultStrategy}
                onChange={v => update('botDefaultStrategy', v)}
                options={['AI Scalper Pro', 'Trend Follower', 'Mean Reversion', 'Momentum Trader', 'Grid Bot']}
              />
              <SelectField
                label="Default Risk Level"
                value={settings.botDefaultRiskLevel}
                onChange={v => update('botDefaultRiskLevel', v)}
                options={['Conservative', 'Moderate', 'Aggressive']}
              />
              <SelectField
                label="Default Timeframe"
                value={settings.botDefaultTimeframe}
                onChange={v => update('botDefaultTimeframe', v)}
                options={['1m', '5m', '15m', '30m', '1h', '4h', '1d']}
                hint="Candle interval used by the bot"
              />
              <NumField
                label="Confidence Threshold (%)"
                value={settings.botConfidenceThreshold}
                onChange={v => update('botConfidenceThreshold', v)}
                min={0} max={100} step={0.5}
                hint="Min signal confidence to open a position"
              />
              <NumField
                label="Max Open Trades (per user)"
                value={settings.botMaxOpenTrades}
                onChange={v => update('botMaxOpenTrades', v)}
                min={1} max={20}
                hint="Concurrent bot trades allowed"
              />
            </div>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs mb-3" style={{ color: '#6b7280' }}>
                Save settings to apply these defaults to all existing users' bot configurations immediately.
              </p>
            </div>
          </Card>

          {/* Save */}
          <div className="lg:col-span-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#a28539,#c9a84c)', color: '#0d0824' }}
            >
              {saving
                ? <span><i className="fas fa-spinner fa-spin mr-2" />Saving…</span>
                : <span><i className="fas fa-save mr-2" />Save General Settings</span>}
            </button>
          </div>
        </div>
      )}

      {/* ── FEATURES TAB ── */}
      {activeTab === 'features' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Platform Features */}
          <Card>
            <CardTitle icon="fas fa-toggle-on" iconColor="#60a5fa">Platform Features</CardTitle>
            <ToggleRow label="Deposits Enabled"     desc="Allow users to submit deposit requests"       value={settings.depositsEnabled}     onChange={() => update('depositsEnabled',     !settings.depositsEnabled)}     color="#4ade80" />
            <ToggleRow label="Withdrawals Enabled"  desc="Allow users to submit withdrawal requests"    value={settings.withdrawalsEnabled}  onChange={() => update('withdrawalsEnabled',  !settings.withdrawalsEnabled)}  color="#a78bfa" />
            <ToggleRow label="Trading Enabled"      desc="Allow users to place buy orders"              value={settings.tradingEnabled}      onChange={() => update('tradingEnabled',      !settings.tradingEnabled)}      color="#f59e0b" />
            <ToggleRow label="Bot Trading Enabled"  desc="Allow users to run the automated trading bot" value={settings.botTradingEnabled}   onChange={() => update('botTradingEnabled',   !settings.botTradingEnabled)}   color="#818cf8" last />
          </Card>

          {/* Access & Compliance */}
          <Card>
            <CardTitle icon="fas fa-shield-alt" iconColor="#f59e0b">Access &amp; Compliance</CardTitle>
            <ToggleRow label="Registration Enabled" desc="Allow new users to create accounts"                value={settings.registrationEnabled} onChange={() => update('registrationEnabled', !settings.registrationEnabled)} color="#34d399" />
            <ToggleRow label="KYC Required"         desc="Require identity verification before trading"      value={settings.kycRequired}         onChange={() => update('kycRequired',         !settings.kycRequired)}         color="#60a5fa" />
            <ToggleRow label="Welcome Bonus"        desc="Credit a bonus to new users on first login"        value={settings.welcomeBonusEnabled} onChange={() => update('welcomeBonusEnabled', !settings.welcomeBonusEnabled)} color="#c9a84c" />
            <ToggleRow label="Maintenance Mode"     desc="Lock all platform activity for maintenance"        value={settings.maintenanceMode}     onChange={() => update('maintenanceMode',     !settings.maintenanceMode)}     color="#f87171" last />
          </Card>

          {/* Admin Notifications */}
          <Card className="lg:col-span-2">
            <CardTitle icon="fas fa-bell" iconColor="#fb923c">Admin Notifications</CardTitle>
            <p className="text-xs mb-3" style={{ color: '#6b7280' }}>Choose which events trigger an admin alert.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <ToggleRow label="New Deposit Submitted"    desc="Alert when a user submits a deposit"    value={settings.notifyOnNewDeposit}    onChange={() => update('notifyOnNewDeposit',    !settings.notifyOnNewDeposit)}    color="#4ade80" />
              <ToggleRow label="New Withdrawal Submitted" desc="Alert when a user submits a withdrawal" value={settings.notifyOnNewWithdrawal} onChange={() => update('notifyOnNewWithdrawal', !settings.notifyOnNewWithdrawal)} color="#a78bfa" />
              <ToggleRow label="New User Registered"      desc="Alert when a new account is created"    value={settings.notifyOnNewUser}       onChange={() => update('notifyOnNewUser',       !settings.notifyOnNewUser)}       color="#34d399" />
              <ToggleRow label="New Buy Order Placed"     desc="Alert when a user places a buy order"   value={settings.notifyOnNewOrder}      onChange={() => update('notifyOnNewOrder',      !settings.notifyOnNewOrder)}      color="#fb923c" last />
            </div>
          </Card>

          {/* Save */}
          <div className="lg:col-span-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#a28539,#c9a84c)', color: '#0d0824' }}
            >
              {saving
                ? <span><i className="fas fa-spinner fa-spin mr-2" />Saving…</span>
                : <span><i className="fas fa-save mr-2" />Save Feature Settings</span>}
            </button>
          </div>
        </div>
      )}

      {/* ── SECURITY TAB ── */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Session & Login */}
          <Card>
            <CardTitle icon="fas fa-lock" iconColor="#f59e0b">Session &amp; Login</CardTitle>
            <div className="space-y-4">
              <NumField
                label="Max Login Attempts"
                value={settings.maxLoginAttempts}
                onChange={v => update('maxLoginAttempts', v)}
                min={1} max={20}
                hint="Account locked after this many failed attempts"
              />
              <NumField
                label="Session Timeout (minutes)"
                value={settings.sessionTimeoutMinutes}
                onChange={v => update('sessionTimeoutMinutes', v)}
                min={5} max={1440}
                hint="Idle sessions expire after this duration"
              />
            </div>
          </Card>

          {/* Info panel */}
          <Card>
            <CardTitle icon="fas fa-info-circle" iconColor="#60a5fa">Security Notes</CardTitle>
            <div className="space-y-3">
              {[
                { icon: 'fa-shield-halved', color: '#4ade80', text: 'All admin actions are logged with timestamps and IP addresses.' },
                { icon: 'fa-key',           color: '#c9a84c', text: 'Passwords are hashed using bcrypt with a minimum cost factor of 12.' },
                { icon: 'fa-clock',         color: '#60a5fa', text: 'Sessions are invalidated server-side on logout or timeout.' },
                { icon: 'fa-ban',           color: '#f87171', text: 'Locked accounts must be manually unlocked by an admin.' },
              ].map(n => (
                <div key={n.text} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <i className={`fas ${n.icon} text-xs mt-0.5 flex-shrink-0`} style={{ color: n.color }} />
                  <p className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>{n.text}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Save */}
          <div className="lg:col-span-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#a28539,#c9a84c)', color: '#0d0824' }}
            >
              {saving
                ? <span><i className="fas fa-spinner fa-spin mr-2" />Saving…</span>
                : <span><i className="fas fa-save mr-2" />Save Security Settings</span>}
            </button>
          </div>
        </div>
      )}

      {/* ── DANGER TAB ── */}
      {activeTab === 'danger' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Warning banner */}
          <div
            className="lg:col-span-2 flex items-start gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)' }}
          >
            <i className="fas fa-triangle-exclamation text-sm mt-0.5 flex-shrink-0" style={{ color: '#f87171' }} />
            <p className="text-sm" style={{ color: '#fca5a5' }}>
              These actions are <strong>irreversible</strong>. Admin accounts are always preserved. Proceed with extreme caution.
            </p>
          </div>

          {/* Reset all data */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)' }}>
                <i className="fas fa-rotate-left" style={{ color: '#f87171' }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Reset All Platform Data</p>
                <p className="text-xs" style={{ color: '#9ca3af' }}>Users are kept, all financial data is wiped</p>
              </div>
            </div>
            <ul className="space-y-1 mb-4 pl-1">
              {['All balances → $0.00', 'All deposits & withdrawals', 'All orders & holdings', 'All trade history & bot trades', 'All notifications'].map(item => (
                <li key={item} className="flex items-center gap-2 text-xs" style={{ color: '#9ca3af' }}>
                  <i className="fas fa-xmark text-xs flex-shrink-0" style={{ color: '#f87171' }} />{item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => { setShowResetModal(true); setResetConfirmText('') }}
              className="w-full py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
              style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.35)' }}
            >
              <i className="fas fa-rotate-left mr-1.5" />Reset All Data
            </button>
          </div>

          {/* Delete all users */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.25)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.35)' }}>
                <i className="fas fa-users-slash" style={{ color: '#fca5a5' }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Delete All Users</p>
                <p className="text-xs" style={{ color: '#9ca3af' }}>Permanently removes all Member accounts</p>
              </div>
            </div>
            <ul className="space-y-1 mb-4 pl-1">
              {['All Member user accounts', 'All their deposits & withdrawals', 'All their orders & holdings', 'All their trade history', 'All admin action logs'].map(item => (
                <li key={item} className="flex items-center gap-2 text-xs" style={{ color: '#9ca3af' }}>
                  <i className="fas fa-xmark text-xs flex-shrink-0" style={{ color: '#fca5a5' }} />{item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => { setShowDeleteModal(true); setDeleteConfirmText('') }}
              className="w-full py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
              style={{ background: 'rgba(220,38,38,0.2)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.4)' }}
            >
              <i className="fas fa-users-slash mr-1.5" />Delete All Users
            </button>
          </div>

        </div>
      )}

      {/* ── Reset Confirmation Modal ── */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !resetting && setShowResetModal(false)}
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              className="w-full max-w-md rounded-2xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'linear-gradient(145deg,#130d35,#1a1040)', border: '1px solid rgba(248,113,113,0.25)' }}
            >
              <div className="h-0.5" style={{ background: 'linear-gradient(90deg,transparent,#f87171,transparent)' }} />
              <div className="px-5 sm:px-6 pt-6 pb-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)' }}>
                    <i className="fas fa-triangle-exclamation text-lg" style={{ color: '#f87171' }} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Reset All Platform Data</h2>
                    <p className="text-xs" style={{ color: '#9ca3af' }}>This action cannot be undone</p>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>
                    Type <span className="font-bold text-white">RESET</span> to confirm
                  </label>
                  <input
                    type="text" value={resetConfirmText}
                    onChange={e => setResetConfirmText(e.target.value)}
                    placeholder="RESET"
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none tracking-widest"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(248,113,113,0.3)' }}
                    disabled={resetting}
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowResetModal(false)} disabled={resetting}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Cancel
                  </button>
                  <button onClick={handleReset} disabled={resetting || resetConfirmText !== 'RESET'}
                    className="flex-1 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#dc2626,#f87171)', color: '#fff' }}>
                    {resetting ? <span><i className="fas fa-spinner fa-spin mr-2" />Resetting…</span> : <span><i className="fas fa-rotate-left mr-2" />Reset Everything</span>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Users Confirmation Modal ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !deletingUsers && setShowDeleteModal(false)}
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              className="w-full max-w-md rounded-2xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'linear-gradient(145deg,#1a0505,#2d0a0a)', border: '1px solid rgba(220,38,38,0.35)' }}
            >
              <div className="h-0.5" style={{ background: 'linear-gradient(90deg,transparent,#dc2626,transparent)' }} />
              <div className="px-5 sm:px-6 pt-6 pb-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)' }}>
                    <i className="fas fa-users-slash text-lg" style={{ color: '#fca5a5' }} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Delete All Users</h2>
                    <p className="text-xs" style={{ color: '#9ca3af' }}>This action cannot be undone</p>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)' }}>
                  <i className="fas fa-shield-check text-xs flex-shrink-0" style={{ color: '#4ade80' }} />
                  <p className="text-xs font-semibold" style={{ color: '#4ade80' }}>Admin accounts will be preserved</p>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>
                    Type <span className="font-bold text-white">DELETE</span> to confirm
                  </label>
                  <input
                    type="text" value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none tracking-widest"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(220,38,38,0.35)' }}
                    disabled={deletingUsers}
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowDeleteModal(false)} disabled={deletingUsers}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Cancel
                  </button>
                  <button onClick={handleDeleteUsers} disabled={deletingUsers || deleteConfirmText !== 'DELETE'}
                    className="flex-1 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#7f1d1d,#dc2626)', color: '#fff' }}>
                    {deletingUsers ? <span><i className="fas fa-spinner fa-spin mr-2" />Deleting…</span> : <span><i className="fas fa-users-slash mr-2" />Delete All Users</span>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Apply Defaults Confirmation Modal ── */}
      <AnimatePresence>
        {showApplyModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !applyingDefaults && setShowApplyModal(false)}
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              className="w-full max-w-md rounded-2xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'linear-gradient(145deg,#130d35,#1a1040)', border: '1px solid rgba(52,211,153,0.25)' }}
            >
              <div className="h-0.5" style={{ background: 'linear-gradient(90deg,transparent,#34d399,transparent)' }} />
              <div className="px-5 sm:px-6 pt-6 pb-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)' }}>
                    <i className="fas fa-users text-lg" style={{ color: '#34d399' }} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Apply Defaults to All Users</h2>
                    <p className="text-xs" style={{ color: '#9ca3af' }}>This will add to existing balances</p>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
                <div className="space-y-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {[
                    { label: 'Starting Balance', value: `+$${(settings.defaultStartingBalance ?? 0).toLocaleString()}` },
                    { label: 'Welcome Bonus', value: settings.welcomeBonusEnabled ? `+$${(settings.welcomeBonusAmount ?? 0).toLocaleString()}` : 'Disabled' },
                    { label: 'Total per user', value: `+$${((settings.defaultStartingBalance ?? 0) + (settings.welcomeBonusEnabled ? (settings.welcomeBonusAmount ?? 0) : 0)).toLocaleString()}` },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: '#9ca3af' }}>{row.label}</span>
                      <span className="text-sm font-bold" style={{ color: '#34d399' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  Settings will be saved first, then the combined amount will be added to every Member account's current balance.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setShowApplyModal(false)} disabled={applyingDefaults}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Cancel
                  </button>
                  <button onClick={handleApplyDefaults} disabled={applyingDefaults}
                    className="flex-1 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#059669,#34d399)', color: '#fff' }}>
                    {applyingDefaults
                      ? <span><i className="fas fa-spinner fa-spin mr-2" />Applying…</span>
                      : <span><i className="fas fa-users mr-2" />Apply to All Users</span>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </AdminLayout>
  )
}
