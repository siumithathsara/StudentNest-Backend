import rateLimit from "express-rate-limit"

const base = { standardHeaders: true, legacyHeaders: false } as const

export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  message: { message: "Too many failed attempts. Please try again in 15 minutes." }
})

export const chatLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.user?.id ?? "anonymous",
  message: { message: "You are sending messages too fast. Please wait a minute." }
})

export const geoLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: (req) => req.user?.id ?? "anonymous",
  message: { message: "Too many searches. Please wait a moment." }
})
export const forgotLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: { message: "Too many reset requests. Please try again in an hour." }
})