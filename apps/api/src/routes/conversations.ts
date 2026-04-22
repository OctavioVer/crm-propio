import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@crm/database'

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
  status: z.enum(['OPEN', 'ASSIGNED', 'RESOLVED', 'ARCHIVED']).optional(),
  channel: z.enum(['EMAIL', 'WHATSAPP', 'SMS', 'CHAT', 'INSTAGRAM', 'FACEBOOK']).optional(),
  assignedTo: z.string().optional(),
})

const createSchema = z.object({
  channel: z.enum(['EMAIL', 'WHATSAPP', 'SMS', 'CHAT', 'INSTAGRAM', 'FACEBOOK']),
  contactId: z.string().optional(),
  assignedTo: z.string().optional(),
  firstMessage: z.string().optional(),
})

const updateSchema = z.object({
  status: z.enum(['OPEN', 'ASSIGNED', 'RESOLVED', 'ARCHIVED']).optional(),
  assignedTo: z.string().nullable().optional(),
})

const messageSchema = z.object({
  body: z.string().min(1),
  mediaUrls: z.array(z.string()).optional(),
})

export const conversationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (request) => {
    const { page, limit, status, channel, assignedTo } = listSchema.parse(request.query)
    const tenantId = request.authUser.tenantId

    const where = {
      tenantId,
      ...(status && { status: status as any }),
      ...(channel && { channel: channel as any }),
      ...(assignedTo && { assignedTo }),
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, companyName: true } },
          messages: { orderBy: { sentAt: 'desc' }, take: 1 },
          _count: { select: { messages: true } },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ])

    return {
      data: conversations,
      meta: { total, page, totalPages: Math.ceil(total / limit) },
    }
  })

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const conversation = await prisma.conversation.findFirst({
      where: { id, tenantId: request.authUser.tenantId },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, companyName: true, emails: true, phones: true } },
        messages: { orderBy: { sentAt: 'asc' } },
      },
    })
    if (!conversation) return reply.status(404).send({ message: 'Conversación no encontrada' })
    return conversation
  })

  fastify.post('/', async (request, reply) => {
    const body = createSchema.parse(request.body)
    const tenantId = request.authUser.tenantId

    const conversation = await prisma.conversation.create({
      data: {
        tenantId,
        channel: body.channel as any,
        contactId: body.contactId,
        assignedTo: body.assignedTo,
        status: body.assignedTo ? 'ASSIGNED' : 'OPEN',
        lastMessageAt: new Date(),
        ...(body.firstMessage && {
          messages: {
            create: {
              direction: 'OUT',
              body: body.firstMessage,
              sentAt: new Date(),
            },
          },
        }),
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        messages: true,
      },
    })
    return reply.status(201).send(conversation)
  })

  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = updateSchema.parse(request.body)

    const conversation = await prisma.conversation.findFirst({
      where: { id, tenantId: request.authUser.tenantId },
    })
    if (!conversation) return reply.status(404).send({ message: 'Conversación no encontrada' })

    const updated = await prisma.conversation.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status as any }),
        ...(body.assignedTo !== undefined && { assignedTo: body.assignedTo }),
      },
    })
    return updated
  })

  fastify.post('/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = messageSchema.parse(request.body)

    const conversation = await prisma.conversation.findFirst({
      where: { id, tenantId: request.authUser.tenantId },
    })
    if (!conversation) return reply.status(404).send({ message: 'Conversación no encontrada' })

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: id,
          direction: 'OUT',
          body: body.body,
          mediaUrls: body.mediaUrls ?? [],
          sentAt: new Date(),
        },
      }),
      prisma.conversation.update({
        where: { id },
        data: { lastMessageAt: new Date() },
      }),
    ])
    return reply.status(201).send(message)
  })

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const conversation = await prisma.conversation.findFirst({
      where: { id, tenantId: request.authUser.tenantId },
    })
    if (!conversation) return reply.status(404).send({ message: 'Conversación no encontrada' })
    await prisma.conversation.update({ where: { id }, data: { status: 'ARCHIVED' } })
    return reply.status(204).send()
  })
}
