import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@crm/database'

const stageSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number(),
  color: z.string(),
})

const createSchema = z.object({
  name: z.string().min(1).max(100),
  stages: z.array(stageSchema).min(1),
  isDefault: z.boolean().optional(),
})

export const pipelineRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (request) => {
    const pipelines = await prisma.pipeline.findMany({
      where: { tenantId: request.authUser.tenantId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
    return pipelines.map((p) => ({ ...p, stages: p.stagesJson }))
  })

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const pipeline = await prisma.pipeline.findFirst({
      where: { id, tenantId: request.authUser.tenantId },
    })
    if (!pipeline) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Pipeline no encontrado' })
    return { ...pipeline, stages: pipeline.stagesJson }
  })

  fastify.post('/', { preHandler: [fastify.requireRole(['ADMIN', 'MANAGER'])] }, async (request, reply) => {
    const body = createSchema.parse(request.body)
    const pipeline = await prisma.pipeline.create({
      data: {
        tenantId: request.authUser.tenantId,
        name: body.name,
        stagesJson: body.stages,
        isDefault: body.isDefault ?? false,
      },
    })
    return reply.status(201).send({ ...pipeline, stages: pipeline.stagesJson })
  })

  fastify.patch('/:id', { preHandler: [fastify.requireRole(['ADMIN', 'MANAGER'])] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = createSchema.partial().parse(request.body)
    const existing = await prisma.pipeline.findFirst({ where: { id, tenantId: request.authUser.tenantId } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Pipeline no encontrado' })
    const updated = await prisma.pipeline.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.stages && { stagesJson: body.stages }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      },
    })
    return { ...updated, stages: updated.stagesJson }
  })

  fastify.delete('/:id', { preHandler: [fastify.requireRole(['ADMIN'])] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await prisma.pipeline.findFirst({ where: { id, tenantId: request.authUser.tenantId } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Pipeline no encontrado' })
    if (existing.isDefault) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'No puedes eliminar el pipeline por defecto' })
    await prisma.pipeline.delete({ where: { id } })
    return reply.status(204).send()
  })
}
