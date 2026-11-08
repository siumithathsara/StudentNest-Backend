import { Router } from "express"
import { addFavorite, favoriteIds, listFavorites, removeFavorite } from "../controllers/favorite.controller"
import { authenticate } from "../middleware/auth"
import { requireRole } from "../middleware/role"
import { Role } from "../models/user.model"

const router = Router()


router.use(authenticate, requireRole([Role.STUDENT]))

router.get("/", listFavorites)
router.get("/ids", favoriteIds)
router.put("/:boardingId", addFavorite)
router.delete("/:boardingId", removeFavorite)

export default router