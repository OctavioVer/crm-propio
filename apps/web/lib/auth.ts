'use client'

import { api } from './api'
import type { AuthTokens, AuthUser } from '@crm/types'

const ACCESS_KEY = 'crm_access'
const REFRESH_KEY = 'crm_refresh'
const USER_KEY = 'crm_user'

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_KEY)
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export function storeAuth(tokens: AuthTokens, user: AuthUser) {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken)
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  api.setToken(tokens.accessToken)
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
  api.setToken(null)
}

export async function login(email: string, password: string, tenantSlug: string) {
  const result = await api.post<{ user: AuthUser; tokens: AuthTokens }>('/api/auth/login', {
    email,
    password,
    tenantSlug,
  })
  storeAuth(result.tokens, result.user)
  return result.user
}

export async function register(data: {
  tenantName: string
  tenantSlug: string
  email: string
  name: string
  password: string
}) {
  const result = await api.post<{ user: AuthUser; tokens: AuthTokens }>('/api/auth/register', data)
  storeAuth(result.tokens, result.user)
  return result.user
}

export async function logout() {
  const refresh = localStorage.getItem(REFRESH_KEY)
  if (refresh) {
    await api.post('/api/auth/logout', { refreshToken: refresh }).catch(() => {})
  }
  clearAuth()
}

export function initAuth() {
  const token = getStoredToken()
  if (token) api.setToken(token)
}
