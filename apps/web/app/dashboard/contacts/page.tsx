'use client'

import { useEffect, useState, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatDate, getInitials } from '@/lib/utils'
import { Plus, Search, Mail, Phone, MoreHorizontal, Download } from 'lucide-react'
import type { Contact, PaginatedResponse } from '@crm/types'
import { Modal } from '@/components/ui/modal'
import { ContactForm } from '@/components/contacts/contact-form'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { downloadCsv } from '@/lib/csv'

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()

  const fetchContacts = useCallback(async (q = '', page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (q) params.set('search', q)
      const res = await api.get<PaginatedResponse<Contact>>(`/api/contacts?${params}`)
      setContacts(res.data)
      setMeta({ total: res.meta.total, page: res.meta.page, totalPages: res.meta.totalPages })
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => fetchContacts(search), 300)
    return () => clearTimeout(timeout)
  }, [search, fetchContacts])

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

  return (
    <div>
      <Header title="Contactos" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-5 gap-4">
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
            <button onClick={handleExport} className="btn-secondary"><Download size={16} /> Exportar</button>
            <button onClick={() => setIsModalOpen(true)} className="btn-primary"><Plus size={16} /> Nuevo contacto</button>
          </div>
        </div>

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
                      {search ? 'Sin resultados' : 'Sin contactos aún. ¡Crea el primero!'}
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
                          <button className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                            <MoreHorizontal size={16} />
                          </button>
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
                <button disabled={meta.page === 1} onClick={() => fetchContacts(search, meta.page - 1)} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Anterior</button>
                <span className="text-sm text-gray-600">{meta.page} / {meta.totalPages}</span>
                <button disabled={meta.page === meta.totalPages} onClick={() => fetchContacts(search, meta.page + 1)} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Siguiente</button>
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
            fetchContacts(search)
            toast.success('Contacto creado')
          }}
        />
      </Modal>
    </div>
  )
}
