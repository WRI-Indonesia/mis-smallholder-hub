import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

function readCsv(filename: string) {
  const csvPath = path.join(process.cwd(), 'prisma', 'seeds', 'csv', filename)
  if (!fs.existsSync(csvPath)) return []
  
  const csvData = fs.readFileSync(csvPath, 'utf8')
  const lines = csvData.split('\n').filter(line => line.trim() !== '')
  return lines.slice(1) // skip header
}

export async function seedRegionalData(prisma: PrismaClient) {
  console.log('\n--- Seeding Regional Data ---')

  // 1. Province
  const provinces = readCsv('province.csv')
  for (const line of provinces) {
    const [code, name] = line.split(',')
    if(!code || !name) continue
    await prisma.province.upsert({
      where: { code: code.trim() },
      update: {},
      create: { code: code.trim(), name: name.trim() },
    })
  }
  console.log(`Seeded ${provinces.length} provinces.`)

  // 2. District
  const districts = readCsv('district.csv')
  for (const line of districts) {
    const [code, name, provinceCode] = line.split(',')
    if(!code || !name || !provinceCode) continue
    const province = await prisma.province.findUnique({ where: { code: provinceCode.trim() } })
    if (province) {
      await prisma.district.upsert({
        where: { code: code.trim() },
        update: {},
        create: { code: code.trim(), name: name.trim(), provinceId: province.id },
      })
    }
  }
  console.log(`Seeded ${districts.length} districts.`)

  // 3. SubDistrict
  const subDistricts = readCsv('subdistrict.csv')
  for (const line of subDistricts) {
    const [code, name, districtCode] = line.split(',')
    if(!code || !name || !districtCode) continue
    const district = await prisma.district.findUnique({ where: { code: districtCode.trim() } })
    if (district) {
      await prisma.subDistrict.upsert({
        where: { code: code.trim() },
        update: {},
        create: { code: code.trim(), name: name.trim(), districtId: district.id },
      })
    }
  }
  console.log(`Seeded ${subDistricts.length} sub-districts.`)

  // 4. Village
  const villages = readCsv('village.csv')
  for (const line of villages) {
    const [code, name, subDistrictCode] = line.split(',')
    if(!code || !name || !subDistrictCode) continue
    const subDistrict = await prisma.subDistrict.findUnique({ where: { code: subDistrictCode.trim() } })
    if (subDistrict) {
      await prisma.village.upsert({
        where: { code: code.trim() },
        update: {},
        create: { code: code.trim(), name: name.trim(), subDistrictId: subDistrict.id },
      })
    }
  }
  console.log(`Seeded ${villages.length} villages.`)
}
