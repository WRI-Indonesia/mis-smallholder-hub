import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

export async function seedTrainingTypes(prisma: PrismaClient) {
  console.log('\n--- Seeding Training Types from CSV ---')

  const csvPath = path.join(process.cwd(), 'prisma', 'seeds', 'csv', 'training-type.csv')
  if (!fs.existsSync(csvPath)) return

  const csvData = fs.readFileSync(csvPath, 'utf8')
  const lines = csvData.split('\n').filter(line => line.trim() !== '')
  
  for (let i = 1; i < lines.length; i++) {
    const [name, description] = lines[i].split(',')
    if (!name) continue
    
    await prisma.trainingType.upsert({
      where: { name: name.trim() },
      update: {},
      create: {
        name: name.trim(),
        description: description ? description.trim() : null,
      },
    })
  }

  console.log(`Seeded ${lines.length - 1} training types.`)
}
