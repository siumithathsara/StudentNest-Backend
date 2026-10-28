import { z } from "zod"

const email = z.string().trim().toLowerCase().email("Invalid email address")

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/\d/, "Password must contain a number")

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(60),
    email,
    password,
    // can't make admin by using register
    role: z.enum(["STUDENT", "OWNER"]),
    phone: z.string().trim().regex(/^[0-9+\-\s]{9,15}$/, "Invalid phone number").optional()
  })
  .refine((d) => d.role !== "OWNER" || !!d.phone, {
    message: "Phone number is required for owners",
    path: ["phone"]
  })

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required")
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(10, "refreshToken is required")
})