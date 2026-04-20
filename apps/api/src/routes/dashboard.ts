import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '@crm/database'

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/stats', async (request) => {
    const tenantId = request.authUser.tenantId
    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 86400_000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000)

    const [contacts, openDeals, dealsClosingSoon, recentActivities, wonDealsThisMonth] = await Promise.all([
      prisma.contact.count({ where: { tenantId } }),
      prisma.deal.count({ where: { tenantId, status: 'OPEN' } }),
      prisma.deal.findMany({
        where: {
          tenantId,
          status: 'OPEN',
          closeDate: { lte: weekFromNow, gte: now },
        },
        select: {
          id: true,
          title: true,
          stage: true,
          amount: true,
          currency: true,
          closeDate: true,
          contact: { select: { firstName: true, lastName: true, companyName: true } },
        },
        orderBy: { closeDate: 'asc' },
        take: 10,
      }),
      prisma.activity.findMany({
        where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
        include: {
          user: { select: { name: true, avatarUrl: true } },
          contact: { select: { firstName: true, lastName: true, companyName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.deal.aggregate({
        where: { tenantId, status: 'WON', updatedAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
        _count: true,
      }),
    ])

    return {
      contacts,
      openDeals,
      dealsClosingSoon,
      recentActivities,
      wonThisMonth: {
        count: wonDealsThisMonth._count,
        revenue: Number(wonDealsThisMonth._sum.amount ?? 0),
      },
    }
  })
}
