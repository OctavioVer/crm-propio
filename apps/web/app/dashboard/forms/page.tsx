'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Plus, ExternalLink, Copy, Trash2, ToggleLeft, ToggleRight, FormInput } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Form {
  id: string
  name: string
  slug: string
  description?: string
  active: boolean
  createdAt: string
  _count: { submissions: number }
}

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    api.get<Form[]>('/api/forms')
      .then(setForms)
      .catch(() => toast.error('Error al cargar formularios'))
      .finally(() => setLoading(false))
  }, [])

  const createForm = async () => {
    try {
      const form = await api.post<Form>('/api/forms', {
        name: 'Nuevo formulario',
        fields: [
          { id: 'f1', type: 'text', label: 'Nombre', required: true, mapTo: 'firstName' },
          { id: 'f2', type: 'email', label: 'Email', required: true, mapTo: 'email' },
        ],
        active: true,
        submitMessage: '¡Gracias! Nos pondremos en contacto pronto.',
      })
      router.push(`/dashboard/forms/${form.id}`)
    } catch { toast.error('Error al crear') }
  }

  const toggleActive = async (f: Form) => {
    const updated = await api.patch<Form>(`/api/forms/${f.id}`, { active: !f.active })
    setForms(prev => prev.map(x => x.id === f.id ? { ...x, active: updated.active } : x))
    toast.success(updated.active ? 'Formulario activado' : 'Formulario desactivado')
  }

  const deleteForm = async (id: string) => {
    if (!confirm('¿Eliminar este formulario?')) return
    await api.delete(`/api/forms/${id}`)
    setForms(prev => prev.filter(f => f.id !== id))
    toast.success('Formulario eliminado')
  }

  const copyEmbed = (slug: string) => {
    const url = `${window.location.origin}/form/${slug}`
    navigator.clipboard.writeText(url)
    toast.success('URL copiada al portapapeles')
  }

  return (
    <div>
      <Header title="Formularios" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">Formularios embebibles para capturar leads desde tu web</p>
          <button onClick={createForm} className="btn-primary flex items-center gap-2"><Plus size={16} /> Nuevo formulario</button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="card p-5 h-36 animate-pulse bg-gray-50" />)}
          </div>
        ) : forms.length === 0 ? (
          <div className="card p-12 flex flex-col items-center text-center">
            <FormInput size={32} className="text-gray-200 mb-3" />
            <h3 className="font-semibold text-gray-700 mb-1">Sin formularios</h3>
            <p className="text-sm text-gray-400 mb-4">Creá formularios para capturar leads desde tu sitio web.</p>
            <button onClick={createForm} className="btn-primary flex items-center gap-2"><Plus size={15} /> Crear formulario</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forms.map(f => (
              <div key={f.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{f.name}</p>
                    {f.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{f.description}</p>}
                  </div>
                  <button onClick={() => toggleActive(f)} className="flex-shrink-0">
                    {f.active
                      ? <ToggleRight size={20} className="text-green-500" />
                      : <ToggleLeft size={20} className="text-gray-300" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${f.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    {f.active ? 'Activo' : 'Inactivo'}
                  </span>
                  <span>{f._count.submissions} envíos</span>
                  <span>· {formatDate(f.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => router.push(`/dashboard/forms/${f.id}`)} className="btn-secondary text-xs py-1.5 flex-1">Editar</button>
                  <button onClick={() => copyEmbed(f.slug)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors" title="Copiar URL">
                    <Copy size={14} />
                  </button>
                  <a href={`/form/${f.slug}`} target="_blank" rel="noreferrer" className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors" title="Ver formulario">
                    <ExternalLink size={14} />
                  </a>
                  <button onClick={() => deleteForm(f.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
