import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@crm/database'

const createSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().max(100).optional(),
  description: z.string().optional(),
  price: z.number().min(0),
  currency: z.string().length(3).default('USD'),
  category: z.string().max(100).optional(),
  active: z.boolean().optional().default(true),
})

export const productRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (request) => {
    const { active } = (request.query as any)
    return prisma.product.findMany({
      where: {
        tenantId: request.authUser.tenantId,
        ...(active !== undefined && { active: active === 'true' }),
      },
      include: { _count: { select: { dealProducts: true } } },
      orderBy: { name: 'asc' },
    })
  })

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const product = await prisma.product.findFirst({
      where: { id, tenantId: request.authUser.tenantId },
    })
    if (!product) return reply.status(404).send({ message: 'Producto no encontrado' })
    return product
  })

  fastify.post('/', async (request, reply) => {
    const body = createSchema.parse(request.body)
    const product = await prisma.product.create({
      data: { tenantId: request.authUser.tenantId, ...body },
    })
    return reply.status(201).send(product)
  })

  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = createSchema.partial().parse(request.body)
    const product = await prisma.product.findFirst({
      where: { id, tenantId: request.authUser.tenantId },
    })
    if (!product) return reply.status(404).send({ message: 'Producto no encontrado' })
    return prisma.product.update({ where: { id }, data: body })
  })

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const product = await prisma.product.findFirst({
      where: { id, tenantId: request.authUser.tenantId },
    })
    if (!product) return reply.status(404).send({ message: 'Producto no encontrado' })
    await prisma.product.delete({ where: { id } })
    return reply.status(204).send()
  })

  // Add product to deal
  fastify.post('/deal/:dealId', async (request, reply) => {
    const { dealId } = request.params as { dealId: string }
    const { productId, qty, unitPrice, discount } = z.object({
      productId: z.string(),
      qty: z.number().min(0.01).default(1),
      unitPrice: z.number().min(0).optional(),
      discount: z.number().min(0).max(100).default(0),
    }).parse(request.body)

    const [deal, product] = await Promise.all([
      prisma.deal.findFirst({ where: { id: dealId, tenantId: request.authUser.tenantId } }),
      prisma.product.findFirst({ where: { id: productId, tenantId: request.authUser.tenantId } }),
    ])
    if (!deal) return reply.status(404).send({ message: 'Deal no encontrado' })
    if (!product) return reply.status(404).send({ message: 'Producto no encontrado' })

    await prisma.dealProduct.upsert({
      where: { dealId_productId: { dealId, productId } },
      create: { dealId, productId, qty, unitPrice: unitPrice ?? product.price, discount },
      update: { qty, unitPrice: unitPrice ?? product.price, discount },
    })
    return reply.status(201).send({ dealId, productId })
  })

  // Remove product from deal
  fastify.delete('/deal/:dealId/:productId', async (request, reply) => {
    const { dealId, productId } = request.params as { dealId: string; productId: string }
    await prisma.dealProduct.deleteMany({ where: { dealId, productId } })
    return reply.status(204).send()
  })
}
