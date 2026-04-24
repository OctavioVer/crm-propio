import { prisma } from '@crm/database'
import type { CreateContactInput, UpdateContactInput, PaginationParams } from '@crm/types'

const contactSelect = {
  id: true,
  tenantId: true,
  type: true,
  firstName: true,
  lastName: true,
  companyName: true,
  ownerId: true,
  stage: true,
  score: true,
  tags: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  emails: { select: { id: true, email: true, isPrimary: true } },
  phones: { select: { id: true, phone: true, type: true } },
  owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
}

export class ContactService {
  async list(tenantId: string, params: PaginationParams) {
    const page = params.page ?? 1
    const limit = Math.min(params.limit ?? 25, 100)
    const skip = (page - 1) * limit

    const p = params as any
    const where: any = {
      tenantId,
      ...(params.search && {
        OR: [
          { firstName: { contains: params.search, mode: 'insensitive' as const } },
          { lastName: { contains: params.search, mode: 'insensitive' as const } },
          { companyName: { contains: params.search, mode: 'insensitive' as const } },
          { emails: { some: { email: { contains: params.search, mode: 'insensitive' as const } } } },
        ],
      }),
      ...(p.stage && { stage: p.stage }),
      ...(p.type && { type: p.type }),
      ...(p.ownerId && { ownerId: p.ownerId }),
      ...(p.tag && { tags: { has: p.tag } }),
      ...(p.scoreMin != null && { score: { gte: Number(p.scoreMin) } }),
      ...(p.scoreMax != null && { score: { ...( p.scoreMin != null ? { gte: Number(p.scoreMin) } : {}), lte: Number(p.scoreMax) } }),
    }

    // Fix scoreMin+scoreMax combined
    if (p.scoreMin != null && p.scoreMax != null) {
      where.score = { gte: Number(p.scoreMin), lte: Number(p.scoreMax) }
    } else if (p.scoreMin != null) {
      where.score = { gte: Number(p.scoreMin) }
    } else if (p.scoreMax != null) {
      where.score = { lte: Number(p.scoreMax) }
    }

    const [data, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        select: contactSelect,
        orderBy: { [params.sortBy ?? 'createdAt']: params.sortOrder ?? 'desc' },
        skip,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ])

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    }
  }

  async getById(tenantId: string, id: string) {
    const contact = await prisma.contact.findFirst({
      where: { id, tenantId },
      select: {
        ...contactSelect,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { id: true, type: true, title: true, body: true, createdAt: true, user: { select: { name: true } } },
        },
        deals: {
          select: { id: true, title: true, stage: true, amount: true, status: true, pipeline: { select: { name: true } } },
        },
      },
    })
    if (!contact) throw new Error('Contacto no encontrado')
    return contact
  }

  async create(tenantId: string, userId: string, input: CreateContactInput) {
    const { emails, phones, ...rest } = input
    return prisma.contact.create({
      data: {
        ...rest,
        tenantId,
        ownerId: rest.ownerId ?? userId,
        emails: emails ? { create: emails } : undefined,
        phones: phones ? { create: phones } : undefined,
      },
      select: contactSelect,
    })
  }

  async update(tenantId: string, id: string, input: UpdateContactInput) {
    await this.assertExists(tenantId, id)
    const { emails, phones, ...rest } = input
    return prisma.contact.update({
      where: { id },
      data: {
        ...rest,
        ...(emails !== undefined && {
          emails: {
            deleteMany: {},
            create: emails,
          },
        }),
        ...(phones !== undefined && {
          phones: {
            deleteMany: {},
            create: phones,
          },
        }),
      },
      select: contactSelect,
    })
  }

  async delete(tenantId: string, id: string) {
    await this.assertExists(tenantId, id)
    await prisma.contact.delete({ where: { id } })
  }

  async recalculateScore(tenantId: string, id: string) {
    const contact = await prisma.contact.findFirst({
      where: { id, tenantId },
      include: {
        emails: true,
        phones: true,
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
        deals: { include: { activities: { select: { id: true } } } },
        conversations: { select: { id: true, metadataJson: true } },
      },
    })
    if (!contact) throw new Error('Contacto no encontrado')

    let score = 0
    const breakdown: Record<string, number> = {}

    // --- Completitud del perfil (25 pts) ---
    if (contact.emails.length > 0) { score += 15; breakdown['Email registrado'] = 15 }
    if (contact.phones.length > 0) { score += 5; breakdown['Teléfono registrado'] = 5 }
    if (contact.notes) { score += 3; breakdown['Tiene notas'] = 3 }
    if (contact.companyName) { score += 2; breakdown['Empresa registrada'] = 2 }

    // --- Actividad reciente (30 pts) ---
    const now = Date.now()
    const activitiesLast7 = contact.activities.filter(a => now - new Date(a.createdAt).getTime() < 7 * 86400_000)
    const activitiesLast30 = contact.activities.filter(a => now - new Date(a.createdAt).getTime() < 30 * 86400_000)
    const recencyPts = Math.min(activitiesLast7.length * 8, 20)
    const volumePts = Math.min(activitiesLast30.length * 2, 10)
    if (recencyPts > 0) { score += recencyPts; breakdown[`${activitiesLast7.length} actividades últimos 7d`] = recencyPts }
    if (volumePts > 0) { score += volumePts; breakdown[`${activitiesLast30.length} actividades últimos 30d`] = volumePts }

    // --- Tipo de actividades (10 pts) ---
    const hasMeeting = contact.activities.some(a => a.type === 'MEETING')
    const hasCall = contact.activities.some(a => a.type === 'CALL')
    if (hasMeeting) { score += 6; breakdown['Reunión registrada'] = 6 }
    else if (hasCall) { score += 4; breakdown['Llamada registrada'] = 4 }

    // --- Deals (30 pts) ---
    const openDeals = contact.deals.filter(d => d.status === 'OPEN')
    const wonDeals = contact.deals.filter(d => d.status === 'WON')
    const dealValuePts = Math.min(openDeals.length * 10, 20)
    const wonPts = Math.min(wonDeals.length * 10, 10)
    if (dealValuePts > 0) { score += dealValuePts; breakdown[`${openDeals.length} deal(s) abierto(s)`] = dealValuePts }
    if (wonPts > 0) { score += wonPts; breakdown[`${wonDeals.length} deal(s) ganado(s)`] = wonPts }

    // --- Sentimiento en conversaciones (5 pts) ---
    const positiveConvs = contact.conversations.filter(c => {
      const meta = c.metadataJson as any
      return meta?.sentiment?.sentiment === 'positivo'
    }).length
    if (positiveConvs > 0) { score += 5; breakdown['Conversaciones positivas'] = 5 }

    score = Math.min(Math.round(score), 100)
    await prisma.contact.update({ where: { id }, data: { score } })
    return { score, breakdown, prediction: scoreToPrediction(score) }
  }

  private async assertExists(tenantId: string, id: string) {
    const c = await prisma.contact.findFirst({ where: { id, tenantId }, select: { id: true } })
    if (!c) throw new Error('Contacto no encontrado')
  }
}

function scoreToPrediction(score: number): { label: string; probability: number; recommendation: string } {
  if (score >= 80) return { label: 'Hot lead', probability: 0.85, recommendation: 'Contactar de inmediato con propuesta' }
  if (score >= 60) return { label: 'Warm lead', probability: 0.55, recommendation: 'Agendar reunión de calificación' }
  if (score >= 40) return { label: 'Nurturing', probability: 0.30, recommendation: 'Enviar contenido de valor y hacer seguimiento' }
  if (score >= 20) return { label: 'Cold lead', probability: 0.12, recommendation: 'Incluir en campaña de reactivación' }
  return { label: 'Inactivo', probability: 0.05, recommendation: 'Completar datos del perfil y registrar primer contacto' }
}
