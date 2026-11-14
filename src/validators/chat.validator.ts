import { z } from "zod"
import { CHAT_MAX_HISTORY, CHAT_MAX_MESSAGE } from "../util/chatRules"

export const chatSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Type a message")
    .max(CHAT_MAX_MESSAGE, `Message must be ${CHAT_MAX_MESSAGE} characters or less`),
  history: z
    .array(z.object({ role: z.enum(["user", "bot"]), text: z.string().max(CHAT_MAX_MESSAGE) }))
    .max(CHAT_MAX_HISTORY)
    .default([]),
  campusId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "Invalid id")
    .optional()
})