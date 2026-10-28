export interface AdminUser {
  id: number
  email: string
  firstName: string
  lastName: string
  role: string
  avatar: string | null
  balance: number
  currency: string
  phone?: string
  dateOfBirth?: string
  country?: string
  address?: string
  memberSince?: string
  depositBankName?: string
  depositAccountName?: string
  depositAccountNumber?: string
  depositRoutingNumber?: string
  depositAccountType?: string
  withdrawBankName?: string
  withdrawAccountName?: string
  withdrawAccountNumber?: string
  withdrawRoutingNumber?: string
  withdrawAccountType?: string
  withdrawSwiftCode?: string
  kycVerified?: boolean
  accountStatus?: 'active' | 'suspended' | 'banned'
}

export interface Deposit {
  id: number
  userId: number
  type: 'deposit' | 'withdraw'
  method: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'rejected' | 'cancelled'
  date: string
  time: string
  txId: string
  note: string
  screenshot: string | null
  rejectionReason: string | null
}

export interface Purchase {
  id: number
  userId: number
  type: 'buy_stock' | 'buy_crypto'
  symbol: string
  name: string
  color: string
  quantity: number
  price: number
  totalCost: number
  date: string
  time: string
  txId: string
  status: 'pending' | 'completed' | 'cancelled'
  rejectionReason: string | null
}

export interface Holding {
  id: number
  userId: number
  type: 'stock' | 'crypto'
  symbol: string
  name: string
  color: string
  quantity: number
  avgBuyPrice: number
  currentPrice: number
}

export type PaymentMethod = 'bank_transfer' | 'credit_card' | 'wire_transfer' | 'crypto'
export type AssignedTo = 'deposit' | 'buy_crypto' | 'buy_stock' | 'all'

export interface PlatformAccount {
  id: number
  accountName: string
  paymentMethod: PaymentMethod
  // Bank / Wire Transfer
  bankName: string
  accountNumber: string
  routingNumber: string
  accountType: string
  swiftCode: string
  bankAddress: string
  myAddress: string
  homeAddress: string
  // Wire Transfer extras
  iban: string
  sortCode: string
  currencyAccepted: string
  // Crypto
  coinSymbol: string
  walletAddress: string
  network: string
  qrCodeImage: string | null
  // Meta
  isDefault: boolean
  assignedTo: AssignedTo
  status: 'active' | 'inactive'
}

export interface PlatformSettings {
  id: number
  // Deposit / Withdrawal limits
  minDepositAmount: number
  maxDepositAmount: number
  minWithdrawalAmount: number
  maxWithdrawalAmount: number
  // Fees
  tradingFeePercent: number
  withdrawalFeePercent: number
  // Feature flags
  depositsEnabled: boolean
  withdrawalsEnabled: boolean
  tradingEnabled: boolean
  kycRequired: boolean
  maintenanceMode: boolean
  registrationEnabled: boolean
  botTradingEnabled: boolean
  // User defaults
  defaultStartingBalance: number
  welcomeBonusAmount: number
  welcomeBonusEnabled: boolean
  // Bot defaults
  botDefaultStrategy: string
  botDefaultRiskLevel: string
  botDefaultTimeframe: string
  botConfidenceThreshold: number
  botMaxOpenTrades: number
  // Security
  maxLoginAttempts: number
  sessionTimeoutMinutes: number
  // Notifications
  notifyOnNewDeposit: boolean
  notifyOnNewWithdrawal: boolean
  notifyOnNewUser: boolean
  notifyOnNewOrder: boolean
  // Branding
  platformName: string
  supportEmail: string
  supportPhone: string
}

export interface AdminAction {
  id: number
  adminId: number
  action: string
  targetUserId: number
  targetId: string
  details: string
  timestamp: string
}

export interface AdminNotification {
  id: number
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error' | 'user' | 'deposit' | 'withdrawal' | 'order' | 'login' | 'bot_trade'
  isRead: boolean
  relatedId: string | null
  relatedType: string | null
  createdAt: string
}

export interface BotTrade {
  id: number
  userId: number
  userName: string
  strategy: string
  pair: string
  timeframe: string
  side: 'buy' | 'sell'
  quantity: number
  entryPrice: number
  expectedProfit: number
  displayPnl: number
  finalPnl: number | null
  status: 'open' | 'closed'
  closeReason: 'take_profit' | 'duration_expired' | 'admin_closed' | null
  tradeDurationSeconds: number
  openedAt: string
  closedAt: string | null
  timeRemaining: number
}

export interface BotSettings {
  id: number
  userId: number
  strategy: string
  riskLevel: string
  timeframe: string
  confidenceThreshold: number
  tradeDurationSeconds: number
  adminControlled: boolean
  isActive: boolean
}
