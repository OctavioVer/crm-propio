'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatDate, getInitials } from '@/lib/utils'
import type { User, UserRole } from '@crm/types'
import { Plus, Trash2, Pencil, Shield, UserCheck } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { toast } from 'sonner'
import { TableSkeleton } from '@/components/ui/skeleton'
import { getStoredUser } from '@/lib/auth'

const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  ADMIN: 'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  SELLER: 'bg-green-100 text-green-700',
  VIEWER: 'bg-gray-100 text-gray-600',
}

const ROLE_OPTIONS: UserRole[] = ['ADMIN', 'MANAGER', 'SELLER', 'VIEWER']

interface InviteForm {
  email: string
  name: string
  role: UserRole
  password: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState<InviteForm>({ email: '', name: '', role: 'SELLER', password: '' })
  const [saving, setSaving] = useState(false)
  const me = getStoredUser()

  const fetchUsers = () => {
    api.get<User[]>('/api/users').then(setUsers).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email) { toast.error('Email requerido'); return }
    setSaving(true)
    try {
      await api.post('/api/users', { ...form, password: form.password || undefined })
      toast.success(`Usuario ${form.email} creado`)
      setInviteOpen(false)
      setForm({ email: '', name: '', role: 'SELLER', password: '' })
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message ?? 'Error al crear usuario')
    } finally {
      setSaving(false)
    }
  }

  const handleEditRole = async (userId: string, role: UserRole) => {
    try {
      await api.patch(`/api/users/${userId}`, { role })
      toast.success('Rol actualizado')
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
      setEditUser(null)
    } catch {
      toast.error('Error al actualizar rol')
    }
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`¿Eliminar a ${user.name ?? user.email}? Esta acción no se puede deshacer.`)) return
    try {
      await api.delete(`/api/users/${user.id}`)
      toast.success('Usuario eliminado')
      setUsers(prev => prev.filter(u => u.id !== user.id))
    } catch {
      toast.error('Error al eliminar usuario')
    }
  }

  const isAdmin = me?.role === 'ADMIN' || me?.role === 'SUPER_ADMIN'

  return (
    <div>
      <Header title="Gestión de usuarios" />
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm text-gray-500">{users.length} usuario{users.length !== 1 ? 's' : ''} en el equipo</p>
          </div>
          {isAdmin && (
            <button onClick={() => setInviteOpen(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Invitar usuario
            </button>
          )}
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <TableSkeleton rows={3} cols={5} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Rol</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Último login</th>
                  {isAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {getInitials(user.name || user.email)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name ?? '—'}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        {user.id === me?.id && (
                          <span className="text-xs bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded font-medium">Yo</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${ROLE_COLORS[user.role]}`}>{user.role}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        {user.emailVerified
                          ? <><UserCheck size={13} className="text-green-500" /><span className="text-xs text-green-600">Verificado</span></>
                          : <span className="text-xs text-gray-400">Pendiente</span>
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                      {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Nunca'}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {user.id !== me?.id && (
                            <>
                              <button
                                onClick={() => setEditUser(user)}
                                className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                                title="Cambiar rol"
                              >
                                <Shield size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(user)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                title="Eliminar usuario"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      <Modal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} title="Invitar usuario" maxWidth="max-w-md">
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" placeholder="email@empresa.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Nombre</label>
            <input type="text" className="input" placeholder="Nombre completo" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Rol</label>
            <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}>
              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Contraseña temporal</label>
            <input type="password" className="input" placeholder="Mínimo 8 caracteres" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} minLength={8} />
            <p className="text-xs text-gray-400 mt-1">El usuario deberá cambiarla al ingresar.</p>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setInviteOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Cambiar rol" maxWidth="max-w-sm">
        {editUser && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Cambiar el rol de <span className="font-semibold">{editUser.name ?? editUser.email}</span></p>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map(role => (
                <button
                  key={role}
                  onClick={() => handleEditRole(editUser.id, role)}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    editUser.role === role
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
            <button onClick={() => setEditUser(null)} className="btn-secondary w-full">Cancelar</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
