import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'

export async function seedUsers(prisma: PrismaClient) {
  console.log('Seeding Users from CSV...')

  const csvPath = path.join(process.cwd(), 'prisma', 'seeds', 'csv', 'user.csv')
  const csvData = fs.readFileSync(csvPath, 'utf8')
  
  const lines = csvData.split('\n').filter(line => line.trim() !== '')
  
  // Skip the header line (index 0) and iterate through the rest
  for (let i = 1; i < lines.length; i++) {
    const [name, email, password, role] = lines[i].split(',')
    
    if (!name || !email || !password || !role) continue

    const passwordHash = await bcrypt.hash(password.trim(), 10)

    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim() },
    })

    if (!existingUser) {
      await prisma.user.create({
        data: {
          name: name.trim(),
          email: email.trim(),
          passwordHash,
          role: role.trim() as 'ADMINISTRATOR' | 'MANAGEMENT' | 'OPERATOR',
        },
      })
      console.log(`Created user with email: ${email.trim()}`)
    } else {
      console.log(`User with email: ${email.trim()} already exists`)
    }
  }

  console.log('Finished seeding users from CSV.')
}
