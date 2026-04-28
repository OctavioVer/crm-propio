'use client'

import { Bell, X, Check, Search, User, Briefcase } from 'lucide-react'
import { getInitials, formatDate } from '@/lib/utils'
import { getStoredUser } from '@/lib/auth'
import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'
import type { AuthUser } from '@crm/types'

interface Notification {
  id: string
  title: string
  body?: string
  type: string
  readAt?: string
  createdAt: string
}

interface SearchResult {
  id: string
  label: string
  sub: string
  type: 'contact' | 'deal'
}

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ contacts: SearchResult[]; deals: SearchResult[] } | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => { setUser(getStoredUser()) }, [])

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get<{ data: Notification[]; unreadCount: number }>('/api/notifications')
      setNotifications(res.data)
      setUnread(res.unreadCount)
    } catch {}
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults(null); return }
    const t = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await api.get<{ contacts: SearchResult[]; deals: SearchResult[] }>(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        setSearchResults(res)
        setSearchOpen(true)
      } catch {} finally { setSearchLoading(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const markRead = async (id: string) => {
    await api.patch(`/api/notifications/${id}/read`).catch(() => {})
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    await api.post('/api/notifications/read-all').catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })))
    setUnread(0)
  }

  const dismiss = async (id: string, isUnread: boolean) => {
    await api.delete(`/api/notifications/${id}`).catch(() => {})
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (isUnread) setUnread(prev => Math.max(0, prev - 1))
  }

  const handleSearchSelect = (result: SearchResult) => {
    setSearchQuery('')
    setSearchOpen(false)
    setSearchResults(null)
    if (result.type === 'contact') router.push(`/dashboard/contacts/${result.id}`)
    else router.push(`/dashboard/deals/${result.id}`)
  }

  const totalResults = (searchResults?.contacts.length ?? 0) + (searchResults?.deals.length ?? 0)

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Global search */}
        <div className="relative hidden md:block" ref={searchRef}>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar contactos, deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults && setSearchOpen(true)}
            className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 w-60 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults(null) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}

          {searchOpen && (totalResults > 0 || searchLoading) && (
            <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
              {searchLoading && (
                <div className="px-4 py-3 text-sm text-gray-400">Buscando...</div>
              )}
              {searchResults && (
                <>
                  {searchResults.contacts.length > 0 && (
                    <div>
                      <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">Contactos</p>
                      {searchResults.contacts.map(r => (
                        <button key={r.id} onClick={() => handleSearchSelect(r)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                          <div className="w-7 h-7 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                            {r.label[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{r.label}</p>
                            {r.sub && <p className="text-xs text-gray-400 truncate">{r.sub}</p>}
                          </div>
                          <User size={12} className="text-gray-300 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.deals.length > 0 && (
                    <div>
                      <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">Deals</p>
                      {searchResults.deals.map(r => (
                        <button key={r.id} onClick={() => handleSearchSelect(r)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                          <div className="w-7 h-7 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center flex-shrink-0">
                            <Briefcase size={12} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{r.label}</p>
                            {r.sub && <p className="text-xs text-gray-400 truncate">{r.sub}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {totalResults === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">Sin resultados para "{searchQuery}"</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(v => !v)}
            className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">
                  Notificaciones {unread > 0 && <span className="text-brand-600">({unread})</span>}
                </h3>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1">
                    <Check size={12} /> Marcar todas
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bell size={24} className="text-gray-200 mb-2" />
                    <p className="text-sm text-gray-400">Sin notificaciones</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isUnread = !n.readAt
                    return (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${isUnread ? 'bg-brand-50/30' : ''}`}
                        onClick={() => isUnread && markRead(n.id)}
                      >
                        <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${isUnread ? 'bg-brand-500' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'} leading-snug`}>{n.title}</p>
                          {n.body && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>}
                          <p className="text-xs text-gray-300 mt-1">{formatDate(n.createdAt)}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); dismiss(n.id, isUnread) }}
                          className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-sm font-semibold">
            {getInitials(user?.name ?? user?.email)}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900 leading-none">{user?.name ?? 'Usuario'}</p>
            <p className="text-xs text-gray-500 mt-0.5">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
