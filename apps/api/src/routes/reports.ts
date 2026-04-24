import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@crm/database'
import { mailer } from '../lib/mailer'
import { config } from '../config'

const createSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['weekly_summary', 'pipeline_snapshot', 'seller_performance', 'monthly_revenue']).default('weekly_summary'),
  cronExpr: z.string().default('0 8 * * 1'),
  recipients: z.array(z.string().email()).min(1),
  active: z.boolean().optional().default(true),
})

export const reportRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (request) => {
    return prisma.scheduledReport.findMany({
      where: { tenantId: request.authUser.tenantId },
      orderBy: { createdAt: 'desc' },
    })
  })

  fastify.post('/', async (request, reply) => {
    const body = createSchema.parse(request.body)
    const report = await prisma.scheduledReport.create({
      data: { tenantId: request.authUser.tenantId, ...body },
    })
    return reply.status(201).send(report)
  })

  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = createSchema.partial().parse(request.body)
    const report = await prisma.scheduledReport.findFirst({ where: { id, tenantId: request.authUser.tenantId } })
    if (!report) return reply.status(404).send({ message: 'Reporte no encontrado' })
    return prisma.scheduledReport.update({ where: { id }, data: body })
  })

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const report = await prisma.scheduledReport.findFirst({ where: { id, tenantId: request.authUser.tenantId } })
    if (!report) return reply.status(404).send({ message: 'Reporte no encontrado' })
    await prisma.scheduledReport.delete({ where: { id } })
    return reply.status(204).send()
  })

  // Send now (test / manual trigger)
  fastify.post('/:id/send', async (request, reply) => {
    const { id } = request.params as { id: string }
    const report = await prisma.scheduledReport.findFirst({ where: { id, tenantId: request.authUser.tenantId } })
    if (!report) return reply.status(404).send({ message: 'Reporte no encontrado' })

    const html = await buildReportHtml(request.authUser.tenantId, report.type)

    const typeLabels: Record<string, string> = {
      weekly_summary: 'Resumen semanal',
      pipeline_snapshot: 'Snapshot del pipeline',
      seller_performance: 'Performance de vendedores',
      monthly_revenue: 'Revenue mensual',
    }

    for (const to of report.recipients) {
      await mailer.sendMail({
        from: config.SMTP_FROM,
        to,
        subject: `${typeLabels[report.type] ?? 'Reporte'} — CRM`,
        html,
      }).catch(() => {})
    }

    await prisma.scheduledReport.update({ where: { id }, data: { lastSentAt: new Date() } })
    return { ok: true, sentTo: report.recipients }
  })
}

async function buildReportHtml(tenantId: string, type: string): Promise<string> {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400_000)

  const [contacts, openDeals, wonDeals, recentActivities] = await Promise.all([
    prisma.contact.count({ where: { tenantId } }),
    prisma.deal.aggregate({ where: { tenantId, status: 'OPEN' }, _count: true, _sum: { amount: true } }),
    prisma.deal.aggregate({ where: { tenantId, status: 'WON', updatedAt: { gte: thirtyDaysAgo } }, _count: true, _sum: { amount: true } }),
    prisma.activity.count({ where: { tenantId, createdAt: { gte: sevenDaysAgo } } }),
  ])

  const pipelineByStage = await prisma.deal.groupBy({
    by: ['stage'],
    where: { tenantId, status: 'OPEN' },
    _count: true,
    _sum: { amount: true },
  })

  const stageRows = pipelineByStage
    .map(s => `<tr><td style="padding:4px 8px">${s.stage}</td><td style="padding:4px 8px;text-align:right">${s._count}</td><td style="padding:4px 8px;text-align:right">$${Number(s._sum?.amount ?? 0).toLocaleString('es-AR')}</td></tr>`)
    .join('')

  return `
<!DOCTYPE html>
<html lang="es">
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#374151">
  <div style="background:#6366f1;color:white;padding:20px;border-radius:12px;margin-bottom:24px">
    <h1 style="margin:0;font-size:20px">CRM — Reporte ${new Date().toLocaleDateString('es-AR')}</h1>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
    <div style="background:#f3f4f6;padding:16px;border-radius:8px;text-align:center">
      <p style="font-size:28px;font-weight:bold;margin:0;color:#6366f1">${contacts}</p>
      <p style="font-size:12px;color:#6b7280;margin:4px 0 0">Contactos totales</p>
    </div>
    <div style="background:#f3f4f6;padding:16px;border-radius:8px;text-align:center">
      <p style="font-size:28px;font-weight:bold;margin:0;color:#6366f1">${openDeals._count}</p>
      <p style="font-size:12px;color:#6b7280;margin:4px 0 0">Deals abiertos</p>
    </div>
    <div style="background:#ecfdf5;padding:16px;border-radius:8px;text-align:center">
      <p style="font-size:28px;font-weight:bold;margin:0;color:#059669">${wonDeals._count}</p>
      <p style="font-size:12px;color:#6b7280;margin:4px 0 0">Deals ganados (30d)</p>
    </div>
    <div style="background:#fffbeb;padding:16px;border-radius:8px;text-align:center">
      <p style="font-size:28px;font-weight:bold;margin:0;color:#d97706">$${Number(wonDeals._sum?.amount ?? 0).toLocaleString('es-AR')}</p>
      <p style="font-size:12px;color:#6b7280;margin:4px 0 0">Revenue ganado (30d)</p>
    </div>
  </div>

  <h2 style="font-size:16px;color:#374151;margin-bottom:12px">Pipeline por etapa</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
    <thead>
      <tr style="background:#f3f4f6">
        <th style="text-align:left;padding:8px;color:#6b7280;font-weight:500">Etapa</th>
        <th style="text-align:right;padding:8px;color:#6b7280;font-weight:500">Deals</th>
        <th style="text-align:right;padding:8px;color:#6b7280;font-weight:500">Valor</th>
      </tr>
    </thead>
    <tbody>${stageRows}</tbody>
  </table>

  <p style="font-size:14px;color:#6b7280">Actividades últimos 7 días: <strong>${recentActivities}</strong></p>
  <p style="font-size:12px;color:#9ca3af;margin-top:24px">Generado automáticamente por CRM Pro</p>
</body>
</html>`
}
