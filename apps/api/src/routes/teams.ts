import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@crm/database'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  managerId: z.string().optional(),
})

export const teamRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (request) => {
    const tenantId = request.authUser.tenantId
    const teams = await prisma.team.findMany({
      where: { tenantId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
          },
        },
      },
    })
    return teams
  })

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const team = await prisma.team.findFirst({
      where: { id, tenantId: request.authUser.tenantId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
          },
        },
      },
    })
    if (!team) return reply.status(404).send({ message: 'Equipo no encontrado' })
    return team
  })

  fastify.post('/', async (request, reply) => {
    const body = createSchema.parse(request.body)
    const team = await prisma.team.create({
      data: {
        tenantId: request.authUser.tenantId,
        name: body.name,
        managerId: body.managerId,
      },
    })
    return reply.status(201).send(team)
  })

  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = createSchema.partial().parse(request.body)
    const team = await prisma.team.findFirst({
      where: { id, tenantId: request.authUser.tenantId },
    })
    if (!team) return reply.status(404).send({ message: 'Equipo no encontrado' })
    const updated = await prisma.team.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.managerId !== undefined && { managerId: body.managerId }),
      },
    })
    return updated
  })

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const team = await prisma.team.findFirst({
      where: { id, tenantId: request.authUser.tenantId },
    })
    if (!team) return reply.status(404).send({ message: 'Equipo no encontrado' })
    await prisma.team.delete({ where: { id } })
    return reply.status(204).send()
  })

  fastify.post('/:id/members', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { userId } = z.object({ userId: z.string() }).parse(request.body)

    const [team, user] = await Promise.all([
      prisma.team.findFirst({ where: { id, tenantId: request.authUser.tenantId } }),
      prisma.user.findFirst({ where: { id: userId, tenantId: request.authUser.tenantId } }),
    ])
    if (!team) return reply.status(404).send({ message: 'Equipo no encontrado' })
    if (!user) return reply.status(404).send({ message: 'Usuario no encontrado' })

    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: id, userId } },
      create: { teamId: id, userId },
      update: {},
    })
    return reply.status(201).send({ teamId: id, userId })
  })

  fastify.delete('/:id/members/:userId', async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string }
    const team = await prisma.team.findFirst({
      where: { id, tenantId: request.authUser.tenantId },
    })
    if (!team) return reply.status(404).send({ message: 'Equipo no encontrado' })
    await prisma.teamMember.deleteMany({ where: { teamId: id, userId } })
    return reply.status(204).send()
  })
}
