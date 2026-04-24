'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Plus, Trash2, ChevronLeft, Webhook, CheckCircle, XCircle, Play } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface WebhookRow {
  id: string
  name: string
  url: string
  events: string[]
  active: boolean
  createdAt: string
  _count: { deliveries: number }
  deliveries: Array<{ success: boolean; createdAt: string }>
}

const ALL_EVENTS = [
  'contact.created', 'contact.updated', 'contact.deleted',
  'deal.created', 'deal.updated', 'deal.stage_changed', 'deal.won', 'deal.lost',
  'activity.created', 'conversation.created',
]

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<{ name: string; url: string; events: string[]; secret: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get<WebhookRow[]>('/api/webhooks')
      .then(setWebhooks)
      .catch(() => toast.error('Error al cargar webhooks'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!form?.name.trim() || !form.url.trim()) { toast.error('Nombre y URL son requeridos'); return }
    if (!form.events.length) { toast.error('Seleccioná al menos un evento'); return }
    setSaving(true)
    try {
      const wh = await api.post<WebhookRow>('/api/webhooks', {
        name: form.name,
        url: form.url,
        events: form.events,
        secret: form.secret || undefined,
      })
      setWebhooks(prev => [...prev, { ...wh, _count: { deliveries: 0 }, deliveries: [] }])
      setForm(null)
      toast.success('Webhook creado')
    } catch (err: any) {
      toast.error(err.message ?? 'Error al crear')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este webhook?')) return
    await api.delete(`/api/webhooks/${id}`)
    setWebhooks(prev => prev.filter(w => w.id !== id))
    toast.success('Webhook eliminado')
  }

  const handleTest = async (id: string) => {
    try {
      await api.post(`/api/webhooks/${id}/test`, {})
      toast.success('Prueba enviada — revisá los logs del receptor')
    } catch { toast.error('Error al enviar prueba') }
  }

  const toggleEvent = (event: string) => {
    if (!form) return
    setForm(prev => prev ? {
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    } : prev)
  }

  return (
    <div>
      <Header title="Webhooks" />
      <div className="p-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/settings" className="text-gray-400 hover:text-gray-700"><ChevronLeft size={18} /></Link>
          <p className="text-sm text-gray-500">Conectá el CRM con herramientas externas via webhooks (n8n, Make, Zapier, Slack)</p>
          <button onClick={() => setForm({ name: '', url: '', events: [], secret: '' })} className="btn-primary ml-auto flex items-center gap-2">
            <Plus size={16} /> Nuevo webhook
          </button>
        </div>

        {form && (
          <div className="card p-5 mb-6 space-y-4">
            <h3 className="font-semibold text-gray-800">Nuevo webhook</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre</label>
                <input className="input" placeholder="Ej: Notificar Slack" value={form.name} onChange={e => setForm(f => f ? { ...f, name: e.target.value } : f)} />
              </div>
              <div>
                <label className="label">URL</label>
                <input className="input" type="url" placeholder="https://..." value={form.url} onChange={e => setForm(f => f ? { ...f, url: e.target.value } : f)} />
              </div>
              <div className="col-span-2">
                <label className="label">Secret (opcional, para verificar firma)</label>
                <input className="input" placeholder="mi-secreto-seguro" value={form.secret} onChange={e => setForm(f => f ? { ...f, secret: e.target.value } : f)} />
              </div>
              <div className="col-span-2">
                <label className="label mb-2">Eventos a recibir</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_EVENTS.map(ev => (
                    <button
                      key={ev}
                      type="button"
                      onClick={() => toggleEvent(ev)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                        form.events.includes(ev)
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {ev}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setForm(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleCreate} disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? 'Creando...' : 'Crear webhook'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="card p-5 h-20 animate-pulse bg-gray-50" />)}
          </div>
        ) : webhooks.length === 0 && !form ? (
          <div className="card p-12 flex flex-col items-center text-center">
            <Webhook size={32} className="text-gray-200 mb-3" />
            <h3 className="font-semibold text-gray-700 mb-1">Sin webhooks</h3>
            <p className="text-sm text-gray-400 mb-4">Conectá el CRM con Slack, n8n, Make o cualquier URL HTTP.</p>
            <button onClick={() => setForm({ name: '', url: '', events: [], secret: '' })} className="btn-primary flex items-center gap-2"><Plus size={15} /> Crear webhook</button>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map(wh => {
              const lastDelivery = wh.deliveries[0]
              return (
                <div key={wh.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${wh.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <p className="font-semibold text-gray-900 text-sm">{wh.name}</p>
                      </div>
                      <p className="text-xs text-gray-400 font-mono truncate">{wh.url}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {wh.events.map(ev => (
                          <span key={ev} className="text-[10px] px-1.5 py-0.5 bg-brand-50 text-brand-700 rounded font-medium">{ev}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {lastDelivery && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          {lastDelivery.success
                            ? <CheckCircle size={13} className="text-green-500" />
                            : <XCircle size={13} className="text-red-400" />}
                          {formatDate(lastDelivery.createdAt)}
                        </div>
                      )}
                      <button onClick={() => handleTest(wh.id)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-600 px-2 py-1 rounded border border-gray-200 hover:border-brand-200">
                        <Play size={11} /> Probar
                      </button>
                      <button onClick={() => handleDelete(wh.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">{wh._count.deliveries} envíos · Creado {formatDate(wh.createdAt)}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
