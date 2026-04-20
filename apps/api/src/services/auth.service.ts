import { prisma } from '@crm/database'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { sendMagicLinkEmail } from '../lib/mailer'
import { redis } from '../lib/redis'
import { config } from '../config'
import type { FastifyInstance } from 'fastify'
import type { JWTPayload, AuthTokens } from '@crm/types'

export class AuthService {
  constructor(private fastify: FastifyInstance) {}

  async register(data: {
    tenantName: string
    tenantSlug: string
    email: string
    name: string
    password: string
  }) {
    const existingTenant = await prisma.tenant.findUnique({ where: { slug: data.tenantSlug } })
    if (existingTenant) throw new Error('El slug del tenant ya está en uso')

    const tenant = await prisma.tenant.create({
      data: {
        slug: data.tenantSlug,
        name: data.tenantName,
        plan: 'STARTER',
      },
    })

    const passwordHash = await bcrypt.hash(data.password, 12)

    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: data.email,
        name: data.name,
        passwordHash,
        role: 'ADMIN',
        emailVerified: true,
      },
    })

    await prisma.pipeline.create({
      data: {
        tenantId: tenant.id,
        name: 'Pipeline de Ventas',
        isDefault: true,
        stagesJson: [
          { id: 'lead', name: 'Lead', order: 0, color: '#6366f1' },
          { id: 'qualified', name: 'Calificado', order: 1, color: '#8b5cf6' },
          { id: 'proposal', name: 'Propuesta', order: 2, color: '#ec4899' },
          { id: 'negotiation', name: 'Negociación', order: 3, color: '#f59e0b' },
          { id: 'closed-won', name: 'Ganado', order: 4, color: '#10b981' },
        ],
      },
    })

    const tokens = await this.generateTokens(user.id, tenant.id, user.email, user.name ?? undefined, user.role as any)
    return { tenant, user: { id: user.id, email: user.email, name: user.name, role: user.role }, tokens }
  }

  async login(email: string, password: string, tenantSlug: string) {
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug, active: true } })
    if (!tenant) throw new Error('Tenant no encontrado')

    const user = await prisma.user.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email } } })
    if (!user || !user.passwordHash) throw new Error('Credenciales inválidas')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new Error('Credenciales inválidas')

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

    const tokens = await this.generateTokens(user.id, tenant.id, user.email, user.name ?? undefined, user.role as any)
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: tenant.id }, tokens }
  }

  async refreshToken(token: string) {
    const session = await prisma.session.findUnique({
      where: { refreshToken: token },
      include: { user: true },
    })

    if (!session || session.expiresAt < new Date()) {
      throw new Error('Refresh token inválido o expirado')
    }

    await prisma.session.delete({ where: { id: session.id } })

    const tokens = await this.generateTokens(
      session.user.id,
      session.user.tenantId,
      session.user.email,
      session.user.name ?? undefined,
      session.user.role as any
    )
    return tokens
  }

  async sendMagicLink(email: string, tenantSlug: string) {
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug, active: true } })
    if (!tenant) throw new Error('Tenant no encontrado')

    const user = await prisma.user.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email } } })
    if (!user) return // Don't reveal if user exists

    const token = nanoid(32)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    await prisma.magicLink.create({ data: { userId: user.id, token, expiresAt } })

    const link = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${token}`
    await sendMagicLinkEmail(email, link, tenant.name)
  }

  async verifyMagicLink(token: string) {
    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: { user: { include: { tenant: true } } },
    })

    if (!magicLink || magicLink.usedAt || magicLink.expiresAt < new Date()) {
      throw new Error('Enlace inválido o expirado')
    }

    await prisma.magicLink.update({ where: { id: magicLink.id }, data: { usedAt: new Date() } })
    await prisma.user.update({ where: { id: magicLink.userId }, data: { lastLoginAt: new Date(), emailVerified: true } })

    const { user } = magicLink
    const tokens = await this.generateTokens(user.id, user.tenantId, user.email, user.name ?? undefined, user.role as any)
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, tokens }
  }

  async logout(refreshToken: string) {
    await prisma.session.deleteMany({ where: { refreshToken } })
  }

  private async generateTokens(
    userId: string,
    tenantId: string,
    email: string,
    name: string | undefined,
    role: JWTPayload['role']
  ): Promise<AuthTokens> {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = { sub: userId, tid: tenantId, email, name, role }
    const accessToken = await this.fastify.jwt.sign(payload)

    const refreshToken = nanoid(64)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await prisma.session.create({
      data: { userId, refreshToken, expiresAt },
    })

    return { accessToken, refreshToken, expiresIn: 900 }
  }
}
