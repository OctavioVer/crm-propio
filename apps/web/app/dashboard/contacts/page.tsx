'use client'

import { useEffect, useState, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatDate, getInitials } from '@/lib/utils'
import { Plus, Search, Mail, Phone, MoreHorizontal, Download, SlidersHorizontal, X, Upload, Bookmark, BookmarkCheck } from 'lucide-react'
import type { Contact, PaginatedResponse } from '@crm/types'
import { Modal } from '@/components/ui/modal'
import { ContactForm } from '@/components/contacts/contact-form'
import { ImportContactsModal } from '@/components/contacts/import-contacts-modal'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { downloadCsv } from '@/lib/csv'

interface Segment { id: string; name: string; filterJson: Record<string, unknown>; contactCount?: number }

interface Filters {
  stage: string
  type: string
  scoreMin: string
  scoreMax: string
  tag: string
}

const EMPTY_FILTERS: Filters = { stage: '', type: '', scoreMin: '', scoreMax: '', tag: '' }

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [segments, setSegments] = useState<Segment[]>([])
  const router = useRouter()

  useEffect(() => {
    api.get<Segment[]>('/api/segments').then(setSegments).catch(() => {})
  }, [])

  const saveSegment = async () => {
    const name = prompt('Nombre del segmento:')
    if (!name?.trim()) return
    try {
      const seg = await api.post<Segment>('/api/segments', { name: name.trim(), filter: filters })
      setSegments(prev => [...prev, seg])
      toast.success(`Segmento "${name}" guardado`)
    } catch { toast.error('Error al guardar segmento') }
  }

  const loadSegment = (seg: Segment) => {
    const f = seg.filterJson as any
    setFilters({
      stage: f.stage ?? '',
      type: f.type ?? '',
      scoreMin: f.scoreMin != null ? String(f.scoreMin) : '',
      scoreMax: f.scoreMax != null ? String(f.scoreMax) : '',
      tag: f.tag ?? '',
    })
    setShowFilters(true)
  }

  const deleteSegment = async (id: string) => {
    await api.delete(`/api/segments/${id}`)
    setSegments(prev => prev.filter(s => s.id !== id))
    toast.success('Segmento eliminado')
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const fetchContacts = useCallback(async (q = '', page = 1, f: Filters = EMPTY_FILTERS) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (q) params.set('search', q)
      if (f.stage) params.set('stage', f.stage)
      if (f.type) params.set('type', f.type)
      if (f.scoreMin) params.set('scoreMin', f.scoreMin)
      if (f.scoreMax) params.set('scoreMax', f.scoreMax)
      if (f.tag) params.set('tag', f.tag)
      const res = await api.get<PaginatedResponse<Contact>>(`/api/contacts?${params}`)
      setContacts(res.data)
      setMeta({ total: res.meta.total, page: res.meta.page, totalPages: res.meta.totalPages })
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => fetchContacts(search, 1, filters), 300)
    return () => clearTimeout(timeout)
  }, [search, filters, fetchContacts])

  const toggleSelectAll = () => {
    if (selectedIds.length === contacts.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(contacts.map(c => c.id))
    }
  }

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleExport = async () => {
    try {
      const res = await api.get<PaginatedResponse<Contact>>(`/api/contacts?limit=1000`)
      const rows = res.data.map(c => ({
        Nombre: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.companyName || '',
        Tipo: c.type,
        Email: c.emails?.find(e => e.isPrimary)?.email ?? c.emails?.[0]?.email ?? '',
        Teléfono: c.phones?.[0]?.phone ?? '',
        Etapa: c.stage ?? '',
        Score: c.score,
        Tags: c.tags?.join(', ') ?? '',
        Creado: formatDate(c.createdAt),
      }))
      downloadCsv(`contactos-${new Date().toISOString().slice(0, 10)}.csv`, rows)
      toast.success(`${rows.length} contactos exportados`)
    } catch {
      toast.error('Error al exportar contactos')
    }
  }

  const clearFilters = () => setFilters(EMPTY_FILTERS)

  return (
    <div>
      <Header title="Contactos" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar contactos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`btn-secondary flex items-center gap-1.5 ${activeFilterCount > 0 ? 'border-brand-300 text-brand-600 bg-brand-50' : ''}`}
            >
              <SlidersHorizontal size={15} />
              Filtros
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button onClick={() => setIsImportOpen(true)} className="btn-secondary"><Upload size={16} /> Importar CSV</button>
            <button onClick={handleExport} className="btn-secondary"><Download size={16} /> Exportar</button>
            <button onClick={() => setIsModalOpen(true)} className="btn-primary"><Plus size={16} /> Nuevo contacto</button>
          </div>
        </div>

        {/* Advanced filters panel */}
        {showFilters && (
          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <select className="input text-sm py-1.5" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
                <option value="">Todos</option>
                <option value="PERSON">Persona</option>
                <option value="COMPANY">Empresa</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Etapa</label>
              <input className="input text-sm py-1.5 w-32" placeholder="Ej: Lead" value={filters.stage} onChange={e => setFilters(f => ({ ...f, stage: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tag</label>
              <input className="input text-sm py-1.5 w-32" placeholder="Ej: VIP" value={filters.tag} onChange={e => setFilters(f => ({ ...f, tag: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Score mín</label>
              <input type="number" min={0} max={100} className="input text-sm py-1.5 w-20" placeholder="0" value={filters.scoreMin} onChange={e => setFilters(f => ({ ...f, scoreMin: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Score máx</label>
              <input type="number" min={0} max={100} className="input text-sm py-1.5 w-20" placeholder="100" value={filters.scoreMax} onChange={e => setFilters(f => ({ ...f, scoreMax: e.target.value }))} />
            </div>
            {activeFilterCount > 0 && (
              <>
                <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 mt-auto pb-1.5">
                  <X size={14} /> Limpiar
                </button>
                <button onClick={saveSegment} className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800 mt-auto pb-1.5 font-medium">
                  <Bookmark size={14} /> Guardar segmento
                </button>
              </>
            )}
          </div>
        )}

        {segments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-400 flex items-center gap-1 mr-1"><BookmarkCheck size={12} /> Segmentos:</span>
            {segments.map(seg => (
              <div key={seg.id} className="flex items-center gap-1 bg-brand-50 border border-brand-100 rounded-full px-2.5 py-0.5">
                <button onClick={() => loadSegment(seg)} className="text-xs text-brand-700 font-medium hover:text-brand-900">{seg.name}</button>
                <button onClick={() => deleteSegment(seg.id)} className="text-brand-300 hover:text-red-500 ml-0.5">×</button>
              </div>
            ))}
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <TableSkeleton rows={8} cols={7} />
            ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      checked={selectedIds.length === contacts.length && contacts.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Teléfono</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden xl:table-cell">Etapa</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden xl:table-cell">Score</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Creado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                      {search || activeFilterCount > 0 ? 'Sin resultados para los filtros aplicados' : 'Sin contactos aún. ¡Crea el primero!'}
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => {
                    const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.companyName || 'Sin nombre'
                    const primaryEmail = contact.emails?.find((e) => e.isPrimary)?.email ?? contact.emails?.[0]?.email
                    const primaryPhone = contact.phones?.[0]?.phone
                    const isSelected = selectedIds.includes(contact.id)
                    return (
                      <tr
                        key={contact.id}
                        className={`border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer group ${isSelected ? 'bg-brand-50/30' : ''}`}
                        onClick={() => router.push(`/dashboard/contacts/${contact.id}`)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(contact.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 group-hover:bg-brand-200 transition-colors">
                              {getInitials(fullName)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{fullName}</p>
                              {contact.companyName && contact.type === 'PERSON' && (
                                <p className="text-xs text-gray-500">{contact.companyName}</p>
                              )}
                              {contact.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {contact.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">{tag}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {primaryEmail ? (
                            <span className="flex items-center gap-1.5 text-gray-600">
                              <Mail size={13} />{primaryEmail}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-gray-600">
                          {primaryPhone ? <span className="flex items-center gap-1.5"><Phone size={13} />{primaryPhone}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          {contact.stage ? (
                            <span className="badge bg-brand-50 text-brand-700 border border-brand-100">
                              {contact.stage}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full max-w-16">
                              <div className="h-1.5 bg-brand-500 rounded-full" style={{ width: `${contact.score}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{contact.score}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">{formatDate(contact.createdAt)}</td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            )}
          </div>
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-sm text-gray-500">{meta.total} contactos</p>
              <div className="flex items-center gap-2">
                <button disabled={meta.page === 1} onClick={() => fetchContacts(search, meta.page - 1, filters)} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Anterior</button>
                <span className="text-sm text-gray-600">{meta.page} / {meta.totalPages}</span>
                <button disabled={meta.page === meta.totalPages} onClick={() => fetchContacts(search, meta.page + 1, filters)} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Siguiente</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear nuevo contacto"
        maxWidth="max-w-xl"
      >
        <ContactForm
          onCancel={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false)
            fetchContacts(search, 1, filters)
            toast.success('Contacto creado')
          }}
        />
      </Modal>

      <ImportContactsModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => fetchContacts(search, 1, filters)}
      />

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl">
          <span className="text-sm font-medium">{selectedIds.length} seleccionado{selectedIds.length > 1 ? 's' : ''}</span>
          <div className="w-px h-4 bg-gray-600" />
          <button
            onClick={async () => {
              const tag = prompt('Agregar tag:')
              if (!tag?.trim()) return
              await api.post('/api/contacts/bulk', { ids: selectedIds, action: 'add_tag', value: tag.trim() })
              toast.success(`Tag "${tag}" agregado a ${selectedIds.length} contactos`)
              setSelectedIds([])
              fetchContacts(search, 1, filters)
            }}
            className="text-sm hover:text-brand-300 transition-colors"
          >
            Agregar tag
          </button>
          <button
            onClick={async () => {
              const stage = prompt('Nueva etapa:')
              if (!stage?.trim()) return
              await api.post('/api/contacts/bulk', { ids: selectedIds, action: 'set_stage', value: stage.trim() })
              toast.success(`Etapa actualizada`)
              setSelectedIds([])
              fetchContacts(search, 1, filters)
            }}
            className="text-sm hover:text-brand-300 transition-colors"
          >
            Cambiar etapa
          </button>
          <button
            onClick={async () => {
              if (!confirm(`¿Eliminar ${selectedIds.length} contactos? Esta acción no se puede deshacer.`)) return
              await api.post('/api/contacts/bulk', { ids: selectedIds, action: 'delete' })
              toast.success(`${selectedIds.length} contactos eliminados`)
              setSelectedIds([])
              fetchContacts(search, 1, filters)
            }}
            className="text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Eliminar
          </button>
          <div className="w-px h-4 bg-gray-600" />
          <button onClick={() => setSelectedIds([])} className="text-gray-400 hover:text-white transition-colors text-sm">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
