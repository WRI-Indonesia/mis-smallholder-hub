"use server"

import { revalidatePath } from "next/cache"
import prisma from "../prisma"
import { TrainingTypeFormValues, trainingTypeSchema } from "../zod/training-type"



export async function getTrainingTypes() {
  try {
    const data = await prisma.trainingType.findMany({
      orderBy: { createdAt: "desc" },
    })
    return { data, error: null }
  } catch (error) {
    console.error("Failed to fetch training types:", error)
    return { data: [], error: "Failed to fetch training types." }
  }
}

export async function upsertTrainingType(data: TrainingTypeFormValues) {
  try {
    const validatedData = trainingTypeSchema.parse(data)

    if (validatedData.id) {
      // Update
      await prisma.trainingType.update({
        where: { id: validatedData.id },
        data: {
          name: validatedData.name,
          description: validatedData.description,
        },
      })
    } else {
      // Create
      await prisma.trainingType.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
        },
      })
    }

    revalidatePath("/dashboard/training/type")
    return { success: true, error: null }
  } catch (error: any) {
    console.error("Failed to upsert training type:", error)
    return { success: false, error: error.message || "Something went wrong." }
  }
}

export async function deleteTrainingType(id: string) {
  try {
    await prisma.trainingType.delete({
      where: { id },
    })
    revalidatePath("/dashboard/training/type")
    return { success: true, error: null }
  } catch (error: any) {
    console.error("Failed to delete training type:", error)
    return { success: false, error: "Failed to delete training type." }
  }
}
