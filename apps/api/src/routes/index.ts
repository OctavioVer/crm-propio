import type { FastifyPluginAsync } from 'fastify'
import { authRoutes } from './auth'
import { contactRoutes } from './contacts'
import { dealRoutes } from './deals'
import { pipelineRoutes } from './pipelines'
import { userRoutes } from './users'

export const apiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.register(authRoutes, { prefix: '/auth' })
  fastify.register(contactRoutes, { prefix: '/contacts' })
  fastify.register(dealRoutes, { prefix: '/deals' })
  fastify.register(pipelineRoutes, { prefix: '/pipelines' })
  fastify.register(userRoutes, { prefix: '/users' })
}
