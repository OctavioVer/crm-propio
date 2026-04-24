import { Worker, Queue, type Job } from 'bullmq'
import { prisma } from '@crm/database'
import { redis } from '../lib/redis'
import { mailer } from '../lib/mailer'
import { config } from '../config'

export const WORKFLOW_QUEUE = 'workflow-executions'

export interface WorkflowJobData {
  executionId: string
  workflowId: string
  tenantId: string
  entityType: string
  entityId: string
}

export const workflowQueue = new Queue<WorkflowJobData>(WORKFLOW_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})

type NodeType = 'send_email' | 'create_task' | 'assign_owner' | 'move_stage' | 'add_tag' | 'wait' | 'notify'

interface WorkflowNode {
  id: string
  type: NodeType
  label: string
  config: Record<string, unknown>
  nextId?: string
}

async function executeNode(node: WorkflowNode, context: { tenantId: string; entityId: string; entityType: string }) {
  const log: { node: string; type: string; result: string; ts: string } = {
    node: node.id,
    type: node.type,
    result: 'ok',
    ts: new Date().toISOString(),
  }

  try {
    switch (node.type) {
      case 'send_email': {
        const subject = String(node.config.subject ?? 'Mensaje del CRM')
        const body = String(node.config.body ?? node.label)
        const to = String(node.config.to ?? '')

        if (to) {
          await mailer.sendMail({
            from: config.SMTP_FROM,
            to,
            subject,
            text: body,
            html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
          })
        }
        log.result = `Email enviado a ${to || 'destinatario no configurado'}`
        break
      }

      case 'create_task': {
        const title = String(node.config.title ?? node.label)
        const daysFromNow = Number(node.config.daysFromNow ?? 1)
        const dueAt = new Date(Date.now() + daysFromNow * 86400_000)

        const activity = await prisma.activity.create({
          data: {
            tenantId: context.tenantId,
            type: 'TASK',
            title,
            dueAt,
            ...(context.entityType === 'contact' && { contactId: context.entityId }),
            ...(context.entityType === 'deal' && { dealId: context.entityId }),
          },
        })
        log.result = `Tarea creada: ${activity.id}`
        break
      }

      case 'assign_owner': {
        const ownerId = String(node.config.ownerId ?? '')
        if (!ownerId) break

        if (context.entityType === 'deal') {
          await prisma.deal.updateMany({
            where: { id: context.entityId, tenantId: context.tenantId },
            data: { ownerId },
          })
        } else if (context.entityType === 'contact') {
          await prisma.contact.updateMany({
            where: { id: context.entityId, tenantId: context.tenantId },
            data: { ownerId },
          })
        }
        log.result = `Owner asignado: ${ownerId}`
        break
      }

      case 'move_stage': {
        const stage = String(node.config.stage ?? '')
        if (!stage || context.entityType !== 'deal') break

        await prisma.deal.updateMany({
          where: { id: context.entityId, tenantId: context.tenantId },
          data: { stage },
        })
        log.result = `Deal movido a etapa: ${stage}`
        break
      }

      case 'add_tag': {
        const tag = String(node.config.tag ?? '')
        if (!tag || context.entityType !== 'contact') break

        const contact = await prisma.contact.findFirst({
          where: { id: context.entityId, tenantId: context.tenantId },
          select: { tags: true },
        })
        if (contact && !contact.tags.includes(tag)) {
          await prisma.contact.update({
            where: { id: context.entityId },
            data: { tags: [...contact.tags, tag] },
          })
        }
        log.result = `Tag agregado: ${tag}`
        break
      }

      case 'notify': {
        // Log notification as an activity note
        const message = String(node.config.message ?? node.label)
        await prisma.activity.create({
          data: {
            tenantId: context.tenantId,
            type: 'NOTE',
            title: 'Notificación automática',
            body: message,
            ...(context.entityType === 'contact' && { contactId: context.entityId }),
            ...(context.entityType === 'deal' && { dealId: context.entityId }),
          },
        })
        log.result = `Notificación registrada`
        break
      }

      case 'wait': {
        const hours = Number(node.config.hours ?? 24)
        // In real impl, this would delay the next job — for now we log
        log.result = `Espera de ${hours}h (simulada)`
        break
      }
    }
  } catch (err: any) {
    log.result = `ERROR: ${err?.message ?? 'desconocido'}`
    throw err
  }

  return log
}

export function startWorkflowWorker() {
  const worker = new Worker<WorkflowJobData>(
    WORKFLOW_QUEUE,
    async (job: Job<WorkflowJobData>) => {
      const { executionId, workflowId, tenantId, entityType, entityId } = job.data

      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: { status: 'RUNNING' },
      })

      const workflow = await prisma.workflow.findFirst({
        where: { id: workflowId, tenantId, active: true },
      })

      if (!workflow) {
        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: { status: 'FAILED', logJson: [{ error: 'Workflow no encontrado o inactivo' }], finishedAt: new Date() },
        })
        return
      }

      const nodes = workflow.nodesJson as any as WorkflowNode[]
      const logs: unknown[] = []

      for (const node of nodes) {
        const nodeLog = await executeNode(node, { tenantId, entityId, entityType })
        logs.push(nodeLog)
      }

      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: { status: 'COMPLETED', logJson: logs as any, finishedAt: new Date() },
      })
    },
    { connection: redis, concurrency: 5 }
  )

  worker.on('completed', (job) => {
    console.log(`[Workflow] Execution ${job.data.executionId} completed`)
  })

  worker.on('failed', async (job, err) => {
    console.error(`[Workflow] Execution ${job?.data?.executionId} failed:`, err.message)
    if (job?.data?.executionId) {
      await prisma.workflowExecution.update({
        where: { id: job.data.executionId },
        data: { status: 'FAILED', finishedAt: new Date() },
      }).catch(() => {})
    }
  })

  console.log('[Workflow] Worker started')
  return worker
}

// Enqueue a workflow execution when a trigger fires
export async function triggerWorkflows(tenantId: string, triggerType: string, entityType: string, entityId: string) {
  const workflows = await prisma.workflow.findMany({
    where: { tenantId, active: true },
  })

  for (const workflow of workflows) {
    const trigger = workflow.triggerJson as { type: string }
    if (trigger.type !== triggerType) continue

    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        entityType,
        entityId,
        status: 'PENDING',
      },
    })

    await workflowQueue.add('execute', {
      executionId: execution.id,
      workflowId: workflow.id,
      tenantId,
      entityType,
      entityId,
    })
  }
}
