"use server"

import prisma from "../prisma"

export async function getRegionalTreeLevel(level: "province" | "district" | "subdistrict" | "village", parentId?: string) {
  try {
    switch (level) {
      case "province":
         const provinces = await prisma.province.findMany({
            orderBy: { name: "asc" }
         })
         return { success: true, data: provinces.map(p => ({ ...p, type: 'province' })) }

      case "district":
         if (!parentId) throw new Error("Province ID required")
         const districts = await prisma.district.findMany({
            where: { provinceId: parentId },
            orderBy: { name: "asc" }
         })
         return { success: true, data: districts.map(d => ({ ...d, type: 'district' })) }

      case "subdistrict":
         if (!parentId) throw new Error("District ID required")
         const subDistricts = await prisma.subDistrict.findMany({
            where: { districtId: parentId },
            orderBy: { name: "asc" }
         })
         return { success: true, data: subDistricts.map(sd => ({ ...sd, type: 'subdistrict' })) }

      case "village":
         if (!parentId) throw new Error("SubDistrict ID required")
         const villages = await prisma.village.findMany({
            where: { subDistrictId: parentId },
            orderBy: { name: "asc" }
         })
         return { success: true, data: villages.map(v => ({ ...v, type: 'village' })) }

      default:
         throw new Error("Invalid level")
    }
  } catch (error: any) {
     console.error(`Failed to fetch ${level} nodes:`, error)
     return { success: false, data: [], error: error.message }
  }
}

export async function searchRegionalTree(query: string) {
  if (!query || query.length < 2) return { success: true, data: [] }
  
  try {
     const [provinces, districts, subDistricts, villages] = await Promise.all([
        prisma.province.findMany({ 
           where: { name: { contains: query, mode: 'insensitive' } },
           take: 5 
        }),
        prisma.district.findMany({ 
           where: { name: { contains: query, mode: 'insensitive' } },
           include: { province: true },
           take: 10 
        }),
        prisma.subDistrict.findMany({ 
           where: { name: { contains: query, mode: 'insensitive' } },
           include: { district: { include: { province: true } } },
           take: 10 
        }),
        prisma.village.findMany({ 
           where: { name: { contains: query, mode: 'insensitive' } },
           include: { subDistrict: { include: { district: { include: { province: true } } } } },
           take: 15 
        })
     ])

     const results: any[] = []

     provinces.forEach(p => results.push({
        id: p.id, code: p.code, name: p.name, type: 'province',
        path: p.name
     }))

     districts.forEach(d => results.push({
        id: d.id, code: d.code, name: d.name, type: 'district', parentId: d.provinceId,
        path: `${d.province.name} > ${d.name}`
     }))

     subDistricts.forEach(sd => results.push({
        id: sd.id, code: sd.code, name: sd.name, type: 'subdistrict', parentId: sd.districtId,
        path: `${sd.district.province.name} > ${sd.district.name} > ${sd.name}`
     }))

     villages.forEach(v => results.push({
        id: v.id, code: v.code, name: v.name, type: 'village', parentId: v.subDistrictId,
        path: `${v.subDistrict.district.province.name} > ${v.subDistrict.district.name} > ${v.subDistrict.name} > ${v.name}`
     }))

     return { success: true, data: results }
  } catch (error: any) {
     console.error("Failed to search regional tree:", error)
     return { success: false, data: [], error: error.message }
  }
}
