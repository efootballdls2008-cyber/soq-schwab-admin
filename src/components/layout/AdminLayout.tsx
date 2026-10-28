import { useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import AdminSidebar from './AdminSidebar'
import AdminHeader from './AdminHeader'
import { getAllDeposits } from '../../services/depositService'
import { getAllPurchases } from '../../services/purchaseService'
import { getAllActiveBotTrades } from '../../services/botTradeService'

interface AdminLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

// How often to refresh sidebar badge counts (ms).
// 60 seconds is plenty — these are just badge numbers, not live trade data.
const COUNTS_REFRESH_MS = 60_000

export default function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingDeposits, setPendingDeposits] = useState(0)
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [activeBotTrades, setActiveBotTrades] = useState(0)

  // Guard against running a second fetch while one is already in-flight
  const fetchingRef = useRef(false)

  const loadCounts = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const [deps, purchases, botTrades] = await Promise.all([
        getAllDeposits(),
        getAllPurchases(),
        getAllActiveBotTrades(),
      ])
      setPendingDeposits(deps.filter(d => d.type === 'deposit' && d.status === 'pending').length)
      setPendingWithdrawals(deps.filter(d => d.type === 'withdraw' && d.status === 'pending').length)
      setPendingOrders(purchases.filter(p => p.status === 'pending').length)
      setActiveBotTrades(botTrades.length)
    } catch { /* silent */ }
    finally {
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    void loadCounts()
    // Refresh badge counts periodically — no need to hammer the API on every render
    const interval = setInterval(() => void loadCounts(), COUNTS_REFRESH_MS)
    return () => clearInterval(interval)
  }, [loadCounts])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0a0720' }}>
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingDeposits={pendingDeposits}
        pendingWithdrawals={pendingWithdrawals}
        pendingOrders={pendingOrders}
        activeBotTrades={activeBotTrades}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <AdminHeader title={title} subtitle={subtitle} onMenuClick={() => setSidebarOpen(o => !o)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6" style={{ background: '#110b2d' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
