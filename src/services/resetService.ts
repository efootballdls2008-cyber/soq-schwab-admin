import { get, del, patch } from '../api/client'
import { API } from '../api/endpoints'

interface UserRecord { id: number; role: string }
interface Identifiable { id: number | string }

/**
 * Delete all records from a collection by fetching then deleting each one.
 * Used for per-user scoped resets where bulk delete isn't available.
 */
async function clearCollectionByUser(
  endpoint: string,
  itemEndpoint: (id: number | string) => string,
  userId: number,
): Promise<void> {
  const items = await get<Identifiable[]>(`${endpoint}?userId=${userId}`).catch(() => [] as Identifiable[])
  await Promise.all(items.map((item) => del(itemEndpoint(item.id))))
}

/**
 * Reset all transactional data for a specific user:
 * - Zero out balance
 * - Delete their deposits, purchases, holdings, botTrades, tradeHistory, notifications, profitOverview
 */
export async function resetUserData(userId: number): Promise<void> {
  // Zero balance
  await patch(API.user(userId), { balance: 0 })

  // Delete all user-scoped records in parallel
  await Promise.all([
    clearCollectionByUser(API.deposits,      API.deposit,          userId),
    clearCollectionByUser(API.purchases,     API.purchase,         userId),
    clearCollectionByUser(API.holdings,      API.holding,          userId),
    clearCollectionByUser(API.botTrades,     API.botTrade,         userId),
    clearCollectionByUser(API.tradeHistory,  API.tradeHistoryItem, userId),
    clearCollectionByUser(API.notifications, API.notification,     userId),
    clearCollectionByUser(API.profitOverview, API.profitOverviewItem, userId),
  ])
}

/**
 * Reset ALL platform data:
 * - Zero all user balances
 * - Bulk-delete all transactional collections in one request each
 *
 * Uses admin bulk-delete endpoints (DELETE /collection without an id)
 * instead of fetch-then-delete-each, which avoids 422 errors and is
 * orders of magnitude faster with large datasets.
 */
export async function resetAllData(): Promise<void> {
  // Zero all user balances
  const users = await get<UserRecord[]>(API.users)
  await Promise.all(users.map((u) => patch(API.user(u.id), { balance: 0 })))

  // Bulk delete every transactional table — single DELETE per collection
  await Promise.all([
    del(API.deposits,      { confirm: true }),
    del(API.purchases,     { confirm: true }),
    del(API.holdings,      { confirm: true }),
    del(API.botTrades,     { confirm: true }),
    del(API.tradeHistory,  { confirm: true }),
    del(API.notifications, { confirm: true }),
    del(API.adminActions,  { confirm: true }),
    del(API.profitOverview, { confirm: true }),
  ])
}

/**
 * Delete ALL non-Admin users and all their associated data.
 * Admin accounts (role === 'Admin') are preserved.
 */
export async function deleteAllUsers(): Promise<{ deleted: number }> {
  const users = await get<UserRecord[]>(API.users)
  const memberUsers = users.filter((u) => u.role !== 'Admin')

  // Delete all data for each member user first
  await Promise.all(memberUsers.map((u) => resetUserData(u.id)))

  // Then delete the user accounts themselves
  await Promise.all(memberUsers.map((u) => del(API.user(u.id))))

  // Clear admin action logs
  await del(API.adminActions).catch(() => {/* ignore if already empty */})

  return { deleted: memberUsers.length }
}
