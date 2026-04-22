'use client'

import { useEffect, useState, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { MessageSquare, Plus, Search, Mail, Phone, Instagram, Facebook, Wifi } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface ConversationContact {
  id: string
  firstName?: string
  lastName?: string
  companyName?: string
}

interface Conversation {
  id: string
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS' | 'CHAT' | 'INSTAGRAM' | 'FACEBOOK'
  status: 'OPEN' | 'ASSIGNED' | 'RESOLVED' | 'ARCHIVED'
  contact?: ConversationContact
  lastMessageAt?: string
  messages: Array<{ body?: string; direction: 'IN' | 'OUT'; sentAt: string }>
  _count: { messages: number }
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  EMAIL: <Mail size={14} />,
  WHATSAPP: <Phone size={14} />,
  SMS: <Phone size={14} />,
  CHAT: <MessageSquare size={14} />,
  INSTAGRAM: <Instagram size={14} />,
  FACEBOOK: <Facebook size={14} />,
}

const CHANNEL_COLORS: Record<string, string> = {
  EMAIL: 'bg-blue-100 text-blue-600',
  WHATSAPP: 'bg-green-100 text-green-600',
  SMS: 'bg-purple-100 text-purple-600',
  CHAT: 'bg-brand-100 text-brand-600',
  INSTAGRAM: 'bg-pink-100 text-pink-600',
  FACEBOOK: 'bg-indigo-100 text-indigo-600',
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierta',
  ASSIGNED: 'Asignada',
  RESOLVED: 'Resuelta',
  ARCHIVED: 'Archivada',
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-yellow-50 text-yellow-700',
  ASSIGNED: 'bg-blue-50 text-blue-700',
  RESOLVED: 'bg-green-50 text-green-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const router = useRouter()

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (filter !== 'all') params.set('status', filter.toUpperCase())
      const res = await api.get<{ data: Conversation[] }>(`/api/conversations?${params}`)
      setConversations(res.data)
    } catch {
      toast.error('Error al cargar conversaciones')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  const handleNewConversation = async () => {
    try {
      const conv = await api.post<Conversation>('/api/conversations', {
        channel: 'CHAT',
        firstMessage: 'Nueva conversación iniciada',
      })
      router.push(`/dashboard/conversations/${conv.id}`)
    } catch {
      toast.error('Error al crear conversación')
    }
  }

  const filtered = conversations.filter(c => {
    if (!search) return true
    const name = c.contact
      ? [c.contact.firstName, c.contact.lastName].filter(Boolean).join(' ') || c.contact.companyName || ''
      : ''
    return name.toLowerCase().includes(search.toLowerCase())
  })

  const tabs = [
    { key: 'all', label: 'Todas' },
    { key: 'open', label: 'Abiertas' },
    { key: 'assigned', label: 'Asignadas' },
    { key: 'resolved', label: 'Resueltas' },
  ]

  return (
    <div className="flex flex-col h-screen">
      <Header title="Conversaciones" />
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 border-r border-gray-100 flex flex-col bg-white">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-8 py-1.5 text-sm"
                />
              </div>
              <button onClick={handleNewConversation} className="btn-primary p-2"><Plus size={16} /></button>
            </div>
            <div className="flex gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                    filter === tab.key ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-sm text-gray-400">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                <MessageSquare size={28} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">Sin conversaciones</p>
              </div>
            ) : (
              filtered.map((conv) => {
                const contactName = conv.contact
                  ? [conv.contact.firstName, conv.contact.lastName].filter(Boolean).join(' ') || conv.contact.companyName || 'Desconocido'
                  : 'Sin contacto'
                const lastMsg = conv.messages[0]
                return (
                  <div
                    key={conv.id}
                    onClick={() => router.push(`/dashboard/conversations/${conv.id}`)}
                    className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-xs font-semibold text-gray-500 flex-shrink-0">
                        {contactName[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{contactName}</p>
                          {conv.lastMessageAt && (
                            <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(conv.lastMessageAt)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${CHANNEL_COLORS[conv.channel] ?? 'bg-gray-100 text-gray-500'}`}>
                            {CHANNEL_ICONS[conv.channel]} {conv.channel}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[conv.status]}`}>
                            {STATUS_LABELS[conv.status]}
                          </span>
                        </div>
                        {lastMsg?.body && (
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            {lastMsg.direction === 'OUT' ? 'Tú: ' : ''}{lastMsg.body}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/50">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
            <MessageSquare size={28} className="text-brand-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Selecciona una conversación</h3>
          <p className="text-sm text-gray-400 max-w-xs">
            Elegí una conversación de la lista o creá una nueva para empezar.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-xs text-gray-400">
            {['WhatsApp', 'Email', 'Chat'].map(ch => (
              <div key={ch} className="flex flex-col items-center gap-1 p-3 bg-white rounded-xl border border-gray-100">
                <Wifi size={16} className="text-gray-300" />
                {ch}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
