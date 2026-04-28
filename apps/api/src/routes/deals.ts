import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { DealService } from '../services/deal.service'
import { triggerWorkflows } from '../workers/workflow.worker'
import { dispatchWebhook } from '../lib/webhook-dispatch'

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
      triggerWorkflows(request.authUser.tenantId, 'deal_created', 'deal', deal.id).catch(() => {})
      dispatchWebhook(request.authUser.tenantId, 'deal.created', { id: deal.id, title: deal.title, stage: deal.stage }).catch(() => {})
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
      const deal = await service.moveStage(request.authUser.tenantId, id, stage)
      const triggerType = deal.status === 'WON' ? 'deal_won' : deal.status === 'LOST' ? 'deal_lost' : 'deal_stage_changed'
      const webhookEvent = deal.status === 'WON' ? 'deal.won' : deal.status === 'LOST' ? 'deal.lost' : 'deal.stage_changed'
      triggerWorkflows(request.authUser.tenantId, triggerType, 'deal', id).catch(() => {})
      dispatchWebhook(request.authUser.tenantId, webhookEvent, { id: deal.id, title: deal.title, stage: deal.stage, status: deal.status }).catch(() => {})
      return deal
    } catch {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Deal no encontrado' })
    }
  })

  // Quick close: mark won or lost
  fastify.post('/:id/won', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const deal = await service.update(request.authUser.tenantId, id, { status: 'WON' as any })
      triggerWorkflows(request.authUser.tenantId, 'deal_won', 'deal', id).catch(() => {})
      dispatchWebhook(request.authUser.tenantId, 'deal.won', { id, title: (deal as any).title }).catch(() => {})
      return deal
    } catch {
      return reply.status(404).send({ message: 'Deal no encontrado' })
    }
  })

  fastify.post('/:id/lost', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { reason } = (request.body as any) ?? {}
    try {
      const deal = await service.update(request.authUser.tenantId, id, { status: 'LOST' as any, notes: reason })
      triggerWorkflows(request.authUser.tenantId, 'deal_lost', 'deal', id).catch(() => {})
      dispatchWebhook(request.authUser.tenantId, 'deal.lost', { id, title: (deal as any).title, reason }).catch(() => {})
      return deal
    } catch {
      return reply.status(404).send({ message: 'Deal no encontrado' })
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
