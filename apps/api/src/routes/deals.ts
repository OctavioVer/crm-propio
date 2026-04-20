import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { DealService } from '../services/deal.service'

const createSchema = z.object({
  pipelineId: z.string(),
  contactId: z.string().optional(),
  ownerId: z.string().optional(),
  title: z.string().min(1).max(200),
  stage: z.string(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  probability: z.number().min(0).max(100).optional(),
  closeDate: z.string().datetime().optional(),
  notes: z.string().optional(),
})

const listSchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(200).optional(),
  search: z.string().optional(),
  pipelineId: z.string().optional(),
  stage: z.string().optional(),
  status: z.enum(['OPEN', 'WON', 'LOST']).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

const stageSchema = z.object({ stage: z.string() })

export const dealRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new DealService()

  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (request) => {
    const params = listSchema.parse(request.query)
    return service.list(request.authUser.tenantId, params)
  })

  fastify.get('/kanban/:pipelineId', async (request, reply) => {
    const { pipelineId } = request.params as { pipelineId: string }
    try {
      return await service.kanban(request.authUser.tenantId, pipelineId)
    } catch {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Pipeline no encontrado' })
    }
  })

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return await service.getById(request.authUser.tenantId, id)
    } catch {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Deal no encontrado' })
    }
  })

  fastify.post('/', async (request, reply) => {
    const body = createSchema.parse(request.body)
    try {
      const deal = await service.create(request.authUser.tenantId, request.authUser.id, body)
      return reply.status(201).send(deal)
    } catch (err: any) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: err.message })
    }
  })

  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = createSchema.omit({ pipelineId: true }).partial().parse(request.body)
    try {
      return await service.update(request.authUser.tenantId, id, body)
    } catch {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Deal no encontrado' })
    }
  })

  fastify.patch('/:id/stage', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { stage } = stageSchema.parse(request.body)
    try {
      return await service.moveStage(request.authUser.tenantId, id, stage)
    } catch {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Deal no encontrado' })
    }
  })

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await service.delete(request.authUser.tenantId, id)
      return reply.status(204).send()
    } catch {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Deal no encontrado' })
    }
  })
}
