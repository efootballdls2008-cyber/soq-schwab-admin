import { get, patch, post } from '../api/client'
import { API } from '../api/endpoints'
import type { Deposit } from '../types'

export async function getAllDeposits(): Promise<Deposit[]> {
  return get<Deposit[]>(API.deposits)
}

export async function getDepositsByUser(userId: number): Promise<Deposit[]> {
  return get<Deposit[]>(`${API.deposits}?userId=${userId}`)
}

/**
 * Approve a deposit.
 * The backend PATCH /deposits/:id automatically credits the user balance
 * when status is set to 'completed' — no manual balance update needed.
 */
export async function approveDeposit(deposit: Deposit): Promise<void> {
  await patch(API.deposit(deposit.id), { status: 'completed', rejectionReason: null })
  await post(API.adminActions, {
    action: 'approve_deposit',
    targetUserId: deposit.userId,
    targetId: deposit.txId,
    details: `Approved deposit of $${deposit.amount} (${deposit.txId})`,
  })
}

export async function rejectDeposit(deposit: Deposit, reason: string): Promise<void> {
  await patch(API.deposit(deposit.id), { status: 'rejected', rejectionReason: reason })
  await post(API.adminActions, {
    action: 'reject_deposit',
    targetUserId: deposit.userId,
    targetId: deposit.txId,
    details: `Rejected deposit of $${deposit.amount}. Reason: ${reason}`,
  })
}

/**
 * Approve a withdrawal.
 * The backend PATCH /deposits/:id automatically deducts the user balance
 * when a withdrawal is set to 'completed' — no manual balance update needed.
 */
export async function approveWithdrawal(deposit: Deposit): Promise<void> {
  await patch(API.deposit(deposit.id), { status: 'completed', rejectionReason: null })
  await post(API.adminActions, {
    action: 'approve_withdrawal',
    targetUserId: deposit.userId,
    targetId: deposit.txId,
    details: `Approved withdrawal of $${deposit.amount} (${deposit.txId})`,
  })
}

export async function rejectWithdrawal(deposit: Deposit, reason: string): Promise<void> {
  await patch(API.deposit(deposit.id), { status: 'rejected', rejectionReason: reason })
  await post(API.adminActions, {
    action: 'reject_withdrawal',
    targetUserId: deposit.userId,
    targetId: deposit.txId,
    details: `Rejected withdrawal of $${deposit.amount}. Reason: ${reason}`,
  })
}
