import { Router } from "express"
import { reverse, search } from "../controllers/geo.controller"
import { authenticate } from "../middleware/auth"
import { geoLimiter } from "../middleware/rateLimit"
import { validateQuery } from "../middleware/validate"
import { geoSearchSchema, reverseSchema } from "../validators/campus.validator"

const router = Router()

router.get("/search", authenticate, geoLimiter, validateQuery(geoSearchSchema), search)
router.get("/reverse", authenticate, geoLimiter, validateQuery(reverseSchema), reverse)

export default router