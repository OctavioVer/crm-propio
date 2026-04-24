import { buildApp } from './app'
import { config } from './config'
import { prisma } from '@crm/database'
import { redis } from './lib/redis'
import { startWorkflowWorker } from './workers/workflow.worker'

async function main() {
  const app = await buildApp()

  await prisma.$connect()
  
  if (redis.status === 'wait') {
    try {
      await redis.connect()
    } catch (err: any) {
      if (!err.message.includes('already connecting')) throw err
    }
  }

  // Start BullMQ workflow worker
  startWorkflowWorker()

  await app.listen({ port: config.API_PORT, host: config.API_HOST })
  console.log(`API corriendo en http://${config.API_HOST}:${config.API_PORT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
