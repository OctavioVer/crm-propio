import type { UserRole } from '@crm/types'

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string
      tenantId: string
      email: string
      name?: string
      role: UserRole
    }
    tenantId: string
  }
}
