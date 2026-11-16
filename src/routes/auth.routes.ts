import { Router } from "express"
import { forgotPassword, login, me, refresh, register, resetPassword } from "../controllers/auth.controller"
import { authenticate } from "../middleware/auth"
import { authLimiter, forgotLimiter } from "../middleware/rateLimit"
import { validate } from "../middleware/validate"
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema
} from "../validators/auth.validator"

const router = Router()

router.post("/register", authLimiter, validate(registerSchema), register)
router.post("/login", authLimiter, validate(loginSchema), login)
router.post("/refresh", authLimiter, validate(refreshSchema), refresh)
router.post("/forgot-password", forgotLimiter, validate(forgotPasswordSchema), forgotPassword)
router.post("/reset-password", authLimiter, validate(resetPasswordSchema), resetPassword)
router.get("/me", authenticate, me)

export default router