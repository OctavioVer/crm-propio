import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-20 h-20 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl font-black text-brand-500">4</span>
          <span className="text-4xl font-black text-brand-300">0</span>
          <span className="text-4xl font-black text-brand-500">4</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Página no encontrada</h1>
        <p className="text-gray-500 mb-8 max-w-sm">
          La página que buscás no existe o fue movida.
        </p>
        <Link
          href="/dashboard/overview"
          className="inline-flex items-center gap-2 bg-brand-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-600 transition-colors"
        >
          Volver al dashboard
        </Link>
      </div>
    </div>
  )
}
