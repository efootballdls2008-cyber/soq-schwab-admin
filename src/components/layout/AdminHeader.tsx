import NotificationBell from '../notifications/NotificationBell'

interface AdminHeaderProps {
  title: string
  subtitle?: string
  onMenuClick: () => void
}

export default function AdminHeader({ title, subtitle, onMenuClick }: AdminHeaderProps) {
  return (
    <header
      className="flex items-center gap-3 px-4 sm:px-6 flex-shrink-0"
      style={{ height: 60, background: '#0d0824', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
    >
      <button
        onClick={onMenuClick}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <i className="fas fa-bars text-sm" />
      </button>
      <div className="flex-1">
        <h1 className="text-base font-bold text-white leading-none">{title}</h1>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <span
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'rgba(201,168,76,0.1)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.2)' }}
        >
          <i className="fas fa-shield-alt text-xs" />
          Admin
        </span>
      </div>
    </header>
  )
}
