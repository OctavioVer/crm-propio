'use client'

import { useState, useRef } from 'react'
import { api } from '@/lib/api'
import { Modal } from '@/components/ui/modal'
import { toast } from 'sonner'
import { Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react'

interface ImportResult {
  created: number
  skipped: number
  errors: number
  errorDetails: string[]
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

const FIELD_MAP: Record<string, string> = {
  'nombre': 'firstName',
  'first_name': 'firstName',
  'firstname': 'firstName',
  'apellido': 'lastName',
  'last_name': 'lastName',
  'lastname': 'lastName',
  'empresa': 'companyName',
  'company': 'companyName',
  'company_name': 'companyName',
  'email': 'email',
  'correo': 'email',
  'telefono': 'phone',
  'teléfono': 'phone',
  'phone': 'phone',
  'etapa': 'stage',
  'stage': 'stage',
  'tags': 'tags',
  'etiquetas': 'tags',
  'notas': 'notes',
  'notes': 'notes',
}

export function ImportContactsModal({ isOpen, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => { setStep('upload'); setRows([]); setResult(null) }
  const handleClose = () => { reset(); onClose() }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCsv(text)
      if (!parsed.length) { toast.error('El archivo no tiene datos válidos'); return }
      const mapped = parsed.map(row => {
        const mapped: Record<string, string> = {}
        for (const [key, val] of Object.entries(row)) {
          const field = FIELD_MAP[key.toLowerCase().trim()]
          if (field) mapped[field] = val
        }
        return mapped
      }).filter(r => Object.values(r).some(Boolean))
      setRows(mapped)
      setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleImport = async () => {
    setLoading(true)
    try {
      const res = await api.post<ImportResult>('/api/import/contacts', {
        rows: rows.slice(0, 1000),
        skipDuplicates: true,
      })
      setResult(res)
      setStep('done')
      if (res.created > 0) onSuccess()
    } catch (err: any) {
      toast.error(err.message ?? 'Error al importar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar contactos desde CSV" maxWidth="max-w-xl">
      {step === 'upload' && (
        <div className="space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/20 transition-colors"
          >
            <Upload size={28} className="text-gray-300 mb-3" />
            <p className="font-medium text-gray-700 text-sm">Hacé clic para seleccionar un CSV</p>
            <p className="text-xs text-gray-400 mt-1">Máximo 1000 filas</p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500">
            <p className="font-medium text-gray-700 mb-2">Columnas reconocidas:</p>
            <div className="grid grid-cols-3 gap-1">
              {['nombre / first_name', 'apellido / last_name', 'empresa / company', 'email / correo', 'telefono / phone', 'etapa / stage', 'tags / etiquetas', 'notas / notes'].map(c => (
                <span key={c} className="font-mono bg-white border border-gray-200 rounded px-1.5 py-0.5">{c}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText size={16} className="text-brand-500" />
            <span>{rows.length} contactos detectados</span>
          </div>
          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Nombre', 'Apellido', 'Empresa', 'Email', 'Teléfono'].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-medium text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-3 py-1.5 text-gray-700">{row.firstName || '—'}</td>
                    <td className="px-3 py-1.5 text-gray-700">{row.lastName || '—'}</td>
                    <td className="px-3 py-1.5 text-gray-700">{row.companyName || '—'}</td>
                    <td className="px-3 py-1.5 text-gray-700">{row.email || '—'}</td>
                    <td className="px-3 py-1.5 text-gray-700">{row.phone || '—'}</td>
                  </tr>
                ))}
                {rows.length > 10 && (
                  <tr><td colSpan={5} className="px-3 py-2 text-center text-gray-400">...y {rows.length - 10} más</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">Los duplicados (mismo email) serán omitidos automáticamente.</p>
          <div className="flex justify-end gap-3">
            <button onClick={reset} className="btn-secondary">Volver</button>
            <button onClick={handleImport} disabled={loading} className="btn-primary disabled:opacity-60">
              {loading ? 'Importando...' : `Importar ${rows.length} contactos`}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <div className="space-y-4">
          <div className="flex flex-col items-center text-center py-4">
            <CheckCircle size={40} className="text-green-500 mb-3" />
            <h3 className="font-semibold text-gray-900 text-lg">Importación completada</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <p className="text-2xl font-bold text-green-600">{result.created}</p>
              <p className="text-xs text-green-700">Creados</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-gray-500">{result.skipped}</p>
              <p className="text-xs text-gray-400">Omitidos</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-xl">
              <p className="text-2xl font-bold text-red-500">{result.errors}</p>
              <p className="text-xs text-red-400">Errores</p>
            </div>
          </div>
          {result.errorDetails.length > 0 && (
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-xs font-medium text-red-600 flex items-center gap-1 mb-1"><AlertTriangle size={12} /> Detalles de errores</p>
              {result.errorDetails.map((e, i) => <p key={i} className="text-xs text-red-500">{e}</p>)}
            </div>
          )}
          <div className="flex justify-end">
            <button onClick={handleClose} className="btn-primary">Cerrar</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
