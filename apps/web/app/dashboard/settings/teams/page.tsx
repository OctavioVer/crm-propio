'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { Plus, Trash2, UserPlus, ChevronLeft, Users } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface TeamUser {
  id: string
  name?: string
  email: string
  role: string
  avatarUrl?: string
}

interface TeamMember {
  user: TeamUser
}

interface Team {
  id: string
  name: string
  managerId?: string
  members: TeamMember[]
}

interface User {
  id: string
  name?: string
  email: string
  role: string
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [addMember, setAddMember] = useState<{ teamId: string; userId: string } | null>(null)

  useEffect(() => {
    Promise.all([
      api.get<Team[]>('/api/teams'),
      api.get<{ data: User[] }>('/api/users'),
    ]).then(([t, u]) => {
      setTeams(t)
      setUsers(u.data)
    }).catch(() => toast.error('Error al cargar datos')).finally(() => setLoading(false))
  }, [])

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return
    try {
      const team = await api.post<Team>('/api/teams', { name: newTeamName.trim() })
      setTeams(prev => [...prev, { ...team, members: [] }])
      setNewTeamName('')
      setCreatingTeam(false)
      toast.success('Equipo creado')
    } catch {
      toast.error('Error al crear equipo')
    }
  }

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('¿Eliminar este equipo?')) return
    try {
      await api.delete(`/api/teams/${id}`)
      setTeams(prev => prev.filter(t => t.id !== id))
      toast.success('Equipo eliminado')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const handleAddMember = async () => {
    if (!addMember) return
    try {
      await api.post(`/api/teams/${addMember.teamId}/members`, { userId: addMember.userId })
      const user = users.find(u => u.id === addMember.userId)!
      setTeams(prev => prev.map(t =>
        t.id === addMember.teamId
          ? { ...t, members: [...t.members, { user }] }
          : t
      ))
      setAddMember(null)
      toast.success('Miembro agregado')
    } catch {
      toast.error('Error al agregar miembro')
    }
  }

  const handleRemoveMember = async (teamId: string, userId: string) => {
    try {
      await api.delete(`/api/teams/${teamId}/members/${userId}`)
      setTeams(prev => prev.map(t =>
        t.id === teamId
          ? { ...t, members: t.members.filter(m => m.user.id !== userId) }
          : t
      ))
      toast.success('Miembro eliminado')
    } catch {
      toast.error('Error al eliminar miembro')
    }
  }

  return (
    <div>
      <Header title="Equipos" />
      <div className="p-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/settings" className="text-gray-400 hover:text-gray-700">
            <ChevronLeft size={18} />
          </Link>
          <p className="text-sm text-gray-500">Gestión de equipos de trabajo</p>
          <button
            onClick={() => setCreatingTeam(true)}
            className="btn-primary ml-auto flex items-center gap-2"
          >
            <Plus size={16} /> Nuevo equipo
          </button>
        </div>

        {creatingTeam && (
          <div className="card p-4 mb-4 flex items-center gap-3">
            <input
              autoFocus
              className="input flex-1"
              placeholder="Nombre del equipo..."
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTeam(); if (e.key === 'Escape') setCreatingTeam(false) }}
            />
            <button onClick={handleCreateTeam} className="btn-primary">Crear</button>
            <button onClick={() => setCreatingTeam(false)} className="btn-secondary">Cancelar</button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
                <div className="flex gap-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="w-8 h-8 bg-gray-100 rounded-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : teams.length === 0 && !creatingTeam ? (
          <div className="card p-12 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-4">
              <Users size={24} className="text-purple-500" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Sin equipos</h3>
            <p className="text-sm text-gray-400 mb-5">Creá equipos para organizar a tu equipo de ventas.</p>
            <button onClick={() => setCreatingTeam(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Crear primer equipo
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {teams.map(team => {
              const memberIds = team.members.map(m => m.user.id)
              const availableUsers = users.filter(u => !memberIds.includes(u.id))

              return (
                <div key={team.id} className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">{team.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{team.members.length} miembro{team.members.length !== 1 ? 's' : ''}</span>
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {team.members.map(({ user }) => (
                      <div key={user.id} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full pl-1 pr-2 py-1">
                        <div className="w-6 h-6 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-semibold">
                          {(user.name ?? user.email)[0].toUpperCase()}
                        </div>
                        <span className="text-xs text-gray-700">{user.name ?? user.email}</span>
                        <button
                          onClick={() => handleRemoveMember(team.id, user.id)}
                          className="text-gray-300 hover:text-red-500 ml-0.5 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {team.members.length === 0 && (
                      <p className="text-xs text-gray-400">Sin miembros aún</p>
                    )}
                  </div>

                  {addMember?.teamId === team.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        className="input text-sm flex-1"
                        value={addMember.userId}
                        onChange={(e) => setAddMember({ teamId: team.id, userId: e.target.value })}
                      >
                        <option value="">Seleccionar usuario...</option>
                        {availableUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.name ?? u.email} ({u.role})</option>
                        ))}
                      </select>
                      <button onClick={handleAddMember} disabled={!addMember.userId} className="btn-primary disabled:opacity-40">Agregar</button>
                      <button onClick={() => setAddMember(null)} className="btn-secondary">Cancelar</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddMember({ teamId: team.id, userId: '' })}
                      className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                      <UserPlus size={14} /> Agregar miembro
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
