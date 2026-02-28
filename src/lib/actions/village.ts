"use server"

import { revalidatePath } from "next/cache"
import prisma from "../prisma"
import { VillageFormValues, villageSchema } from "../zod/village"



export async function getVillages() {
  try {
    const data = await prisma.village.findMany({
      include: {
        subDistrict: {
          include: {
             district: true // Fetching up to District for better context in UI if needed
          }
        }
      },
      orderBy: { code: "asc" },
    })
    return { data, error: null }
  } catch (error) {
    console.error("Failed to fetch villages:", error)
    return { data: [], error: "Failed to fetch villages." }
  }
}

export async function upsertVillage(data: VillageFormValues) {
  try {
    const validatedData = villageSchema.parse(data)

    const existing = await prisma.village.findUnique({
      where: { code: validatedData.code },
    })
    
    if (validatedData.id) {
      if (existing && existing.id !== validatedData.id) {
         return { success: false, error: "Village code already exists." }
      }
      
      await prisma.village.update({
        where: { id: validatedData.id },
        data: {
          code: validatedData.code,
          name: validatedData.name,
          subDistrictId: validatedData.subDistrictId
        },
      })
    } else {
      if (existing) {
         return { success: false, error: "Village code already exists." }
      }

      await prisma.village.create({
        data: {
          code: validatedData.code,
          name: validatedData.name,
          subDistrictId: validatedData.subDistrictId
        },
      })
    }

    revalidatePath("/dashboard/settings/village")
    return { success: true, error: null }
  } catch (error: any) {
    console.error("Failed to upsert village:", error)
    return { success: false, error: error.message || "Something went wrong." }
  }
}

export async function deleteVillage(id: string) {
  try {
    await prisma.village.delete({
      where: { id },
    })
    revalidatePath("/dashboard/settings/village")
    return { success: true, error: null }
  } catch (error: any) {
    console.error("Failed to delete village:", error)
    
    if (error.code === 'P2003') {
       return { success: false, error: "Cannot delete this village because it is currently linked to farmer data." }
    }
    
    return { success: false, error: "Failed to delete village." }
  }
}
