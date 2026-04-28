'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Users, Trophy, Target, Activity, AlertTriangle, CheckCircle, Info, DollarSign, Repeat } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import { toast } from 'sonner'

interface SellerStat { id: string; name: string; openDeals: number; wonDeals: number; lostDeals: number; wonRevenue: number; winRate: number; activities: number }
interface StageData { stage: string; count: number; value: number }
interface Metrics { mrr: number; arr: number; ltv: number; avgDealValue: number; uniqueCustomers: number; totalRevenue: number }
interface SourceData { source: string; count: number }
interface Alert { type: 'warning' | 'info' | 'success'; title: string; body: string }

interface AnalyticsData {
  sellers: SellerStat[]
  pipelineByStage: StageData[]
  revenue: { last30Days: number; prev30Days: number; growth: number }
  conversionRates: Array<{ status: string; count: number; value: number }>
  metrics: Metrics
  sources: SourceData[]
  dealsAtRisk: Array<{ id: string; title: string; stage: string }>
}

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#10b981', '#f59e0b', '#ef4444']

function StatCard({ title, value, sub, icon: Icon, trend, color = 'bg-brand-50 text-brand-600' }: {
  title: string; value: string; sub?: string; icon: React.ElementType; trend?: number; color?: string
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500">{title}</p>
        <div className={`p-2 rounded-lg ${color}`}><Icon size={14} /></div>
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
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<AnalyticsData>('/api/dashboard/analytics'),
      api.get<{ alerts: Alert[] }>('/api/dashboard/anomalies'),
    ])
      .then(([analytics, anomalies]) => { setData(analytics); setAlerts(anomalies.alerts) })
      .catch(() => toast.error('Error al cargar analytics'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <Header title="Analítica" />
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse h-24 bg-gray-50" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const avgWinRate = data.sellers.length
    ? Math.round(data.sellers.reduce((s, u) => s + u.winRate, 0) / data.sellers.length)
    : 0

  const alertIcons = { warning: AlertTriangle, info: Info, success: CheckCircle }
  const alertColors = {
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    success: 'bg-green-50 border-green-200 text-green-700',
  }

  return (
    <div>
      <Header title="Analítica" />
      <div className="p-6 space-y-6">
        {/* Anomaly alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, i) => {
              const Icon = alertIcons[alert.type]
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${alertColors[alert.type]}`}>
                  <Icon size={15} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{alert.title}</p>
                    {alert.body && <p className="text-xs opacity-80 mt-0.5">{alert.body}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Revenue KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Revenue 30d" value={formatCurrency(data.revenue.last30Days)} trend={data.revenue.growth} icon={TrendingUp} />
          <StatCard title="MRR" value={formatCurrency(data.metrics.mrr)} sub="Mensual recurrente" icon={Repeat} color="bg-green-50 text-green-600" />
          <StatCard title="ARR" value={formatCurrency(data.metrics.arr)} sub="Anual recurrente" icon={DollarSign} color="bg-purple-50 text-purple-600" />
          <StatCard title="LTV promedio" value={formatCurrency(data.metrics.ltv)} sub="Valor de vida del cliente" icon={Users} color="bg-amber-50 text-amber-600" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Deals ganados 30d" value={String(data.sellers.reduce((s, u) => s + u.wonDeals, 0))} icon={Trophy} color="bg-green-50 text-green-600" />
          <StatCard title="Win rate promedio" value={`${avgWinRate}%`} icon={Target} />
          <StatCard title="Ticket promedio" value={formatCurrency(data.metrics.avgDealValue)} icon={DollarSign} color="bg-blue-50 text-blue-600" />
          <StatCard title="Clientes únicos" value={String(data.metrics.uniqueCustomers)} icon={Activity} color="bg-teal-50 text-teal-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline por etapa */}
          <div className="card p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Pipeline por etapa (deals abiertos)</h3>
            {data.pipelineByStage.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-sm text-gray-400">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.pipelineByStage} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {data.pipelineByStage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Fuentes de contactos */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Origen de contactos</h3>
            {data.sources.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-sm text-gray-400">Sin datos de origen</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.sources} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={70} label={({ source, percent }) => `${source} ${Math.round(percent * 100)}%`} labelLine={false}>
                    {data.sources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Conversión */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Conversión (últimos 30 días)</h3>
          <div className="space-y-3 max-w-lg">
            {data.conversionRates.map(({ status, count, value }) => {
              const total = data.conversionRates.reduce((s, r) => s + r.count, 0)
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              const color = status === 'WON' ? 'bg-green-500' : status === 'LOST' ? 'bg-red-400' : 'bg-brand-400'
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{status === 'WON' ? 'Ganados' : status === 'LOST' ? 'Perdidos' : 'Abiertos'}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-xs">{count} deals ({pct}%)</span>
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

        {/* Seller leaderboard */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Users size={15} /> Performance por vendedor (30 días)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">#</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Vendedor</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-400">Abiertos</th>
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
                          <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${seller.winRate}%` }} />
                        </div>
                        <span className="text-xs text-gray-600 w-8 text-right">{seller.winRate}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600">{seller.activities}</td>
                  </tr>
                ))}
                {data.sellers.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400 text-sm">Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
