import { prisma } from '@crm/database'
import crypto from 'crypto'

export async function dispatchWebhook(tenantId: string, event: string, payload: Record<string, unknown>) {
  const webhooks = await prisma.webhook.findMany({
    where: { tenantId, active: true, events: { has: event } },
  })

  for (const webhook of webhooks) {
    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() })
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-CRM-Event': event,
    }

    if (webhook.secret) {
      const sig = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex')
      headers['X-CRM-Signature'] = `sha256=${sig}`
    }

    let statusCode: number | null = null
    let responseText: string | null = null
    let success = false

    try {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      })
      statusCode = res.status
      responseText = await res.text().catch(() => null)
      success = res.ok
    } catch (err: any) {
      responseText = err?.message ?? 'Timeout'
    }

    await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event,
        payload,
        statusCode,
        response: responseText?.slice(0, 500),
        success,
      },
    }).catch(() => {})
  }
}
