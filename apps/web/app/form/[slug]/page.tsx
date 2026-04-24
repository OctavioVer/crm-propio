'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'

interface FormField {
  id: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'number'
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
}

interface FormDef {
  id: string
  name: string
  description?: string
  fieldsJson: FormField[]
  submitMessage?: string
  redirectUrl?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [form, setForm] = useState<FormDef | null>(null)
  const [loading, setLoading] = useState(true)
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/api/forms/public/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setForm)
      .catch(() => setError('Formulario no encontrado o inactivo'))
      .finally(() => setLoading(false))
  }, [slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/forms/public/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? 'Error al enviar'); return }
      setSubmitted(true)
      if (data.redirectUrl) {
        setTimeout(() => window.location.href = data.redirectUrl, 1500)
      }
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const setValue = (id: string, value: unknown) => setValues(prev => ({ ...prev, [id]: value }))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    )
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 text-sm">{error || 'Formulario no disponible'}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-sm w-full text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">¡Enviado!</h2>
          <p className="text-gray-500 text-sm">{form.submitMessage ?? '¡Gracias! Nos pondremos en contacto pronto.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{form.name}</h1>
        {form.description && <p className="text-gray-500 text-sm mb-6">{form.description}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {form.fieldsJson.map(field => (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  rows={4}
                  placeholder={field.placeholder}
                  required={field.required}
                  value={String(values[field.id] ?? '')}
                  onChange={e => setValue(field.id, e.target.value)}
                />
              ) : field.type === 'select' ? (
                <select
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required={field.required}
                  value={String(values[field.id] ?? '')}
                  onChange={e => setValue(field.id, e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {(field.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : field.type === 'checkbox' ? (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    required={field.required}
                    checked={Boolean(values[field.id])}
                    onChange={e => setValue(field.id, e.target.checked)}
                  />
                  <span className="text-sm text-gray-600">{field.placeholder || field.label}</span>
                </label>
              ) : (
                <input
                  type={field.type}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder={field.placeholder}
                  required={field.required}
                  value={String(values[field.id] ?? '')}
                  onChange={e => setValue(field.id, e.target.value)}
                />
              )}
            </div>
          ))}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
      </div>
    </div>
  )
}
