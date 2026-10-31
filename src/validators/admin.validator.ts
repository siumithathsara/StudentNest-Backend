import { z } from "zod"
import { pageQuerySchema } from "./common.validator"

export const usersQuerySchema = pageQuerySchema.extend({
  status: z.enum(["PENDING_APPROVAL", "APPROVED", "REJECTED", "SUSPENDED"]).optional()
})

export const userStatusSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]),
    reason: z.string().trim().min(3, "Reason is too short").max(300).optional()
  })
  .refine((d) => d.status === "APPROVED" || !!d.reason, {
    message: "A reason is required",
    path: ["reason"]
  })

  export const boardingsQuerySchema = pageQuerySchema.extend({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional()
})

export const boardingStatusSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    reason: z.string().trim().min(3, "Reason is too short").max(300).optional()
  })
  .refine((d) => d.status === "APPROVED" || !!d.reason, {
    message: "A reason is required",
    path: ["reason"]
  })