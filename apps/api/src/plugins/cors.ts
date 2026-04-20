import fp from 'fastify-plugin'
import cors from '@fastify/cors'
import { config } from '../config'

export default fp(async (fastify) => {
  const origins = config.CORS_ORIGINS.split(',').map((o) => o.trim())

  await fastify.register(cors, {
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug'],
  })
})
