import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { ActivityService } from '../services/activity.service'

const createSchema = z.object({
  type: z.enum(['CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK', 'WHATSAPP']),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  outcome: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  dueAt: z.string().datetime().optional(),
})

export const activityRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new ActivityService()

  fastify.addHook('preHandler', fastify.authenticate)

  fastify.post('/', async (request, reply) => {
    const body = createSchema.parse(request.body)
    const activity = await service.create(request.authUser.tenantId, request.authUser.id, {
      ...body,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
    })
    return reply.status(201).send(activity)
  })

  fastify.get('/contact/:contactId', async (request) => {
    const { contactId } = request.params as { contactId: string }
    return service.listByContact(request.authUser.tenantId, contactId)
  })

  fastify.get('/deal/:dealId', async (request) => {
    const { dealId } = request.params as { dealId: string }
    return service.listByDeal(request.authUser.tenantId, dealId)
  })
}
