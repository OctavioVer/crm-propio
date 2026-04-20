'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Users, Briefcase, TrendingUp, Trophy, Calendar, Clock, CheckCircle2, Plus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { CardSkeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'

interface DashboardStats {
  contacts: number
  openDeals: number
  dealsClosingSoon: {
    id: string
    title: string
    stage: string
    amount: number | null
    currency: string
    closeDate: string
    contact: { firstName?: string; lastName?: string; companyName?: string } | null
  }[]
  recentActivities: {
    id: string
    type: string
    title: string | null
    body: string | null
    createdAt: string
    user: { name: string | null; avatarUrl: string | null } | null
    contact: { firstName?: string; lastName?: string; companyName?: string } | null
  }[]
  wonThisMonth: { count: number; revenue: number }
}

interface StageData { name: string; count: number; total: number; color: string }

const ACTIVITY_ICONS: Record<string, string> = {
  CALL: '📞', EMAIL: '✉️', MEETING: '📅', NOTE: '📝', TASK: '✓', WHATSAPP: '💬',
}

const ONBOARDING_STEPS = [
  { key: 'contacts', label: 'Crear primer contacto', href: '/dashboard/contacts' },
  { key: 'deals', label: 'Crear primer deal', href: '/dashboard/deals' },
  { key: 'activities', label: 'Registrar primera actividad', href: '/dashboard/contacts' },
]

export default function OverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [stageData, setStageData] = useState<StageData[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    Promise.all([
      api.get<DashboardStats>('/api/dashboard/stats'),
      api.get<any[]>('/api/pipelines'),
    ]).then(async ([dashStats, pipelines]) => {
      setStats(dashStats)
      const def = pipelines.find((p: any) => p.isDefault) ?? pipelines[0]
      if (def) {
        const kanban = await api.get<any[]>(`/api/deals/kanban/${def.id}`)
        setStageData(kanban.map((s: any) => ({ name: s.name, count: s.deals.length, total: s.total, color: s.color })))
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const showOnboarding = !loading && stats && (stats.contacts < 3 || stats.openDeals === 0)
  const completedSteps = {
    contacts: (stats?.contacts ?? 0) > 0,
    deals: (stats?.openDeals ?? 0) > 0,
    activities: (stats?.recentActivities.length ?? 0) > 0,
  }

  const statCards = [
    { label: 'Contactos', value: loading ? '—' : (stats?.contacts ?? 0).toLocaleString(), icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Deals abiertos', value: loading ? '—' : (stats?.openDeals ?? 0).toLocaleString(), icon: Briefcase, color: 'text-purple-600 bg-purple-50' },
    { label: 'Ganados este mes', value: loading ? '—' : formatCurrency(stats?.wonThisMonth.revenue ?? 0, 'ARS'), icon: Trophy, color: 'text-green-600 bg-green-50' },
    { label: 'Pipeline total', value: loading ? '—' : formatCurrency(stageData.reduce((a, s) => a + s.total, 0), 'ARS'), icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
  ]

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Onboarding Checklist */}
        {showOnboarding && (
          <div className="card p-5 border-brand-100 bg-brand-50/30">
            <h3 className="font-semibold text-gray-900 mb-1">Primeros pasos</h3>
            <p className="text-xs text-gray-500 mb-4">Completá estos pasos para sacar el máximo provecho del CRM.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ONBOARDING_STEPS.map((step) => {
                const done = completedSteps[step.key as keyof typeof completedSteps]
                return (
                  <button
                    key={step.key}
                    onClick={() => !done && router.push(step.href)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${done
                      ? 'border-green-200 bg-green-50 text-green-700 cursor-default'
                      : 'border-brand-200 bg-white hover:bg-brand-50 text-gray-700 cursor-pointer'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-500' : 'bg-brand-100'}`}>
                      {done ? <CheckCircle2 size={14} className="text-white" /> : <Plus size={12} className="text-brand-600" />}
                    </div>
                    <span className="text-sm font-medium">{step.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            : statCards.map((s) => (
              <div key={s.label} className="card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${s.color}`}><s.icon size={20} /></div>
                </div>
              </div>
            ))
          }
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline Chart */}
          <div className="card p-5 lg:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-1">Deals por etapa</h3>
            <p className="text-xs text-gray-400 mb-4">Pipeline principal</p>
            {stageData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sin datos de pipeline</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stageData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip
                    formatter={(v: number) => [v, 'Deals']}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {stageData.map((s, i) => <Cell key={i} fill={s.color || '#6366f1'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Deals por vencer */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-orange-500" />
              <h3 className="font-semibold text-gray-900">Vencen esta semana</h3>
            </div>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
            ) : (stats?.dealsClosingSoon.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <CheckCircle2 size={28} className="text-green-400 mb-2" />
                <p className="text-sm text-gray-500">No hay deals por vencer</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats?.dealsClosingSoon.map((d) => {
                  const contactName = d.contact
                    ? ([d.contact.firstName, d.contact.lastName].filter(Boolean).join(' ') || d.contact.companyName)
                    : null
                  const daysLeft = Math.ceil((new Date(d.closeDate).getTime() - Date.now()) / 86400_000)
                  return (
                    <button
                      key={d.id}
                      onClick={() => router.push(`/dashboard/deals/${d.id}`)}
                      className="w-full text-left p-3 rounded-xl border border-orange-100 bg-orange-50/50 hover:bg-orange-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">{d.title}</p>
                      {contactName && <p className="text-xs text-gray-500 truncate">{contactName}</p>}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs font-semibold text-orange-600">
                          {daysLeft === 0 ? 'Hoy' : daysLeft === 1 ? 'Mañana' : `En ${daysLeft} días`}
                        </span>
                        {d.amount && <span className="text-xs text-gray-600">{formatCurrency(Number(d.amount), d.currency)}</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-brand-500" />
            <h3 className="font-semibold text-gray-900">Actividad reciente del equipo</h3>
          </div>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : (stats?.recentActivities.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6 italic">Sin actividad reciente. ¡Empezá a registrar notas y llamadas!</p>
          ) : (
            <div className="space-y-1">
              {stats?.recentActivities.map((a) => {
                const contactName = a.contact
                  ? ([a.contact.firstName, a.contact.lastName].filter(Boolean).join(' ') || a.contact.companyName)
                  : null
                return (
                  <div key={a.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-base mt-0.5 select-none">{ACTIVITY_ICONS[a.type] ?? '•'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">{a.title || a.body?.slice(0, 50) || a.type}</span>
                        {contactName && <span className="text-xs text-gray-400 truncate">— {contactName}</span>}
                      </div>
                      <p className="text-xs text-gray-400">{a.user?.name ?? 'Sistema'} · {formatDate(a.createdAt)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
