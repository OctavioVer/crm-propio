'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Modal } from '@/components/ui/modal'
import type { Deal, Pipeline, Contact } from '@crm/types'
import { toast } from 'sonner'

interface DealFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  deal?: Deal
  defaultPipelineId?: string
  defaultStage?: string
}

export function DealFormModal({ isOpen, onClose, onSuccess, deal, defaultPipelineId, defaultStage }: DealFormModalProps) {
  const isEdit = !!deal
  const [loading, setLoading] = useState(false)
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])

  const [pipelineId, setPipelineId] = useState(deal?.pipelineId ?? defaultPipelineId ?? '')
  const [stage, setStage] = useState(deal?.stage ?? defaultStage ?? '')
  const [title, setTitle] = useState(deal?.title ?? '')
  const [amount, setAmount] = useState(deal?.amount != null ? String(deal.amount) : '')
  const [currency, setCurrency] = useState(deal?.currency ?? 'ARS')
  const [probability, setProbability] = useState(deal?.probability != null ? String(deal.probability) : '')
  const [closeDate, setCloseDate] = useState(deal?.closeDate ? deal.closeDate.slice(0, 10) : '')
  const [contactId, setContactId] = useState(deal?.contactId ?? '')
  const [notes, setNotes] = useState(deal?.notes ?? '')

  useEffect(() => {
    if (!isOpen) return
    api.get<Pipeline[]>('/api/pipelines').then(setPipelines).catch(() => {})
    api.get<{ data: Contact[] }>('/api/contacts?limit=100').then(r => setContacts(r.data)).catch(() => {})
  }, [isOpen])

  const activePipeline = pipelines.find(p => p.id === pipelineId)
  const stages = activePipeline?.stages ?? []

  useEffect(() => {
    if (!pipelineId && pipelines.length) {
      const def = pipelines.find(p => p.isDefault) ?? pipelines[0]
      setPipelineId(def.id)
    }
  }, [pipelines])

  useEffect(() => {
    if (!stage && stages.length) {
      setStage(defaultStage ?? stages[0].id)
    }
  }, [stages])

  const reset = () => {
    setTitle('')
    setAmount('')
    setProbability('')
    setCloseDate('')
    setContactId('')
    setNotes('')
  }

  const handleClose = () => {
    if (!isEdit) reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('El título es requerido'); return }
    if (!pipelineId) { toast.error('Seleccioná un pipeline'); return }
    if (!stage) { toast.error('Seleccioná una etapa'); return }

    setLoading(true)
    try {
      const payload = {
        pipelineId,
        title: title.trim(),
        stage,
        amount: amount ? Number(amount) : undefined,
        currency,
        probability: probability ? Number(probability) : undefined,
        closeDate: closeDate || undefined,
        contactId: contactId || undefined,
        notes: notes.trim() || undefined,
      }
      if (isEdit) {
        await api.patch(`/api/deals/${deal.id}`, payload)
        toast.success('Deal actualizado')
      } else {
        await api.post('/api/deals', payload)
        toast.success('Deal creado')
      }
      if (!isEdit) reset()
      onSuccess()
    } catch {
      toast.error('Error al guardar el deal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEdit ? 'Editar deal' : 'Nuevo deal'} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Título del deal *</label>
          <input className="input" placeholder="Ej. Propuesta empresa XYZ" value={title} onChange={e => setTitle(e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Pipeline</label>
            <select className="input" value={pipelineId} onChange={e => { setPipelineId(e.target.value); setStage('') }}>
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Etapa</label>
            <select className="input" value={stage} onChange={e => setStage(e.target.value)}>
              {stages.sort((a, b) => a.order - b.order).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Valor</label>
            <input className="input" type="number" min="0" step="0.01" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="label">Moneda</label>
            <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Probabilidad (%)</label>
            <input className="input" type="number" min="0" max="100" placeholder="—" value={probability} onChange={e => setProbability(e.target.value)} />
          </div>
          <div>
            <label className="label">Fecha cierre estimada</label>
            <input className="input" type="date" value={closeDate} onChange={e => setCloseDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Contacto vinculado</label>
          <select className="input" value={contactId} onChange={e => setContactId(e.target.value)}>
            <option value="">Sin contacto</option>
            {contacts.map(c => {
              const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.companyName || c.id
              return <option key={c.id} value={c.id}>{name}</option>
            })}
          </select>
        </div>

        <div>
          <label className="label">Notas</label>
          <textarea className="input resize-none" rows={3} placeholder="Detalles adicionales..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={handleClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
            {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear deal'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
