import rateLimit from "express-rate-limit"

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? "anonymous", 
  message: { message: "You are sending messages too fast. Please wait a minute." }
})