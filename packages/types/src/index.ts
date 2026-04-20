// ─── AUTH ─────────────────────────────────────────────────────────────────────

export interface JWTPayload {
  sub: string
  tid: string
  role: UserRole
  email: string
  name?: string
  iat: number
  exp: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface AuthUser {
  id: string
  tenantId: string
  email: string
  name?: string
  role: UserRole
  avatarUrl?: string
}

// ─── ENUMS ────────────────────────────────────────────────────────────────────

export type Plan = 'STARTER' | 'GROWTH' | 'ENTERPRISE'
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SELLER' | 'VIEWER'
export type ContactType = 'PERSON' | 'COMPANY'
export type DealStatus = 'OPEN' | 'WON' | 'LOST'
export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'TASK' | 'WHATSAPP'
export type Channel = 'EMAIL' | 'WHATSAPP' | 'SMS' | 'CHAT' | 'INSTAGRAM' | 'FACEBOOK'

// ─── PAGINATION ───────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// ─── CONTACT ─────────────────────────────────────────────────────────────────

export interface ContactEmail {
  id: string
  email: string
  isPrimary: boolean
}

export interface ContactPhone {
  id: string
  phone: string
  type: string
}

export interface Contact {
  id: string
  tenantId: string
  type: ContactType
  firstName?: string
  lastName?: string
  companyName?: string
  ownerId?: string
  stage?: string
  score: number
  tags: string[]
  notes?: string
  emails: ContactEmail[]
  phones: ContactPhone[]
  createdAt: string
  updatedAt: string
}

export interface CreateContactInput {
  type?: ContactType
  firstName?: string
  lastName?: string
  companyName?: string
  ownerId?: string
  stage?: string
  tags?: string[]
  notes?: string
  emails?: { email: string; isPrimary?: boolean }[]
  phones?: { phone: string; type?: string }[]
}

export type UpdateContactInput = Partial<CreateContactInput>

// ─── DEAL ─────────────────────────────────────────────────────────────────────

export interface PipelineStage {
  id: string
  name: string
  order: number
  color: string
}

export interface Pipeline {
  id: string
  tenantId: string
  name: string
  stages: PipelineStage[]
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface Deal {
  id: string
  tenantId: string
  pipelineId: string
  contactId?: string
  ownerId?: string
  title: string
  stage: string
  status: DealStatus
  amount?: number
  currency: string
  probability?: number
  closeDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CreateDealInput {
  pipelineId: string
  contactId?: string
  ownerId?: string
  title: string
  stage: string
  amount?: number
  currency?: string
  probability?: number
  closeDate?: string
  notes?: string
}

export type UpdateDealInput = Partial<Omit<CreateDealInput, 'pipelineId'>>

// ─── ACTIVITY ─────────────────────────────────────────────────────────────────

export interface Activity {
  id: string
  tenantId: string
  type: ActivityType
  contactId?: string
  dealId?: string
  userId?: string
  title?: string
  body?: string
  outcome?: string
  scheduledAt?: string
  completedAt?: string
  dueAt?: string
  createdAt: string
  updatedAt: string
  user?: { name: string }
}

export interface CreateActivityInput {
  type: ActivityType
  contactId?: string
  dealId?: string
  title?: string
  body?: string
  outcome?: string
  scheduledAt?: string
  completedAt?: string
  dueAt?: string
}

// ─── USER ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  tenantId: string
  email: string
  name?: string
  role: UserRole
  avatarUrl?: string
  emailVerified: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface InviteUserInput {
  email: string
  name?: string
  role: UserRole
}

// ─── API ERRORS ───────────────────────────────────────────────────────────────

export interface ApiError {
  statusCode: number
  error: string
  message: string
}
