'use client'

import { Header } from '@/components/layout/header'
import { getStoredUser } from '@/lib/auth'
import { User, Users, Bell, Shield, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const user = getStoredUser()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'

  const sections = [
    {
      icon: User,
      title: 'Mi perfil',
      description: 'Nombre, email y preferencias personales',
      href: null,
      color: 'bg-brand-50 text-brand-600',
      available: true,
    },
    {
      icon: Users,
      title: 'Usuarios y equipo',
      description: 'Invitar usuarios, gestionar roles y permisos',
      href: '/dashboard/settings/users',
      color: 'bg-purple-50 text-purple-600',
      available: isAdmin,
    },
    {
      icon: Bell,
      title: 'Notificaciones',
      description: 'Configurar alertas y notificaciones in-app',
      href: null,
      color: 'bg-orange-50 text-orange-500',
      available: false,
    },
    {
      icon: Shield,
      title: 'Seguridad',
      description: '2FA, sesiones activas y logs de acceso',
      href: null,
      color: 'bg-red-50 text-red-500',
      available: false,
    },
  ]

  return (
    <div>
      <Header title="Configuración" />
      <div className="p-6 max-w-2xl space-y-4">
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

        {/* Settings sections */}
        <div className="card overflow-hidden divide-y divide-gray-100">
          {sections.map((s) => {
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
    </div>
  )
}
