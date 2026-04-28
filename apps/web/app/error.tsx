'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <span className="text-2xl">⚠️</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Algo salió mal</h1>
        <p className="text-gray-500 mb-6 text-sm max-w-sm">
          Ocurrió un error inesperado. Podés intentar recargar la página.
        </p>
        <div className="flex items-center gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-colors text-sm"
          >
            Reintentar
          </button>
          <Link href="/dashboard/overview" className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm">
            Ir al dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
