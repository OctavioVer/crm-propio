import { Header } from '@/components/layout/header'
import { MessageSquare } from 'lucide-react'

export default function ConversationsPage() {
  return (
    <div>
      <Header title="Conversaciones" />
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
          <MessageSquare size={28} className="text-blue-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Bandeja unificada</h2>
        <p className="text-gray-500 max-w-sm">WhatsApp, email, Instagram y más — todo en un solo lugar. Disponible en MVP Plus.</p>
      </div>
    </div>
  )
}
