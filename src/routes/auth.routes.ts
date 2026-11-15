import { Router } from "express"
import { login, me, refresh, register } from "../controllers/auth.controller"
import { authenticate } from "../middleware/auth"
import { authLimiter } from "../middleware/rateLimit"
import { validate } from "../middleware/validate"
import { loginSchema, refreshSchema, registerSchema } from "../validators/auth.validator"

const router = Router()

router.post("/register", authLimiter, validate(registerSchema), register)
router.post("/login", authLimiter, validate(loginSchema), login)
router.post("/refresh", authLimiter, validate(refreshSchema), refresh)
router.get("/me", authenticate, me)

export default router