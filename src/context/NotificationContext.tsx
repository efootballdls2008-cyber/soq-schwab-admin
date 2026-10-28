import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react'
import { io, Socket } from 'socket.io-client'
import type { AdminNotification } from '../types'
import {
  getAdminNotifications,
  markNotificationRead,
  markAllRead,
  deleteNotification,
  deleteAllNotifications,
} from '../services/notificationService'

interface NotificationContextValue {
  notifications: AdminNotification[]
  unreadCount: number
  loading: boolean
  // Actions
  fetchNotifications: () => Promise<void>
  markRead: (id: number) => Promise<void>
  markAllAsRead: () => Promise<void>
  remove: (id: number) => Promise<void>
  removeAll: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAdminNotifications()
      setNotifications(data)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  // Connect socket when token is available
  useEffect(() => {
    const token = sessionStorage.getItem('admin_token')
    if (!token) return

    // Avoid creating a duplicate socket (e.g. React StrictMode double-invoke)
    if (socketRef.current?.connected) return

    const socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[socket] Connected to notification server')
    })

    // New notification pushed from server
    socket.on('notification:new', (notif: AdminNotification) => {
      setNotifications((prev) => [notif, ...prev])
    })

    // A notification was updated (e.g. marked read from another tab)
    socket.on('notification:updated', (updated: AdminNotification) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
      )
    })

    // All notifications marked read
    socket.on('notification:allRead', () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    })

    // A notification was deleted
    socket.on('notification:deleted', ({ id }: { id: number }) => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    })

    // All notifications deleted
    socket.on('notification:allDeleted', () => {
      setNotifications([])
    })

    socket.on('connect_error', (err) => {
      console.warn('[socket] Connection error:', err.message)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    const token = sessionStorage.getItem('admin_token')
    if (token) fetchNotifications()
  }, [fetchNotifications])

  const markRead = useCallback(async (id: number) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
    try {
      await markNotificationRead(id, true)
    } catch {
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
      )
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    try {
      await markAllRead()
    } catch {
      fetchNotifications()
    }
  }, [fetchNotifications])

  const remove = useCallback(async (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    try {
      await deleteNotification(id)
    } catch {
      fetchNotifications()
    }
  }, [fetchNotifications])

  const removeAll = useCallback(async () => {
    setNotifications([])
    try {
      await deleteAllNotifications()
    } catch {
      fetchNotifications()
    }
  }, [fetchNotifications])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markRead,
        markAllAsRead,
        remove,
        removeAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
