import { PrismaClient } from '@prisma/client'
import { createHash, randomBytes } from 'crypto'

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = createHash('sha256').update(password + salt).digest('hex')
  return `${salt}:${hash}`
}

async function main() {
  console.log('Seeding database...')

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug: 'demo',
      name: 'Demo Company',
      plan: 'GROWTH',
      brandingJson: { primaryColor: '#6366f1', logoUrl: null },
    },
  })

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@demo.com',
      name: 'Admin Demo',
      passwordHash: hashPassword('admin123'),
      role: 'ADMIN',
      emailVerified: true,
    },
  })

  const seller = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'seller@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'seller@demo.com',
      name: 'Vendedor Demo',
      passwordHash: hashPassword('seller123'),
      role: 'SELLER',
      emailVerified: true,
    },
  })

  const pipeline = await prisma.pipeline.upsert({
    where: { id: 'default-pipeline' },
    update: {},
    create: {
      id: 'default-pipeline',
      tenantId: tenant.id,
      name: 'Pipeline de Ventas',
      isDefault: true,
      stagesJson: [
        { id: 'lead', name: 'Lead', order: 0, color: '#6366f1' },
        { id: 'qualified', name: 'Calificado', order: 1, color: '#8b5cf6' },
        { id: 'proposal', name: 'Propuesta', order: 2, color: '#ec4899' },
        { id: 'negotiation', name: 'Negociación', order: 3, color: '#f59e0b' },
        { id: 'closed-won', name: 'Ganado', order: 4, color: '#10b981' },
        { id: 'closed-lost', name: 'Perdido', order: 5, color: '#ef4444' },
      ],
    },
  })

  const contact = await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      type: 'PERSON',
      firstName: 'Juan',
      lastName: 'Pérez',
      ownerId: seller.id,
      score: 85,
      tags: ['cliente-potencial', 'empresa-grande'],
      emails: { create: [{ email: 'juan@empresa.com', isPrimary: true }] },
      phones: { create: [{ phone: '+54 11 1234-5678', type: 'mobile' }] },
    },
  })

  await prisma.deal.create({
    data: {
      tenantId: tenant.id,
      pipelineId: pipeline.id,
      contactId: contact.id,
      ownerId: seller.id,
      title: 'Licencia Enterprise Anual',
      stage: 'proposal',
      amount: 25000,
      currency: 'USD',
      probability: 60,
      closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  console.log('Seed complete:', { tenant: tenant.slug, admin: admin.email, seller: seller.email })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
