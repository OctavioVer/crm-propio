import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '@crm/database'

export const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  // Get notifications for current user (unread first)
  fastify.get('/', async (request) => {
    const notifications = await prisma.notification.findMany({
      where: {
        tenantId: request.authUser.tenantId,
        userId: request.authUser.id,
      },
      orderBy: [{ readAt: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    })
    const unreadCount = notifications.filter(n => !n.readAt).length
    return { data: notifications, unreadCount }
  })

  // Mark one as read
  fastify.patch('/:id/read', async (request, reply) => {
    const { id } = request.params as { id: string }
    const notif = await prisma.notification.findFirst({
      where: { id, userId: request.authUser.id, tenantId: request.authUser.tenantId },
    })
    if (!notif) return reply.status(404).send({ message: 'Notificación no encontrada' })
    await prisma.notification.update({ where: { id }, data: { readAt: new Date() } })
    return reply.status(204).send()
  })

  // Mark all as read
  fastify.post('/read-all', async (request) => {
    await prisma.notification.updateMany({
      where: { userId: request.authUser.id, tenantId: request.authUser.tenantId, readAt: null },
      data: { readAt: new Date() },
    })
    return { ok: true }
  })

  // Delete notification
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const notif = await prisma.notification.findFirst({
      where: { id, userId: request.authUser.id, tenantId: request.authUser.tenantId },
    })
    if (!notif) return reply.status(404).send({ message: 'Notificación no encontrada' })
    await prisma.notification.delete({ where: { id } })
    return reply.status(204).send()
  })
}

// Helper to create a notification (used internally from other routes)
export async function createNotification(params: {
  tenantId: string
  userId: string
  title: string
  body?: string
  type?: string
  entityType?: string
  entityId?: string
}) {
  return prisma.notification.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      title: params.title,
      body: params.body,
      type: params.type ?? 'info',
      entityType: params.entityType,
      entityId: params.entityId,
    },
  })
}
