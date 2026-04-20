import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@crm/database'
import bcrypt from 'bcryptjs'

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'SELLER', 'VIEWER']),
  password: z.string().min(8).optional(),
})

const updateSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'SELLER', 'VIEWER']).optional(),
  avatarUrl: z.string().url().optional(),
})

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatarUrl: true,
  emailVerified: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
}

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (request) => {
    return prisma.user.findMany({
      where: { tenantId: request.authUser.tenantId },
      select: userSelect,
      orderBy: { createdAt: 'asc' },
    })
  })

  fastify.get('/me', async (request) => {
    return prisma.user.findUnique({
      where: { id: request.authUser.id },
      select: userSelect,
    })
  })

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = await prisma.user.findFirst({
      where: { id, tenantId: request.authUser.tenantId },
      select: userSelect,
    })
    if (!user) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Usuario no encontrado' })
    return user
  })

  fastify.post('/', { preHandler: [fastify.requireRole(['ADMIN'])] }, async (request, reply) => {
    const body = inviteSchema.parse(request.body)
    const existing = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: request.authUser.tenantId, email: body.email } },
    })
    if (existing) return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'El usuario ya existe en este tenant' })

    const passwordHash = body.password ? await bcrypt.hash(body.password, 12) : undefined

    const user = await prisma.user.create({
      data: {
        tenantId: request.authUser.tenantId,
        email: body.email,
        name: body.name,
        role: body.role,
        passwordHash,
        emailVerified: false,
      },
      select: userSelect,
    })
    return reply.status(201).send(user)
  })

  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = updateSchema.parse(request.body)

    // Users can update themselves; admins can update anyone
    if (id !== request.authUser.id && request.authUser.role !== 'ADMIN') {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Permisos insuficientes' })
    }

    const existing = await prisma.user.findFirst({ where: { id, tenantId: request.authUser.tenantId } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Usuario no encontrado' })

    return prisma.user.update({ where: { id }, data: body, select: userSelect })
  })

  fastify.delete('/:id', { preHandler: [fastify.requireRole(['ADMIN'])] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    if (id === request.authUser.id) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'No puedes eliminarte a ti mismo' })

    const existing = await prisma.user.findFirst({ where: { id, tenantId: request.authUser.tenantId } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Usuario no encontrado' })

    await prisma.user.delete({ where: { id } })
    return reply.status(204).send()
  })
}
