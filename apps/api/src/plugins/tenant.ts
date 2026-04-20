import fp from 'fastify-plugin'
import { prisma } from '@crm/database'

export default fp(async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    // Public routes that don't need tenant resolution
    const publicPaths = ['/health', '/api/auth/register', '/api/auth/login',
      '/api/auth/refresh', '/api/auth/magic-link', '/documentation']

    if (publicPaths.some((p) => request.url.startsWith(p))) return

    // Resolve tenant from subdomain or header
    let slug: string | undefined

    const host = request.hostname
    const parts = host.split('.')
    if (parts.length >= 3) {
      // subdomain.domain.tld
      slug = parts[0]
    }

    if (!slug) {
      slug = request.headers['x-tenant-slug'] as string | undefined
    }

    if (!slug && request.authUser?.tenantId) {
      // Already resolved via JWT
      return
    }

    if (!slug) return // Let route-level auth handle missing tenant

    const tenant = await prisma.tenant.findUnique({
      where: { slug, active: true },
      select: { id: true, slug: true, plan: true },
    })

    if (!tenant) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Tenant no encontrado' })
    }

    request.tenantId = tenant.id
  })
})
