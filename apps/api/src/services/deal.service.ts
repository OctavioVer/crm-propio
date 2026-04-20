import { prisma } from '@crm/database'
import type { CreateDealInput, UpdateDealInput, PaginationParams } from '@crm/types'

const dealSelect = {
  id: true,
  tenantId: true,
  pipelineId: true,
  contactId: true,
  ownerId: true,
  title: true,
  stage: true,
  status: true,
  amount: true,
  currency: true,
  probability: true,
  closeDate: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  pipeline: { select: { id: true, name: true, stagesJson: true } },
  contact: { select: { id: true, firstName: true, lastName: true, companyName: true } },
  owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
}

export class DealService {
  async list(tenantId: string, params: PaginationParams & { pipelineId?: string; stage?: string; status?: string }) {
    const page = params.page ?? 1
    const limit = Math.min(params.limit ?? 50, 200)
    const skip = (page - 1) * limit

    const where = {
      tenantId,
      ...(params.pipelineId && { pipelineId: params.pipelineId }),
      ...(params.stage && { stage: params.stage }),
      ...(params.status && { status: params.status as any }),
      ...(params.search && {
        title: { contains: params.search, mode: 'insensitive' as const },
      }),
    }

    const [data, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        select: dealSelect,
        orderBy: { [params.sortBy ?? 'createdAt']: params.sortOrder ?? 'desc' },
        skip,
        take: limit,
      }),
      prisma.deal.count({ where }),
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
    const deal = await prisma.deal.findFirst({
      where: { id, tenantId },
      select: {
        ...dealSelect,
        products: {
          select: {
            qty: true,
            unitPrice: true,
            discount: true,
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, type: true, title: true, body: true, createdAt: true },
        },
      },
    })
    if (!deal) throw new Error('Deal no encontrado')
    return deal
  }

  async create(tenantId: string, userId: string, input: CreateDealInput) {
    const pipeline = await prisma.pipeline.findFirst({ where: { id: input.pipelineId, tenantId } })
    if (!pipeline) throw new Error('Pipeline no encontrado')

    return prisma.deal.create({
      data: {
        ...input,
        tenantId,
        ownerId: input.ownerId ?? userId,
        amount: input.amount ? input.amount : undefined,
      },
      select: dealSelect,
    })
  }

  async update(tenantId: string, id: string, input: UpdateDealInput) {
    await this.assertExists(tenantId, id)
    return prisma.deal.update({
      where: { id },
      data: input,
      select: dealSelect,
    })
  }

  async moveStage(tenantId: string, id: string, stage: string) {
    await this.assertExists(tenantId, id)
    return prisma.deal.update({
      where: { id },
      data: { stage },
      select: dealSelect,
    })
  }

  async delete(tenantId: string, id: string) {
    await this.assertExists(tenantId, id)
    await prisma.deal.delete({ where: { id } })
  }

  async kanban(tenantId: string, pipelineId: string) {
    const [pipeline, deals] = await Promise.all([
      prisma.pipeline.findFirst({ where: { id: pipelineId, tenantId } }),
      prisma.deal.findMany({
        where: { tenantId, pipelineId, status: 'OPEN' },
        select: dealSelect,
        orderBy: { updatedAt: 'desc' },
      }),
    ])

    if (!pipeline) throw new Error('Pipeline no encontrado')

    const stages = pipeline.stagesJson as any[]
    return stages.map((stage) => ({
      ...stage,
      deals: deals.filter((d) => d.stage === stage.id),
      total: deals.filter((d) => d.stage === stage.id).reduce((acc, d) => acc + Number(d.amount ?? 0), 0),
    }))
  }

  private async assertExists(tenantId: string, id: string) {
    const d = await prisma.deal.findFirst({ where: { id, tenantId }, select: { id: true } })
    if (!d) throw new Error('Deal no encontrado')
  }
}
