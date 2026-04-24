import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@crm/database'
import { dispatchWebhook } from '../lib/webhook-dispatch'

const WEBHOOK_EVENTS = [
  'contact.created', 'contact.updated', 'contact.deleted',
  'deal.created', 'deal.updated', 'deal.stage_changed', 'deal.won', 'deal.lost',
  'activity.created',
  'conversation.created', 'conversation.message_sent',
]

const createSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().optional(),
  active: z.boolean().optional().default(true),
})

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/events', async () => ({ events: WEBHOOK_EVENTS }))

  fastify.get('/', async (request) => {
    return prisma.webhook.findMany({
      where: { tenantId: request.authUser.tenantId },
      include: {
        _count: { select: { deliveries: true } },
        deliveries: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    })
  })

  fastify.post('/', async (request, reply) => {
    const body = createSchema.parse(request.body)
    const webhook = await prisma.webhook.create({
      data: { tenantId: request.authUser.tenantId, ...body },
    })
    return reply.status(201).send(webhook)
  })

  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = createSchema.partial().parse(request.body)
    const wh = await prisma.webhook.findFirst({ where: { id, tenantId: request.authUser.tenantId } })
    if (!wh) return reply.status(404).send({ message: 'Webhook no encontrado' })
    return prisma.webhook.update({ where: { id }, data: body })
  })

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const wh = await prisma.webhook.findFirst({ where: { id, tenantId: request.authUser.tenantId } })
    if (!wh) return reply.status(404).send({ message: 'Webhook no encontrado' })
    await prisma.webhook.delete({ where: { id } })
    return reply.status(204).send()
  })

  // Test a webhook
  fastify.post('/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string }
    const wh = await prisma.webhook.findFirst({ where: { id, tenantId: request.authUser.tenantId } })
    if (!wh) return reply.status(404).send({ message: 'Webhook no encontrado' })
    await dispatchWebhook(request.authUser.tenantId, 'test', { message: 'Prueba de conexión desde CRM Pro', webhookId: id })
    return { ok: true, message: 'Prueba enviada' }
  })

  // Get deliveries for a webhook
  fastify.get('/:id/deliveries', async (request, reply) => {
    const { id } = request.params as { id: string }
    const wh = await prisma.webhook.findFirst({ where: { id, tenantId: request.authUser.tenantId } })
    if (!wh) return reply.status(404).send({ message: 'Webhook no encontrado' })
    return prisma.webhookDelivery.findMany({
      where: { webhookId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  })
}
