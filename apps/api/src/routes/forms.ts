import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@crm/database'
import { mailer } from '../lib/mailer'
import { config } from '../config'
import { nanoid } from 'nanoid'

const fieldSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'number']),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  mapTo: z.enum(['firstName', 'lastName', 'companyName', 'email', 'phone', 'notes', 'stage']).optional(),
})

const createFormSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  fields: z.array(fieldSchema).min(1),
  active: z.boolean().optional().default(true),
  notifyEmail: z.string().email().optional(),
  redirectUrl: z.string().url().optional(),
  submitMessage: z.string().optional().default('¡Gracias! Nos pondremos en contacto pronto.'),
})

export const formRoutes: FastifyPluginAsync = async (fastify) => {
  // ── Public routes (NO auth) — registered outside authenticated scope ──────
  fastify.get('/public/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const form = await prisma.form.findFirst({
      where: { slug, active: true },
      select: { id: true, name: true, description: true, fieldsJson: true, submitMessage: true, redirectUrl: true },
    })
    if (!form) return reply.status(404).send({ message: 'Formulario no encontrado' })
    return form
  })

  fastify.post('/public/:slug/submit', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const form = await prisma.form.findFirst({ where: { slug, active: true } })
    if (!form) return reply.status(404).send({ message: 'Formulario no encontrado' })

    const submissionData = request.body as Record<string, unknown>
    const fields = form.fieldsJson as Array<{ mapTo?: string; id: string }>
    const contactData: Record<string, string> = {}
    for (const field of fields) {
      if (field.mapTo && submissionData[field.id] != null) {
        contactData[field.mapTo] = String(submissionData[field.id])
      }
    }

    let contactId: string | null = null
    if (contactData.email) {
      const existing = await prisma.contactEmail.findFirst({
        where: { email: contactData.email, contact: { tenantId: form.tenantId } },
        include: { contact: true },
      })
      if (existing) {
        contactId = existing.contact.id
      } else {
        const contact = await prisma.contact.create({
          data: {
            tenantId: form.tenantId,
            type: 'PERSON',
            firstName: contactData.firstName || undefined,
            lastName: contactData.lastName || undefined,
            companyName: contactData.companyName || undefined,
            stage: contactData.stage || 'Lead',
            notes: contactData.notes || undefined,
            source: `form:${form.slug}`,
            emails: { create: [{ email: contactData.email, isPrimary: true }] },
            ...(contactData.phone && { phones: { create: [{ phone: contactData.phone, type: 'mobile' }] } }),
          },
        })
        contactId = contact.id
      }
    }

    await prisma.formSubmission.create({
      data: {
        formId: form.id,
        contactId,
        dataJson: submissionData as any,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
      },
    })

    if (form.notifyEmail && contactData.email) {
      await mailer.sendMail({
        from: config.SMTP_FROM,
        to: form.notifyEmail,
        subject: `Nueva respuesta en "${form.name}"`,
        html: `<p>Nuevo envío del formulario <strong>${form.name}</strong>:</p><ul>${
          Object.entries(submissionData).map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`).join('')
        }</ul>`,
      }).catch(() => {})
    }

    return { ok: true, message: (form.submitMessage as string) ?? '¡Gracias!', redirectUrl: form.redirectUrl }
  })

  // ── Authenticated routes — in child scope with auth hook ─────────────────
  fastify.register(async (auth) => {
    auth.addHook('preHandler', fastify.authenticate)

    auth.get('/', async (request) => {
      return prisma.form.findMany({
        where: { tenantId: request.authUser.tenantId },
        include: { _count: { select: { submissions: true } } },
        orderBy: { createdAt: 'desc' },
      })
    })

    auth.get('/:id', async (request, reply) => {
      const { id } = request.params as { id: string }
      const form = await prisma.form.findFirst({
        where: { id, tenantId: request.authUser.tenantId },
        include: { submissions: { orderBy: { createdAt: 'desc' }, take: 50 } },
      })
      if (!form) return reply.status(404).send({ message: 'Formulario no encontrado' })
      return form
    })

    auth.post('/', async (request, reply) => {
      const body = createFormSchema.parse(request.body)
      const slug = nanoid(10).toLowerCase()
      const form = await prisma.form.create({
        data: {
          tenantId: request.authUser.tenantId,
          name: body.name,
          slug,
          description: body.description,
          fieldsJson: body.fields as any,
          active: body.active,
          notifyEmail: body.notifyEmail,
          redirectUrl: body.redirectUrl,
          submitMessage: body.submitMessage,
        },
      })
      return reply.status(201).send(form)
    })

    auth.patch('/:id', async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = createFormSchema.partial().parse(request.body)
      const form = await prisma.form.findFirst({ where: { id, tenantId: request.authUser.tenantId } })
      if (!form) return reply.status(404).send({ message: 'Formulario no encontrado' })
      return prisma.form.update({
        where: { id },
        data: {
          ...(body.name && { name: body.name }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.fields && { fieldsJson: body.fields as any }),
          ...(body.active !== undefined && { active: body.active }),
          ...(body.notifyEmail !== undefined && { notifyEmail: body.notifyEmail }),
          ...(body.redirectUrl !== undefined && { redirectUrl: body.redirectUrl }),
          ...(body.submitMessage !== undefined && { submitMessage: body.submitMessage }),
        },
      })
    })

    auth.delete('/:id', async (request, reply) => {
      const { id } = request.params as { id: string }
      const form = await prisma.form.findFirst({ where: { id, tenantId: request.authUser.tenantId } })
      if (!form) return reply.status(404).send({ message: 'Formulario no encontrado' })
      await prisma.form.delete({ where: { id } })
      return reply.status(204).send()
    })
  })
}
