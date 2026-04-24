import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@crm/database'
import Anthropic from '@anthropic-ai/sdk'
import { config } from '../config'

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

  // Sentiment analysis via Claude
  fastify.post('/:id/analyze', async (request, reply) => {
    const { id } = request.params as { id: string }
    if (!config.ANTHROPIC_API_KEY) {
      return reply.status(503).send({ message: 'AI no configurada' })
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id, tenantId: request.authUser.tenantId },
      include: { messages: { orderBy: { sentAt: 'asc' }, take: 20 } },
    })
    if (!conversation) return reply.status(404).send({ message: 'Conversación no encontrada' })
    if (conversation.messages.length === 0) {
      return reply.status(400).send({ message: 'La conversación no tiene mensajes' })
    }

    const transcript = conversation.messages
      .map(m => `[${m.direction === 'IN' ? 'Cliente' : 'Agente'}]: ${m.body ?? ''}`)
      .join('\n')

    const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Analizá el sentimiento de esta conversación de soporte/ventas y devolvé un JSON con:
- sentiment: "positivo" | "neutro" | "negativo"
- score: número del -1 (muy negativo) al 1 (muy positivo)
- summary: resumen de 1 oración del tono
- urgency: "baja" | "media" | "alta"

Conversación:
${transcript}

Respondé SOLO con el JSON, sin markdown.`,
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
    let analysis: Record<string, unknown> = {}
    try { analysis = JSON.parse(text) } catch { analysis = { sentiment: 'neutro', score: 0, summary: text, urgency: 'baja' } }

    // Store in metadata
    const meta = (conversation.metadataJson as Record<string, unknown>) ?? {}
    await prisma.conversation.update({
      where: { id },
      data: { metadataJson: { ...meta, sentiment: analysis } },
    })

    return analysis
  })
}
