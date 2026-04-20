'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { Activity, ActivityType } from '@crm/types'
import {
  MessageSquare, Mail, Phone, Calendar,
  CheckCircle2, MessageCircle, User, Loader2
} from 'lucide-react'

const ACTIVITY_META: Record<ActivityType, { label: string; icon: React.ElementType; color: string }> = {
  NOTE: { label: 'Nota', icon: MessageSquare, color: 'bg-yellow-100 text-yellow-600' },
  EMAIL: { label: 'Email', icon: Mail, color: 'bg-blue-100 text-blue-600' },
  CALL: { label: 'Llamada', icon: Phone, color: 'bg-green-100 text-green-600' },
  MEETING: { label: 'Reunión', icon: Calendar, color: 'bg-purple-100 text-purple-600' },
  TASK: { label: 'Tarea', icon: CheckCircle2, color: 'bg-orange-100 text-orange-600' },
  WHATSAPP: { label: 'WhatsApp', icon: MessageCircle, color: 'bg-emerald-100 text-emerald-600' },
}

interface ActivityFeedProps {
  contactId?: string
  dealId?: string
  refreshKey?: number
}

export function ActivityFeed({ contactId, dealId, refreshKey }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = dealId
      ? `/api/activities/deal/${dealId}`
      : contactId
        ? `/api/activities/contact/${contactId}`
        : null
    if (!url) { setActivities([]); setLoading(false); return }
    setLoading(true)
    api.get<Activity[]>(url)
      .then(setActivities)
      .catch(() => setActivities([]))
      .finally(() => setLoading(false))
  }, [contactId, dealId, refreshKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 size={20} className="animate-spin mr-2" /> Cargando actividades...
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-center">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
          <MessageSquare size={18} className="text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700">Sin actividades registradas</p>
        <p className="text-xs text-gray-400 mt-1">Usa los botones de arriba para registrar una nota, llamada o reunión.</p>
      </div>
    )
  }

  return (
    <div className="relative pl-8 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
      {activities.map((activity) => {
        const meta = ACTIVITY_META[activity.type]
        const Icon = meta.icon
        return (
          <div key={activity.id} className="relative">
            <div className={`absolute -left-8 top-1 w-6 h-6 ${meta.color} rounded-full flex items-center justify-center ring-4 ring-gray-50`}>
              <Icon size={12} />
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{meta.label}</span>
                  {activity.title && (
                    <span className="text-sm font-medium text-gray-900">— {activity.title}</span>
                  )}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(activity.createdAt)}</span>
              </div>
              {activity.body && (
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{activity.body}</p>
              )}
              {activity.outcome && (
                <p className="text-xs text-gray-500 mt-2 italic">Resultado: {activity.outcome}</p>
              )}
              {activity.user?.name && (
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                  <User size={11} /> {activity.user.name}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
