import { get, post, patch, del } from '../api/client'

export interface AdminBotTrade {
  id: string
  userId: number
  userName: string
  userEmail: string
  pair: string
  side: 'buy' | 'sell'
  entryPrice: number
  exitPrice: number | null
  amount: number
  pnl: number
  pnlPct: number
  finalPnl: number | null
  expectedProfit: number | null
  tradeDurationSeconds: number | null
  strategy: string
  signal: string | null
  timeframe: string
  openedAt: string
  closedAt: string | null
  status: 'open' | 'closed'
  closeReason: string | null
  remainingSeconds: number | null
}

export interface ExecuteTradePayload {
  userId: number
  pair: string
  side: 'buy' | 'sell'
  entryPrice: number
  amount: number
  strategy: string
  timeframe: string
  expectedProfit?: number
  expectedLoss?: number
  tradeDurationSeconds?: number
  signal?: string
}

/** Get all currently open bot trades across all users */
export async function getActiveBotTrades(): Promise<AdminBotTrade[]> {
  return get<AdminBotTrade[]>('/botTrades/admin/active')
}

/** Get all active bot trades (alias for compatibility) */
export async function getAllActiveBotTrades(): Promise<AdminBotTrade[]> {
  return getActiveBotTrades()
}

/** Get active bot trades for a specific user */
export async function getUserActiveBotTrades(userId: number): Promise<AdminBotTrade[]> {
  return get<AdminBotTrade[]>(`/botTrades/admin/active?userId=${userId}`)
}

/** Update bot trade profit and duration */
export async function updateBotTradeProfit(
  tradeId: string,
  expectedProfit: number,
  tradeDurationSeconds: number
): Promise<AdminBotTrade> {
  return patch<AdminBotTrade>(`/botTrades/admin/${tradeId}/profit`, {
    expectedProfit,
    tradeDurationSeconds,
  })
}

/** Close a bot trade (admin force-close) */
export async function closeBotTrade(tradeId: string): Promise<AdminBotTrade> {
  return post<AdminBotTrade>(`/botTrades/admin/${tradeId}/force-close`, {})
}

/** Admin executes a bot trade for a specific user */
export async function executeAdminBotTrade(payload: ExecuteTradePayload): Promise<AdminBotTrade> {
  return post<AdminBotTrade>('/botTrades/admin/execute', payload)
}

/** Update expected profit and/or duration for an open trade */
export async function updateTradeProfit(
  tradeId: string,
  expectedProfit?: number,
  tradeDurationSeconds?: number
): Promise<AdminBotTrade> {
  return patch<AdminBotTrade>(`/botTrades/admin/${tradeId}/profit`, {
    expectedProfit,
    tradeDurationSeconds,
  })
}

/** Force-close a trade immediately */
export async function forceCloseTrade(tradeId: string): Promise<AdminBotTrade> {
  return post<AdminBotTrade>(`/botTrades/admin/${tradeId}/force-close`, {})
}

/** Get bot trades for a specific user */
export async function getUserBotTrades(userId: number): Promise<AdminBotTrade[]> {
  return get<AdminBotTrade[]>(`/botTrades?userId=${userId}`)
}

/** Delete a bot trade */
export async function deleteBotTrade(tradeId: string): Promise<void> {
  return del<void>(`/botTrades/${tradeId}`)
}
