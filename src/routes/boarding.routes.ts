import { Router } from "express"
import { compareBoardings, getBoardingDetail, listBoardings } from "../controllers/browse.controller"
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
import { validate, validateQuery } from "../middleware/validate"
import { Role } from "../models/user.model"
import {
  browseQuerySchema,
  compareQuerySchema,
  createBoardingSchema,
  detailQuerySchema,
  updateBoardingSchema
} from "../validators/boarding.validator"

const router = Router()
const ownerOnly = [authenticate, requireRole([Role.OWNER])]
const studentOnly = [authenticate, requireRole([Role.STUDENT])]

// ── Owner ──
router.get("/mine", ...ownerOnly, myBoardings)
router.get("/mine/:id", ...ownerOnly, getMyBoarding)
router.post("/", ...ownerOnly, uploadImagesMiddleware, validate(createBoardingSchema), createBoarding)
router.put("/:id", ...ownerOnly, uploadImagesMiddleware, validate(updateBoardingSchema), updateBoarding)
router.delete("/:id", ...ownerOnly, deleteBoarding)

// ── Student ──
router.get("/", ...studentOnly, validateQuery(browseQuerySchema), listBoardings)
router.get("/compare", ...studentOnly, validateQuery(compareQuerySchema), compareBoardings) // "/:id" ට කලින්
router.get("/:id", ...studentOnly, validateQuery(detailQuerySchema), getBoardingDetail)

export default router