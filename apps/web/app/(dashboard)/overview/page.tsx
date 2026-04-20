'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Users, Briefcase, TrendingUp, Clock } from 'lucide-react'

interface Stats {
  contacts: number
  deals: number
  revenue: number
  openDeals: number
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats>({ contacts: 0, deals: 0, revenue: 0, openDeals: 0 })

  useEffect(() => {
    Promise.all([
      api.get<{ meta: { total: number } }>('/api/contacts?limit=1'),
      api.get<{ meta: { total: number }; data: any[] }>('/api/deals?limit=200&status=OPEN'),
    ]).then(([contacts, deals]) => {
      const revenue = deals.data?.reduce((acc: number, d: any) => acc + Number(d.amount ?? 0), 0) ?? 0
      setStats({
        contacts: contacts.meta.total,
        deals: deals.meta.total,
        revenue,
        openDeals: deals.meta.total,
      })
    }).catch(() => {})
  }, [])

  const statCards = [
    { label: 'Contactos', value: stats.contacts.toLocaleString(), icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Deals abiertos', value: stats.openDeals.toLocaleString(), icon: Briefcase, color: 'text-purple-600 bg-purple-50' },
    { label: 'Revenue potencial', value: formatCurrency(stats.revenue), icon: TrendingUp, color: 'text-green-600 bg-green-50' },
    { label: 'Tareas pendientes', value: '—', icon: Clock, color: 'text-orange-600 bg-orange-50' },
  ]

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${s.color}`}>
                  <s.icon size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Placeholder para gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Pipeline por etapa</h3>
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              Los gráficos se cargan en Fase 3 (ClickHouse + Analytics)
            </div>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Actividad reciente</h3>
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              Timeline en construcción
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
