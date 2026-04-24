'use client'

import { useEffect, useState, useCallback } from 'react'
import { use } from 'react'
import { api } from '@/lib/api'
import { ChevronLeft, Plus, Trash2, Save, ExternalLink, Copy, GripVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface FormField {
  id: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'number'
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  mapTo?: string
}

interface FormData {
  id: string
  name: string
  slug: string
  description?: string
  fieldsJson: FormField[]
  active: boolean
  notifyEmail?: string
  redirectUrl?: string
  submitMessage?: string
}

const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'textarea', label: 'Área de texto' },
  { value: 'select', label: 'Selector' },
  { value: 'number', label: 'Número' },
  { value: 'checkbox', label: 'Checkbox' },
]

const MAP_OPTIONS = [
  { value: '', label: 'No mapear' },
  { value: 'firstName', label: 'Nombre' },
  { value: 'lastName', label: 'Apellido' },
  { value: 'companyName', label: 'Empresa' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'notes', label: 'Notas' },
  { value: 'stage', label: 'Etapa' },
]

const genId = () => Math.random().toString(36).slice(2, 9)

export default function FormBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [form, setForm] = useState<FormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'fields' | 'settings' | 'submissions'>('fields')
  const router = useRouter()

  const fetchForm = useCallback(async () => {
    try {
      const data = await api.get<FormData & { submissions: Array<{ id: string; dataJson: unknown; createdAt: string }> }>(`/api/forms/${id}`)
      setForm(data)
    } catch { toast.error('Formulario no encontrado'); router.push('/dashboard/forms') }
    finally { setLoading(false) }
  }, [id, router])

  useEffect(() => { fetchForm() }, [fetchForm])

  const save = async () => {
    if (!form) return
    setSaving(true)
    try {
      await api.patch(`/api/forms/${id}`, {
        name: form.name,
        description: form.description,
        fields: form.fieldsJson,
        active: form.active,
        notifyEmail: form.notifyEmail || undefined,
        redirectUrl: form.redirectUrl || undefined,
        submitMessage: form.submitMessage,
      })
      toast.success('Formulario guardado')
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const addField = () => {
    setForm(prev => prev ? {
      ...prev,
      fieldsJson: [...prev.fieldsJson, { id: genId(), type: 'text', label: 'Nuevo campo', required: false }],
    } : prev)
  }

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setForm(prev => prev ? {
      ...prev,
      fieldsJson: prev.fieldsJson.map(f => f.id === fieldId ? { ...f, ...updates } : f),
    } : prev)
  }

  const removeField = (fieldId: string) => {
    setForm(prev => prev ? { ...prev, fieldsJson: prev.fieldsJson.filter(f => f.id !== fieldId) } : prev)
  }

  if (loading || !form) return <div className="flex items-center justify-center h-screen text-gray-400">Cargando...</div>

  const formUrl = typeof window !== 'undefined' ? `${window.location.origin}/form/${form.slug}` : `/form/${form.slug}`

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4">
        <button onClick={() => router.push('/dashboard/forms')} className="text-gray-400 hover:text-gray-700"><ChevronLeft size={20} /></button>
        <input
          className="font-semibold text-gray-900 text-base bg-transparent border-none outline-none flex-1 max-w-xs"
          value={form.name}
          onChange={e => setForm(prev => prev ? { ...prev, name: e.target.value } : prev)}
        />
        <div className="flex items-center gap-2 ml-auto">
          <a href={formUrl} target="_blank" rel="noreferrer" className="btn-secondary flex items-center gap-1.5 text-sm"><ExternalLink size={14} /> Ver</a>
          <button onClick={() => { navigator.clipboard.writeText(formUrl); toast.success('URL copiada') }} className="btn-secondary flex items-center gap-1.5 text-sm"><Copy size={14} /> Copiar URL</button>
          <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-1.5 disabled:opacity-60"><Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: form editor */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex gap-1 mb-6 border-b border-gray-200">
            {(['fields', 'settings', 'submissions'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t === 'fields' ? 'Campos' : t === 'settings' ? 'Configuración' : 'Envíos'}
              </button>
            ))}
          </div>

          {tab === 'fields' && (
            <div className="max-w-xl space-y-3">
              {form.fieldsJson.map((field) => (
                <div key={field.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <GripVertical size={16} className="text-gray-300 flex-shrink-0" />
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Etiqueta</label>
                        <input className="input text-sm" value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} />
                      </div>
                      <div>
                        <label className="label">Tipo</label>
                        <select className="input text-sm" value={field.type} onChange={e => updateField(field.id, { type: e.target.value as FormField['type'] })}>
                          {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Placeholder</label>
                        <input className="input text-sm" value={field.placeholder ?? ''} onChange={e => updateField(field.id, { placeholder: e.target.value })} />
                      </div>
                      <div>
                        <label className="label">Mapear a campo CRM</label>
                        <select className="input text-sm" value={field.mapTo ?? ''} onChange={e => updateField(field.id, { mapTo: e.target.value as FormField['mapTo'] || undefined })}>
                          {MAP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} />
                        Requerido
                      </label>
                      <button onClick={() => removeField(field.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {field.type === 'select' && (
                    <div>
                      <label className="label">Opciones (separadas por coma)</label>
                      <input className="input text-sm" placeholder="Opción 1, Opción 2, Opción 3" value={(field.options ?? []).join(', ')} onChange={e => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addField} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-brand-300 hover:text-brand-500 transition-colors flex items-center justify-center gap-1.5">
                <Plus size={14} /> Agregar campo
              </button>
            </div>
          )}

          {tab === 'settings' && (
            <div className="max-w-xl space-y-4">
              <div>
                <label className="label">Descripción del formulario</label>
                <textarea className="input resize-none" rows={2} value={form.description ?? ''} onChange={e => setForm(f => f ? { ...f, description: e.target.value } : f)} />
              </div>
              <div>
                <label className="label">Mensaje de éxito</label>
                <textarea className="input resize-none" rows={2} value={form.submitMessage ?? ''} onChange={e => setForm(f => f ? { ...f, submitMessage: e.target.value } : f)} />
              </div>
              <div>
                <label className="label">Redirigir a URL tras envío (opcional)</label>
                <input className="input" type="url" placeholder="https://mi-sitio.com/gracias" value={form.redirectUrl ?? ''} onChange={e => setForm(f => f ? { ...f, redirectUrl: e.target.value } : f)} />
              </div>
              <div>
                <label className="label">Notificar por email al recibir envíos</label>
                <input className="input" type="email" placeholder="admin@empresa.com" value={form.notifyEmail ?? ''} onChange={e => setForm(f => f ? { ...f, notifyEmail: e.target.value } : f)} />
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={form.active} onChange={e => setForm(f => f ? { ...f, active: e.target.checked } : f)} />
                  Formulario activo (acepta envíos)
                </label>
              </div>
              <div className="p-4 bg-brand-50 rounded-xl">
                <p className="text-xs font-semibold text-brand-700 mb-2">URL del formulario</p>
                <code className="text-xs text-brand-600 break-all">{formUrl}</code>
                <p className="text-xs text-gray-500 mt-2">Compartí esta URL o embebiéla con un iframe:</p>
                <code className="text-xs text-gray-600 mt-1 block">{`<iframe src="${formUrl}" width="100%" height="600" frameborder="0"></iframe>`}</code>
              </div>
            </div>
          )}
        </div>

        {/* Right: live preview */}
        <div className="w-80 flex-shrink-0 bg-white border-l border-gray-100 p-5 overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Vista previa</h3>
          <div className="border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm">{form.name}</h2>
            {form.description && <p className="text-xs text-gray-500">{form.description}</p>}
            {form.fieldsJson.map(field => (
              <div key={field.id}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400 resize-none" rows={3} placeholder={field.placeholder} disabled />
                ) : field.type === 'select' ? (
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400" disabled>
                    <option>Seleccionar...</option>
                    {(field.options ?? []).map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <div className="flex items-center gap-2"><input type="checkbox" disabled /><span className="text-xs text-gray-400">{field.placeholder || field.label}</span></div>
                ) : (
                  <input type={field.type} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400" placeholder={field.placeholder} disabled />
                )}
              </div>
            ))}
            <button className="w-full bg-brand-500 text-white text-sm py-2 rounded-lg font-medium" disabled>Enviar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
