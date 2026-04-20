'use client'

import { useEffect, useState, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Plus, Download } from 'lucide-react'
import { DealFormModal } from '@/components/deals/deal-form-modal'
import { toast } from 'sonner'
import { downloadCsv } from '@/lib/csv'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRouter } from 'next/navigation'

interface DealCard {
  id: string
  title: string
  amount?: number
  currency: string
  probability?: number
  contact?: { firstName?: string; lastName?: string; companyName?: string }
}

interface Stage {
  id: string
  name: string
  color: string
  order: number
  deals: DealCard[]
  total: number
}

interface Pipeline {
  id: string
  name: string
  isDefault: boolean
}

function DraggableDealCard({ deal, onClick }: { deal: DealCard; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="card p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none"
    >
      <p className="font-medium text-gray-900 text-sm mb-1 truncate">{deal.title}</p>
      {deal.contact && (
        <p className="text-xs text-gray-500 mb-2">
          {[deal.contact.firstName, deal.contact.lastName].filter(Boolean).join(' ') || deal.contact.companyName}
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">
          {deal.amount ? formatCurrency(Number(deal.amount), deal.currency) : '—'}
        </span>
        {deal.probability != null && <span className="text-xs text-gray-400">{deal.probability}%</span>}
      </div>
    </div>
  )
}

function StaticDealCard({ deal }: { deal: DealCard }) {
  return (
    <div className="card p-4 shadow-lg rotate-1">
      <p className="font-medium text-gray-900 text-sm truncate">{deal.title}</p>
      <span className="text-sm font-semibold text-gray-900">
        {deal.amount ? formatCurrency(Number(deal.amount), deal.currency) : '—'}
      </span>
    </div>
  )
}

export default function DealsPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [activePipeline, setActivePipeline] = useState<string | null>(null)
  const [kanban, setKanban] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [dealModal, setDealModal] = useState<{ open: boolean; stage?: string }>({ open: false })
  const [draggedDeal, setDraggedDeal] = useState<DealCard | null>(null)
  const router = useRouter()

  const handleExport = () => {
    const allDeals = kanban.flatMap(s => s.deals.map(d => ({
      Título: d.title,
      Etapa: s.name,
      Contacto: d.contact ? [d.contact.firstName, d.contact.lastName].filter(Boolean).join(' ') || d.contact.companyName || '' : '',
      Valor: d.amount ?? '',
      Moneda: d.currency,
      Probabilidad: d.probability != null ? `${d.probability}%` : '',
    })))
    if (!allDeals.length) { toast.error('No hay deals para exportar'); return }
    downloadCsv(`deals-${new Date().toISOString().slice(0, 10)}.csv`, allDeals)
    toast.success(`${allDeals.length} deals exportados`)
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    api.get<Pipeline[]>('/api/pipelines').then((data) => {
      setPipelines(data)
      const def = data.find((p) => p.isDefault) ?? data[0]
      if (def) setActivePipeline(def.id)
    }).catch(() => {})
  }, [])

  const fetchKanban = useCallback(async (pipelineId: string) => {
    setLoading(true)
    try {
      const data = await api.get<Stage[]>(`/api/deals/kanban/${pipelineId}`)
      setKanban(data)
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activePipeline) fetchKanban(activePipeline)
  }, [activePipeline, fetchKanban])

  const handleDragStart = (event: DragStartEvent) => {
    const deal = kanban.flatMap(s => s.deals).find(d => d.id === event.active.id)
    setDraggedDeal(deal ?? null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggedDeal(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const dealId = String(active.id)
    const targetStage = kanban.find(s => s.id === over.id || s.deals.some(d => d.id === over.id))
    if (!targetStage) return

    const sourceStage = kanban.find(s => s.deals.some(d => d.id === dealId))
    if (!sourceStage || sourceStage.id === targetStage.id) return

    setKanban(prev => prev.map(s => {
      if (s.id === sourceStage.id) return { ...s, deals: s.deals.filter(d => d.id !== dealId) }
      if (s.id === targetStage.id) {
        const deal = sourceStage.deals.find(d => d.id === dealId)!
        return { ...s, deals: [...s.deals, deal] }
      }
      return s
    }))

    try {
      await api.patch(`/api/deals/${dealId}/stage`, { stage: targetStage.id })
    } catch {
      toast.error('No se pudo mover el deal')
      if (activePipeline) fetchKanban(activePipeline)
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <Header title="Pipeline de Ventas" />
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {pipelines.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePipeline(p.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  activePipeline === p.id ? 'bg-brand-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="btn-secondary"><Download size={16} /> Exportar</button>
            <button onClick={() => setDealModal({ open: true })} className="btn-primary flex items-center gap-1.5">
              <Plus size={16} /> Nuevo deal
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Cargando pipeline...</div>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
              {kanban.map((stage) => (
                <div key={stage.id} className="flex-shrink-0 w-72 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-sm font-semibold text-gray-700">{stage.name}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{stage.deals.length}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-500">{formatCurrency(stage.total)}</span>
                  </div>

                  <SortableContext items={stage.deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
                    <div
                      id={stage.id}
                      className="flex-1 space-y-2 min-h-16 p-2 -m-2 rounded-xl transition-colors"
                    >
                      {stage.deals.map((deal) => (
                        <DraggableDealCard
                          key={deal.id}
                          deal={deal}
                          onClick={() => router.push(`/dashboard/deals/${deal.id}`)}
                        />
                      ))}
                      <button
                        onClick={() => setDealModal({ open: true, stage: stage.id })}
                        className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus size={14} /> Agregar deal
                      </button>
                    </div>
                  </SortableContext>
                </div>
              ))}
            </div>
            <DragOverlay>
              {draggedDeal && <StaticDealCard deal={draggedDeal} />}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <DealFormModal
        isOpen={dealModal.open}
        onClose={() => setDealModal({ open: false })}
        onSuccess={() => {
          setDealModal({ open: false })
          if (activePipeline) fetchKanban(activePipeline)
        }}
        defaultPipelineId={activePipeline ?? undefined}
        defaultStage={dealModal.stage}
      />
    </div>
  )
}
