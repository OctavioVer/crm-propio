import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AuthService } from '../services/auth.service'

const registerSchema = z.object({
  tenantName: z.string().min(2).max(100),
  tenantSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().min(1),
})

const refreshSchema = z.object({
  refreshToken: z.string(),
})

const magicLinkSchema = z.object({
  email: z.string().email(),
  tenantSlug: z.string().min(1),
})

const verifySchema = z.object({
  token: z.string(),
})

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify)

  fastify.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body)
    try {
      const result = await authService.register(body)
      return reply.status(201).send(result)
    } catch (err: any) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: err.message })
    }
  })

  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body)
    try {
      const result = await authService.login(body.email, body.password, body.tenantSlug)
      return reply.send(result)
    } catch {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Credenciales inválidas' })
    }
  })

  fastify.post('/refresh', async (request, reply) => {
    const { refreshToken } = refreshSchema.parse(request.body)
    try {
      const tokens = await authService.refreshToken(refreshToken)
      return reply.send(tokens)
    } catch {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Token inválido' })
    }
  })

  fastify.post('/magic-link', async (request, reply) => {
    const body = magicLinkSchema.parse(request.body)
    await authService.sendMagicLink(body.email, body.tenantSlug)
    return reply.send({ message: 'Si el correo existe, recibirás un enlace de acceso.' })
  })

  fastify.post('/magic-link/verify', async (request, reply) => {
    const { token } = verifySchema.parse(request.body)
    try {
      const result = await authService.verifyMagicLink(token)
      return reply.send(result)
    } catch {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Enlace inválido o expirado' })
    }
  })

  fastify.post('/logout', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { refreshToken } = refreshSchema.parse(request.body)
    await authService.logout(refreshToken)
    return reply.send({ message: 'Sesión cerrada' })
  })

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request) => {
    return request.authUser
  })
}
