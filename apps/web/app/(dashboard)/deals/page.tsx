'use client'

import { useEffect, useState, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Plus } from 'lucide-react'

interface Stage {
  id: string
  name: string
  color: string
  order: number
  deals: any[]
  total: number
}

interface Pipeline {
  id: string
  name: string
}

export default function DealsPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [activePipeline, setActivePipeline] = useState<string | null>(null)
  const [kanban, setKanban] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<any[]>('/api/pipelines').then((data) => {
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

  return (
    <div className="flex flex-col h-screen">
      <Header title="Pipeline de Ventas" />
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        {/* Pipeline selector + actions */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {pipelines.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePipeline(p.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  activePipeline === p.id
                    ? 'bg-brand-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
          <button className="btn-primary">
            <Plus size={16} />
            Nuevo deal
          </button>
        </div>

        {/* Kanban board */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Cargando pipeline...</div>
        ) : (
          <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
            {kanban.map((stage) => (
              <div key={stage.id} className="flex-shrink-0 w-72">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-sm font-semibold text-gray-700">{stage.name}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                      {stage.deals.length}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    {formatCurrency(stage.total)}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {stage.deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
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
                        {deal.probability != null && (
                          <span className="text-xs text-gray-400">{deal.probability}%</span>
                        )}
                      </div>
                    </div>
                  ))}

                  <button className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-1">
                    <Plus size={14} />
                    Agregar deal
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
