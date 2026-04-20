'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { Sparkles, Loader2, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'

interface AiPanelProps {
  contactId: string
}

interface NBA {
  action: string
  reason: string
}

export function AiPanel({ contactId }: AiPanelProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [nba, setNba] = useState<NBA | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [loadingNba, setLoadingNba] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const handleSummary = async () => {
    setLoadingSummary(true)
    try {
      const res = await api.post<{ summary: string }>(`/api/contacts/${contactId}/summary`)
      setSummary(res.summary)
    } catch (err: any) {
      toast.error(err.message ?? 'Error al generar resumen AI')
    } finally {
      setLoadingSummary(false)
    }
  }

  const handleNba = async () => {
    setLoadingNba(true)
    try {
      const res = await api.get<NBA>(`/api/contacts/${contactId}/nba`)
      setNba(res)
    } catch {
      toast.error('Error al obtener sugerencia')
    } finally {
      setLoadingNba(false)
    }
  }

  return (
    <section className="border border-brand-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-brand-50/60 hover:bg-brand-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-brand-500" />
          <span className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Asistente AI</span>
        </div>
        {expanded ? <ChevronUp size={14} className="text-brand-400" /> : <ChevronDown size={14} className="text-brand-400" />}
      </button>

      {expanded && (
        <div className="p-4 bg-white space-y-4">
          {/* NBA */}
          {nba ? (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Lightbulb size={13} className="text-amber-500" />
                <span className="text-xs font-semibold text-amber-700">Próxima acción sugerida</span>
              </div>
              <p className="text-sm font-medium text-gray-900">{nba.action}</p>
              <p className="text-xs text-gray-500 mt-0.5">{nba.reason}</p>
            </div>
          ) : (
            <button
              onClick={handleNba}
              disabled={loadingNba}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              {loadingNba ? <Loader2 size={12} className="animate-spin" /> : <Lightbulb size={12} />}
              {loadingNba ? 'Analizando...' : 'Sugerir próxima acción'}
            </button>
          )}

          {/* AI Summary */}
          {summary ? (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles size={12} className="text-brand-500" />
                <span className="text-xs font-semibold text-brand-700">Resumen ejecutivo</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{summary}</p>
              <button
                onClick={handleSummary}
                disabled={loadingSummary}
                className="mt-2 text-xs text-brand-500 hover:text-brand-700 font-medium"
              >
                Regenerar
              </button>
            </div>
          ) : (
            <button
              onClick={handleSummary}
              disabled={loadingSummary}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-brand-700 bg-brand-50 border border-brand-100 rounded-lg hover:bg-brand-100 transition-colors disabled:opacity-50"
            >
              {loadingSummary ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {loadingSummary ? 'Generando resumen...' : 'Generar resumen con AI'}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
