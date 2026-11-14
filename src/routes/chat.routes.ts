import { Router } from "express"
import { chat } from "../controllers/chat.controller"
import { authenticate } from "../middleware/auth"
import { chatLimiter } from "../middleware/rateLimit"
import { requireRole } from "../middleware/role"
import { validate } from "../middleware/validate"
import { Role } from "../models/user.model"
import { chatSchema } from "../validators/chat.validator"

const router = Router()

router.post("/", authenticate, requireRole([Role.STUDENT]), chatLimiter, validate(chatSchema), chat)

export default router