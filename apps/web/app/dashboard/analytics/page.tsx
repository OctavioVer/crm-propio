'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Users, Trophy, Target, Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { toast } from 'sonner'

interface SellerStat {
  id: string
  name: string
  openDeals: number
  wonDeals: number
  lostDeals: number
  wonRevenue: number
  winRate: number
  activities: number
}

interface StageData {
  stage: string
  count: number
  value: number
}

interface AnalyticsData {
  sellers: SellerStat[]
  pipelineByStage: StageData[]
  revenue: { last30Days: number; prev30Days: number; growth: number }
  conversionRates: Array<{ status: string; count: number; value: number }>
}

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe']

function StatCard({ title, value, sub, icon: Icon, trend }: {
  title: string
  value: string
  sub?: string
  icon: React.ElementType
  trend?: number
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className="p-2 bg-brand-50 rounded-lg"><Icon size={16} className="text-brand-600" /></div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend)}% vs mes anterior
        </div>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<AnalyticsData>('/api/dashboard/analytics')
      .then(setData)
      .catch(() => toast.error('Error al cargar analytics'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <Header title="Analítica" />
        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-7 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const totalWon = data.sellers.reduce((s, u) => s + u.wonRevenue, 0)
  const totalActivities = data.sellers.reduce((s, u) => s + u.activities, 0)
  const avgWinRate = data.sellers.length
    ? Math.round(data.sellers.reduce((s, u) => s + u.winRate, 0) / data.sellers.length)
    : 0

  return (
    <div>
      <Header title="Analítica" />
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Revenue 30 días"
            value={formatCurrency(data.revenue.last30Days)}
            trend={data.revenue.growth}
            icon={TrendingUp}
          />
          <StatCard
            title="Deals ganados"
            value={String(data.sellers.reduce((s, u) => s + u.wonDeals, 0))}
            sub="últimos 30 días"
            icon={Trophy}
          />
          <StatCard
            title="Win rate promedio"
            value={`${avgWinRate}%`}
            sub="del equipo"
            icon={Target}
          />
          <StatCard
            title="Actividades"
            value={String(totalActivities)}
            sub="últimos 30 días"
            icon={Activity}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline by stage */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Pipeline por etapa</h3>
            {data.pipelineByStage.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-gray-400">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.pipelineByStage} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {data.pipelineByStage.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Funnel */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Conversión (últimos 30 días)</h3>
            <div className="space-y-3">
              {data.conversionRates.map(({ status, count, value }) => {
                const total = data.conversionRates.reduce((s, r) => s + r.count, 0)
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                const color = status === 'WON' ? 'bg-green-500' : status === 'LOST' ? 'bg-red-400' : 'bg-brand-400'
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">{status === 'WON' ? 'Ganados' : status === 'LOST' ? 'Perdidos' : 'Abiertos'}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-xs">{count} deals</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(value)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Seller leaderboard */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Users size={15} /> Performance por vendedor (últimos 30 días)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">#</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Vendedor</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-400">Deals abiertos</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-400">Ganados</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-400">Revenue</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-400">Win rate</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-400">Actividades</th>
                </tr>
              </thead>
              <tbody>
                {data.sellers.map((seller, i) => (
                  <tr key={seller.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-400 font-medium">{i + 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-semibold">
                          {(seller.name ?? '?')[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{seller.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600">{seller.openDeals}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{seller.wonDeals}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatCurrency(seller.wonRevenue)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full">
                          <div
                            className="h-1.5 rounded-full bg-brand-500"
                            style={{ width: `${seller.winRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-8 text-right">{seller.winRate}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600">{seller.activities}</td>
                  </tr>
                ))}
                {data.sellers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-gray-400 text-sm">
                      Sin datos de vendedores aún
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
