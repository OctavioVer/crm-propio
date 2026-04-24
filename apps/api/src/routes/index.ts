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
import { notificationRoutes } from './notifications'
import { copilotRoutes } from './copilot'
import { productRoutes } from './products'
import { importRoutes } from './imports'
import { webhookRoutes } from './webhooks'
import { campaignRoutes } from './campaigns'
import { formRoutes } from './forms'
import { segmentRoutes } from './segments'
import { reportRoutes } from './reports'

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
  fastify.register(notificationRoutes, { prefix: '/notifications' })
  fastify.register(copilotRoutes, { prefix: '/copilot' })
  fastify.register(productRoutes, { prefix: '/products' })
  fastify.register(importRoutes, { prefix: '/import' })
  fastify.register(webhookRoutes, { prefix: '/webhooks' })
  fastify.register(campaignRoutes, { prefix: '/campaigns' })
  fastify.register(formRoutes, { prefix: '/forms' })
  fastify.register(segmentRoutes, { prefix: '/segments' })
  fastify.register(reportRoutes, { prefix: '/reports' })
}
