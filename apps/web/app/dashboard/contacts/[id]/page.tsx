'use client'

import { useEffect, useState, use } from 'react'
import { api } from '@/lib/api'
import { formatDate, getInitials } from '@/lib/utils'
import {
  Mail, Phone, Building2, Calendar, Tag,
  MoreVertical, ArrowLeft, MessageSquare,
  PhoneOutgoing, FileText, CheckCircle2, User, Pencil, RefreshCw
} from 'lucide-react'
import type { Contact, ActivityType } from '@crm/types'
import { useRouter } from 'next/navigation'
import { ActivityFeed } from '@/components/contacts/activity-feed'
import { AddActivityModal } from '@/components/contacts/add-activity-modal'
import { SendEmailModal } from '@/components/contacts/send-email-modal'
import { AiPanel } from '@/components/contacts/ai-panel'
import { Modal } from '@/components/ui/modal'
import { ContactForm } from '@/components/contacts/contact-form'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('timeline')
  const [activityRefreshKey, setActivityRefreshKey] = useState(0)
  const [activityModal, setActivityModal] = useState<{ open: boolean; type: ActivityType }>({ open: false, type: 'NOTE' })
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [scoringLoading, setScoringLoading] = useState(false)
  const router = useRouter()

  const fetchContact = async () => {
    try {
      const res = await api.get<Contact>(`/api/contacts/${id}`)
      setContact(res)
    } catch {
      toast.error('No se pudo cargar el contacto')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContact()
  }, [id])

  const openActivity = (type: ActivityType) => setActivityModal({ open: true, type })

  const handleRecalculateScore = async () => {
    setScoringLoading(true)
    try {
      const result = await api.post<{ score: number; breakdown: Record<string, number> }>(`/api/contacts/${id}/score`)
      setContact(prev => prev ? { ...prev, score: result.score } : prev)
      toast.success(`Score actualizado: ${result.score}/100`)
    } catch {
      toast.error('No se pudo calcular el score')
    } finally {
      setScoringLoading(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-3 w-24" /></div>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="w-80 bg-white border-l border-gray-200 p-6 space-y-4 hidden xl:block">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 rounded" />)}
        </div>
      </div>
    </div>
  )
  if (!contact) return <div className="p-8 text-center text-red-500 font-medium">Contacto no encontrado</div>

  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.companyName || 'Sin nombre'
  const primaryEmail = contact.emails?.find((e) => e.isPrimary)?.email ?? contact.emails?.[0]?.email
  const primaryPhone = contact.phones?.[0]?.phone

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center font-bold">
              {getInitials(fullName)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{fullName}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                {contact.type === 'COMPANY' ? (
                  <span className="badge bg-blue-50 text-blue-700 border border-blue-100 gap-1">
                    <Building2 size={12} /> Empresa
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">{contact.companyName || 'Persona independiente'}</span>
                )}
                {contact.stage && (
                  <span className="badge bg-brand-50 text-brand-700 border border-brand-100">
                    {contact.stage}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="btn-secondary px-3 py-1.5"><MoreVertical size={16} /></button>
            <button onClick={() => setEditModalOpen(true)} className="btn-primary px-4 py-1.5 flex items-center gap-1.5">
              <Pencil size={14} /> Editar
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-3 pt-2">
          <button onClick={() => openActivity('NOTE')} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200">
            <MessageSquare size={16} className="text-gray-400" /> Nota
          </button>
          <button onClick={() => setEmailModalOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200">
            <Mail size={16} className="text-gray-400" /> Correo
          </button>
          <button onClick={() => openActivity('CALL')} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200">
            <PhoneOutgoing size={16} className="text-gray-400" /> Llamada
          </button>
          <button onClick={() => openActivity('MEETING')} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200">
            <Calendar size={16} className="text-gray-400" /> Reunión
          </button>
          <button onClick={() => openActivity('TASK')} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200">
            <CheckCircle2 size={16} className="text-gray-400" /> Tarea
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Tabs & Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex border-b border-gray-200 bg-white px-6">
            {['Timeline', 'Deals', 'Archivos'].map((tab) => (
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
                <ActivityFeed contactId={id} refreshKey={activityRefreshKey} />
                <div className="relative pl-8 before:absolute before:left-[11px] before:top-0 before:h-4 before:w-0.5 before:bg-gray-200">
                  <div className="relative">
                    <div className="absolute -left-8 top-1 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center ring-4 ring-gray-50">
                      <User size={12} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-900"><span className="font-semibold">Contacto creado</span></p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(contact.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'deals' && (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm italic">
                Deals vinculados próximamente...
              </div>
            )}
            {activeTab === 'archivos' && (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm italic">
                Archivos próximamente...
              </div>
            )}
          </div>
        </div>

        {/* Right: Info Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto p-6 space-y-8 hidden xl:block">
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Información básica</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg text-gray-400 mt-0.5"><Mail size={16} /></div>
                <div>
                  <p className="text-xs text-gray-500">Email principal</p>
                  <p className="text-sm font-medium text-gray-900 break-all">{primaryEmail || 'No asignado'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg text-gray-400 mt-0.5"><Phone size={16} /></div>
                <div>
                  <p className="text-xs text-gray-500">Teléfono</p>
                  <p className="text-sm font-medium text-gray-900">{primaryPhone || 'No asignado'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg text-gray-400 mt-0.5"><Tag size={16} /></div>
                <div>
                  <p className="text-xs text-gray-500">Etiquetas</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {contact.tags?.length ? contact.tags.map(tag => (
                      <span key={tag} className="badge bg-gray-100 text-gray-600 border border-gray-200">{tag}</span>
                    )) : <span className="text-xs text-gray-400 italic">Sin etiquetas</span>}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Propiedades</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-xs text-gray-500">Lead Score</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">{contact.score}/100</span>
                  <button
                    onClick={handleRecalculateScore}
                    disabled={scoringLoading}
                    title="Recalcular score"
                    className="p-0.5 text-gray-400 hover:text-brand-600 transition-colors disabled:opacity-40"
                  >
                    <RefreshCw size={12} className={scoringLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-xs text-gray-500">Tipo</span>
                <span className="text-xs font-medium text-gray-900">{contact.type === 'PERSON' ? 'Persona' : 'Empresa'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-xs text-gray-500">Creado</span>
                <span className="text-xs font-medium text-gray-900">{formatDate(contact.createdAt)}</span>
              </div>
            </div>
          </section>

          <section className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Notas internas</h3>
            <p className="text-xs text-gray-600 italic line-clamp-4">
              {contact.notes || 'No hay notas sobre este contacto todavía.'}
            </p>
            {contact.notes && (
              <button className="text-xs font-semibold text-brand-600 mt-3 flex items-center gap-1 hover:underline">
                <FileText size={12} /> Ver todas
              </button>
            )}
          </section>

          <AiPanel contactId={id} />
        </div>
      </div>

      <AddActivityModal
        isOpen={activityModal.open}
        onClose={() => setActivityModal(prev => ({ ...prev, open: false }))}
        onSuccess={() => {
          setActivityModal(prev => ({ ...prev, open: false }))
          setActivityRefreshKey(k => k + 1)
        }}
        contactId={id}
        defaultType={activityModal.type}
      />

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar contacto" maxWidth="max-w-xl">
        <ContactForm
          contact={contact}
          onCancel={() => setEditModalOpen(false)}
          onSuccess={() => {
            setEditModalOpen(false)
            fetchContact()
            toast.success('Contacto actualizado')
          }}
        />
      </Modal>

      <SendEmailModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSuccess={() => {
          setEmailModalOpen(false)
          setActivityRefreshKey(k => k + 1)
        }}
        contactId={id}
        defaultTo={contact?.emails?.find(e => e.isPrimary)?.email ?? contact?.emails?.[0]?.email}
      />
    </div>
  )
}
