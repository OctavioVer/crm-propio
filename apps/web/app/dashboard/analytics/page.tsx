import { Header } from '@/components/layout/header'
import { BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <div>
      <Header title="Analítica" />
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
          <BarChart3 size={28} className="text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Analytics avanzado</h2>
        <p className="text-gray-500 max-w-sm">Cohortes, CAC, LTV, ROAS, MRR y revenue analytics con ClickHouse. Disponible en Fase 3.</p>
      </div>
    </div>
  )
}
