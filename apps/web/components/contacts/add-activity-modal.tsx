'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { Modal } from '@/components/ui/modal'
import type { ActivityType } from '@crm/types'
import { toast } from 'sonner'

interface AddActivityModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  contactId?: string
  dealId?: string
  defaultType?: ActivityType
}

const TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: 'NOTE', label: 'Nota' },
  { value: 'CALL', label: 'Llamada' },
  { value: 'MEETING', label: 'Reunión' },
  { value: 'TASK', label: 'Tarea' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
]

export function AddActivityModal({ isOpen, onClose, onSuccess, contactId, dealId, defaultType = 'NOTE' }: AddActivityModalProps) {
  const [type, setType] = useState<ActivityType>(defaultType)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [outcome, setOutcome] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setType(defaultType)
    setTitle('')
    setBody('')
    setOutcome('')
    setDueAt('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim() && !title.trim()) {
      toast.error('Escribí al menos un título o descripción')
      return
    }
    setLoading(true)
    try {
      await api.post('/api/activities', {
        type,
        contactId: contactId || undefined,
        dealId: dealId || undefined,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
        outcome: outcome.trim() || undefined,
        dueAt: dueAt || undefined,
      })
      toast.success('Actividad registrada')
      reset()
      onSuccess()
    } catch {
      toast.error('Error al guardar la actividad')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Registrar actividad" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Tipo</label>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setType(opt.value)}
                className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors ${
                  type === opt.value
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Título <span className="text-gray-400 font-normal">(opcional)</span></label>
          <input
            type="text"
            className="input"
            placeholder={type === 'CALL' ? 'Ej: Llamada de seguimiento' : type === 'MEETING' ? 'Ej: Demo del producto' : 'Título de la actividad'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="label">
            {type === 'NOTE' ? 'Nota' : type === 'CALL' ? 'Descripción de la llamada' : 'Descripción'}
          </label>
          <textarea
            className="input resize-none"
            rows={4}
            placeholder={type === 'NOTE' ? 'Escribí tu nota aquí...' : 'Detalles de la actividad...'}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        {(type === 'CALL' || type === 'MEETING') && (
          <div>
            <label className="label">Resultado <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input
              type="text"
              className="input"
              placeholder="Ej: Cliente interesado, enviar propuesta"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            />
          </div>
        )}

        {(type === 'TASK' || type === 'MEETING') && (
          <div>
            <label className="label">Fecha límite <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input
              type="datetime-local"
              className="input"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={handleClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
            {loading ? 'Guardando...' : 'Guardar actividad'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
