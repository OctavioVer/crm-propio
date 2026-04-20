import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'
import { redis } from '../lib/redis'

export default fp(async (fastify) => {
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis,
    keyGenerator: (req) => {
      return req.authUser?.id ?? req.ip
    },
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Demasiadas solicitudes. Intenta en un minuto.',
    }),
  })
})
