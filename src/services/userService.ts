import { get, patch, del } from '../api/client'
import { API } from '../api/endpoints'
import type { AdminUser } from '../types'

export async function getAllUsers(): Promise<AdminUser[]> {
  return get<AdminUser[]>(API.users)
}

export async function getUserById(id: number): Promise<AdminUser> {
  return get<AdminUser>(API.user(id))
}

export async function updateUser(id: number, fields: Partial<AdminUser>): Promise<AdminUser> {
  return patch<AdminUser>(API.user(id), fields)
}

export async function adjustBalance(id: number, newBalance: number): Promise<AdminUser> {
  return patch<AdminUser>(API.user(id), { balance: newBalance })
}

export async function suspendUser(id: number): Promise<AdminUser> {
  return patch<AdminUser>(API.user(id), { accountStatus: 'suspended' })
}

export async function activateUser(id: number): Promise<AdminUser> {
  return patch<AdminUser>(API.user(id), { accountStatus: 'active' })
}

export async function deleteUser(id: number): Promise<void> {
  return del<void>(API.user(id))
}
