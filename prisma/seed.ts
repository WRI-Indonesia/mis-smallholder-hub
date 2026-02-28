import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { seedUsers } from './seeds/user'
import { seedRegionalData } from './seeds/regional'
import { seedTrainingTypes } from './seeds/training-type'
import 'dotenv/config'

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Start seeding...')

  // Insert seed functions here
  await seedUsers(prisma)
  await seedRegionalData(prisma)
  await seedTrainingTypes(prisma)

  console.log('\nSeeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
