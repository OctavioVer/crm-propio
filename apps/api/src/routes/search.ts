import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@crm/database'

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (request) => {
    const { q } = z.object({ q: z.string().min(1).max(100) }).parse(request.query)
    const tenantId = request.authUser.tenantId

    const [contacts, deals] = await Promise.all([
      prisma.contact.findMany({
        where: {
          tenantId,
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { companyName: { contains: q, mode: 'insensitive' } },
            { emails: { some: { email: { contains: q, mode: 'insensitive' } } } },
          ],
        },
        select: { id: true, firstName: true, lastName: true, companyName: true, stage: true, score: true },
        take: 5,
      }),
      prisma.deal.findMany({
        where: {
          tenantId,
          title: { contains: q, mode: 'insensitive' },
        },
        select: { id: true, title: true, stage: true, status: true, amount: true, currency: true },
        take: 5,
      }),
    ])

    return {
      contacts: contacts.map(c => ({
        id: c.id,
        label: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.companyName || 'Sin nombre',
        sub: c.stage ?? '',
        type: 'contact' as const,
        score: c.score,
      })),
      deals: deals.map(d => ({
        id: d.id,
        label: d.title,
        sub: `${d.stage} · ${d.status}`,
        type: 'deal' as const,
        amount: Number(d.amount ?? 0),
        currency: d.currency,
      })),
    }
  })
}
