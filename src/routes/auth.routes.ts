import { Router } from "express"
import { login, me, refresh, register } from "../controllers/auth.controller"
import { authenticate } from "../middleware/auth"
import { requireRole } from "../middleware/role"
import { validate } from "../middleware/validate"
import { Role } from "../models/user.model"
import { loginSchema, refreshSchema, registerSchema } from "../validators/auth.validator"

const router = Router()

router.post("/register", validate(registerSchema), register)
router.post("/login", validate(loginSchema), login)
router.post("/refresh", validate(refreshSchema), refresh)
router.get("/me", authenticate, me)

// temporary add one remeber me
router.get("/admin-test", authenticate, requireRole([Role.ADMIN]), (_req, res) => {
  res.json({ message: "Hello admin" })
})

export default router