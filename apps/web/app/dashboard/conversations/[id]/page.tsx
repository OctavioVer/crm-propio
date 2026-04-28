'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { use } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Send, ChevronLeft, CheckCheck, Phone, Mail, User, Sparkles, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

interface Message {
  id: string
  body?: string
  direction: 'IN' | 'OUT'
  sentAt: string
  readAt?: string
}

interface Contact {
  id: string
  firstName?: string
  lastName?: string
  companyName?: string
  emails: Array<{ email: string; isPrimary: boolean }>
  phones: Array<{ phone: string }>
}

interface Conversation {
  id: string
  channel: string
  status: 'OPEN' | 'ASSIGNED' | 'RESOLVED' | 'ARCHIVED'
  contact?: Contact
  messages: Message[]
  lastMessageAt?: string
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-200',
  RESOLVED: 'bg-green-50 text-green-700 border-green-200',
  ARCHIVED: 'bg-gray-100 text-gray-500 border-gray-200',
}

export default function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [sentiment, setSentiment] = useState<{ sentiment: string; score: number; summary: string; urgency: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const fetchConversation = useCallback(async () => {
    try {
      const data = await api.get<Conversation>(`/api/conversations/${id}`)
      setConversation(data)
    } catch {
      toast.error('No se pudo cargar la conversación')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchConversation() }, [fetchConversation])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [conversation?.messages])

  const sendMessage = async () => {
    if (!message.trim() || sending) return
    setSending(true)
    try {
      const msg = await api.post<Message>(`/api/conversations/${id}/messages`, { body: message.trim() })
      setConversation(prev => prev ? { ...prev, messages: [...prev.messages, msg] } : prev)
      setMessage('')
    } catch {
      toast.error('Error al enviar el mensaje')
    } finally {
      setSending(false)
    }
  }

  const analyzeSentiment = async () => {
    setAnalyzing(true)
    try {
      const result = await api.post<{ sentiment: string; score: number; summary: string; urgency: string }>(
        `/api/conversations/${id}/analyze`, {}
      )
      setSentiment(result)
      toast.success('Análisis completado')
    } catch { toast.error('Error al analizar sentimiento') }
    finally { setAnalyzing(false) }
  }

  const updateStatus = async (status: string) => {
    try {
      await api.patch(`/api/conversations/${id}`, { status })
      setConversation(prev => prev ? { ...prev, status: status as any } : prev)
      toast.success('Estado actualizado')
    } catch {
      toast.error('Error al actualizar el estado')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <Header title="Conversación" />
        <div className="flex-1 flex items-center justify-center text-gray-400">Cargando...</div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="flex flex-col h-screen">
        <Header title="Conversación" />
        <div className="flex-1 flex items-center justify-center text-gray-400">Conversación no encontrada</div>
      </div>
    )
  }

  const contactName = conversation.contact
    ? [conversation.contact.firstName, conversation.contact.lastName].filter(Boolean).join(' ') || conversation.contact.companyName || 'Sin nombre'
    : 'Sin contacto'

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 bg-white">
        <button onClick={() => router.push('/dashboard/conversations')} className="text-gray-400 hover:text-gray-700">
          <ChevronLeft size={20} />
        </button>
        <div className="w-9 h-9 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-sm font-semibold">
          {contactName[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">{contactName}</p>
          <p className="text-xs text-gray-400">{conversation.channel}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={conversation.status}
            onChange={(e) => updateStatus(e.target.value)}
            className={`text-xs px-2 py-1 rounded-lg border font-medium ${STATUS_COLORS[conversation.status]} cursor-pointer`}
          >
            <option value="OPEN">Abierta</option>
            <option value="ASSIGNED">Asignada</option>
            <option value="RESOLVED">Resuelta</option>
            <option value="ARCHIVED">Archivada</option>
          </select>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gray-50/50">
            {conversation.messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">
                Sin mensajes aún. Enviá el primero.
              </div>
            ) : (
              conversation.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.direction === 'OUT' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                    msg.direction === 'OUT'
                      ? 'bg-brand-500 text-white rounded-br-sm'
                      : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm shadow-sm'
                  }`}>
                    <p>{msg.body}</p>
                    <div className={`flex items-center gap-1 mt-1 text-xs ${msg.direction === 'OUT' ? 'text-brand-100 justify-end' : 'text-gray-400'}`}>
                      {formatDate(msg.sentAt)}
                      {msg.direction === 'OUT' && <CheckCheck size={12} />}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {conversation.status !== 'ARCHIVED' && (
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="flex items-end gap-3">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder="Escribí tu mensaje..."
                  rows={2}
                  className="flex-1 input resize-none py-2.5"
                />
                <button
                  onClick={sendMessage}
                  disabled={!message.trim() || sending}
                  className="btn-primary p-2.5 disabled:opacity-40"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Enter para enviar · Shift+Enter para nueva línea</p>
            </div>
          )}
        </div>

        {/* Contact sidebar */}
        {conversation.contact && (
          <div className="w-64 flex-shrink-0 border-l border-gray-100 bg-white p-4 overflow-y-auto">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contacto</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center font-semibold">
                {contactName[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{contactName}</p>
              </div>
            </div>
            {conversation.contact.emails?.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Mail size={11} /> Email</p>
                {conversation.contact.emails.map((e, i) => (
                  <p key={i} className="text-sm text-gray-700 truncate">{e.email}</p>
                ))}
              </div>
            )}
            {conversation.contact.phones?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Phone size={11} /> Teléfono</p>
                {conversation.contact.phones.map((p, i) => (
                  <p key={i} className="text-sm text-gray-700">{p.phone}</p>
                ))}
              </div>
            )}
            <Link href={`/dashboard/contacts/${conversation.contact.id}`} className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium mb-4">
              <User size={14} /> Ver perfil completo
            </Link>

            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Sparkles size={11} /> Sentimiento AI
              </h3>
              {sentiment ? (
                <div className="space-y-2 text-xs">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold ${
                    sentiment.sentiment === 'positivo' ? 'bg-green-100 text-green-700' :
                    sentiment.sentiment === 'negativo' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {sentiment.sentiment === 'positivo' ? '😊' : sentiment.sentiment === 'negativo' ? '😞' : '😐'}
                    {sentiment.sentiment}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Urgencia:</span>
                    <span className={`font-medium ${sentiment.urgency === 'alta' ? 'text-red-600' : sentiment.urgency === 'media' ? 'text-yellow-600' : 'text-green-600'}`}>
                      {sentiment.urgency}
                    </span>
                  </div>
                  {sentiment.summary && <p className="text-gray-500 leading-relaxed">{sentiment.summary}</p>}
                </div>
              ) : (
                <button onClick={analyzeSentiment} disabled={analyzing || conversation.messages.length === 0} className="w-full flex items-center justify-center gap-2 text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-lg transition-colors disabled:opacity-40 font-medium">
                  {analyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {analyzing ? 'Analizando...' : 'Analizar sentimiento'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
