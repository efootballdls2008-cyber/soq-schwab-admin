import { NavLink } from 'react-router-dom'
import { useAdmin } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'

interface NavItem {
  key: string
  label: string
  icon: string
  to: string
  badge?: number
}

interface AdminSidebarProps {
  open: boolean
  onClose: () => void
  pendingDeposits: number
  pendingWithdrawals: number
  pendingOrders: number
  activeBotTrades: number
}

export default function AdminSidebar({ open, onClose, pendingDeposits, pendingWithdrawals, pendingOrders, activeBotTrades }: AdminSidebarProps) {
  const { admin, logout } = useAdmin()
  const { unreadCount } = useNotifications()

  const navItems: NavItem[] = [
    { key: 'dashboard',      label: 'Dashboard',        icon: 'fas fa-th-large',      to: '/admin/dashboard' },
    { key: 'users',          label: 'Users',             icon: 'fas fa-users',         to: '/admin/users' },
    { key: 'deposits',       label: 'Deposits',          icon: 'fas fa-arrow-down',    to: '/admin/deposits',       badge: pendingDeposits },
    { key: 'withdrawals',    label: 'Withdrawals',       icon: 'fas fa-arrow-up',      to: '/admin/withdrawals',    badge: pendingWithdrawals },
    { key: 'orders',         label: 'Buy Orders',        icon: 'fas fa-shopping-cart', to: '/admin/orders',         badge: pendingOrders },
    { key: 'bot-trades',     label: 'Bot Trades',        icon: 'fas fa-robot',         to: '/admin/bot-trades',     badge: activeBotTrades },
    { key: 'accounts',       label: 'Platform Accounts', icon: 'fas fa-university',    to: '/admin/accounts' },
    { key: 'notifications',  label: 'Notifications',     icon: 'fas fa-bell',          to: '/admin/notifications',  badge: unreadCount },
    { key: 'settings',       label: 'Settings',          icon: 'fas fa-cog',           to: '/admin/settings' },
  ]

  const initials = admin ? `${admin.firstName[0]}${admin.lastName[0]}`.toUpperCase() : 'A'

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }}
          onClick={onClose}
        />
      )}

      <aside
        className={[
          'fixed lg:relative flex flex-col flex-shrink-0 h-screen overflow-y-auto z-30',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
        style={{ width: 230, background: '#0d0824', borderRight: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#a28539,#c9a84c)' }}>
              <i className="fas fa-shield-alt text-sm" style={{ color: '#0d0824' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">Admin Panel</p>
              <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Charles Schwab</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <i className="fas fa-times text-xs" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-5 pb-3 overflow-y-auto">
          <p className="px-3 mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#4b5563' }}>Management</p>
          <ul className="space-y-0.5">
            {navItems.map(item => (
              <li key={item.key}>
                <NavLink
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) => [
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5',
                  ].join(' ')}
                  style={({ isActive }) => isActive ? { background: 'rgba(201,168,76,0.12)', borderLeft: '3px solid #c9a84c', paddingLeft: 9 } : {}}
                >
                  <i className={`${item.icon} w-4 text-center text-sm`} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#ef4444', color: '#fff', minWidth: 20, textAlign: 'center' }}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Admin profile + logout */}
        <div className="px-3 pb-5 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 px-3 py-3 mt-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'rgba(201,168,76,0.2)', color: '#c9a84c' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{admin?.firstName} {admin?.lastName}</p>
              <p className="text-xs truncate" style={{ color: '#6b7280' }}>Super Admin</p>
            </div>
            <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors" title="Logout">
              <i className="fas fa-sign-out-alt text-sm" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
