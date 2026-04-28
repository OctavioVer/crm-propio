import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { ContactService } from '../services/contact.service'
import { AiService } from '../services/ai.service'
import { triggerWorkflows } from '../workers/workflow.worker'
import { mailer } from '../lib/mailer'
import { prisma } from '@crm/database'
import { config } from '../config'
import { dispatchWebhook } from '../lib/webhook-dispatch'

const createSchema = z.object({
  type: z.enum(['PERSON', 'COMPANY']).optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  companyName: z.string().max(200).optional(),
  ownerId: z.string().optional(),
  stage: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  emails: z.array(z.object({ email: z.string().email(), isPrimary: z.boolean().optional() })).optional(),
  phones: z.array(z.object({ phone: z.string(), type: z.string().optional() })).optional(),
})

const listSchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  stage: z.string().optional(),
  type: z.enum(['PERSON', 'COMPANY']).optional(),
  ownerId: z.string().optional(),
  tag: z.string().optional(),
  scoreMin: z.coerce.number().min(0).max(100).optional(),
  scoreMax: z.coerce.number().min(0).max(100).optional(),
})

export const contactRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new ContactService()
  const ai = new AiService()

  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (request) => {
    const params = listSchema.parse(request.query)
    return service.list(request.authUser.tenantId, params)
  })

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return await service.getById(request.authUser.tenantId, id)
    } catch {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Contacto no encontrado' })
    }
  })

  fastify.post('/', async (request, reply) => {
    const body = createSchema.parse(request.body)
    const contact = await service.create(request.authUser.tenantId, request.authUser.id, body)
    triggerWorkflows(request.authUser.tenantId, 'contact_created', 'contact', contact.id).catch(() => {})
    dispatchWebhook(request.authUser.tenantId, 'contact.created', { id: contact.id, firstName: contact.firstName, lastName: contact.lastName, email: contact.emails?.[0]?.email }).catch(() => {})
    return reply.status(201).send(contact)
  })

  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = createSchema.partial().parse(request.body)
    try {
      return await service.update(request.authUser.tenantId, id, body)
    } catch {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Contacto no encontrado' })
    }
  })

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await service.delete(request.authUser.tenantId, id)
      return reply.status(204).send()
    } catch {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Contacto no encontrado' })
    }
  })

  fastify.post('/:id/score', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const result = await service.recalculateScore(request.authUser.tenantId, id)
      return reply.send(result)
    } catch {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Contacto no encontrado' })
    }
  })

  fastify.post('/:id/summary', async (request, reply) => {
    const { id } = request.params as { id: string }
    if (!process.env.ANTHROPIC_API_KEY) {
      return reply.status(503).send({ statusCode: 503, error: 'Unavailable', message: 'API key de AI no configurada' })
    }
    try {
      const summary = await ai.summarizeContact(request.authUser.tenantId, id)
      return reply.send({ summary })
    } catch (err: any) {
      return reply.status(500).send({ statusCode: 500, error: 'Error', message: err.message })
    }
  })

  fastify.get('/:id/nba', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const nba = await ai.suggestNextAction(request.authUser.tenantId, id)
      return reply.send(nba)
    } catch {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Contacto no encontrado' })
    }
  })

  // Bulk actions
  fastify.post('/bulk', async (request, reply) => {
    const body = z.object({
      ids: z.array(z.string()).min(1).max(200),
      action: z.enum(['delete', 'add_tag', 'remove_tag', 'set_stage', 'set_owner']),
      value: z.string().optional(),
    }).parse(request.body)

    const tenantId = request.authUser.tenantId
    const where = { id: { in: body.ids }, tenantId }

    switch (body.action) {
      case 'delete':
        await prisma.contact.deleteMany({ where })
        return reply.status(200).send({ affected: body.ids.length })

      case 'add_tag': {
        if (!body.value) return reply.status(400).send({ message: 'Tag requerido' })
        const contacts = await prisma.contact.findMany({ where, select: { id: true, tags: true } })
        await Promise.all(contacts.map(c =>
          c.tags.includes(body.value!)
            ? Promise.resolve()
            : prisma.contact.update({ where: { id: c.id }, data: { tags: [...c.tags, body.value!] } })
        ))
        return { affected: contacts.length }
      }

      case 'remove_tag': {
        if (!body.value) return reply.status(400).send({ message: 'Tag requerido' })
        const contacts = await prisma.contact.findMany({ where, select: { id: true, tags: true } })
        await Promise.all(contacts.map(c =>
          prisma.contact.update({ where: { id: c.id }, data: { tags: c.tags.filter(t => t !== body.value) } })
        ))
        return { affected: contacts.length }
      }

      case 'set_stage':
        if (!body.value) return reply.status(400).send({ message: 'Etapa requerida' })
        await prisma.contact.updateMany({ where, data: { stage: body.value } })
        return { affected: body.ids.length }

      case 'set_owner':
        if (!body.value) return reply.status(400).send({ message: 'Owner requerido' })
        await prisma.contact.updateMany({ where, data: { ownerId: body.value } })
        return { affected: body.ids.length }
    }
  })

  const emailSchema = z.object({
    subject: z.string().min(1).max(200),
    body: z.string().min(1),
    to: z.string().email().optional(),
  })

  fastify.post('/:id/email', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { subject, body, to } = emailSchema.parse(request.body)

    const contact = await prisma.contact.findFirst({
      where: { id, tenantId: request.authUser.tenantId },
      include: { emails: true },
    })
    if (!contact) return reply.status(404).send({ message: 'Contacto no encontrado' })

    const recipient = to ?? contact.emails.find(e => e.isPrimary)?.email ?? contact.emails[0]?.email
    if (!recipient) return reply.status(400).send({ message: 'El contacto no tiene email registrado' })

    const senderUser = await prisma.user.findUnique({
      where: { id: request.authUser.id },
      select: { name: true, email: true },
    })
    const fromName = senderUser?.name ?? 'CRM'
    const fromEmail = config.SMTP_FROM

    await mailer.sendMail({
      from: `${fromName} <${fromEmail.includes('<') ? fromEmail.match(/<(.+)>/)?.[1] ?? 'noreply@crm.local' : fromEmail}>`,
      to: recipient,
      subject,
      text: body,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><p style="white-space:pre-wrap">${body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p></div>`,
    })

    // Log the email as an activity
    await prisma.activity.create({
      data: {
        tenantId: request.authUser.tenantId,
        type: 'EMAIL',
        contactId: id,
        userId: request.authUser.id,
        title: subject,
        body: `Para: ${recipient}\n\n${body}`,
        completedAt: new Date(),
      },
    })

    return reply.status(201).send({ ok: true, sentTo: recipient })
  })
}
