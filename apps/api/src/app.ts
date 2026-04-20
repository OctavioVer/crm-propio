import Fastify from 'fastify'
import fp from 'fastify-plugin'
import helmet from '@fastify/helmet'
import { config, isDev } from './config'
import corsPlugin from './plugins/cors'
import authPlugin from './plugins/auth'
import tenantPlugin from './plugins/tenant'
import rateLimitPlugin from './plugins/rate-limit'
import { apiRoutes } from './routes'

export async function buildApp() {
  const fastify = Fastify({
    logger: isDev
      ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
      : true,
  })

  await fastify.register(helmet, { contentSecurityPolicy: false })
  await fastify.register(corsPlugin)
  await fastify.register(authPlugin)
  await fastify.register(tenantPlugin)
  await fastify.register(rateLimitPlugin)

  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  fastify.register(apiRoutes, { prefix: '/api' })

  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error)
    if (error.name === 'ZodError') {
      return reply.status(422).send({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: 'Datos inválidos',
        details: (error as any).errors,
      })
    }
    const statusCode = error.statusCode ?? 500
    return reply.status(statusCode).send({
      statusCode,
      error: error.name ?? 'Internal Server Error',
      message: isDev ? error.message : 'Error interno del servidor',
    })
  })

  return fastify
}
