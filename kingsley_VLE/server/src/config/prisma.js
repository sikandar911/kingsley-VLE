import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { PrismaClient } from '@prisma/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '../../.env') })

// Use global prisma instance to avoid multiple connections
let prisma

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient()
} else {
  // In development, use global to persist the same instance across hot reloads
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: process.env.DATABASE_LOG ? ['query', 'error', 'warn'] : ['error'],
    })
  }
  prisma = global.prisma
}

export default prisma
