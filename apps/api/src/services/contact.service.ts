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

    const where = {
      tenantId,
      ...(params.search && {
        OR: [
          { firstName: { contains: params.search, mode: 'insensitive' as const } },
          { lastName: { contains: params.search, mode: 'insensitive' as const } },
          { companyName: { contains: params.search, mode: 'insensitive' as const } },
          { emails: { some: { email: { contains: params.search, mode: 'insensitive' as const } } } },
        ],
      }),
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
        activities: { where: { createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } } },
        deals: { where: { status: { in: ['OPEN', 'WON'] } } },
      },
    })
    if (!contact) throw new Error('Contacto no encontrado')

    let score = 0
    const breakdown: Record<string, number> = {}

    if (contact.emails.length > 0) { score += 20; breakdown['Tiene email'] = 20 }
    if (contact.phones.length > 0) { score += 15; breakdown['Tiene teléfono'] = 15 }
    if (contact.notes) { score += 5; breakdown['Tiene notas'] = 5 }

    const activityPoints = Math.min(contact.activities.length * 5, 30)
    if (activityPoints > 0) { score += activityPoints; breakdown[`${contact.activities.length} actividades recientes`] = activityPoints }

    const openDeals = contact.deals.filter(d => d.status === 'OPEN').length
    const openPoints = Math.min(openDeals * 15, 15)
    if (openPoints > 0) { score += openPoints; breakdown[`${openDeals} deal(s) abierto(s)`] = openPoints }

    const wonDeals = contact.deals.filter(d => d.status === 'WON').length
    const wonPoints = Math.min(wonDeals * 15, 15)
    if (wonPoints > 0) { score += wonPoints; breakdown[`${wonDeals} deal(s) ganado(s)`] = wonPoints }

    score = Math.min(score, 100)
    await prisma.contact.update({ where: { id }, data: { score } })
    return { score, breakdown }
  }

  private async assertExists(tenantId: string, id: string) {
    const c = await prisma.contact.findFirst({ where: { id, tenantId }, select: { id: true } })
    if (!c) throw new Error('Contacto no encontrado')
  }
}
