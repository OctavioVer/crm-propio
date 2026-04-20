export {} // Necesario para que este archivo sea un módulo y las declaraciones augmenten en vez de sobreescribir

type UserRoleLocal = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SELLER' | 'VIEWER'

declare module 'fastify' {
  interface FastifyRequest {
    authUser: {
      id: string
      tenantId: string
      email: string
      name?: string
      role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SELLER' | 'VIEWER'
    }
    tenantId: string
  }
}
