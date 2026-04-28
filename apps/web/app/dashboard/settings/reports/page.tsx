'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Plus, Trash2, ChevronLeft, Send, BarChart2, Play } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface ScheduledReport {
  id: string
  name: string
  type: string
  cronExpr: string
  recipients: string[]
  active: boolean
  lastSentAt?: string
  createdAt: string
}

const REPORT_TYPES = [
  { value: 'weekly_summary', label: 'Resumen semanal' },
  { value: 'pipeline_snapshot', label: 'Snapshot del pipeline' },
  { value: 'seller_performance', label: 'Performance de vendedores' },
  { value: 'monthly_revenue', label: 'Revenue mensual' },
]

const CRON_PRESETS = [
  { label: 'Cada lunes a las 8am', value: '0 8 * * 1' },
  { label: 'Cada día a las 8am', value: '0 8 * * *' },
  { label: 'Cada viernes a las 5pm', value: '0 17 * * 5' },
  { label: 'Primero de cada mes', value: '0 8 1 * *' },
]

export default function ReportsSettingsPage() {
  const [reports, setReports] = useState<ScheduledReport[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'weekly_summary', cronExpr: '0 8 * * 1', recipients: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get<ScheduledReport[]>('/api/reports')
      .then(setReports)
      .catch(() => toast.error('Error al cargar reportes'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    const recipientList = form.recipients.split(',').map(r => r.trim()).filter(Boolean)
    if (!form.name.trim() || recipientList.length === 0) { toast.error('Completá nombre y destinatarios'); return }
    setSaving(true)
    try {
      const report = await api.post<ScheduledReport>('/api/reports', {
        name: form.name,
        type: form.type,
        cronExpr: form.cronExpr,
        recipients: recipientList,
        active: true,
      })
      setReports(prev => [...prev, report])
      setCreating(false)
      setForm({ name: '', type: 'weekly_summary', cronExpr: '0 8 * * 1', recipients: '' })
      toast.success('Reporte programado creado')
    } catch { toast.error('Error al crear') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este reporte?')) return
    await api.delete(`/api/reports/${id}`)
    setReports(prev => prev.filter(r => r.id !== id))
    toast.success('Eliminado')
  }

  const handleSendNow = async (id: string) => {
    try {
      await api.post(`/api/reports/${id}/send`, {})
      toast.success('Reporte enviado')
      const updated = await api.get<ScheduledReport[]>('/api/reports')
      setReports(updated)
    } catch { toast.error('Error al enviar') }
  }

  const toggleActive = async (r: ScheduledReport) => {
    const updated = await api.patch<ScheduledReport>(`/api/reports/${r.id}`, { active: !r.active })
    setReports(prev => prev.map(x => x.id === r.id ? updated : x))
  }

  return (
    <div>
      <Header title="Reportes programados" />
      <div className="p-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/settings" className="text-gray-400 hover:text-gray-700"><ChevronLeft size={18} /></Link>
          <p className="text-sm text-gray-500">Envío automático de reportes por email</p>
          <button onClick={() => setCreating(true)} className="btn-primary ml-auto flex items-center gap-2"><Plus size={16} /> Nuevo reporte</button>
        </div>

        {creating && (
          <div className="card p-5 mb-6 space-y-4">
            <h3 className="font-semibold text-gray-800">Nuevo reporte programado</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre</label>
                <input className="input" placeholder="Reporte semanal del equipo" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Tipo de reporte</label>
                <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Frecuencia</label>
                <select className="input" value={form.cronExpr} onChange={e => setForm(f => ({ ...f, cronExpr: e.target.value }))}>
                  {CRON_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Destinatarios (separados por coma)</label>
                <input className="input" type="text" placeholder="admin@empresa.com, ceo@empresa.com" value={form.recipients} onChange={e => setForm(f => ({ ...f, recipients: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCreating(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleCreate} disabled={saving} className="btn-primary disabled:opacity-60">{saving ? 'Creando...' : 'Crear reporte'}</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{[1, 2].map(i => <div key={i} className="card p-5 h-20 animate-pulse bg-gray-50" />)}</div>
        ) : reports.length === 0 && !creating ? (
          <div className="card p-12 flex flex-col items-center text-center">
            <BarChart2 size={32} className="text-gray-200 mb-3" />
            <h3 className="font-semibold text-gray-700 mb-1">Sin reportes programados</h3>
            <p className="text-sm text-gray-400 mb-4">Enviá reportes automáticos del CRM por email.</p>
            <button onClick={() => setCreating(true)} className="btn-primary flex items-center gap-2"><Plus size={15} /> Crear reporte</button>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${r.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                    </div>
                    <p className="text-xs text-gray-400">
                      {REPORT_TYPES.find(t => t.value === r.type)?.label} · {CRON_PRESETS.find(p => p.value === r.cronExpr)?.label ?? r.cronExpr}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      <Send size={10} className="inline mr-1" />{r.recipients.join(', ')}
                    </p>
                    {r.lastSentAt && <p className="text-xs text-gray-300 mt-0.5">Último envío: {formatDate(r.lastSentAt)}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => toggleActive(r)} className={`text-xs px-2.5 py-1 rounded-full font-medium ${r.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {r.active ? 'Activo' : 'Pausado'}
                    </button>
                    <button onClick={() => handleSendNow(r.id)} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 px-2 py-1 rounded border border-brand-200 hover:border-brand-400">
                      <Play size={11} /> Enviar ahora
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
