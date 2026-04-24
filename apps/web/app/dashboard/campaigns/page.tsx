'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { Mail, Send, Users, CheckCircle, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'

interface PreviewResult { total: number; withEmail: number }
interface SendResult { sent: number; failed: number; total: number; campaignName: string }

export default function CampaignsPage() {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [filter, setFilter] = useState({ stage: '', tag: '', scoreMin: '', scoreMax: '' })
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [result, setResult] = useState<SendResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'compose' | 'confirm' | 'done'>('compose')

  const buildFilter = () => ({
    stage: filter.stage || undefined,
    tag: filter.tag || undefined,
    scoreMin: filter.scoreMin ? Number(filter.scoreMin) : undefined,
    scoreMax: filter.scoreMax ? Number(filter.scoreMax) : undefined,
  })

  const handlePreview = async () => {
    setLoading(true)
    try {
      const res = await api.post<PreviewResult>('/api/campaigns/preview', { filter: buildFilter() })
      setPreview(res)
    } catch { toast.error('Error al calcular audiencia') } finally { setLoading(false) }
  }

  const handleNext = async () => {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      toast.error('Completá nombre, asunto y cuerpo')
      return
    }
    await handlePreview()
    setStep('confirm')
  }

  const handleSend = async () => {
    setLoading(true)
    try {
      const res = await api.post<SendResult>('/api/campaigns/send', {
        name, subject, body, filter: buildFilter(),
      })
      setResult(res)
      setStep('done')
      toast.success(`Campaña enviada: ${res.sent} emails`)
    } catch (err: any) {
      toast.error(err.message ?? 'Error al enviar')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setName(''); setSubject(''); setBody(''); setFilter({ stage: '', tag: '', scoreMin: '', scoreMax: '' })
    setPreview(null); setResult(null); setStep('compose')
  }

  return (
    <div>
      <Header title="Campañas de email" />
      <div className="p-6 max-w-3xl">
        {step === 'compose' && (
          <div className="space-y-6">
            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Mail size={16} /> Componer campaña</h2>
              <div>
                <label className="label">Nombre de la campaña</label>
                <input className="input" placeholder="Ej: Newsletter Julio 2025" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="label">Asunto del email</label>
                <input className="input" placeholder="Ej: ¡Tenemos novedades para vos, {{nombre}}!" value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
              <div>
                <label className="label">Cuerpo del mensaje</label>
                <textarea
                  className="input resize-none"
                  rows={8}
                  placeholder="Hola {{nombre}},&#10;&#10;Escribí tu mensaje aquí...&#10;&#10;Podés usar {{nombre}} y {{empresa}} para personalizar."
                  value={body}
                  onChange={e => setBody(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">Variables: <code className="bg-gray-100 px-1 rounded">{"{{nombre}}"}</code> <code className="bg-gray-100 px-1 rounded">{"{{empresa}}"}</code></p>
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2"><SlidersHorizontal size={16} /> Segmento (opcional)</h2>
              <p className="text-xs text-gray-500">Si no aplicás filtros, se envía a todos los contactos con email.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Etapa</label>
                  <input className="input" placeholder="Ej: Lead" value={filter.stage} onChange={e => setFilter(f => ({ ...f, stage: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Tag</label>
                  <input className="input" placeholder="Ej: VIP" value={filter.tag} onChange={e => setFilter(f => ({ ...f, tag: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Score mínimo</label>
                  <input type="number" min={0} max={100} className="input" placeholder="0" value={filter.scoreMin} onChange={e => setFilter(f => ({ ...f, scoreMin: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Score máximo</label>
                  <input type="number" min={0} max={100} className="input" placeholder="100" value={filter.scoreMax} onChange={e => setFilter(f => ({ ...f, scoreMax: e.target.value }))} />
                </div>
              </div>
              <button onClick={handlePreview} disabled={loading} className="btn-secondary flex items-center gap-2 disabled:opacity-60">
                <Users size={14} /> {loading ? 'Calculando...' : 'Calcular audiencia'}
              </button>
              {preview && (
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-600">{preview.total} contactos en el segmento</span>
                  <span className="font-semibold text-brand-600">{preview.withEmail} con email válido</span>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button onClick={handleNext} className="btn-primary flex items-center gap-2">
                Continuar → Revisar
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="font-semibold text-gray-800 mb-4">Revisar antes de enviar</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex gap-4"><dt className="text-gray-400 w-24">Campaña</dt><dd className="font-medium">{name}</dd></div>
                <div className="flex gap-4"><dt className="text-gray-400 w-24">Asunto</dt><dd className="text-gray-700">{subject}</dd></div>
                <div className="flex gap-4"><dt className="text-gray-400 w-24">Destinatarios</dt>
                  <dd className="font-semibold text-brand-600">{preview?.withEmail ?? '—'} contactos</dd>
                </div>
              </dl>
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-medium text-gray-500 mb-1">Vista previa del mensaje:</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">{body}</p>
              </div>
            </div>

            {preview && preview.withEmail === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
                No hay contactos con email en este segmento. Ajustá los filtros.
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={() => setStep('compose')} className="btn-secondary">← Volver</button>
              <button
                onClick={handleSend}
                disabled={loading || (preview?.withEmail ?? 0) === 0}
                className="btn-primary flex items-center gap-2 disabled:opacity-60 bg-green-600 hover:bg-green-700"
              >
                <Send size={16} /> {loading ? 'Enviando...' : `Enviar a ${preview?.withEmail ?? 0} contactos`}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && result && (
          <div className="card p-12 flex flex-col items-center text-center">
            <CheckCircle size={48} className="text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">¡Campaña enviada!</h2>
            <p className="text-gray-500 mb-6">"{result.campaignName}"</p>
            <div className="flex gap-8 mb-8">
              <div>
                <p className="text-3xl font-bold text-green-600">{result.sent}</p>
                <p className="text-sm text-gray-400">Enviados</p>
              </div>
              {result.failed > 0 && (
                <div>
                  <p className="text-3xl font-bold text-red-500">{result.failed}</p>
                  <p className="text-sm text-gray-400">Fallidos</p>
                </div>
              )}
            </div>
            <button onClick={reset} className="btn-primary">Nueva campaña</button>
          </div>
        )}
      </div>
    </div>
  )
}
