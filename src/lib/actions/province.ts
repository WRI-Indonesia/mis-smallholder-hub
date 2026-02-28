"use server"

import { revalidatePath } from "next/cache"
import prisma from "../prisma"
import { ProvinceFormValues, provinceSchema } from "../zod/province"



export async function getProvinces() {
  try {
    const data = await prisma.province.findMany({
      orderBy: { code: "asc" },
    })
    return { data, error: null }
  } catch (error) {
    console.error("Failed to fetch provinces:", error)
    return { data: [], error: "Failed to fetch provinces." }
  }
}

export async function upsertProvince(data: ProvinceFormValues) {
  try {
    const validatedData = provinceSchema.parse(data)

    // Check if code already exists to prevent duplicate key constraint errors
    const existing = await prisma.province.findUnique({
      where: { code: validatedData.code },
    })
    
    if (validatedData.id) {
      // If updating, make sure we aren't stealing another province's code
      if (existing && existing.id !== validatedData.id) {
        return { success: false, error: "Province code already exists." }
      }
      
      await prisma.province.update({
        where: { id: validatedData.id },
        data: {
          code: validatedData.code,
          name: validatedData.name,
        },
      })
    } else {
      if (existing) {
        return { success: false, error: "Province code already exists." }
      }

      await prisma.province.create({
        data: {
          code: validatedData.code,
          name: validatedData.name,
        },
      })
    }

    revalidatePath("/dashboard/settings/province")
    return { success: true, error: null }
  } catch (error: any) {
    console.error("Failed to upsert province:", error)
    return { success: false, error: error.message || "Something went wrong." }
  }
}

export async function deleteProvince(id: string) {
  try {
    // Delete action will fail via Prisma if there are constrained Districts referencing it
    await prisma.province.delete({
      where: { id },
    })
    revalidatePath("/dashboard/settings/province")
    return { success: true, error: null }
  } catch (error: any) {
    console.error("Failed to delete province:", error)
    
    if (error.code === 'P2003') {
       return { success: false, error: "Cannot delete this province because it is currently linked to one or more districts." }
    }
    
    return { success: false, error: "Failed to delete province." }
  }
}
