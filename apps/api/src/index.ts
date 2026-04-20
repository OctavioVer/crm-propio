import { buildApp } from './app'
import { config } from './config'
import { prisma } from '@crm/database'
import { redis } from './lib/redis'

async function main() {
  const app = await buildApp()

  await prisma.$connect()
  await redis.connect()

  await app.listen({ port: config.API_PORT, host: config.API_HOST })
  console.log(`API corriendo en http://${config.API_HOST}:${config.API_PORT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
