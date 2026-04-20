import { Header } from '@/components/layout/header'
import { Zap } from 'lucide-react'

export default function AutomationsPage() {
  return (
    <div>
      <Header title="Automatizaciones" />
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-4">
          <Zap size={28} className="text-purple-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Workflow builder</h2>
        <p className="text-gray-500 max-w-sm">Triggers, condiciones y acciones visuales con React Flow. Disponible en MVP Plus.</p>
      </div>
    </div>
  )
}
