import { Router } from "express"
import { getStats, listBoardingsAdmin, listUsers, setBoardingStatus, setUserStatus } from "../controllers/admin.controller"
import { authenticate } from "../middleware/auth"
import { requireRole } from "../middleware/role"
import { validate, validateQuery } from "../middleware/validate"
import { Role } from "../models/user.model"
import { boardingStatusSchema, boardingsQuerySchema, userStatusSchema, usersQuerySchema } from "../validators/admin.validator"

const router = Router()


router.use(authenticate, requireRole([Role.ADMIN]))

router.get("/stats", getStats)
router.get("/users", validateQuery(usersQuerySchema), listUsers)
router.patch("/users/:id/status", validate(userStatusSchema), setUserStatus)
router.get("/boardings", validateQuery(boardingsQuerySchema),  listBoardingsAdmin)
router.patch("/boardings/:id/status", validate(boardingStatusSchema), setBoardingStatus)

export default router