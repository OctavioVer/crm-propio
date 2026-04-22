'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Plus, Zap, Play, Pause, Trash2, ChevronRight, Activity } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface WorkflowExecution {
  id: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  startedAt: string
}

interface Workflow {
  id: string
  name: string
  description?: string
  active: boolean
  version: number
  triggerJson: { type: string }
  createdAt: string
  updatedAt: string
  _count: { executions: number }
  executions: WorkflowExecution[]
}

const TRIGGER_LABELS: Record<string, string> = {
  deal_created: 'Deal creado',
  deal_stage_changed: 'Etapa cambiada',
  contact_created: 'Contacto creado',
  deal_won: 'Deal ganado',
  deal_lost: 'Deal perdido',
  activity_created: 'Actividad creada',
}

export default function AutomationsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchWorkflows = async () => {
    setLoading(true)
    try {
      const data = await api.get<Workflow[]>('/api/workflows')
      setWorkflows(data)
    } catch {
      toast.error('Error al cargar workflows')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWorkflows() }, [])

  const handleToggle = async (wf: Workflow) => {
    try {
      const updated = await api.post<Workflow>(`/api/workflows/${wf.id}/toggle`, {})
      setWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, active: updated.active } : w))
      toast.success(updated.active ? 'Workflow activado' : 'Workflow pausado')
    } catch {
      toast.error('Error al cambiar el estado')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este workflow?')) return
    try {
      await api.delete(`/api/workflows/${id}`)
      setWorkflows(prev => prev.filter(w => w.id !== id))
      toast.success('Workflow eliminado')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const createWorkflow = async (name: string, triggerType: string, description?: string) => {
    try {
      const wf = await api.post<Workflow>('/api/workflows', {
        name,
        description,
        trigger: { type: triggerType, conditions: [] },
        nodes: [],
        active: false,
      })
      router.push(`/dashboard/automations/${wf.id}`)
    } catch {
      toast.error('Error al crear workflow')
    }
  }

  return (
    <div>
      <Header title="Automatizaciones" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">Automatizá acciones repetitivas y seguimientos.</p>
          <button onClick={() => createWorkflow('Nuevo workflow', 'deal_created')} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Nuevo workflow
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
                <div className="h-8 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <div className="card p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
              <Zap size={28} className="text-brand-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Sin automatizaciones</h3>
            <p className="text-sm text-gray-400 max-w-sm mb-6">
              Creá tu primer workflow para automatizar seguimientos, asignaciones y notificaciones.
            </p>
            <button onClick={() => createWorkflow('Nuevo workflow', 'deal_created')} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Crear workflow
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((wf) => {
              const lastExec = wf.executions[0]
              return (
                <div key={wf.id} className="card p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${wf.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <p className="font-semibold text-gray-900 text-sm truncate">{wf.name}</p>
                      </div>
                      {wf.description && (
                        <p className="text-xs text-gray-400 truncate">{wf.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(wf.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="badge bg-brand-50 text-brand-700 border border-brand-100 flex items-center gap-1">
                      <Zap size={10} />
                      {TRIGGER_LABELS[wf.triggerJson?.type] ?? wf.triggerJson?.type}
                    </span>
                    <span className="badge bg-gray-50 text-gray-500 border border-gray-200 flex items-center gap-1">
                      <Activity size={10} />
                      {wf._count.executions} ejecuciones
                    </span>
                  </div>

                  {lastExec && (
                    <p className="text-xs text-gray-400">
                      Última: {formatDate(lastExec.startedAt)} —{' '}
                      <span className={
                        lastExec.status === 'COMPLETED' ? 'text-green-600' :
                        lastExec.status === 'FAILED' ? 'text-red-600' : 'text-yellow-600'
                      }>{lastExec.status}</span>
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                    <button
                      onClick={() => handleToggle(wf)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        wf.active
                          ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {wf.active ? <><Pause size={12} /> Pausar</> : <><Play size={12} /> Activar</>}
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard/automations/${wf.id}`)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 ml-auto"
                    >
                      Editar <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Plantillas de inicio rápido</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { name: 'Bienvenida a nuevo contacto', trigger: 'contact_created', desc: 'Enviá un email cuando se crea un contacto nuevo' },
              { name: 'Follow-up de deal', trigger: 'deal_stage_changed', desc: 'Creá una tarea cuando un deal cambia de etapa' },
              { name: 'Notificación deal ganado', trigger: 'deal_won', desc: 'Notificá al equipo cuando se cierra un deal' },
            ].map(t => (
              <div
                key={t.name}
                onClick={() => createWorkflow(t.name, t.trigger, t.desc)}
                className="p-4 border border-dashed border-gray-200 rounded-xl hover:border-brand-300 hover:bg-brand-50/30 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={14} className="text-brand-400 group-hover:text-brand-600" />
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{t.name}</p>
                </div>
                <p className="text-xs text-gray-400">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
