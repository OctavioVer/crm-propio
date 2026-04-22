import type { FastifyPluginAsync } from 'fastify'
import { authRoutes } from './auth'
import { contactRoutes } from './contacts'
import { dealRoutes } from './deals'
import { pipelineRoutes } from './pipelines'
import { userRoutes } from './users'
import { activityRoutes } from './activities'
import { dashboardRoutes } from './dashboard'
import { conversationRoutes } from './conversations'
import { workflowRoutes } from './workflows'
import { teamRoutes } from './teams'

export const apiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.register(authRoutes, { prefix: '/auth' })
  fastify.register(contactRoutes, { prefix: '/contacts' })
  fastify.register(dealRoutes, { prefix: '/deals' })
  fastify.register(pipelineRoutes, { prefix: '/pipelines' })
  fastify.register(userRoutes, { prefix: '/users' })
  fastify.register(activityRoutes, { prefix: '/activities' })
  fastify.register(dashboardRoutes, { prefix: '/dashboard' })
  fastify.register(conversationRoutes, { prefix: '/conversations' })
  fastify.register(workflowRoutes, { prefix: '/workflows' })
  fastify.register(teamRoutes, { prefix: '/teams' })
}
