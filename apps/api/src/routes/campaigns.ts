import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@crm/database'
import { mailer } from '../lib/mailer'
import { config } from '../config'

const createSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
  filter: z.object({
    stage: z.string().optional(),
    tag: z.string().optional(),
    scoreMin: z.number().optional(),
    scoreMax: z.number().optional(),
  }).optional().default({}),
})

export const campaignRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  // Preview how many contacts would receive the campaign
  fastify.post('/preview', async (request) => {
    const { filter } = z.object({
      filter: z.object({
        stage: z.string().optional(),
        tag: z.string().optional(),
        scoreMin: z.number().optional(),
        scoreMax: z.number().optional(),
      }).optional().default({}),
    }).parse(request.body)

    const tenantId = request.authUser.tenantId
    const where: any = { tenantId }
    if (filter.stage) where.stage = filter.stage
    if (filter.tag) where.tags = { has: filter.tag }
    if (filter.scoreMin != null || filter.scoreMax != null) {
      where.score = {
        ...(filter.scoreMin != null && { gte: filter.scoreMin }),
        ...(filter.scoreMax != null && { lte: filter.scoreMax }),
      }
    }

    const [count, withEmail] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.count({ where: { ...where, emails: { some: {} } } }),
    ])
    return { total: count, withEmail }
  })

  // Send campaign
  fastify.post('/send', async (request, reply) => {
    const body = createSchema.parse(request.body)
    const tenantId = request.authUser.tenantId

    const where: any = { tenantId }
    if (body.filter?.stage) where.stage = body.filter.stage
    if (body.filter?.tag) where.tags = { has: body.filter.tag }
    if (body.filter?.scoreMin != null || body.filter?.scoreMax != null) {
      where.score = {
        ...(body.filter.scoreMin != null && { gte: body.filter.scoreMin }),
        ...(body.filter.scoreMax != null && { lte: body.filter.scoreMax }),
      }
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: { emails: { where: { isPrimary: true }, take: 1 } },
      take: 500,
    })

    const targets = contacts
      .map(c => ({ contact: c, email: c.emails[0]?.email }))
      .filter(t => t.email)

    if (!targets.length) {
      return reply.status(400).send({ message: 'No hay contactos con email para este segmento' })
    }

    let sent = 0
    let failed = 0

    for (const { contact, email } of targets) {
      const firstName = contact.firstName ?? contact.companyName ?? 'Cliente'
      const personalizedBody = body.body
        .replace(/\{\{nombre\}\}/gi, firstName)
        .replace(/\{\{empresa\}\}/gi, contact.companyName ?? '')
      try {
        await mailer.sendMail({
          from: config.SMTP_FROM,
          to: email!,
          subject: body.subject.replace(/\{\{nombre\}\}/gi, firstName),
          text: personalizedBody,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><p style="white-space:pre-wrap">${personalizedBody.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p></div>`,
        })
        sent++
      } catch {
        failed++
      }
    }

    // Log as activity on each contact
    if (sent > 0) {
      await prisma.activity.createMany({
        data: targets.slice(0, sent).map(({ contact }) => ({
          tenantId,
          type: 'EMAIL' as const,
          contactId: contact.id,
          userId: request.authUser.id,
          title: `Campaña: ${body.name}`,
          body: body.subject,
          completedAt: new Date(),
        })),
      })
    }

    return reply.status(201).send({ sent, failed, total: targets.length, campaignName: body.name })
  })
}
