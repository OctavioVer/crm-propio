'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { Plus, Trash2, ChevronLeft, GripVertical, Save, GitBranch } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Stage {
  id: string
  name: string
  order: number
  color: string
}

interface Pipeline {
  id: string
  name: string
  isDefault: boolean
  stages: Stage[]
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6']

const generateId = () => Math.random().toString(36).slice(2, 9)

export default function PipelinesSettingsPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [newPipelineName, setNewPipelineName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    api.get<Pipeline[]>('/api/pipelines')
      .then(data => {
        setPipelines(data)
        setActivePipelineId(data.find(p => p.isDefault)?.id ?? data[0]?.id ?? null)
      })
      .catch(() => toast.error('Error al cargar pipelines'))
      .finally(() => setLoading(false))
  }, [])

  const activePipeline = pipelines.find(p => p.id === activePipelineId)

  const updateStages = (stages: Stage[]) => {
    setPipelines(prev => prev.map(p => p.id === activePipelineId ? { ...p, stages } : p))
  }

  const addStage = () => {
    if (!activePipeline) return
    const newStage: Stage = {
      id: generateId(),
      name: 'Nueva etapa',
      order: activePipeline.stages.length,
      color: COLORS[activePipeline.stages.length % COLORS.length],
    }
    updateStages([...activePipeline.stages, newStage])
  }

  const updateStage = (stageId: string, updates: Partial<Stage>) => {
    if (!activePipeline) return
    updateStages(activePipeline.stages.map(s => s.id === stageId ? { ...s, ...updates } : s))
  }

  const deleteStage = (stageId: string) => {
    if (!activePipeline) return
    if (activePipeline.stages.length <= 1) { toast.error('El pipeline debe tener al menos una etapa'); return }
    updateStages(activePipeline.stages.filter(s => s.id !== stageId).map((s, i) => ({ ...s, order: i })))
  }

  const moveStage = (index: number, direction: 'up' | 'down') => {
    if (!activePipeline) return
    const stages = [...activePipeline.stages]
    const swap = direction === 'up' ? index - 1 : index + 1
    if (swap < 0 || swap >= stages.length) return
    ;[stages[index], stages[swap]] = [stages[swap], stages[index]]
    updateStages(stages.map((s, i) => ({ ...s, order: i })))
  }

  const savePipeline = async () => {
    if (!activePipeline) return
    if (activePipeline.stages.some(s => !s.name.trim())) {
      toast.error('Todas las etapas deben tener nombre')
      return
    }
    setSaving(true)
    try {
      await api.patch(`/api/pipelines/${activePipeline.id}`, {
        name: activePipeline.name,
        stages: activePipeline.stages,
      })
      toast.success('Pipeline guardado')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const createPipeline = async () => {
    if (!newPipelineName.trim()) return
    try {
      const pipeline = await api.post<Pipeline>('/api/pipelines', {
        name: newPipelineName.trim(),
        stages: [
          { id: generateId(), name: 'Lead', order: 0, color: '#6366f1' },
          { id: generateId(), name: 'Propuesta', order: 1, color: '#8b5cf6' },
          { id: generateId(), name: 'Negociación', order: 2, color: '#f59e0b' },
          { id: generateId(), name: 'Cerrado', order: 3, color: '#10b981' },
        ],
      })
      setPipelines(prev => [...prev, pipeline])
      setActivePipelineId(pipeline.id)
      setNewPipelineName('')
      setCreating(false)
      toast.success('Pipeline creado')
    } catch {
      toast.error('Error al crear pipeline')
    }
  }

  const deletePipeline = async (id: string) => {
    if (!confirm('¿Eliminar este pipeline? Los deals asociados perderán su referencia.')) return
    try {
      await api.delete(`/api/pipelines/${id}`)
      const remaining = pipelines.filter(p => p.id !== id)
      setPipelines(remaining)
      setActivePipelineId(remaining[0]?.id ?? null)
      toast.success('Pipeline eliminado')
    } catch (err: any) {
      toast.error(err.message ?? 'Error al eliminar')
    }
  }

  return (
    <div>
      <Header title="Pipelines" />
      <div className="p-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/settings" className="text-gray-400 hover:text-gray-700"><ChevronLeft size={18} /></Link>
          <p className="text-sm text-gray-500">Configurá las etapas de tus pipelines de venta</p>
        </div>

        {loading ? (
          <div className="card p-8 animate-pulse" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pipeline list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pipelines</p>
                <button onClick={() => setCreating(true)} className="text-xs text-brand-600 hover:text-brand-800 font-medium">+ Nuevo</button>
              </div>

              {creating && (
                <div className="mb-2 flex gap-2">
                  <input
                    autoFocus
                    className="input text-sm flex-1"
                    placeholder="Nombre del pipeline"
                    value={newPipelineName}
                    onChange={e => setNewPipelineName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') createPipeline(); if (e.key === 'Escape') setCreating(false) }}
                  />
                  <button onClick={createPipeline} className="btn-primary py-1 px-2 text-xs">OK</button>
                </div>
              )}

              <div className="space-y-1">
                {pipelines.map(p => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${activePipelineId === p.id ? 'bg-brand-50 border border-brand-200' : 'hover:bg-gray-50 border border-transparent'}`}
                    onClick={() => setActivePipelineId(p.id)}
                  >
                    <GitBranch size={14} className={activePipelineId === p.id ? 'text-brand-500' : 'text-gray-400'} />
                    <span className={`text-sm flex-1 ${activePipelineId === p.id ? 'font-semibold text-brand-700' : 'text-gray-700'}`}>{p.name}</span>
                    {p.isDefault && <span className="text-[10px] bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded-full font-medium">Default</span>}
                    {!p.isDefault && (
                      <button
                        onClick={e => { e.stopPropagation(); deletePipeline(p.id) }}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Stage editor */}
            <div className="md:col-span-2">
              {activePipeline ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <input
                      className="font-semibold text-gray-900 text-sm bg-transparent border-none outline-none focus:ring-0 p-0"
                      value={activePipeline.name}
                      onChange={e => setPipelines(prev => prev.map(p => p.id === activePipelineId ? { ...p, name: e.target.value } : p))}
                    />
                    <button onClick={savePipeline} disabled={saving} className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-60">
                      <Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {activePipeline.stages.sort((a, b) => a.order - b.order).map((stage, idx) => (
                      <div key={stage.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl">
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => moveStage(idx, 'up')} disabled={idx === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs leading-none">▲</button>
                          <GripVertical size={14} className="text-gray-300" />
                          <button onClick={() => moveStage(idx, 'down')} disabled={idx === activePipeline.stages.length - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs leading-none">▼</button>
                        </div>
                        <input
                          type="color"
                          value={stage.color}
                          onChange={e => updateStage(stage.id, { color: e.target.value })}
                          className="w-7 h-7 rounded-lg border border-gray-200 cursor-pointer flex-shrink-0"
                        />
                        <input
                          className="flex-1 text-sm font-medium text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0"
                          value={stage.name}
                          onChange={e => updateStage(stage.id, { name: e.target.value })}
                        />
                        <span className="text-xs text-gray-400 w-4 text-center">{idx + 1}</span>
                        <button onClick={() => deleteStage(stage.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}

                    <button onClick={addStage} className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-brand-300 hover:text-brand-500 transition-colors flex items-center justify-center gap-1.5">
                      <Plus size={14} /> Agregar etapa
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-48 text-sm text-gray-400">
                  Seleccioná un pipeline para editar sus etapas
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
