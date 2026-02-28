"use server"

import bcrypt from "bcryptjs"
import prisma from "../prisma"

export async function loginUser(email: string, passwordString: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    })
    
    // User does not exist
    if (!user) {
       return { success: false, error: "Invalid email or password" }
    }
    
    // Check password
    const isMatch = await bcrypt.compare(passwordString, user.passwordHash)
    
    if (!isMatch) {
       return { success: false, error: "Invalid email or password" }
    }
    
    // Strip sensitive info before returning as session profile
    const sessionProfile = {
       id: user.id,
       name: user.name,
       email: user.email,
       role: user.role,
    }
    
    return { success: true, user: sessionProfile, error: null }
    
  } catch (error) {
    console.error("Login Error:", error)
    return { success: false, error: "Internal server error during login" }
  }
}
