'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Plus, Pencil, Trash2, ChevronLeft, Package, X, Check } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  sku?: string
  description?: string
  price: number
  currency: string
  category?: string
  active: boolean
  _count?: { dealProducts: number }
}

const EMPTY: Omit<Product, 'id' | '_count'> = { name: '', sku: '', description: '', price: 0, currency: 'USD', category: '', active: true }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Product | typeof EMPTY | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get<Product[]>('/api/products')
      .then(setProducts)
      .catch(() => toast.error('Error al cargar productos'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!editing || !(editing as any).name?.trim()) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    try {
      const isNew = !('id' in editing)
      const body = { ...editing, price: Number((editing as any).price) }
      if (isNew) {
        const created = await api.post<Product>('/api/products', body)
        setProducts(prev => [...prev, created])
        toast.success('Producto creado')
      } else {
        const updated = await api.patch<Product>(`/api/products/${(editing as Product).id}`, body)
        setProducts(prev => prev.map(p => p.id === updated.id ? updated : p))
        toast.success('Producto actualizado')
      }
      setEditing(null)
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return
    try {
      await api.delete(`/api/products/${id}`)
      setProducts(prev => prev.filter(p => p.id !== id))
      toast.success('Producto eliminado')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const toggleActive = async (p: Product) => {
    try {
      const updated = await api.patch<Product>(`/api/products/${p.id}`, { active: !p.active })
      setProducts(prev => prev.map(x => x.id === p.id ? updated : x))
    } catch { toast.error('Error') }
  }

  return (
    <div>
      <Header title="Catálogo de productos" />
      <div className="p-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/settings" className="text-gray-400 hover:text-gray-700"><ChevronLeft size={18} /></Link>
          <p className="text-sm text-gray-500">Productos y servicios que podés vincular a deals</p>
          <button onClick={() => setEditing({ ...EMPTY })} className="btn-primary ml-auto flex items-center gap-2">
            <Plus size={16} /> Nuevo producto
          </button>
        </div>

        {/* Form */}
        {editing && (
          <div className="card p-5 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">{'id' in editing ? 'Editar producto' : 'Nuevo producto'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="label">Nombre *</label>
                <input className="input" value={(editing as any).name} onChange={e => setEditing(prev => ({ ...prev!, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">SKU</label>
                <input className="input" value={(editing as any).sku ?? ''} onChange={e => setEditing(prev => ({ ...prev!, sku: e.target.value }))} />
              </div>
              <div>
                <label className="label">Precio</label>
                <input type="number" min={0} step="0.01" className="input" value={(editing as any).price} onChange={e => setEditing(prev => ({ ...prev!, price: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="label">Moneda</label>
                <select className="input" value={(editing as any).currency} onChange={e => setEditing(prev => ({ ...prev!, currency: e.target.value }))}>
                  {['USD', 'ARS', 'EUR', 'BRL', 'MXN'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Categoría</label>
                <input className="input" placeholder="Ej: SaaS, Servicio, Hardware" value={(editing as any).category ?? ''} onChange={e => setEditing(prev => ({ ...prev!, category: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Descripción</label>
                <textarea className="input resize-none" rows={2} value={(editing as any).description ?? ''} onChange={e => setEditing(prev => ({ ...prev!, description: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setEditing(null)} className="btn-secondary"><X size={14} /> Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
                <Check size={14} /> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-4 h-16 animate-pulse bg-gray-50" />)}
          </div>
        ) : products.length === 0 && !editing ? (
          <div className="card p-12 flex flex-col items-center text-center">
            <Package size={32} className="text-gray-200 mb-3" />
            <h3 className="font-semibold text-gray-700 mb-1">Sin productos</h3>
            <p className="text-sm text-gray-400 mb-4">Creá tu catálogo para vincularlo a los deals.</p>
            <button onClick={() => setEditing({ ...EMPTY })} className="btn-primary flex items-center gap-2"><Plus size={15} /> Crear primer producto</button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Producto</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 hidden md:table-cell">SKU</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 hidden lg:table-cell">Categoría</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-400">Precio</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-400 hidden sm:table-cell">En deals</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-400">Estado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      {p.description && <p className="text-xs text-gray-400 truncate max-w-xs">{p.description}</p>}
                    </td>
                    <td className="px-5 py-3 text-gray-500 hidden md:table-cell">{p.sku || '—'}</td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      {p.category ? <span className="badge bg-gray-100 text-gray-600">{p.category}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatCurrency(Number(p.price), p.currency)}</td>
                    <td className="px-5 py-3 text-center text-gray-500 hidden sm:table-cell">{p._count?.dealProducts ?? 0}</td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`text-xs px-2 py-1 rounded-full font-medium ${p.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                      >
                        {p.active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditing(p)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
