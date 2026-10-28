import { get, patch, del } from '../api/client'
import { API } from '../api/endpoints'
import type { AdminNotification } from '../types'

export async function getAdminNotifications(unreadOnly = false): Promise<AdminNotification[]> {
  const url = unreadOnly
    ? `${API.adminNotifications}?unreadOnly=true`
    : API.adminNotifications
  return get<AdminNotification[]>(url)
}

export async function getUnreadCount(): Promise<number> {
  const data = await get<{ count: number }>(API.adminNotificationsUnreadCount)
  return data.count
}

export async function markNotificationRead(id: number, isRead = true): Promise<AdminNotification> {
  return patch<AdminNotification>(API.adminNotification(id), { isRead })
}

export async function markAllRead(): Promise<void> {
  await patch<unknown>(API.adminNotificationsMarkAllRead, {})
}

export async function deleteNotification(id: number): Promise<void> {
  await del<unknown>(API.adminNotification(id))
}

export async function deleteAllNotifications(): Promise<void> {
  await del<unknown>(API.adminNotifications, { confirm: true })
}
