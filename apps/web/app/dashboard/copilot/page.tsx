'use client'

import { useEffect, useState, useRef } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { Sparkles, Send, User, Bot, TrendingUp, Users, Briefcase, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: Date
}

interface CopilotContext {
  contactCount: number
  openDeals: number
  wonRevenue30d: number
  wonDeals30d: number
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [context, setContext] = useState<CopilotContext | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    api.get<{ suggestions: string[] }>('/api/copilot/suggestions')
      .then(r => setSuggestions(r.suggestions))
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const ask = async (question: string) => {
    if (!question.trim() || loading) return
    const userMsg: Message = { role: 'user', content: question.trim(), ts: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await api.post<{ answer: string; context: CopilotContext }>('/api/copilot/ask', { question: question.trim() })
      setMessages(prev => [...prev, { role: 'assistant', content: res.answer, ts: new Date() }])
      setContext(res.context)
    } catch (err: any) {
      toast.error(err.message ?? 'Error al consultar el copiloto')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    ask(input)
  }

  return (
    <div className="flex flex-col h-screen">
      <Header title="Copiloto AI" />

      <div className="flex-1 flex overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-purple-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                <Sparkles size={28} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Copiloto de ventas</h2>
              <p className="text-sm text-gray-500 max-w-sm mb-8">
                Hacé preguntas sobre tus contactos, deals, pipeline y actividad. Respondo con datos reales del CRM.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl w-full">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => ask(s)}
                    className="text-left px-4 py-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot size={14} className="text-white" />
                    </div>
                  )}
                  <div className={`max-w-lg px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand-500 text-white rounded-br-sm'
                      : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1.5 ${msg.role === 'user' ? 'text-brand-100' : 'text-gray-300'}`}>
                      {msg.ts.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User size={14} className="text-gray-500" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot size={14} className="text-white" />
                  </div>
                  <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-100">
            {messages.length > 0 && suggestions.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-3">
                {suggestions.slice(0, 3).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => ask(s)}
                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-brand-50 hover:text-brand-700 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-3 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
                placeholder="Preguntá algo sobre tu CRM... (Enter para enviar)"
                rows={2}
                className="flex-1 input resize-none py-2.5 text-sm"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="btn-primary p-2.5 disabled:opacity-40"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>

        {/* Stats sidebar */}
        <div className="w-64 flex-shrink-0 bg-white border-l border-gray-100 p-5 overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Resumen CRM</h3>
          <div className="space-y-3">
            {[
              { icon: Users, label: 'Contactos', value: context?.contactCount ?? '—', color: 'bg-blue-50 text-blue-600' },
              { icon: Briefcase, label: 'Deals abiertos', value: context?.openDeals ?? '—', color: 'bg-brand-50 text-brand-600' },
              { icon: TrendingUp, label: 'Deals ganados (30d)', value: context?.wonDeals30d ?? '—', color: 'bg-green-50 text-green-600' },
              { icon: DollarSign, label: 'Revenue (30d)', value: context?.wonRevenue30d != null ? formatCurrency(context.wonRevenue30d) : '—', color: 'bg-purple-50 text-purple-600' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`p-2 rounded-lg ${color}`}><Icon size={14} /></div>
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-semibold text-gray-900">{String(value)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 leading-relaxed">
              El copiloto usa datos reales del CRM actualizados en tiempo real. Las respuestas son generadas por Claude (Anthropic).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
