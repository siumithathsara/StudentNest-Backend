import { Router } from "express"
import { reverse, search } from "../controllers/geo.controller"
import { authenticate } from "../middleware/auth"
import { validateQuery } from "../middleware/validate"
import { geoSearchSchema, reverseSchema } from "../validators/campus.validator"

const router = Router()

router.get("/search", authenticate, validateQuery(geoSearchSchema), search)
router.get("/reverse", authenticate, validateQuery(reverseSchema), reverse)

export default router