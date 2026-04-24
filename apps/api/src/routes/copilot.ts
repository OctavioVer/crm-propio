import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@crm/database'
import Anthropic from '@anthropic-ai/sdk'
import { config } from '../config'

const askSchema = z.object({
  question: z.string().min(1).max(500),
})

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })

export const copilotRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.post('/ask', async (request, reply) => {
    if (!config.ANTHROPIC_API_KEY) {
      return reply.status(503).send({ message: 'Copiloto no disponible: ANTHROPIC_API_KEY no configurada' })
    }

    const { question } = askSchema.parse(request.body)
    const tenantId = request.authUser.tenantId
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000)

    // Gather CRM context
    const [
      contactCount,
      dealStats,
      recentDeals,
      recentContacts,
      topContacts,
      pipelineStats,
      activitySummary,
      wonRevenue,
    ] = await Promise.all([
      prisma.contact.count({ where: { tenantId } }),
      prisma.deal.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
        _sum: { amount: true },
      }),
      prisma.deal.findMany({
        where: { tenantId, status: 'OPEN' },
        select: { title: true, stage: true, amount: true, currency: true, closeDate: true, contact: { select: { firstName: true, lastName: true, companyName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.contact.findMany({
        where: { tenantId },
        select: { firstName: true, lastName: true, companyName: true, stage: true, score: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.contact.findMany({
        where: { tenantId },
        select: { firstName: true, lastName: true, companyName: true, score: true },
        orderBy: { score: 'desc' },
        take: 5,
      }),
      prisma.deal.groupBy({
        by: ['stage'],
        where: { tenantId, status: 'OPEN' },
        _count: true,
        _sum: { amount: true },
      }),
      prisma.activity.groupBy({
        by: ['type'],
        where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
        _count: true,
      }),
      prisma.deal.aggregate({
        where: { tenantId, status: 'WON', updatedAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
        _count: true,
      }),
    ])

    const formatContact = (c: any) =>
      [c.firstName, c.lastName].filter(Boolean).join(' ') || c.companyName || 'Sin nombre'

    const context = `
DATOS DEL CRM (actualizados al ${now.toLocaleDateString('es-AR')}):

CONTACTOS:
- Total: ${contactCount}
- Últimos 10: ${recentContacts.map(c => `${formatContact(c)} (score: ${c.score}, etapa: ${c.stage ?? 'sin etapa'})`).join(', ')}
- Top 5 por score: ${topContacts.map(c => `${formatContact(c)} (${c.score}/100)`).join(', ')}

DEALS:
- Abiertos: ${dealStats.find(d => d.status === 'OPEN')?._count ?? 0} (valor: $${Number(dealStats.find(d => d.status === 'OPEN')?._sum?.amount ?? 0).toLocaleString('es-AR')})
- Ganados: ${dealStats.find(d => d.status === 'WON')?._count ?? 0}
- Perdidos: ${dealStats.find(d => d.status === 'LOST')?._count ?? 0}
- Revenue ganado últimos 30 días: $${Number(wonRevenue._sum?.amount ?? 0).toLocaleString('es-AR')} (${wonRevenue._count} deals)

PIPELINE POR ETAPA:
${pipelineStats.map(s => `  - ${s.stage}: ${s._count} deals, valor: $${Number(s._sum?.amount ?? 0).toLocaleString('es-AR')}`).join('\n')}

DEALS ABIERTOS RECIENTES:
${recentDeals.map(d => `  - "${d.title}" | Etapa: ${d.stage} | Valor: ${d.amount ? `$${Number(d.amount).toLocaleString('es-AR')}` : 'sin definir'} | Contacto: ${d.contact ? formatContact(d.contact) : 'sin contacto'} | Cierre: ${d.closeDate ? new Date(d.closeDate).toLocaleDateString('es-AR') : 'sin fecha'}`).join('\n')}

ACTIVIDADES ÚLTIMOS 30 DÍAS:
${activitySummary.map(a => `  - ${a.type}: ${a._count}`).join('\n')}
`.trim()

    const systemPrompt = `Sos el copiloto de un CRM de ventas. Respondés preguntas sobre los datos del CRM de forma concisa y útil.
Usás los datos reales del CRM que se te proveen como contexto.
Respondés en español rioplatense, de forma directa y accionable.
Si la pregunta requiere datos que no tenés, lo decís y sugerís cómo obtenerlos.
Podés hacer cálculos, comparaciones y proyecciones básicas con los datos disponibles.
Cuando sea relevante, incluís números concretos y recomendaciones de acción.`

    const userPrompt = `Datos del CRM:\n${context}\n\nPregunta: ${question}`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return reply.status(500).send({ message: 'Respuesta inesperada del modelo' })
    }

    return {
      answer: content.text,
      context: {
        contactCount,
        openDeals: dealStats.find(d => d.status === 'OPEN')?._count ?? 0,
        wonRevenue30d: Number(wonRevenue._sum?.amount ?? 0),
        wonDeals30d: wonRevenue._count,
      },
    }
  })

  // Suggested questions based on current CRM state
  fastify.get('/suggestions', async (request) => {
    const tenantId = request.authUser.tenantId
    const [openDeals, contacts, dueDeals] = await Promise.all([
      prisma.deal.count({ where: { tenantId, status: 'OPEN' } }),
      prisma.contact.count({ where: { tenantId } }),
      prisma.deal.count({
        where: {
          tenantId,
          status: 'OPEN',
          closeDate: { lte: new Date(Date.now() + 7 * 86400_000) },
        },
      }),
    ])

    const suggestions = [
      '¿Cuántos deals tengo que cierran esta semana?',
      '¿Cuáles son mis contactos con mayor score?',
      `¿Cuál es el valor total del pipeline abierto?`,
      '¿Cuántos deals gané este mes?',
      '¿Qué actividades se registraron en los últimos 7 días?',
      '¿Cuáles son los deals más importantes por valor?',
      '¿Qué etapa del pipeline tiene más valor acumulado?',
    ]

    if (dueDeals > 0) suggestions.unshift(`Tengo ${dueDeals} deals con fecha de cierre próxima, ¿cuáles son?`)

    return { suggestions: suggestions.slice(0, 6) }
  })
}
