import { Router } from "express"
import {
  createBoarding,
  deleteBoarding,
  getMyBoarding,
  myBoardings,
  updateBoarding
} from "../controllers/boarding.controller"
import { authenticate } from "../middleware/auth"
import { requireRole } from "../middleware/role"
import { uploadImagesMiddleware } from "../middleware/upload"
import { validate } from "../middleware/validate"
import { Role } from "../models/user.model"
import { createBoardingSchema, updateBoardingSchema } from "../validators/boarding.validator"

const router = Router()
const ownerOnly = [authenticate, requireRole([Role.OWNER])]

router.get("/mine", ...ownerOnly, myBoardings) 
router.get("/mine/:id", ...ownerOnly, getMyBoarding)

router.post("/", ...ownerOnly, uploadImagesMiddleware, validate(createBoardingSchema), createBoarding)
router.put("/:id", ...ownerOnly, uploadImagesMiddleware, validate(updateBoardingSchema), updateBoarding)
router.delete("/:id", ...ownerOnly, deleteBoarding)

export default router