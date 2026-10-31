import { Router } from "express"
import {
  createCampus,
  deleteCampus,
  listCampuses,
  nearbyCampuses,
  updateCampus
} from "../controllers/campus.controller"
import { authenticate } from "../middleware/auth"
import { requireRole } from "../middleware/role"
import { validate, validateQuery } from "../middleware/validate"
import { Role } from "../models/user.model"
import { campusSchema, nearbyQuerySchema } from "../validators/campus.validator"

const router = Router()
const adminOnly = [authenticate, requireRole([Role.ADMIN])]

router.get("/", authenticate, listCampuses)
router.get("/nearby", authenticate, validateQuery(nearbyQuerySchema), nearbyCampuses) 
router.post("/", ...adminOnly, validate(campusSchema), createCampus)
router.put("/:id", ...adminOnly, validate(campusSchema), updateCampus)
router.delete("/:id", ...adminOnly, deleteCampus)

export default router