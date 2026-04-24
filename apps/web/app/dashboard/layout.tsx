'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { initAuth, getStoredUser } from '@/lib/auth'
import { Toaster } from 'sonner'

const Sidebar = dynamic(() => import('@/components/layout/sidebar').then(mod => mod.Sidebar), {
  ssr: false,
  loading: () => <aside className="fixed inset-y-0 left-0 w-60 bg-white border-r border-gray-200 z-30" />
})

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    initAuth()
    const user = getStoredUser()
    if (!user) router.push('/login')
  }, [router])

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-60 min-h-screen">{children}</main>
      <Toaster position="bottom-right" richColors />
    </div>
  )
}
