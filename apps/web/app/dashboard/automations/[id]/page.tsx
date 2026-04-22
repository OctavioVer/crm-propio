'use client'

import { useEffect, useState, useCallback } from 'react'
import { use } from 'react'
import { api } from '@/lib/api'
import { ChevronLeft, Plus, Trash2, Save, Play, Pause, Zap, Mail, CheckSquare, User, ArrowRight, Bell, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface WorkflowNode {
  id: string
  type: 'send_email' | 'create_task' | 'assign_owner' | 'move_stage' | 'add_tag' | 'wait' | 'notify'
  label: string
  config: Record<string, unknown>
  nextId?: string
}

interface WorkflowTrigger {
  type: string
  conditions: Array<{ field: string; operator: string; value: unknown }>
}

interface Workflow {
  id: string
  name: string
  description?: string
  active: boolean
  triggerJson: WorkflowTrigger
  nodesJson: WorkflowNode[]
}

const TRIGGER_OPTIONS = [
  { value: 'deal_created', label: 'Deal creado' },
  { value: 'deal_stage_changed', label: 'Etapa de deal cambiada' },
  { value: 'contact_created', label: 'Contacto creado' },
  { value: 'deal_won', label: 'Deal ganado' },
  { value: 'deal_lost', label: 'Deal perdido' },
  { value: 'activity_created', label: 'Actividad creada' },
]

const NODE_TYPES = [
  { type: 'send_email', label: 'Enviar email', icon: Mail, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { type: 'create_task', label: 'Crear tarea', icon: CheckSquare, color: 'bg-green-50 text-green-600 border-green-200' },
  { type: 'assign_owner', label: 'Asignar dueño', icon: User, color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { type: 'move_stage', label: 'Mover etapa', icon: ArrowRight, color: 'bg-orange-50 text-orange-600 border-orange-200' },
  { type: 'notify', label: 'Notificar', icon: Bell, color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  { type: 'wait', label: 'Esperar', icon: Clock, color: 'bg-gray-50 text-gray-600 border-gray-200' },
] as const

function generateId() {
  return Math.random().toString(36).slice(2, 9)
}

function NodeCard({ node, onDelete, onEdit }: {
  node: WorkflowNode
  onDelete: () => void
  onEdit: (updates: Partial<WorkflowNode>) => void
}) {
  const meta = NODE_TYPES.find(n => n.type === node.type) ?? NODE_TYPES[4]
  const Icon = meta.icon

  return (
    <div className={`border rounded-xl p-4 bg-white shadow-sm flex items-start gap-3 ${meta.color} border`}>
      <div className={`p-2 rounded-lg ${meta.color}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <input
          className="font-medium text-gray-900 text-sm w-full bg-transparent border-none outline-none focus:ring-0 p-0"
          value={node.label}
          onChange={(e) => onEdit({ label: e.target.value })}
        />
        {node.type === 'send_email' && (
          <input
            className="text-xs text-gray-500 w-full bg-transparent border-none outline-none focus:ring-0 p-0 mt-1"
            placeholder="Asunto del email..."
            value={(node.config.subject as string) ?? ''}
            onChange={(e) => onEdit({ config: { ...node.config, subject: e.target.value } })}
          />
        )}
        {node.type === 'create_task' && (
          <input
            className="text-xs text-gray-500 w-full bg-transparent border-none outline-none focus:ring-0 p-0 mt-1"
            placeholder="Título de la tarea..."
            value={(node.config.title as string) ?? ''}
            onChange={(e) => onEdit({ config: { ...node.config, title: e.target.value } })}
          />
        )}
        {node.type === 'wait' && (
          <div className="flex items-center gap-1 mt-1">
            <input
              type="number"
              min={1}
              className="text-xs text-gray-500 w-16 bg-transparent border-b border-gray-200 outline-none p-0"
              value={(node.config.hours as number) ?? 24}
              onChange={(e) => onEdit({ config: { ...node.config, hours: Number(e.target.value) } })}
            />
            <span className="text-xs text-gray-400">horas</span>
          </div>
        )}
        {node.type === 'notify' && (
          <input
            className="text-xs text-gray-500 w-full bg-transparent border-none outline-none focus:ring-0 p-0 mt-1"
            placeholder="Mensaje de notificación..."
            value={(node.config.message as string) ?? ''}
            onChange={(e) => onEdit({ config: { ...node.config, message: e.target.value } })}
          />
        )}
      </div>
      <button onClick={onDelete} className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

export default function WorkflowBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addingNode, setAddingNode] = useState(false)
  const router = useRouter()

  const fetchWorkflow = useCallback(async () => {
    try {
      const data = await api.get<Workflow>(`/api/workflows/${id}`)
      setWorkflow(data)
    } catch {
      toast.error('Workflow no encontrado')
      router.push('/dashboard/automations')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { fetchWorkflow() }, [fetchWorkflow])

  const save = async () => {
    if (!workflow) return
    setSaving(true)
    try {
      await api.patch(`/api/workflows/${id}`, {
        name: workflow.name,
        description: workflow.description,
        trigger: workflow.triggerJson,
        nodes: workflow.nodesJson,
      })
      toast.success('Workflow guardado')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async () => {
    if (!workflow) return
    try {
      const updated = await api.post<Workflow>(`/api/workflows/${id}/toggle`, {})
      setWorkflow(prev => prev ? { ...prev, active: updated.active } : prev)
      toast.success(updated.active ? 'Workflow activado' : 'Workflow pausado')
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  const addNode = (type: WorkflowNode['type'], label: string) => {
    const newNode: WorkflowNode = { id: generateId(), type, label, config: {} }
    setWorkflow(prev => prev ? { ...prev, nodesJson: [...prev.nodesJson, newNode] } : prev)
    setAddingNode(false)
  }

  const updateNode = (nodeId: string, updates: Partial<WorkflowNode>) => {
    setWorkflow(prev => prev ? {
      ...prev,
      nodesJson: prev.nodesJson.map(n => n.id === nodeId ? { ...n, ...updates } : n),
    } : prev)
  }

  const deleteNode = (nodeId: string) => {
    setWorkflow(prev => prev ? {
      ...prev,
      nodesJson: prev.nodesJson.filter(n => n.id !== nodeId),
    } : prev)
  }

  if (loading || !workflow) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">Cargando...</div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4">
        <button onClick={() => router.push('/dashboard/automations')} className="text-gray-400 hover:text-gray-700">
          <ChevronLeft size={20} />
        </button>
        <input
          className="font-semibold text-gray-900 text-base bg-transparent border-none outline-none flex-1 max-w-xs"
          value={workflow.name}
          onChange={(e) => setWorkflow(prev => prev ? { ...prev, name: e.target.value } : prev)}
        />
        <div className="flex items-center gap-2 ml-auto">
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            workflow.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${workflow.active ? 'bg-green-500' : 'bg-gray-400'}`} />
            {workflow.active ? 'Activo' : 'Inactivo'}
          </div>
          <button
            onClick={toggleActive}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              workflow.active
                ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            {workflow.active ? <><Pause size={14} /> Pausar</> : <><Play size={14} /> Activar</>}
          </button>
          <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-1.5 disabled:opacity-60">
            <Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-md mx-auto space-y-2">
            {/* Trigger block */}
            <div className="bg-brand-500 text-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={16} />
                <span className="text-sm font-semibold">Disparador</span>
              </div>
              <select
                value={workflow.triggerJson.type}
                onChange={(e) => setWorkflow(prev => prev ? {
                  ...prev,
                  triggerJson: { ...prev.triggerJson, type: e.target.value },
                } : prev)}
                className="w-full bg-white/20 text-white text-sm rounded-lg px-3 py-2 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                {TRIGGER_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} className="text-gray-900 bg-white">{o.label}</option>
                ))}
              </select>
            </div>

            {/* Connector */}
            {workflow.nodesJson.length > 0 && (
              <div className="flex justify-center py-1">
                <div className="w-px h-4 bg-gray-300" />
              </div>
            )}

            {/* Action nodes */}
            {workflow.nodesJson.map((node, idx) => (
              <div key={node.id}>
                <NodeCard
                  node={node}
                  onDelete={() => deleteNode(node.id)}
                  onEdit={(updates) => updateNode(node.id, updates)}
                />
                {idx < workflow.nodesJson.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="w-px h-4 bg-gray-300" />
                  </div>
                )}
              </div>
            ))}

            {/* Add node */}
            <div className="flex justify-center py-2">
              <div className="flex flex-col items-center gap-2">
                {workflow.nodesJson.length > 0 && <div className="w-px h-4 bg-gray-300" />}
                {addingNode ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm w-72">
                    <p className="text-xs font-semibold text-gray-500 mb-3">Elegí una acción</p>
                    <div className="grid grid-cols-2 gap-2">
                      {NODE_TYPES.map(({ type, label, icon: Icon, color }) => (
                        <button
                          key={type}
                          onClick={() => addNode(type as WorkflowNode['type'], label)}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all hover:scale-105 ${color}`}
                        >
                          <Icon size={14} /> {label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setAddingNode(false)}
                      className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingNode(true)}
                    className="w-8 h-8 bg-white border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center text-gray-400 hover:border-brand-400 hover:text-brand-500 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-64 flex-shrink-0 bg-white border-l border-gray-100 p-5 overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Configuración</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
              <input
                className="input text-sm"
                value={workflow.name}
                onChange={(e) => setWorkflow(prev => prev ? { ...prev, name: e.target.value } : prev)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
              <textarea
                className="input text-sm resize-none"
                rows={3}
                value={workflow.description ?? ''}
                onChange={(e) => setWorkflow(prev => prev ? { ...prev, description: e.target.value } : prev)}
              />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Resumen</h3>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Acciones</span>
                <span className="font-medium">{workflow.nodesJson.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Estado</span>
                <span className={`font-medium ${workflow.active ? 'text-green-600' : 'text-gray-400'}`}>
                  {workflow.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
