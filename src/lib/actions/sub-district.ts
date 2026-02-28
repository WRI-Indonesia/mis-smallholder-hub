"use server"

import { revalidatePath } from "next/cache"
import prisma from "../prisma"
import { SubDistrictFormValues, subDistrictSchema } from "../zod/sub-district"



export async function getSubDistricts() {
  try {
    const data = await prisma.subDistrict.findMany({
      include: {
        district: true // Fetches associated District data
      },
      orderBy: { code: "asc" },
    })
    return { data, error: null }
  } catch (error) {
    console.error("Failed to fetch sub-districts:", error)
    return { data: [], error: "Failed to fetch sub-districts." }
  }
}

export async function upsertSubDistrict(data: SubDistrictFormValues) {
  try {
    const validatedData = subDistrictSchema.parse(data)

    const existing = await prisma.subDistrict.findUnique({
      where: { code: validatedData.code },
    })
    
    if (validatedData.id) {
      if (existing && existing.id !== validatedData.id) {
         return { success: false, error: "Sub-district code already exists." }
      }
      
      await prisma.subDistrict.update({
        where: { id: validatedData.id },
        data: {
          code: validatedData.code,
          name: validatedData.name,
          districtId: validatedData.districtId
        },
      })
    } else {
      if (existing) {
         return { success: false, error: "Sub-district code already exists." }
      }

      await prisma.subDistrict.create({
        data: {
          code: validatedData.code,
          name: validatedData.name,
          districtId: validatedData.districtId
        },
      })
    }

    revalidatePath("/dashboard/settings/sub-district")
    return { success: true, error: null }
  } catch (error: any) {
    console.error("Failed to upsert sub-district:", error)
    return { success: false, error: error.message || "Something went wrong." }
  }
}

export async function deleteSubDistrict(id: string) {
  try {
    await prisma.subDistrict.delete({
      where: { id },
    })
    revalidatePath("/dashboard/settings/sub-district")
    return { success: true, error: null }
  } catch (error: any) {
    console.error("Failed to delete sub-district:", error)
    
    if (error.code === 'P2003') {
       return { success: false, error: "Cannot delete this sub-district because it is currently linked to one or more villages." }
    }
    
    return { success: false, error: "Failed to delete sub-district." }
  }
}
