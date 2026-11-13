import { z } from "zod"
import { MAX_MESSAGE_LENGTH, MOVE_IN_MAX_DAYS } from "../util/bookingRules"
import { pageQuerySchema } from "./common.validator"

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id")
const DAY_MS = 24 * 60 * 60 * 1000

const moveInDate = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
    .transform((s) => new Date(`${s}T00:00:00.000Z`))
    .refine((d) => !Number.isNaN(d.getTime()), { message: "Invalid date" })
    .refine(
        (d) => {
            const now = new Date()
            const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
            return d.getTime() >= todayUtc - DAY_MS && d.getTime() <= todayUtc + MOVE_IN_MAX_DAYS * DAY_MS
        },
        { message: "Move-in date must be between today and one year from now" }
    )

export const createBookingSchema = z.object({
    boardingId: objectId,
    moveInDate,
    message: z.string().trim().max(MAX_MESSAGE_LENGTH, `Message must be ${MAX_MESSAGE_LENGTH} characters or less`).optional()
})

export const bookingDecisionSchema = z
    .object({
        status: z.enum(["APPROVED", "REJECTED", "CANCELLED"]),
        reason: z.string().trim().min(3, "Reason is too short").max(300).optional()
    })
    .refine((d) => d.status === "APPROVED" || !!d.reason, {
        message: "A reason is required",
        path: ["reason"]
    })

export const bookingsQuerySchema = pageQuerySchema.extend({
    status: z
        .string()
        .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean))
        .pipe(z.array(z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"])).min(1))
        .optional()
})