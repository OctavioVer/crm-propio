'use client'

import { Bell, X, Check } from 'lucide-react'
import { getInitials, formatDate } from '@/lib/utils'
import { getStoredUser } from '@/lib/auth'
import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import type { AuthUser } from '@crm/types'

interface Notification {
  id: string
  title: string
  body?: string
  type: string
  readAt?: string
  createdAt: string
  entityType?: string
  entityId?: string
}

interface HeaderProps {
  title: string
}

const TYPE_COLORS: Record<string, string> = {
  info: 'bg-blue-100 text-blue-600',
  success: 'bg-green-100 text-green-600',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-600',
}

export function Header({ title }: HeaderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

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

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setOpen(v => !v)}
            className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {open && (
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

              <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Bell size={24} className="text-gray-200 mb-2" />
                    <p className="text-sm text-gray-400">Sin notificaciones</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isUnread = !n.readAt
                    return (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${isUnread ? 'bg-brand-50/30' : ''}`}
                        onClick={() => isUnread && markRead(n.id)}
                      >
                        <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${isUnread ? 'bg-brand-500' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'} leading-snug`}>
                            {n.title}
                          </p>
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

        {/* User avatar */}
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
