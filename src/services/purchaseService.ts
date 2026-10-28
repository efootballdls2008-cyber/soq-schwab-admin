import { get, patch, post, put } from '../api/client'
import { API } from '../api/endpoints'
import type { Purchase, Holding } from '../types'

export async function getAllPurchases(): Promise<Purchase[]> {
  return get<Purchase[]>(API.purchases)
}

/**
 * Approve a purchase.
 * The backend PATCH /purchases/:id automatically deducts the user balance
 * when status is set to 'completed' — no manual balance update needed.
 * Holdings are NOT managed by the backend, so we update them here.
 */
export async function approvePurchase(purchase: Purchase): Promise<void> {
  // 1. Update or create holding
  const holdings = await get<Holding[]>(`${API.holdings}?userId=${purchase.userId}`)
  const assetType = purchase.type === 'buy_stock' ? 'stock' : 'crypto'
  const existing = holdings.find(h => h.symbol === purchase.symbol && h.type === assetType)

  if (existing) {
    const newQty = existing.quantity + purchase.quantity
    const newAvg = ((existing.quantity * existing.avgBuyPrice) + (purchase.quantity * purchase.price)) / newQty
    await put(API.holding(existing.id), {
      ...existing,
      quantity: newQty,
      avgBuyPrice: newAvg,
      currentPrice: purchase.price,
    })
  } else {
    await post(API.holdings, {
      userId: purchase.userId,
      type: assetType,
      symbol: purchase.symbol,
      name: purchase.name,
      color: purchase.color,
      quantity: purchase.quantity,
      avgBuyPrice: purchase.price,
      currentPrice: purchase.price,
    })
  }

  // 2. Mark purchase completed — backend deducts balance automatically
  await patch(API.purchase(purchase.id), { status: 'completed', rejectionReason: null })

  // 3. Log admin action
  await post(API.adminActions, {
    action: 'approve_purchase',
    targetUserId: purchase.userId,
    targetId: purchase.txId,
    details: `Approved ${purchase.type} of ${purchase.quantity} ${purchase.symbol} for $${purchase.totalCost}`,
  })
}

export async function rejectPurchase(purchase: Purchase, reason: string): Promise<void> {
  await patch(API.purchase(purchase.id), { status: 'cancelled', rejectionReason: reason })
  await post(API.adminActions, {
    action: 'reject_purchase',
    targetUserId: purchase.userId,
    targetId: purchase.txId,
    details: `Rejected ${purchase.type} of ${purchase.quantity} ${purchase.symbol}. Reason: ${reason}`,
  })
}
