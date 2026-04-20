const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

class ApiClient {
  private baseUrl: string
  private accessToken: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  setToken(token: string | null) {
    this.accessToken = token
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string>),
    }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }))
      throw new ApiError(res.status, error.message ?? 'Error desconocido', error)
    }

    if (res.status === 204) return undefined as T
    return res.json()
  }

  get<T>(path: string) {
    return this.request<T>(path, { method: 'GET' })
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined })
  }

  delete<T = void>(path: string) {
    return this.request<T>(path, { method: 'DELETE' })
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const api = new ApiClient(API_URL)

if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('crm_access')
  if (stored) api.setToken(stored)
}
