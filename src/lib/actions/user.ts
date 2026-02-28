"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import prisma from "../prisma"
import { UserFormValues, userSchema } from "../zod/user"

export async function getUsers() {
  try {
    const data = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
         id: true,
         name: true,
         email: true,
         role: true,
         createdAt: true,
         updatedAt: true
         // purposely excluding passwordHash from the payload sent to client
      }
    })
    return { data, error: null }
  } catch (error) {
    console.error("Failed to fetch users:", error)
    return { data: [], error: "Failed to fetch users." }
  }
}

export async function upsertUser(data: UserFormValues) {
  try {
    const validatedData = userSchema.parse(data)

    const existing = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })
    
    if (validatedData.id) {
      if (existing && existing.id !== validatedData.id) {
         return { success: false, error: "Email address is already in use by another user." }
      }
      
      const updatePayload: any = {
         name: validatedData.name,
         email: validatedData.email,
         role: validatedData.role,
      }
      
      // Only hash and update password if provided
      if (validatedData.password && validatedData.password.trim() !== "") {
         updatePayload.passwordHash = await bcrypt.hash(validatedData.password, 10)
      }

      await prisma.user.update({
        where: { id: validatedData.id },
        data: updatePayload,
      })
    } else {
      if (existing) {
         return { success: false, error: "Email address is already registered." }
      }
      
      if (!validatedData.password) {
         return { success: false, error: "Password is required for new users." }
      }

      const hashedPassword = await bcrypt.hash(validatedData.password, 10)

      await prisma.user.create({
        data: {
          name: validatedData.name,
          email: validatedData.email,
          role: validatedData.role,
          passwordHash: hashedPassword
        },
      })
    }

    revalidatePath("/dashboard/settings/user")
    return { success: true, error: null }
  } catch (error: any) {
    console.error("Failed to upsert user:", error)
    return { success: false, error: error.message || "Something went wrong." }
  }
}

export async function deleteUser(id: string) {
  try {
    await prisma.user.delete({
      where: { id },
    })
    revalidatePath("/dashboard/settings/user")
    return { success: true, error: null }
  } catch (error: any) {
    console.error("Failed to delete user:", error)
    return { success: false, error: "Failed to delete user." }
  }
}
