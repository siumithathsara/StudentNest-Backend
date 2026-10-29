import { Router } from "express"
import { getStats, listUsers, setUserStatus } from "../controllers/admin.controller"
import { authenticate } from "../middleware/auth"
import { requireRole } from "../middleware/role"
import { validate, validateQuery } from "../middleware/validate"
import { Role } from "../models/user.model"
import { userStatusSchema, usersQuerySchema } from "../validators/admin.validator"

const router = Router()


router.use(authenticate, requireRole([Role.ADMIN]))

router.get("/stats", getStats)
router.get("/users", validateQuery(usersQuerySchema), listUsers)
router.patch("/users/:id/status", validate(userStatusSchema), setUserStatus)

export default router