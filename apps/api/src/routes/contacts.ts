import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { ContactService } from '../services/contact.service'

const createSchema = z.object({
  type: z.enum(['PERSON', 'COMPANY']).optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  companyName: z.string().max(200).optional(),
  ownerId: z.string().optional(),
  stage: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  emails: z.array(z.object({ email: z.string().email(), isPrimary: z.boolean().optional() })).optional(),
  phones: z.array(z.object({ phone: z.string(), type: z.string().optional() })).optional(),
})

const listSchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export const contactRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new ContactService()

  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (request) => {
    const params = listSchema.parse(request.query)
    return service.list(request.user.tenantId, params)
  })

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return await service.getById(request.user.tenantId, id)
    } catch {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Contacto no encontrado' })
    }
  })

  fastify.post('/', async (request, reply) => {
    const body = createSchema.parse(request.body)
    const contact = await service.create(request.user.tenantId, request.user.id, body)
    return reply.status(201).send(contact)
  })

  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = createSchema.partial().parse(request.body)
    try {
      return await service.update(request.user.tenantId, id, body)
    } catch {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Contacto no encontrado' })
    }
  })

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await service.delete(request.user.tenantId, id)
      return reply.status(204).send()
    } catch {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Contacto no encontrado' })
    }
  })
}
