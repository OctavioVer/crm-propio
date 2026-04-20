import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { config } from '../config'
import type { JWTPayload } from '@crm/types'

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.JWT_ACCESS_EXPIRES },
  })

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = await request.jwtVerify<JWTPayload>()
      request.authUser = {
        id: payload.sub,
        tenantId: payload.tid,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      }
      request.tenantId = payload.tid
    } catch {
      reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Token inválido o expirado' })
    }
  })

  fastify.decorate('requireRole', (roles: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.authUser) {
        return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'No autenticado' })
      }
      if (!roles.includes(request.authUser.role)) {
        return reply.code(403).send({ statusCode: 403, error: 'Forbidden', message: 'Permisos insuficientes' })
      }
    }
  })
})

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireRole: (roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
