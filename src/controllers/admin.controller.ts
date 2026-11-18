import { Request, Response } from "express"
import mongoose, { isValidObjectId } from "mongoose"
import { Role, Status, User } from "../models/user.model"
import { notify } from "../service/notification.service"
import { Boarding, BoardingStatus } from "../models/boarding.model"
import { Campus } from "../models/campus.model"
import { Booking } from "../models/booking.model"

const TRANSITIONS: Record<string, Status[]> = {
  APPROVED: [Status.PENDING_APPROVAL, Status.REJECTED, Status.SUSPENDED],
  REJECTED: [Status.PENDING_APPROVAL],
  SUSPENDED: [Status.APPROVED]
}

type CountRow = { _id: string; count: number }
const toMap = (rows: CountRow[]) => Object.fromEntries(rows.map((r) => [r._id, r.count])) as Record<string, number>

export const getStats = async (_req: Request, res: Response) => {
  try {
    const match = { $match: { role: { $ne: Role.ADMIN } } }
    const [byStatus, byRole, boardingsByStatus, campuses, bookingsByStatus] = await Promise.all([

      User.aggregate<CountRow>([match, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      User.aggregate<CountRow>([match, { $group: { _id: "$role", count: { $sum: 1 } } }]),
      Boarding.aggregate<CountRow>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Campus.countDocuments(),
      Booking.aggregate<CountRow>([{ $group: { _id: "$status", count: { $sum: 1 } } }])
    ])
    const s = toMap(byStatus)
    const r = toMap(byRole)
    const b = toMap(boardingsByStatus)
    const bk = toMap(bookingsByStatus)

    res.json({
      message: "Success",
      data: {
        users: {
          total: (s.PENDING_APPROVAL ?? 0) + (s.APPROVED ?? 0) + (s.REJECTED ?? 0) + (s.SUSPENDED ?? 0),
          pending: s.PENDING_APPROVAL ?? 0,
          approved: s.APPROVED ?? 0,
          rejected: s.REJECTED ?? 0,
          suspended: s.SUSPENDED ?? 0,
          students: r.STUDENT ?? 0,
          owners: r.OWNER ?? 0
        },
        boardings: {
          total: (b.PENDING ?? 0) + (b.APPROVED ?? 0) + (b.REJECTED ?? 0),
          pending: b.PENDING ?? 0,
          approved: b.APPROVED ?? 0,
          rejected: b.REJECTED ?? 0
        },
        bookings: {
          total: (bk.PENDING ?? 0) + (bk.APPROVED ?? 0) + (bk.REJECTED ?? 0) + (bk.CANCELLED ?? 0),
          pending: bk.PENDING ?? 0,
          approved: bk.APPROVED ?? 0
        },
        campuses
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const listUsers = async (_req: Request, res: Response) => {
  try {
    const { page, limit, status } = res.locals.query
    const filter: Record<string, unknown> = { role: { $ne: Role.ADMIN } }
    if (status) filter.status = status

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter)
    ])

    const items = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: u.status,
      rejectionReason: u.rejectionReason,
      createdAt: (u as unknown as { createdAt: Date }).createdAt
    }))

    res.json({ message: "Success", data: { items, total, page, limit } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const setUserStatus = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid id" })
      return
    }
    const { status, reason } = req.body as { status: "APPROVED" | "REJECTED" | "SUSPENDED"; reason?: string }
   
    const user = await User.findById(id)
    if (!user || user.role === Role.ADMIN) {
      res.status(404).json({ message: "User not found" })
      return
    }
    if (!TRANSITIONS[status].includes(user.status)) {
      res.status(409).json({ message: `Cannot change status from ${user.status} to ${status}` })
      return
    }

    user.status = status as Status
    user.rejectionReason = status === "APPROVED" ? undefined : reason
    if (status === "APPROVED") {
      user.approvedBy = new mongoose.Types.ObjectId(req.user!.id)
      user.approvedAt = new Date()
    }
    await user.save()

    const messages = {
      APPROVED: "Your account has been approved. Welcome to StudentNest!",
      REJECTED: `Your application was rejected: ${reason}`,
      SUSPENDED: `Your account has been suspended: ${reason}`
    }
    await notify(user._id, {
      type: `USER_${status}`,
      title: `Account ${status.toLowerCase()}`,
      message: messages[status]
    })

    res.json({ message: `User ${status.toLowerCase()}` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const listBoardingsAdmin = async (_req: Request, res: Response) => {
  try {
    const { page, limit, status } = res.locals.query
    const filter = status ? { status } : {}

    const [rows, total] = await Promise.all([
      Boarding.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("owner", "name email phone")
        .lean(),
      Boarding.countDocuments(filter)
    ])

    const items = rows.map((b: any) => ({
      id: b._id.toString(),
      title: b.title,
      description: b.description,
      city: b.city,
      address: b.address,
      monthlyRent: b.monthlyRent,
      totalRooms: b.totalRooms,
      availableRooms: b.availableRooms,
      facilities: b.facilities,
      lat: b.location.coordinates[1],
      lng: b.location.coordinates[0],
      images: b.images,
      status: b.status,
      rejectionReason: b.rejectionReason,
      createdAt: b.createdAt,
      owner: b.owner ? { id: b.owner._id.toString(), name: b.owner.name, email: b.owner.email, phone: b.owner.phone } : null
    }))

    res.json({ message: "Success", data: { items, total, page, limit } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const setBoardingStatus = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid id" })
      return
    }
    const { status, reason } = req.body as { status: "APPROVED" | "REJECTED"; reason?: string }

    const boarding = await Boarding.findById(id)
    if (!boarding) {
      res.status(404).json({ message: "Boarding not found" })
      return
    }
    if (boarding.status === (status as BoardingStatus)) {
      res.status(409).json({ message: `Boarding is already ${status.toLowerCase()}` })
      return
    }

    boarding.status = status as BoardingStatus
    boarding.rejectionReason = status === "APPROVED" ? undefined : reason
    await boarding.save()

    await notify(boarding.owner, {
      type: `BOARDING_${status}`,
      title: `Boarding ${status.toLowerCase()}`,
      message:
        status === "APPROVED"
          ? `"${boarding.title}" is now visible to students.`
          : `"${boarding.title}" was rejected: ${reason}. Update it and it will be reviewed again.`,
      link: "/owner/boardings"
    })

    res.json({ message: `Boarding ${status.toLowerCase()}` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}