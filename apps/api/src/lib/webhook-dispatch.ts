import { prisma } from '@crm/database'

export async function dispatchWebhook(tenantId: string, event: string, payload: Record<string, any>) {
  const webhooks = await prisma.webhook.findMany({
    where: { tenantId, active: true },
  })

  const results = await Promise.all(webhooks.map(async (webhook) => {
    if (!webhook.events.includes(event) && !webhook.events.includes('*')) {
      return
    }

    let statusCode: number | null = null
    let responseText: string | null = null
    let success = false

    try {
      const body = JSON.stringify({
        event,
        payload,
        timestamp: new Date().toISOString(),
      })

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (webhook.secret) {
        headers['X-Webhook-Secret'] = webhook.secret
      }

      const res = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      })
      statusCode = res.status
      success = res.ok
      responseText = await res.text()
    } catch (err: any) {
      responseText = err.message
    }

    await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event,
        payload: payload as any,
        statusCode,
        response: responseText?.slice(0, 500),
        success,
      },
    })
  }))

  return results
}
