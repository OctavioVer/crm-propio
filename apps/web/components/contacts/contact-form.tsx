'use client'

import React, { useState } from 'react'
import { Plus, Trash2, User, Building2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { Contact } from '@crm/types'

interface ContactFormProps {
  contact?: Contact
  onSuccess: () => void
  onCancel: () => void
}

export function ContactForm({ contact, onSuccess, onCancel }: ContactFormProps) {
  const isEdit = !!contact
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<'PERSON' | 'COMPANY'>(contact?.type ?? 'PERSON')
  const [firstName, setFirstName] = useState(contact?.firstName ?? '')
  const [lastName, setLastName] = useState(contact?.lastName ?? '')
  const [companyName, setCompanyName] = useState(contact?.companyName ?? '')
  const [notes, setNotes] = useState(contact?.notes ?? '')
  const [emails, setEmails] = useState(
    contact?.emails?.length ? contact.emails.map(e => ({ email: e.email, isPrimary: e.isPrimary })) : [{ email: '', isPrimary: true }]
  )
  const [phones, setPhones] = useState(
    contact?.phones?.length ? contact.phones.map(p => ({ phone: p.phone, type: p.type })) : [{ phone: '', type: 'MOBILE' }]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        type,
        firstName: type === 'PERSON' ? firstName : undefined,
        lastName: type === 'PERSON' ? lastName : undefined,
        companyName: companyName || undefined,
        notes: notes || undefined,
        emails: emails.filter(e => e.email),
        phones: phones.filter(p => p.phone),
      }
      if (isEdit) {
        await api.patch(`/api/contacts/${contact.id}`, payload)
      } else {
        await api.post('/api/contacts', payload)
      }
      onSuccess()
    } catch {
      alert('Error al guardar el contacto. Revisá los datos.')
    } finally {
      setLoading(false)
    }
  }

  const addEmail = () => setEmails([...emails, { email: '', isPrimary: false }])
  const removeEmail = (index: number) => setEmails(emails.filter((_, i) => i !== index))
  const updateEmail = (index: number, val: string) => {
    const updated = [...emails]
    updated[index].email = val
    setEmails(updated)
  }

  const addPhone = () => setPhones([...phones, { phone: '', type: 'MOBILE' }])
  const removePhone = (index: number) => setPhones(phones.filter((_, i) => i !== index))
  const updatePhone = (index: number, val: string) => {
    const updated = [...phones]
    updated[index].phone = val.replace(/\D/g, '')
    setPhones(updated)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex p-1 bg-gray-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setType('PERSON')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            type === 'PERSON' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <User size={16} /> Persona
        </button>
        <button
          type="button"
          onClick={() => setType('COMPANY')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            type === 'COMPANY' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building2 size={16} /> Empresa
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {type === 'PERSON' ? (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase">Nombre</label>
              <input required className="input" placeholder="Ej. Juan" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase">Apellido</label>
              <input className="input" placeholder="Ej. Pérez" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase">Empresa (Opcional)</label>
              <input className="input" placeholder="Nombre de la empresa" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
          </>
        ) : (
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase">Nombre de la Empresa</label>
            <input required className="input" placeholder="Ej. Acme Corp" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-500 uppercase">Emails</label>
          <button type="button" onClick={addEmail} className="text-brand-600 hover:text-brand-700 text-xs font-medium flex items-center gap-1">
            <Plus size={14} /> Agregar
          </button>
        </div>
        {emails.map((e, i) => (
          <div key={i} className="flex gap-2">
            <input type="email" className="input" placeholder="email@ejemplo.com" value={e.email} onChange={(ev) => updateEmail(i, ev.target.value)} />
            {emails.length > 1 && (
              <button type="button" onClick={() => removeEmail(i)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-500 uppercase">Teléfonos</label>
          <button type="button" onClick={addPhone} className="text-brand-600 hover:text-brand-700 text-xs font-medium flex items-center gap-1">
            <Plus size={14} /> Agregar
          </button>
        </div>
        {phones.map((p, i) => (
          <div key={i} className="flex gap-2">
            <input className="input" placeholder="Ej. 5491112345678" value={p.phone} onChange={(ev) => updatePhone(i, ev.target.value)} />
            {phones.length > 1 && (
              <button type="button" onClick={() => removePhone(i)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-500 uppercase">Notas internas</label>
        <textarea className="input resize-none" rows={3} placeholder="Información adicional sobre este contacto..." value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={loading} className="btn-primary min-w-[100px] justify-center">
          {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear contacto'}
        </button>
      </div>
    </form>
  )
}
