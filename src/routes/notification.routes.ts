import { Router } from "express"
import { listNotifications, markAllRead, markRead, unreadCount } from "../controllers/notification.controller"
import { authenticate } from "../middleware/auth"
import { validateQuery } from "../middleware/validate"
import { pageQuerySchema } from "../validators/common.validator"

const router = Router()

router.use(authenticate) 

router.get("/", validateQuery(pageQuerySchema), listNotifications)
router.get("/unread-count", unreadCount)
router.patch("/read-all", markAllRead)
router.patch("/:id/read", markRead)

export default router