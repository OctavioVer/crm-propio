# CRM Propio

Plataforma CRM enterprise, AI-native, multi-tenant y white-label.

---

## Setup inicial

### Requisitos
- Node.js 20+
- Docker Desktop corriendo

### 1. Variables de entorno
```bash
cp .env.example .env
```

Editá `.env` con tus valores. Para desarrollo local los defaults funcionan.

### 2. Infraestructura local
```bash
docker-compose up -d
```
Levanta Postgres (5433), Redis (6379) y Mailpit (8025).

### 3. Dependencias
```bash
npm install
```

### 4. Base de datos
```bash
cd packages/database
npm run db:migrate:dev -- --name init
npm run db:seed
cd ../..
```

### 5. Levantar todo
```bash
npm run dev
```

| Servicio  | URL                        |
|-----------|----------------------------|
| Web app   | http://localhost:3000      |
| API       | http://localhost:3001      |
| Mailpit   | http://localhost:8025      |

### Credenciales demo
| Email              | Password   | Rol    | Slug  |
|--------------------|------------|--------|-------|
| admin@demo.com     | admin123   | Admin  | demo  |
| seller@demo.com    | seller123  | Seller | demo  |

---

## Estado actual del proyecto

### ✅ Sprint 0 — Fundación (COMPLETO)

**Infraestructura**
- [x] Monorepo Turborepo + npm workspaces
- [x] Docker Compose (Postgres 16 + Redis 7 + Mailpit)
- [x] CI/CD con GitHub Actions (lint, type-check, build, test)
- [x] Variables de entorno centralizadas en raíz

**Base de datos (`packages/database`)**
- [x] Schema Prisma completo — 20+ modelos
- [x] Multi-tenant con Row Level Security (RLS) en Postgres
- [x] Modelos: Tenant, User, Session, MagicLink, Team, Contact, Company, Pipeline, Deal, Product, Activity, Conversation, Message, Workflow, AiDecision, AuditLog, FeatureFlag, CustomField
- [x] Seed con tenant demo, usuarios, pipeline y deal de ejemplo

**API (`apps/api` — Fastify 4)**
- [x] Auth: registro, login, logout, refresh token, magic link
- [x] Multi-tenant middleware (por subdomain o header `X-Tenant-Slug`)
- [x] JWT con roles (SUPER_ADMIN, ADMIN, MANAGER, SELLER, VIEWER)
- [x] CRUD completo: Contactos, Deals, Pipelines, Usuarios
- [x] Kanban endpoint: `/api/deals/kanban/:pipelineId`
- [x] Rate limiting con Redis
- [x] CORS configurado

**Web (`apps/web` — Next.js 15)**
- [x] Login y registro funcionales
- [x] Dashboard layout con sidebar
- [x] `/dashboard/overview` — métricas básicas (contactos, deals, revenue)
- [x] `/dashboard/contacts` — tabla con búsqueda y paginación
- [x] `/dashboard/deals` — Kanban por pipeline
- [x] Auth client-side con localStorage

---

## Roadmap de construcción

### 🔨 MVP Core — Semanas 3–8

**Contactos**
- [ ] Modal "Nuevo contacto" con formulario completo
- [ ] Página de detalle del contacto (`/dashboard/contacts/:id`)
- [ ] Timeline 360° con actividades
- [ ] Edición inline de campos
- [ ] Tags y notas

**Deals**
- [ ] Modal "Nuevo deal"
- [ ] Página de detalle del deal
- [ ] Drag-and-drop entre columnas del Kanban (dnd-kit)
- [ ] Cambio de stage con animación
- [ ] Vinculación deal ↔ contacto

**Actividades**
- [ ] Endpoint `POST /api/activities` y `GET /api/contacts/:id/activities`
- [ ] Feed de actividades en detalle de contacto y deal
- [ ] Crear nota, llamada, reunión, tarea desde el detalle

**Email**
- [ ] OAuth Gmail / Outlook
- [ ] Sincronización de inbox
- [ ] Tracking de apertura de email
- [ ] Enviar email desde el detalle del contacto

**AI básico**
- [ ] Lead scoring por reglas (actividad reciente, emails, deals)
- [ ] Sugerencia de próxima acción (NBA)
- [ ] Resumen automático de contacto con Claude API

**Dashboard**
- [ ] Gráfico de pipeline por etapa (Recharts)
- [ ] Deals por vencer esta semana
- [ ] Actividad reciente del equipo

**UX**
- [ ] Notificaciones in-app
- [ ] Toast de confirmación en acciones
- [ ] Empty states con call to action
- [ ] Loading skeletons

---

### 🚀 MVP Plus — Semanas 9–14

**Comunicaciones**
- [ ] WhatsApp Business API (Twilio o Meta directa)
- [ ] Bandeja unificada de conversaciones
- [ ] Asignación de conversaciones a agentes
- [ ] Templates de respuesta rápida
- [ ] Chatbot básico con handoff humano

**Automatizaciones v1**
- [ ] Workflow builder visual (React Flow)
- [ ] Triggers: deal creado, etapa cambiada, contacto creado, formulario enviado
- [ ] Acciones: enviar email, crear tarea, asignar owner, mover etapa, notificar
- [ ] Secuencias de follow-up automático
- [ ] BullMQ para ejecución asincrónica

**Reportes**
- [ ] Exportación CSV y Excel de contactos y deals
- [ ] Exportación PDF de reportes
- [ ] Filtros avanzados guardados
- [ ] Reporte de performance por vendedor

**Usuarios y equipos**
- [ ] Pantalla de gestión de usuarios
- [ ] Invitación por email
- [ ] Creación y gestión de equipos
- [ ] Asignación de leads por round-robin

**Mobile**
- [ ] PWA responsive completa
- [ ] Push notifications (Web Push API)

**Onboarding**
- [ ] Wizard de setup al registrarse
- [ ] Checklist de primeros pasos
- [ ] Datos de ejemplo opcionales

---

### ⚡ Fase 3 — Growth (Semanas 15–22)

**Analytics avanzado**
- [ ] ClickHouse para OLAP
- [ ] Dashboard ejecutivo con KPIs en tiempo real
- [ ] Métricas por vendedor, equipo, canal y campaña
- [ ] Cohortes de clientes
- [ ] CAC, LTV, ROAS
- [ ] Atribución multitoque
- [ ] Revenue analytics (MRR, ARR, churn)
- [ ] Report builder drag-and-drop
- [ ] Reportes programados por email
- [ ] Alertas por anomalías

**Marketing**
- [ ] Segmentación dinámica con filtros
- [ ] Campañas de email (bulk)
- [ ] A/B testing de emails
- [ ] Formularios web embebibles
- [ ] Landing pages builder básico
- [ ] UTM tracking y atribución de origen

**AI avanzado**
- [ ] Búsqueda semántica (pgvector + embeddings)
- [ ] Copiloto en lenguaje natural (NL → datos del CRM)
- [ ] Scoring predictivo con ML
- [ ] Detección de churn
- [ ] Predicción de cierre de deals
- [ ] Análisis de sentimiento en conversaciones
- [ ] AI Governance: logs, human-in-the-loop, rollback

**Integraciones**
- [ ] Slack (notificaciones)
- [ ] Calendly / Google Calendar
- [ ] Stripe (pagos ligados a deals)
- [ ] n8n / webhooks genéricos
- [ ] Meta Ads / Facebook Lead Ads
- [ ] Google Sheets export

---

### 🏢 Fase 4 — Enterprise (Semanas 23–34)

**Multi-tenant avanzado**
- [ ] White-label completo (dominio, logo, colores, tipografía)
- [ ] Dominios personalizados por tenant
- [ ] Multiempresa / multisucursal / multibrand
- [ ] Billing por tenant (Stripe)
- [ ] Feature flags por plan
- [ ] Sandbox por tenant

**Administración**
- [ ] Roles y permisos granulares (RBAC + ABAC)
- [ ] Approval flows multi-step
- [ ] SLA engine con escalaciones automáticas
- [ ] Auditoría completa con event log inmutable
- [ ] Objetos y campos personalizados no-code
- [ ] Campos obligatorios por etapa de pipeline
- [ ] Políticas por equipo o negocio

**Comercial avanzado**
- [ ] Cotizaciones y propuestas con firma digital
- [ ] Contratos con flujo de aprobación
- [ ] Comisiones y objetivos por vendedor
- [ ] Forecast de ventas
- [ ] Playbooks comerciales

**Customer Success**
- [ ] Tickets de soporte
- [ ] Base de conocimiento
- [ ] Portal del cliente
- [ ] NPS / CSAT automático
- [ ] Health score de cuentas
- [ ] Churn prediction

**Seguridad**
- [ ] SSO / SAML
- [ ] 2FA / MFA
- [ ] Cifrado en reposo
- [ ] Políticas de retención de datos
- [ ] Logs de seguridad

---

### 🌍 Fase 5 — Platform (Semanas 35+)

- [ ] No-code custom object builder
- [ ] Marketplace de integraciones
- [ ] Public API + developer portal
- [ ] SDK para clientes
- [ ] White-label app builder
- [ ] Tenant-specific AI agents
- [ ] Executive cockpit en tiempo real
- [ ] Franchise / branch management
- [ ] Revenue operations layer completo
- [ ] Multi-región
- [ ] i18n / multi-language
- [ ] Multi-currency

---

## Estructura del proyecto

```
crm-propio/
├── apps/
│   ├── api/                  Fastify 4 — API REST
│   │   └── src/
│   │       ├── config.ts     Variables de entorno validadas con Zod
│   │       ├── app.ts        Setup de Fastify + plugins
│   │       ├── index.ts      Entrypoint
│   │       ├── plugins/      cors, auth (JWT), tenant, rate-limit
│   │       ├── routes/       auth, contacts, deals, pipelines, users
│   │       ├── services/     auth.service, contact.service, deal.service
│   │       └── lib/          redis, mailer
│   └── web/                  Next.js 15 App Router
│       ├── app/
│       │   ├── (auth)/       login, register
│       │   └── dashboard/    layout, overview, contacts, deals
│       ├── components/
│       │   └── layout/       sidebar, header
│       └── lib/              api client, auth, utils
├── packages/
│   ├── database/             Prisma schema + client + seed
│   │   └── prisma/
│   │       ├── schema.prisma Schema completo con 20+ modelos
│   │       ├── seed.ts       Datos demo
│   │       └── setup-rls.sql RLS policies para multi-tenant
│   └── types/                Tipos TypeScript compartidos
├── docker-compose.yml        Postgres + Redis + Mailpit
├── turbo.json                Pipeline de Turborepo
└── .env.example              Variables de entorno requeridas
```

## API endpoints disponibles

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/magic-link
POST   /api/auth/magic-link/verify
GET    /api/auth/me

GET    /api/contacts
POST   /api/contacts
GET    /api/contacts/:id
PATCH  /api/contacts/:id
DELETE /api/contacts/:id

GET    /api/deals
GET    /api/deals/kanban/:pipelineId
POST   /api/deals
GET    /api/deals/:id
PATCH  /api/deals/:id
PATCH  /api/deals/:id/stage
DELETE /api/deals/:id

GET    /api/pipelines
POST   /api/pipelines
GET    /api/pipelines/:id
PATCH  /api/pipelines/:id
DELETE /api/pipelines/:id

GET    /api/users
POST   /api/users
GET    /api/users/:id
GET    /api/users/me
PATCH  /api/users/:id
DELETE /api/users/:id
```

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Monorepo | Turborepo 2 + npm workspaces |
| API | Node.js 20 + Fastify 4 + TypeScript |
| ORM | Prisma 5 |
| Base de datos | PostgreSQL 16 (multi-tenant con RLS) |
| Cache / Colas | Redis 7 + BullMQ (Fase 2) |
| Analytics | ClickHouse (Fase 3) |
| Búsqueda semántica | pgvector (Fase 3) |
| Frontend | Next.js 15 + React 19 |
| Estilos | Tailwind CSS 3 |
| Estado | Zustand + TanStack Query (Fase 2) |
| AI | Anthropic Claude API (Fase 2+) |
| Email | Nodemailer + Resend (prod) |
| Comunicaciones | Twilio / Meta API (Fase 2) |
| Auth | JWT (access + refresh) |
| Deploy inicial | Railway / Render |
| CI/CD | GitHub Actions |
