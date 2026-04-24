import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@crm/database'

const filterSchema = z.object({
  search: z.string().optional(),
  stage: z.string().optional(),
  type: z.enum(['PERSON', 'COMPANY']).optional(),
  tag: z.string().optional(),
  scoreMin: z.number().optional(),
  scoreMax: z.number().optional(),
  ownerId: z.string().optional(),
  source: z.string().optional(),
})

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  filter: filterSchema,
})

export const segmentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (request) => {
    const segments = await prisma.segment.findMany({
      where: { tenantId: request.authUser.tenantId },
      orderBy: { createdAt: 'desc' },
    })
    // Annotate each segment with contact count
    const counts = await Promise.all(
      segments.map(async s => {
        const f = s.filterJson as any
        const where: any = { tenantId: request.authUser.tenantId }
        if (f.stage) where.stage = f.stage
        if (f.type) where.type = f.type
        if (f.tag) where.tags = { has: f.tag }
        if (f.ownerId) where.ownerId = f.ownerId
        if (f.source) where.source = { contains: f.source }
        if (f.scoreMin != null || f.scoreMax != null) {
          where.score = {
            ...(f.scoreMin != null && { gte: f.scoreMin }),
            ...(f.scoreMax != null && { lte: f.scoreMax }),
          }
        }
        return prisma.contact.count({ where })
      })
    )
    return segments.map((s, i) => ({ ...s, contactCount: counts[i] }))
  })

  fastify.post('/', async (request, reply) => {
    const body = createSchema.parse(request.body)
    const segment = await prisma.segment.create({
      data: {
        tenantId: request.authUser.tenantId,
        name: body.name,
        description: body.description,
        filterJson: body.filter,
      },
    })
    return reply.status(201).send(segment)
  })

  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = createSchema.partial().parse(request.body)
    const seg = await prisma.segment.findFirst({ where: { id, tenantId: request.authUser.tenantId } })
    if (!seg) return reply.status(404).send({ message: 'Segmento no encontrado' })
    return prisma.segment.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.filter && { filterJson: body.filter }),
      },
    })
  })

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const seg = await prisma.segment.findFirst({ where: { id, tenantId: request.authUser.tenantId } })
    if (!seg) return reply.status(404).send({ message: 'Segmento no encontrado' })
    await prisma.segment.delete({ where: { id } })
    return reply.status(204).send()
  })
}
