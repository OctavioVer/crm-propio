import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@crm/database'

const triggerSchema = z.object({
  type: z.enum(['deal_created', 'deal_stage_changed', 'contact_created', 'deal_won', 'deal_lost', 'activity_created']),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'neq', 'gt', 'lt', 'contains']),
    value: z.unknown(),
  })).optional().default([]),
})

const nodeSchema = z.object({
  id: z.string(),
  type: z.enum(['send_email', 'create_task', 'assign_owner', 'move_stage', 'add_tag', 'wait', 'notify']),
  label: z.string(),
  config: z.record(z.unknown()).default({}),
  nextId: z.string().optional(),
})

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  trigger: triggerSchema,
  nodes: z.array(nodeSchema),
  active: z.boolean().optional().default(false),
})

export const workflowRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (request) => {
    const tenantId = request.authUser.tenantId
    const workflows = await prisma.workflow.findMany({
      where: { tenantId },
      include: {
        _count: { select: { executions: true } },
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return workflows
  })

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const workflow = await prisma.workflow.findFirst({
      where: { id, tenantId: request.authUser.tenantId },
      include: {
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    })
    if (!workflow) return reply.status(404).send({ message: 'Workflow no encontrado' })
    return workflow
  })

  fastify.post('/', async (request, reply) => {
    const body = createSchema.parse(request.body)
    const workflow = await prisma.workflow.create({
      data: {
        tenantId: request.authUser.tenantId,
        name: body.name,
        description: body.description,
        triggerJson: body.trigger as any,
        nodesJson: body.nodes as any,
        active: body.active,
      },
    })
    return reply.status(201).send(workflow)
  })

  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = createSchema.partial().parse(request.body)

    const workflow = await prisma.workflow.findFirst({
      where: { id, tenantId: request.authUser.tenantId },
    })
    if (!workflow) return reply.status(404).send({ message: 'Workflow no encontrado' })

    const updated = await prisma.workflow.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.trigger && { triggerJson: body.trigger as any }),
        ...(body.nodes && { nodesJson: body.nodes as any }),
        ...(body.active !== undefined && { active: body.active }),
        version: { increment: 1 },
      },
    })
    return updated
  })

  fastify.post('/:id/toggle', async (request, reply) => {
    const { id } = request.params as { id: string }
    const workflow = await prisma.workflow.findFirst({
      where: { id, tenantId: request.authUser.tenantId },
    })
    if (!workflow) return reply.status(404).send({ message: 'Workflow no encontrado' })

    const updated = await prisma.workflow.update({
      where: { id },
      data: { active: !workflow.active },
    })
    return updated
  })

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const workflow = await prisma.workflow.findFirst({
      where: { id, tenantId: request.authUser.tenantId },
    })
    if (!workflow) return reply.status(404).send({ message: 'Workflow no encontrado' })
    await prisma.workflow.delete({ where: { id } })
    return reply.status(204).send()
  })

  // Trigger a workflow manually (for testing)
  fastify.post('/:id/run', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { entityType, entityId } = (request.body as any) ?? {}

    const workflow = await prisma.workflow.findFirst({
      where: { id, tenantId: request.authUser.tenantId },
    })
    if (!workflow) return reply.status(404).send({ message: 'Workflow no encontrado' })
    if (!workflow.active) return reply.status(400).send({ message: 'El workflow no está activo' })

    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: id,
        entityType: entityType ?? 'manual',
        entityId: entityId ?? 'manual',
        status: 'PENDING',
      },
    })
    return reply.status(202).send({ executionId: execution.id, message: 'Workflow encolado' })
  })
}
