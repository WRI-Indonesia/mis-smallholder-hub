"use server"

import { revalidatePath } from "next/cache"
import prisma from "../prisma"
import { DistrictFormValues, districtSchema } from "../zod/district"



export async function getDistricts() {
  try {
    const data = await prisma.district.findMany({
      include: {
        province: true // Fetches associated province data
      },
      orderBy: { code: "asc" },
    })
    return { data, error: null }
  } catch (error) {
    console.error("Failed to fetch districts:", error)
    return { data: [], error: "Failed to fetch districts." }
  }
}

export async function upsertDistrict(data: DistrictFormValues) {
  try {
    const validatedData = districtSchema.parse(data)

    // Check if code already exists to prevent duplicate key constraint errors
    const existing = await prisma.district.findUnique({
      where: { code: validatedData.code },
    })
    
    if (validatedData.id) {
      if (existing && existing.id !== validatedData.id) {
         return { success: false, error: "District code already exists." }
      }
      
      await prisma.district.update({
        where: { id: validatedData.id },
        data: {
          code: validatedData.code,
          name: validatedData.name,
          provinceId: validatedData.provinceId
        },
      })
    } else {
      if (existing) {
         return { success: false, error: "District code already exists." }
      }

      await prisma.district.create({
        data: {
          code: validatedData.code,
          name: validatedData.name,
          provinceId: validatedData.provinceId
        },
      })
    }

    revalidatePath("/dashboard/settings/district")
    return { success: true, error: null }
  } catch (error: any) {
    console.error("Failed to upsert district:", error)
    return { success: false, error: error.message || "Something went wrong." }
  }
}

export async function deleteDistrict(id: string) {
  try {
    await prisma.district.delete({
      where: { id },
    })
    revalidatePath("/dashboard/settings/district")
    return { success: true, error: null }
  } catch (error: any) {
    console.error("Failed to delete district:", error)
    
    if (error.code === 'P2003') {
       return { success: false, error: "Cannot delete this district because it is currently linked to one or more sub-districts." }
    }
    
    return { success: false, error: "Failed to delete district." }
  }
}
