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
      data: rest,
      select: contactSelect,
    })
  }

  async delete(tenantId: string, id: string) {
    await this.assertExists(tenantId, id)
    await prisma.contact.delete({ where: { id } })
  }

  private async assertExists(tenantId: string, id: string) {
    const c = await prisma.contact.findFirst({ where: { id, tenantId }, select: { id: true } })
    if (!c) throw new Error('Contacto no encontrado')
  }
}
