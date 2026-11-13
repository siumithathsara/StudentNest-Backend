import { Router } from "express"
import {
    cancelMyBooking,
    createBooking,
    decideBooking,
    myBookings,
    receivedBookings
} from "../controllers/booking.controller"
import { authenticate } from "../middleware/auth"
import { requireRole } from "../middleware/role"
import { validate, validateQuery } from "../middleware/validate"
import { Role } from "../models/user.model"
import { bookingDecisionSchema, bookingsQuerySchema, createBookingSchema } from "../validators/booking.validator"

const router = Router()
const studentOnly = [authenticate, requireRole([Role.STUDENT])]
const ownerOnly = [authenticate, requireRole([Role.OWNER])]

// student
router.post("/", ...studentOnly, validate(createBookingSchema), createBooking)
router.get("/mine", ...studentOnly, validateQuery(bookingsQuerySchema), myBookings)
router.patch("/:id/cancel", ...studentOnly, cancelMyBooking)

// owner
router.get("/received", ...ownerOnly, validateQuery(bookingsQuerySchema), receivedBookings)
router.patch("/:id/status", ...ownerOnly, validate(bookingDecisionSchema), decideBooking)

export default router