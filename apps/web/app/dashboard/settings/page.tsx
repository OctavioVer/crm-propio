'use client'

import { Header } from '@/components/layout/header'
import { getStoredUser } from '@/lib/auth'
import { User, Users, Bell, Shield, ChevronRight, BarChart2, GitBranch, Package, Webhook, Calendar } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const user = getStoredUser()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'

  const sections = [
    {
      group: 'Cuenta',
      items: [
        {
          icon: User,
          title: 'Mi perfil',
          description: 'Nombre, email y preferencias personales',
          href: null,
          color: 'bg-brand-50 text-brand-600',
          available: true,
        },
        {
          icon: Bell,
          title: 'Notificaciones',
          description: 'Configurar alertas in-app',
          href: null,
          color: 'bg-orange-50 text-orange-500',
          available: false,
        },
      ],
    },
    {
      group: 'Organización',
      items: [
        {
          icon: Users,
          title: 'Usuarios',
          description: 'Invitar usuarios, gestionar roles y permisos',
          href: '/dashboard/settings/users',
          color: 'bg-purple-50 text-purple-600',
          available: isAdmin,
        },
        {
          icon: BarChart2,
          title: 'Equipos de venta',
          description: 'Crear equipos y asignar miembros',
          href: '/dashboard/settings/teams',
          color: 'bg-green-50 text-green-600',
          available: isAdmin,
        },
      ],
    },
    {
      group: 'CRM',
      items: [
        {
          icon: GitBranch,
          title: 'Pipelines',
          description: 'Configurar etapas y colores de pipelines',
          href: '/dashboard/settings/pipelines',
          color: 'bg-blue-50 text-blue-600',
          available: isAdmin,
        },
        {
          icon: Package,
          title: 'Catálogo de productos',
          description: 'Productos y servicios vinculables a deals',
          href: '/dashboard/settings/products',
          color: 'bg-amber-50 text-amber-600',
          available: true,
        },
      ],
    },
    {
      group: 'Integraciones',
      items: [
        {
          icon: Webhook,
          title: 'Webhooks',
          description: 'Conectar con n8n, Make, Zapier, Slack y más',
          href: '/dashboard/settings/webhooks',
          color: 'bg-teal-50 text-teal-600',
          available: isAdmin,
        },
        {
          icon: Calendar,
          title: 'Reportes programados',
          description: 'Envío automático de reportes del CRM por email',
          href: '/dashboard/settings/reports',
          color: 'bg-indigo-50 text-indigo-600',
          available: isAdmin,
        },
        {
          icon: Shield,
          title: 'Seguridad',
          description: '2FA, sesiones activas y logs de acceso',
          href: null,
          color: 'bg-red-50 text-red-500',
          available: false,
        },
      ],
    },
  ]

  return (
    <div>
      <Header title="Configuración" />
      <div className="p-6 max-w-2xl space-y-6">
        {/* Profile quick view */}
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center font-bold text-lg">
            {(user?.name ?? user?.email ?? '?')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user?.name ?? 'Sin nombre'}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="badge bg-gray-100 text-gray-600 mt-1">{user?.role}</span>
          </div>
        </div>

        {/* Settings grouped sections */}
        {sections.map(group => (
          <div key={group.group}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-2">{group.group}</p>
            <div className="card overflow-hidden divide-y divide-gray-100">
              {group.items.map((s) => {
                const Icon = s.icon
                const content = (
                  <div className={`flex items-center gap-4 p-4 ${s.available && s.href ? 'hover:bg-gray-50 transition-colors cursor-pointer' : ''} ${!s.available ? 'opacity-50' : ''}`}>
                    <div className={`p-2 rounded-lg ${s.color}`}><Icon size={18} /></div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{s.title}</p>
                      <p className="text-xs text-gray-500">{s.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!s.available && <span className="badge bg-gray-100 text-gray-400 text-xs">Próximamente</span>}
                      {s.available && s.href && <ChevronRight size={16} className="text-gray-400" />}
                    </div>
                  </div>
                )
                return s.available && s.href ? (
                  <Link key={s.title} href={s.href}>{content}</Link>
                ) : (
                  <div key={s.title}>{content}</div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
