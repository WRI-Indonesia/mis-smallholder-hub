"use server"

import { revalidatePath } from "next/cache"
import prisma from "../prisma"
import { MenuFormValues, menuSchema } from "../zod/menu"



export async function getMenus() {
  try {
    const data = await prisma.menu.findMany({
      include: {
         parent: true // include parent if it's a submenu
      },
      orderBy: [
        { parentId: 'asc' }, // nulls (parents) first typically
        { order: 'asc' }
      ],
    })
    return { data, error: null }
  } catch (error) {
    console.error("Failed to fetch menus:", error)
    return { data: [], error: "Failed to fetch menus." }
  }
}

export async function upsertMenu(data: MenuFormValues) {
  try {
    const validatedData = menuSchema.parse(data)

    if (validatedData.id) {
      // Prevent cyclic parent attachments (a menu cannot be its own parent)
      if (validatedData.parentId === validatedData.id) {
         return { success: false, error: "A menu cannot be its own parent." }
      }

      await prisma.menu.update({
        where: { id: validatedData.id },
        data: {
          title: validatedData.title,
          url: validatedData.url,
          icon: validatedData.icon,
          parentId: validatedData.parentId || null,
          order: validatedData.order
        },
      })
    } else {
      await prisma.menu.create({
        data: {
          title: validatedData.title,
          url: validatedData.url,
          icon: validatedData.icon,
          parentId: validatedData.parentId || null,
          order: validatedData.order
        },
      })
    }

    revalidatePath("/dashboard/settings/menu")
    return { success: true, error: null }
  } catch (error: any) {
    console.error("Failed to upsert menu:", error)
    return { success: false, error: error.message || "Something went wrong." }
  }
}

export async function deleteMenu(id: string) {
  try {
    await prisma.menu.delete({
      where: { id },
    })
    revalidatePath("/dashboard/settings/menu")
    return { success: true, error: null }
  } catch (error: any) {
    console.error("Failed to delete menu:", error)
    
    if (error.code === 'P2003') {
       return { success: false, error: "Cannot delete this menu because it currently has active sub-menus linked to it." }
    }
    
    return { success: false, error: "Failed to delete menu." }
  }
}
