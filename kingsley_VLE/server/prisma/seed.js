import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding admin accounts...')

  const adminPassword = await bcrypt.hash('Admin@123456', 10)
  const backupPassword = await bcrypt.hash('BackupAdmin@123456', 10)

  const admin1 = await prisma.user.upsert({
    where: { email: 'admin@system.edu' },
    update: {},
    create: {
      email: 'admin@system.edu',
      username: 'admin',
      passwordHash: adminPassword,
      role: 'admin',
      isActive: true,
    },
  })

  const admin2 = await prisma.user.upsert({
    where: { email: 'backup_admin@system.edu' },
    update: {},
    create: {
      email: 'backup_admin@system.edu',
      username: 'backup_admin',
      passwordHash: backupPassword,
      role: 'admin',
      isActive: true,
    },
  })

  console.log('Admin accounts seeded:')
  console.log(`  ✓ ${admin1.email} / Admin@123456`)
  console.log(`  ✓ ${admin2.email} / BackupAdmin@123456`)
}

main()
  .catch((err) => {
    console.error('Seed error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
