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

  fastify.get('/analytics', async (request) => {
    const tenantId = request.authUser.tenantId
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400_000)

    const [sellerStats, pipelineByStage, dealsByMonth, conversionRates] = await Promise.all([
      // Per-seller performance
      prisma.user.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          email: true,
          ownedDeals: {
            where: { tenantId },
            select: { id: true, status: true, amount: true, createdAt: true, updatedAt: true },
          },
          activities: {
            where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
            select: { id: true, type: true },
          },
        },
      }),
      // Pipeline value by stage
      prisma.deal.groupBy({
        by: ['stage'],
        where: { tenantId, status: 'OPEN' },
        _count: true,
        _sum: { amount: true },
      }),
      // Won deals last 30 vs 60 days
      prisma.deal.findMany({
        where: { tenantId, status: 'WON', updatedAt: { gte: sixtyDaysAgo } },
        select: { amount: true, updatedAt: true },
        orderBy: { updatedAt: 'asc' },
      }),
      // Conversion funnel
      prisma.deal.groupBy({
        by: ['status'],
        where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
        _count: true,
        _sum: { amount: true },
      }),
    ])

    // Compute seller metrics
    const sellers = sellerStats.map(user => {
      const dealsOpen = user.ownedDeals.filter(d => d.status === 'OPEN')
      const dealsWon = user.ownedDeals.filter(d => d.status === 'WON' && d.updatedAt >= thirtyDaysAgo)
      const dealsLost = user.ownedDeals.filter(d => d.status === 'LOST' && d.updatedAt >= thirtyDaysAgo)
      const wonRevenue = dealsWon.reduce((sum, d) => sum + Number(d.amount ?? 0), 0)
      const closedTotal = dealsWon.length + dealsLost.length
      return {
        id: user.id,
        name: user.name ?? user.email,
        openDeals: dealsOpen.length,
        wonDeals: dealsWon.length,
        lostDeals: dealsLost.length,
        wonRevenue,
        winRate: closedTotal > 0 ? Math.round((dealsWon.length / closedTotal) * 100) : 0,
        activities: user.activities.length,
      }
    }).sort((a, b) => b.wonRevenue - a.wonRevenue)

    // Revenue trend (last 30 vs prev 30 days)
    const last30 = dealsByMonth.filter(d => d.updatedAt >= thirtyDaysAgo)
    const prev30 = dealsByMonth.filter(d => d.updatedAt < thirtyDaysAgo)
    const last30Rev = last30.reduce((s, d) => s + Number(d.amount ?? 0), 0)
    const prev30Rev = prev30.reduce((s, d) => s + Number(d.amount ?? 0), 0)

    return {
      sellers,
      pipelineByStage: pipelineByStage.map(s => ({
        stage: s.stage,
        count: s._count,
        value: Number(s._sum.amount ?? 0),
      })),
      revenue: {
        last30Days: last30Rev,
        prev30Days: prev30Rev,
        growth: prev30Rev > 0 ? Math.round(((last30Rev - prev30Rev) / prev30Rev) * 100) : 0,
      },
      conversionRates: conversionRates.map(s => ({
        status: s.status,
        count: s._count,
        value: Number(s._sum.amount ?? 0),
      })),
    }
  })
}
