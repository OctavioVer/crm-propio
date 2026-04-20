import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@crm/database'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export class AiService {
  async summarizeContact(tenantId: string, contactId: string): Promise<string> {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId },
      include: {
        emails: true,
        phones: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { user: { select: { name: true } } },
        },
        deals: {
          include: { pipeline: { select: { name: true } } },
        },
      },
    })
    if (!contact) throw new Error('Contacto no encontrado')

    const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.companyName || 'Sin nombre'
    const emails = contact.emails.map(e => e.email).join(', ') || 'Ninguno'
    const phones = contact.phones.map(p => p.phone).join(', ') || 'Ninguno'
    const activitiesText = contact.activities.length > 0
      ? contact.activities.map(a =>
          `- [${a.type}] ${a.title ?? ''}: ${a.body ?? ''} (${new Date(a.createdAt).toLocaleDateString('es-AR')})`
        ).join('\n')
      : 'Sin actividades registradas'
    const dealsText = contact.deals.length > 0
      ? contact.deals.map(d =>
          `- ${d.title} | ${d.pipeline.name} | Etapa: ${d.stage} | Estado: ${d.status} | Monto: ${d.amount ? `${d.currency} ${d.amount}` : 'Sin definir'}`
        ).join('\n')
      : 'Sin deals asociados'

    const prompt = `Sos un asistente CRM experto. Generá un resumen ejecutivo breve y accionable sobre este contacto para un vendedor.

DATOS DEL CONTACTO:
- Nombre: ${name}
- Tipo: ${contact.type === 'PERSON' ? 'Persona' : 'Empresa'}
- Email: ${emails}
- Teléfono: ${phones}
- Etapa del contacto: ${contact.stage ?? 'Sin clasificar'}
- Score: ${contact.score}/100
- Tags: ${contact.tags.join(', ') || 'Ninguno'}
- Notas: ${contact.notes ?? 'Sin notas'}

ACTIVIDADES RECIENTES:
${activitiesText}

DEALS:
${dealsText}

Generá un resumen en español de 3-4 párrafos cortos que incluya:
1. Estado actual del contacto y relación comercial
2. Actividad reciente relevante
3. Oportunidades o riesgos detectados
4. Próxima acción sugerida

Sé directo, conciso y accionable. No uses bullet points, solo párrafos. Máximo 200 palabras.`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Respuesta inesperada de AI')
    return content.text
  }

  async suggestNextAction(tenantId: string, contactId: string): Promise<{ action: string; reason: string }> {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId },
      include: {
        activities: { orderBy: { createdAt: 'desc' }, take: 5 },
        deals: { where: { status: 'OPEN' } },
      },
    })
    if (!contact) throw new Error('Contacto no encontrado')

    const daysSinceLastActivity = contact.activities.length > 0
      ? Math.floor((Date.now() - new Date(contact.activities[0].createdAt).getTime()) / 86400_000)
      : null

    const openDeals = contact.deals.length

    // Rules-based NBA
    if (openDeals === 0) {
      return { action: 'Crear un deal', reason: 'No hay oportunidades abiertas para este contacto.' }
    }
    if (daysSinceLastActivity === null || daysSinceLastActivity > 14) {
      return { action: 'Registrar una llamada de seguimiento', reason: `Sin actividad en los últimos ${daysSinceLastActivity ?? '∞'} días.` }
    }
    if (daysSinceLastActivity > 7) {
      return { action: 'Enviar un email de seguimiento', reason: `Última actividad hace ${daysSinceLastActivity} días.` }
    }
    if (contact.score < 40) {
      return { action: 'Calificar mejor el lead', reason: `Score bajo (${contact.score}/100). Completar información de contacto.` }
    }
    const lastActivity = contact.activities[0]
    if (lastActivity?.type === 'CALL') {
      return { action: 'Enviar propuesta por email', reason: 'Última actividad fue una llamada. Buen momento para formalizar.' }
    }
    if (lastActivity?.type === 'EMAIL') {
      return { action: 'Hacer seguimiento telefónico', reason: 'Último email enviado. Llamar para confirmar recepción e interés.' }
    }
    return { action: 'Agendar una reunión', reason: 'Contacto activo. Avanzar al siguiente paso.' }
  }
}
