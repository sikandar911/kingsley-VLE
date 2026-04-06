import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { PrismaClient } from '@prisma/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '.env') })

console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Found' : '❌ NOT FOUND')

const prisma = new PrismaClient()

try {
  await prisma.$connect()
  console.log('✅ Database connected successfully')
  const count = await prisma.user.count()
  console.log(`✅ Users in DB: ${count}`)
} catch (err) {
  console.error('❌ DB connection failed:', err.message)
} finally {
  await prisma.$disconnect()
}
