import { prisma } from '@crm/database'

interface CreateActivityInput {
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'TASK' | 'WHATSAPP'
  contactId?: string
  dealId?: string
  title?: string
  body?: string
  outcome?: string
  scheduledAt?: Date
  dueAt?: Date
}

export class ActivityService {
  async create(tenantId: string, userId: string, input: CreateActivityInput) {
    return prisma.activity.create({
      data: {
        ...input,
        tenantId,
        userId,
      },
      include: {
        user: { select: { name: true } },
      },
    })
  }

  async listByContact(tenantId: string, contactId: string) {
    return prisma.activity.findMany({
      where: { tenantId, contactId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
      },
    })
  }

  async listByDeal(tenantId: string, dealId: string) {
    return prisma.activity.findMany({
      where: { tenantId, dealId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
      },
    })
  }
}
