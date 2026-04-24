import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '@crm/database'
import { z } from 'zod'

const rowSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  stage: z.string().optional(),
  tags: z.string().optional(),
  notes: z.string().optional(),
})

const importSchema = z.object({
  rows: z.array(rowSchema).min(1).max(1000),
  skipDuplicates: z.boolean().default(true),
})

export const importRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.post('/contacts', async (request, reply) => {
    const { rows, skipDuplicates } = importSchema.parse(request.body)
    const tenantId = request.authUser.tenantId
    const userId = request.authUser.id

    let created = 0
    let skipped = 0
    let errors = 0
    const errorDetails: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        // Check duplicate by email
        if (skipDuplicates && row.email) {
          const exists = await prisma.contactEmail.findFirst({
            where: {
              email: row.email,
              contact: { tenantId },
            },
          })
          if (exists) { skipped++; continue }
        }

        if (!row.firstName && !row.lastName && !row.companyName && !row.email) {
          skipped++
          continue
        }

        const tags = row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : []

        await prisma.contact.create({
          data: {
            tenantId,
            ownerId: userId,
            type: row.companyName && !row.firstName ? 'COMPANY' : 'PERSON',
            firstName: row.firstName || undefined,
            lastName: row.lastName || undefined,
            companyName: row.companyName || undefined,
            stage: row.stage || undefined,
            notes: row.notes || undefined,
            tags,
            ...(row.email && {
              emails: { create: [{ email: row.email, isPrimary: true }] },
            }),
            ...(row.phone && {
              phones: { create: [{ phone: row.phone, type: 'mobile' }] },
            }),
          },
        })
        created++
      } catch {
        errors++
        errorDetails.push(`Fila ${i + 2}: error al procesar`)
      }
    }

    return reply.status(201).send({ created, skipped, errors, errorDetails })
  })
}
