'use client'

import { useEffect, useState, use } from 'react'
import { api } from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'
import {
  ArrowLeft, MoreVertical, Pencil, Calendar,
  DollarSign, User, TrendingUp, CheckCircle2,
  MessageSquare, Mail, PhoneOutgoing
} from 'lucide-react'
import type { Deal, ActivityType } from '@crm/types'
import { useRouter } from 'next/navigation'
import { DealFormModal } from '@/components/deals/deal-form-modal'
import { ActivityFeed } from '@/components/contacts/activity-feed'
import { AddActivityModal } from '@/components/contacts/add-activity-modal'
import { toast } from 'sonner'

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-50 text-blue-700 border-blue-100',
  WON: 'bg-green-50 text-green-700 border-green-100',
  LOST: 'bg-red-50 text-red-700 border-red-100',
}
const STATUS_LABELS: Record<string, string> = { OPEN: 'Abierto', WON: 'Ganado', LOST: 'Perdido' }

export default function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('timeline')
  const [activityRefreshKey, setActivityRefreshKey] = useState(0)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [activityModal, setActivityModal] = useState<{ open: boolean; type: ActivityType }>({ open: false, type: 'NOTE' })
  const router = useRouter()

  const fetchDeal = async () => {
    try {
      const res = await api.get<Deal>(`/api/deals/${id}`)
      setDeal(res)
    } catch {
      toast.error('No se pudo cargar el deal')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDeal() }, [id])

  const openActivity = (type: ActivityType) => setActivityModal({ open: true, type })

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando deal...</div>
  if (!deal) return <div className="p-8 text-center text-red-500">Deal no encontrado</div>

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{deal.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`badge border ${STATUS_COLORS[deal.status]}`}>{STATUS_LABELS[deal.status]}</span>
              <span className="badge bg-gray-100 text-gray-600 border-gray-200">{deal.stage}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary px-3 py-1.5"><MoreVertical size={16} /></button>
            <button onClick={() => setEditModalOpen(true)} className="btn-primary px-4 py-1.5 flex items-center gap-1.5">
              <Pencil size={14} /> Editar
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-3 pt-2">
          <button onClick={() => openActivity('NOTE')} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
            <MessageSquare size={16} className="text-gray-400" /> Nota
          </button>
          <button onClick={() => openActivity('EMAIL')} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
            <Mail size={16} className="text-gray-400" /> Email
          </button>
          <button onClick={() => openActivity('CALL')} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
            <PhoneOutgoing size={16} className="text-gray-400" /> Llamada
          </button>
          <button onClick={() => openActivity('MEETING')} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
            <Calendar size={16} className="text-gray-400" /> Reunión
          </button>
          <button onClick={() => openActivity('TASK')} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
            <CheckCircle2 size={16} className="text-gray-400" /> Tarea
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Tabs */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex border-b border-gray-200 bg-white px-6">
            {['Timeline', 'Archivos'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.toLowerCase()
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'timeline' && (
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Historial de actividades</h3>
                <ActivityFeed dealId={id} refreshKey={activityRefreshKey} />
              </div>
            )}
            {activeTab === 'archivos' && (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm italic">
                Archivos próximamente...
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto p-6 space-y-8 hidden xl:block">
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Detalles del deal</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><DollarSign size={16} /></div>
                <div>
                  <p className="text-xs text-gray-500">Valor</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {deal.amount ? formatCurrency(Number(deal.amount), deal.currency) : 'Sin definir'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><TrendingUp size={16} /></div>
                <div>
                  <p className="text-xs text-gray-500">Probabilidad</p>
                  <p className="text-sm font-medium text-gray-900">{deal.probability != null ? `${deal.probability}%` : '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Calendar size={16} /></div>
                <div>
                  <p className="text-xs text-gray-500">Fecha de cierre</p>
                  <p className="text-sm font-medium text-gray-900">{deal.closeDate ? formatDate(deal.closeDate) : '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><User size={16} /></div>
                <div>
                  <p className="text-xs text-gray-500">Creado</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(deal.createdAt)}</p>
                </div>
              </div>
            </div>
          </section>

          {deal.notes && (
            <section className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Notas</h3>
              <p className="text-xs text-gray-600">{deal.notes}</p>
            </section>
          )}
        </div>
      </div>

      <DealFormModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => { setEditModalOpen(false); fetchDeal() }}
        deal={deal}
      />

      <AddActivityModal
        isOpen={activityModal.open}
        onClose={() => setActivityModal(prev => ({ ...prev, open: false }))}
        onSuccess={() => {
          setActivityModal(prev => ({ ...prev, open: false }))
          setActivityRefreshKey(k => k + 1)
        }}
        contactId={deal.contactId ?? ''}
        dealId={id}
        defaultType={activityModal.type}
      />
    </div>
  )
}
