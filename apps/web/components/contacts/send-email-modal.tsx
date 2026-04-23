'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { Modal } from '@/components/ui/modal'
import { toast } from 'sonner'
import { Send } from 'lucide-react'

interface SendEmailModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  contactId: string
  defaultTo?: string
}

export function SendEmailModal({ isOpen, onClose, onSuccess, contactId, defaultTo }: SendEmailModalProps) {
  const [to, setTo] = useState(defaultTo ?? '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setSubject('')
    setBody('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) {
      toast.error('Completá el asunto y el cuerpo del email')
      return
    }
    setLoading(true)
    try {
      const res = await api.post<{ sentTo: string }>(`/api/contacts/${contactId}/email`, {
        subject: subject.trim(),
        body: body.trim(),
        to: to.trim() || undefined,
      })
      toast.success(`Email enviado a ${res.sentTo}`)
      reset()
      onSuccess()
    } catch (err: any) {
      toast.error(err.message ?? 'Error al enviar el email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Enviar email" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Para</label>
          <input
            type="email"
            className="input"
            placeholder="email@destino.com"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">Si lo dejás vacío, se usará el email principal del contacto.</p>
        </div>

        <div>
          <label className="label">Asunto</label>
          <input
            type="text"
            className="input"
            placeholder="Ej: Propuesta comercial"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">Mensaje</label>
          <textarea
            className="input resize-none"
            rows={6}
            placeholder="Escribí tu email aquí..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={handleClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
            <Send size={15} />
            {loading ? 'Enviando...' : 'Enviar email'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
