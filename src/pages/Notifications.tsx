import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../components/layout/AdminLayout'
import { useNotifications } from '../context/NotificationContext'
import type { AdminNotification } from '../types'

const TYPE_ICON: Record<string, string> = {
  user:       'fas fa-user-plus',
  login:      'fas fa-sign-in-alt',
  deposit:    'fas fa-arrow-down',
  withdrawal: 'fas fa-arrow-up',
  order:      'fas fa-shopping-cart',
  success:    'fas fa-check-circle',
  warning:    'fas fa-exclamation-triangle',
  error:      'fas fa-times-circle',
  info:       'fas fa-info-circle',
}

const TYPE_COLOR: Record<string, string> = {
  user:       '#6366f1',
  login:      '#8b5cf6',
  deposit:    '#10b981',
  withdrawal: '#f59e0b',
  order:      '#3b82f6',
  success:    '#10b981',
  warning:    '#f59e0b',
  error:      '#ef4444',
  info:       '#6b7280',
}

const TYPE_LABEL: Record<string, string> = {
  user:       'New User',
  login:      'Login',
  deposit:    'Deposit',
  withdrawal: 'Withdrawal',
  order:      'Order',
  success:    'Success',
  warning:    'Warning',
  error:      'Error',
  info:       'Info',
}

const FILTER_OPTIONS = ['all', 'unread', 'user', 'login', 'deposit', 'withdrawal', 'order'] as const
type FilterOption = typeof FILTER_OPTIONS[number]

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Notifications() {
  const { notifications, unreadCount, loading, markRead, markAllAsRead, remove, removeAll } = useNotifications()
  const [filter, setFilter] = useState<FilterOption>('all')
  const [selected, setSelected] = useState<AdminNotification | null>(null)
  const [confirmClearAll, setConfirmClearAll] = useState(false)
  const navigate = useNavigate()

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true
    if (filter === 'unread') return !n.isRead
    return n.type === filter
  })

  const handleSelect = async (notif: AdminNotification) => {
    setSelected(notif)
    if (!notif.isRead) await markRead(notif.id)
  }

  const handleDelete = async (id: number) => {
    await remove(id)
    if (selected?.id === id) setSelected(null)
  }

  const handleClearAll = async () => {
    await removeAll()
    setSelected(null)
    setConfirmClearAll(false)
  }

  const handleRelatedLink = (notif: AdminNotification) => {
    if (!notif.relatedType) return
    const map: Record<string, string> = {
      deposit:    '/admin/deposits',
      withdrawal: '/admin/withdrawals',
      purchase:   '/admin/orders',
      user:       notif.relatedId ? `/admin/users/${notif.relatedId}` : '/admin/users',
    }
    const path = map[notif.relatedType]
    if (path) navigate(path)
  }

  return (
    <AdminLayout title="Notifications" subtitle="Real-time system alerts and activity">
      <div className="flex gap-4 h-full" style={{ minHeight: 0 }}>
        {/* Left panel — list */}
        <div
          className="flex flex-col rounded-xl overflow-hidden flex-shrink-0"
          style={{
            width: selected ? 380 : '100%',
            background: '#0d0824',
            border: '1px solid rgba(255,255,255,0.08)',
            transition: 'width 0.2s ease',
          }}
        >
          {/* Toolbar */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">All Notifications</span>
              {unreadCount > 0 && (
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: '#ef4444', color: '#fff' }}
                >
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                  style={{ background: 'rgba(201,168,76,0.1)', color: '#c9a84c' }}
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => setConfirmClearAll(true)}
                  className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Filter tabs */}
          <div
            className="flex items-center gap-1 px-4 py-2 overflow-x-auto flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="text-xs px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors capitalize"
                style={
                  filter === f
                    ? { background: 'rgba(201,168,76,0.15)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.3)' }
                    : { background: 'rgba(255,255,255,0.04)', color: '#6b7280', border: '1px solid transparent' }
                }
              >
                {f === 'all' ? `All (${notifications.length})` : f === 'unread' ? `Unread (${unreadCount})` : TYPE_LABEL[f] || f}
              </button>
            ))}
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <i className="fas fa-spinner fa-spin text-xl" style={{ color: '#c9a84c' }} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <i className="fas fa-bell-slash text-3xl" style={{ color: '#374151' }} />
                <p className="text-sm" style={{ color: '#6b7280' }}>No notifications</p>
              </div>
            ) : (
              filtered.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleSelect(notif)}
                  className="flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors group"
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: selected?.id === notif.id
                      ? 'rgba(201,168,76,0.08)'
                      : notif.isRead
                      ? 'transparent'
                      : 'rgba(201,168,76,0.03)',
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${TYPE_COLOR[notif.type] || TYPE_COLOR.info}22` }}
                  >
                    <i
                      className={`${TYPE_ICON[notif.type] || TYPE_ICON.info} text-xs`}
                      style={{ color: TYPE_COLOR[notif.type] || TYPE_COLOR.info }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="text-xs font-semibold"
                        style={{ color: notif.isRead ? '#9ca3af' : '#fff' }}
                      >
                        {notif.title}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!notif.isRead && (
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: '#c9a84c' }}
                          />
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(notif.id) }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400"
                        >
                          <i className="fas fa-times text-xs" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#6b7280' }}>
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded capitalize"
                        style={{
                          background: `${TYPE_COLOR[notif.type] || TYPE_COLOR.info}18`,
                          color: TYPE_COLOR[notif.type] || TYPE_COLOR.info,
                        }}
                      >
                        {TYPE_LABEL[notif.type] || notif.type}
                      </span>
                      <span className="text-xs" style={{ color: '#4b5563' }}>{timeAgo(notif.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right panel — detail */}
        {selected && (
          <div
            className="flex-1 rounded-xl overflow-hidden flex flex-col"
            style={{ background: '#0d0824', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Detail header */}
            <div
              className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <span className="text-sm font-semibold text-white">Notification Detail</span>
              <button
                onClick={() => setSelected(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <i className="fas fa-times text-xs" />
              </button>
            </div>

            {/* Detail body */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Type icon */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: `${TYPE_COLOR[selected.type] || TYPE_COLOR.info}22` }}
              >
                <i
                  className={`${TYPE_ICON[selected.type] || TYPE_ICON.info} text-xl`}
                  style={{ color: TYPE_COLOR[selected.type] || TYPE_COLOR.info }}
                />
              </div>

              {/* Type badge */}
              <span
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full mb-3 capitalize"
                style={{
                  background: `${TYPE_COLOR[selected.type] || TYPE_COLOR.info}18`,
                  color: TYPE_COLOR[selected.type] || TYPE_COLOR.info,
                  border: `1px solid ${TYPE_COLOR[selected.type] || TYPE_COLOR.info}33`,
                }}
              >
                <i className={`${TYPE_ICON[selected.type] || TYPE_ICON.info} text-xs`} />
                {TYPE_LABEL[selected.type] || selected.type}
              </span>

              <h2 className="text-lg font-bold text-white mb-2">{selected.title}</h2>
              <p className="text-sm leading-relaxed mb-5" style={{ color: '#9ca3af' }}>
                {selected.message}
              </p>

              {/* Meta */}
              <div
                className="rounded-xl p-4 mb-5 space-y-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#6b7280' }}>Date & Time</span>
                  <span className="text-xs text-white">{formatDate(selected.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#6b7280' }}>Status</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={
                      selected.isRead
                        ? { background: 'rgba(107,114,128,0.15)', color: '#6b7280' }
                        : { background: 'rgba(201,168,76,0.15)', color: '#c9a84c' }
                    }
                  >
                    {selected.isRead ? 'Read' : 'Unread'}
                  </span>
                </div>
                {selected.relatedType && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: '#6b7280' }}>Related To</span>
                    <span className="text-xs text-white capitalize">{selected.relatedType} #{selected.relatedId}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {selected.relatedType && (
                  <button
                    onClick={() => handleRelatedLink(selected)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
                    style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.2)' }}
                  >
                    <i className="fas fa-external-link-alt mr-2 text-xs" />
                    View {selected.relatedType}
                  </button>
                )}
                {!selected.isRead && (
                  <button
                    onClick={() => markRead(selected.id)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
                  >
                    <i className="fas fa-check mr-2 text-xs" />
                    Mark as Read
                  </button>
                )}
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  <i className="fas fa-trash mr-2 text-xs" />
                  Delete Notification
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm clear all modal */}
      {confirmClearAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div
            className="rounded-2xl p-6 w-80"
            style={{ background: '#0d0824', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <i className="fas fa-trash text-lg" style={{ color: '#ef4444' }} />
            </div>
            <h3 className="text-base font-bold text-white text-center mb-2">Clear All Notifications?</h3>
            <p className="text-xs text-center mb-5" style={{ color: '#6b7280' }}>
              This will permanently delete all {notifications.length} notifications. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmClearAll(false)}
                className="flex-1 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
