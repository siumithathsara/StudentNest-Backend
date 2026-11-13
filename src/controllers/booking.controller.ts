import { Request, Response } from "express"
import mongoose, { isValidObjectId } from "mongoose"
import { Boarding, BoardingStatus } from "../models/boarding.model"
import { Booking, BookingStatus } from "../models/booking.model"
import { User } from "../models/user.model"
import { notify } from "../service/notification.service"
import { buildContact, MAX_PENDING_BOOKINGS } from "../util/bookingRules"

const serverError = (res: Response, err: unknown) => {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
}

const releaseRoom = (boardingId: mongoose.Types.ObjectId | string) =>
    Boarding.updateOne(
        { _id: boardingId, $expr: { $lt: ["$availableRooms", "$totalRooms"] } },
        { $inc: { availableRooms: 1 } }
    )

type ListQuery = { status?: BookingStatus[]; page: number; limit: number }

export const createBooking = async (req: Request, res: Response) => {
    try {
        const studentId = req.user!.id
        const { boardingId, moveInDate, message } = req.body as { boardingId: string; moveInDate: Date; message?: string }

        const boarding = await Boarding.findOne({ _id: boardingId, status: BoardingStatus.APPROVED })
        if (!boarding) {
            res.status(404).json({ message: "Boarding not found" })
            return
        }
        if (boarding.availableRooms < 1) {
            res.status(409).json({ message: "This boarding is full" })
            return
        }

        if (await Booking.exists({ student: studentId, boarding: boarding._id, active: true })) {
            res.status(409).json({ message: "You already have an active request for this boarding" })
            return
        }

        if (await Booking.exists({ student: studentId, status: BookingStatus.APPROVED })) {
            res.status(409).json({ message: "You already have an approved booking. Cancel it before requesting another room." })
            return
        }

        const pending = await Booking.countDocuments({ student: studentId, status: BookingStatus.PENDING })
        if (pending >= MAX_PENDING_BOOKINGS) {
            res.status(409).json({
                message: `You already have ${MAX_PENDING_BOOKINGS} pending requests. Wait for a reply or cancel one.`
            })
            return
        }

        let booking
        try {
            booking = await Booking.create({
                boarding: boarding._id,
                student: studentId,
                owner: boarding.owner,
                moveInDate,
                message: message || undefined
            })
        } catch (err: any) {
            if (err?.code === 11000) {

                res.status(409).json({ message: "You already have an active request for this boarding" })
                return
            }
            throw err
        }

        const student = await User.findById(studentId).select("name")
        await notify(boarding.owner, {
            type: "BOOKING_REQUESTED",
            title: "New booking request",
            message: `${student?.name ?? "A student"} requested a room in "${boarding.title}".`,
            link: "/owner/bookings"
        })

        res.status(201).json({
            message: "Request sent to the owner",
            data: { id: booking._id.toString(), status: booking.status }
        })
    } catch (err) {
        serverError(res, err)
    }
}

export const myBookings = async (req: Request, res: Response) => {
    try {
        const q = res.locals.query as ListQuery
        const filter: Record<string, unknown> = { student: req.user!.id }
        if (q.status) filter.status = { $in: q.status }

        const [rows, total] = await Promise.all([
            Booking.find(filter)
                .sort({ createdAt: -1 })
                .skip((q.page - 1) * q.limit)
                .limit(q.limit)
                .populate({
                    path: "boarding",
                    select: "title city monthlyRent images address location owner",
                    populate: { path: "owner", select: "name email phone" }
                })
                .lean(),
            Booking.countDocuments(filter)
        ])

        const items = rows.map((r: any) => ({
            id: r._id.toString(),
            status: r.status as BookingStatus,
            moveInDate: r.moveInDate,
            message: r.message ?? null,
            reason: r.reason ?? null,
            createdAt: r.createdAt,
            decidedAt: r.decidedAt ?? null,
            boarding: r.boarding
                ? {
                    id: r.boarding._id.toString(),
                    title: r.boarding.title,
                    city: r.boarding.city,
                    monthlyRent: r.boarding.monthlyRent,
                    coverImage: (r.boarding.images?.[0]?.url as string | undefined) ?? null
                }
                : null,

            contact: r.status === BookingStatus.APPROVED && r.boarding ? buildContact(r.boarding, r.boarding.owner) : null
        }))

        res.json({ message: "Success", data: { items, total, page: q.page, limit: q.limit } })
    } catch (err) {
        serverError(res, err)
    }
}

export const cancelMyBooking = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)
        if (!isValidObjectId(id)) {
            res.status(400).json({ message: "Invalid id" })
            return
        }

        const old = await Booking.findOneAndUpdate(
            { _id: id, student: req.user!.id, active: true },
            { status: BookingStatus.CANCELLED, active: false, reason: "Cancelled by the student", decidedAt: new Date() },
            { returnDocument: "before" }
        )
        if (!old) {
            res.status(404).json({ message: "Active booking not found" })
            return
        }

        if (old.status === BookingStatus.APPROVED) await releaseRoom(old.boarding)

        const [student, boarding] = await Promise.all([
            User.findById(req.user!.id).select("name"),
            Boarding.findById(old.boarding).select("title")
        ])
        await notify(old.owner, {
            type: "BOOKING_CANCELLED",
            title: "Booking cancelled",
            message: `${student?.name ?? "A student"} cancelled their ${old.status === BookingStatus.APPROVED ? "booking" : "request"
                } for "${boarding?.title ?? "your boarding"}".`,
            link: "/owner/bookings"
        })

        res.json({ message: "Booking cancelled" })
    } catch (err) {
        serverError(res, err)
    }
}

//  owner
export const receivedBookings = async (req: Request, res: Response) => {
    try {
        const q = res.locals.query as ListQuery
        const ownerId = req.user!.id
        const filter: Record<string, unknown> = { owner: ownerId }
        if (q.status) filter.status = { $in: q.status }

        const [rows, total, grouped] = await Promise.all([
            Booking.find(filter)
                .sort({ createdAt: -1 })
                .skip((q.page - 1) * q.limit)
                .limit(q.limit)
                .populate("student", "name email")
                .populate("boarding", "title city availableRooms totalRooms images")
                .lean(),
            Booking.countDocuments(filter),

            Booking.aggregate<{ _id: BookingStatus; count: number }>([
                { $match: { owner: new mongoose.Types.ObjectId(ownerId) } },
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ])
        ])

        const byStatus = Object.fromEntries(grouped.map((g) => [g._id, g.count]))
        const counts = {
            PENDING: byStatus.PENDING ?? 0,
            APPROVED: byStatus.APPROVED ?? 0,
            REJECTED: byStatus.REJECTED ?? 0,
            CANCELLED: byStatus.CANCELLED ?? 0
        }

        const items = rows.map((r: any) => ({
            id: r._id.toString(),
            status: r.status as BookingStatus,
            moveInDate: r.moveInDate,
            message: r.message ?? null,
            reason: r.reason ?? null,
            createdAt: r.createdAt,
            decidedAt: r.decidedAt ?? null,
            student: r.student ? { name: r.student.name as string, email: r.student.email as string } : null,
            boarding: r.boarding
                ? {
                    id: r.boarding._id.toString(),
                    title: r.boarding.title,
                    city: r.boarding.city,
                    availableRooms: r.boarding.availableRooms,
                    totalRooms: r.boarding.totalRooms,
                    coverImage: (r.boarding.images?.[0]?.url as string | undefined) ?? null
                }
                : null
        }))

        res.json({
            message: "Success",
            data: {
                items,
                total,
                page: q.page,
                limit: q.limit,
                counts: { ...counts, all: counts.PENDING + counts.APPROVED + counts.REJECTED + counts.CANCELLED }
            }
        })
    } catch (err) {
        serverError(res, err)
    }
}

export const decideBooking = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id)
        if (!isValidObjectId(id)) {
            res.status(400).json({ message: "Invalid id" })
            return
        }
        const { status, reason } = req.body as { status: "APPROVED" | "REJECTED" | "CANCELLED"; reason?: string }
        const ownerId = req.user!.id

        const booking = await Booking.findOne({ _id: id, owner: ownerId })
        if (!booking) {
            res.status(404).json({ message: "Booking not found" })
            return
        }
        const boarding = await Boarding.findById(booking.boarding).select("title")
        const title = boarding?.title ?? "the boarding"
        const now = new Date()

        if (status === "REJECTED") {
            if (booking.status !== BookingStatus.PENDING) {
                res.status(409).json({ message: "Only pending requests can be rejected" })
                return
            }
            const rejected = await Booking.findOneAndUpdate(
                { _id: id, owner: ownerId, status: BookingStatus.PENDING },
                { status: BookingStatus.REJECTED, active: false, reason, decidedAt: now },
                { returnDocument: "after" }
            )
            if (!rejected) {
                res.status(409).json({ message: "This request was already handled" })
                return
            }
            await notify(rejected.student, {
                type: "BOOKING_REJECTED",
                title: "Booking request rejected",
                message: `Your request for "${title}" was rejected: ${reason}`,
                link: "/bookings"
            })
            res.json({ message: "Request rejected" })
            return
        }

        if (status === "CANCELLED") {
            if (booking.status !== BookingStatus.APPROVED) {
                res.status(409).json({ message: "Only approved bookings can be cancelled" })
                return
            }
            const cancelled = await Booking.findOneAndUpdate(
                { _id: id, owner: ownerId, status: BookingStatus.APPROVED },
                { status: BookingStatus.CANCELLED, active: false, reason, decidedAt: now },
                { returnDocument: "after" }
            )
            if (!cancelled) {
                res.status(409).json({ message: "This booking was already handled" })
                return
            }
            await releaseRoom(cancelled.boarding)
            await notify(cancelled.student, {
                type: "BOOKING_CANCELLED",
                title: "Booking cancelled by the owner",
                message: `Your booking for "${title}" was cancelled: ${reason}`,
                link: "/bookings"
            })
            res.json({ message: "Booking cancelled" })
            return
        }

        if (booking.status !== BookingStatus.PENDING) {
            res.status(409).json({ message: "Only pending requests can be approved" })
            return
        }

        if (await Booking.exists({ student: booking.student, status: BookingStatus.APPROVED })) {
            res.status(409).json({
                message: "This student already has an approved booking elsewhere. You can reject this request."
            })
            return
        }

        const updated = await Boarding.findOneAndUpdate(
            { _id: booking.boarding, status: BoardingStatus.APPROVED, availableRooms: { $gt: 0 } },
            { $inc: { availableRooms: -1 } },
            { returnDocument: "after" }
        )
        if (!updated) {
            const b = await Boarding.findById(booking.boarding).select("status")
            res.status(409).json({
                message:
                    b && b.status !== BoardingStatus.APPROVED
                        ? "This boarding is waiting for admin approval, so requests cannot be approved right now"
                        : "No free rooms left. Increase the available rooms first."
            })
            return
        }

        let approved
        try {
            approved = await Booking.findOneAndUpdate(
                { _id: id, owner: ownerId, status: BookingStatus.PENDING },
                { status: BookingStatus.APPROVED, active: true, approvedAt: now, decidedAt: now },
                { returnDocument: "after" }
            )
        } catch (err) {
            await releaseRoom(booking.boarding)
            throw err
        }
        if (!approved) {
            await releaseRoom(booking.boarding)
            res.status(409).json({ message: "This request was already handled" })
            return
        }

        await notify(approved.student, {
            type: "BOOKING_APPROVED",
            title: "Booking approved",
            message: `Your request for "${title}" was approved. You can now see the owner's contact details.`,
            link: "/bookings"
        })

        if (updated.availableRooms === 0) {
            const others = await Booking.find({
                boarding: updated._id,
                status: BookingStatus.PENDING,
                _id: { $ne: approved._id }
            }).select("student")

            if (others.length > 0) {
                await Booking.updateMany(
                    { _id: { $in: others.map((o) => o._id) }, status: BookingStatus.PENDING },
                    { status: BookingStatus.REJECTED, active: false, reason: "This boarding is now full.", decidedAt: now }
                )
                await Promise.all(
                    others.map((o) =>
                        notify(o.student, {
                            type: "BOOKING_REJECTED",
                            title: "Booking request closed",
                            message: `"${title}" is now full, so your request was closed.`,
                            link: "/bookings"
                        })
                    )
                )
            }
        }

        res.json({ message: "Request approved", data: { availableRooms: updated.availableRooms } })
    } catch (err) {
        serverError(res, err)
    }
}