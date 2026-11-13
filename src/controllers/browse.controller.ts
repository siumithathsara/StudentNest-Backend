import { Request, Response } from "express"
import mongoose, { isValidObjectId } from "mongoose"
import { Boarding, BoardingStatus } from "../models/boarding.model"
import { Campus } from "../models/campus.model"
import { Favorite } from "../models/favorite.model"
import { estimateTravel } from "../util/geo"
import { Booking, BookingStatus } from "../models/booking.model"
import { buildContact, getRequestBlockedReason } from "../util/bookingRules"

const approx = (n: number) => Math.round(n * 1000) / 1000

const toPoint = (lng: number, lat: number) => ({
  type: "Point" as const,
  coordinates: [lng, lat] as [number, number]
})

export const toCard = (b: any) => ({
  id: b._id.toString(),
  title: b.title,
  city: b.city,
  monthlyRent: b.monthlyRent,
  totalRooms: b.totalRooms,
  availableRooms: b.availableRooms,
  facilities: b.facilities,
  coverImage: (b.images?.[0]?.url as string | undefined) ?? null,
  imageCount: (b.images?.length as number | undefined) ?? 0,
  lat: approx(b.location.coordinates[1]),
  lng: approx(b.location.coordinates[0]),
  ...(b.distanceMeters !== undefined ? { travel: estimateTravel(b.distanceMeters) } : {})
})

type CampusDistanceRow = { _id: mongoose.Types.ObjectId; name: string; city: string; distanceMeters: number }

export const listBoardings = async (_req: Request, res: Response) => {
  try {
    const q = res.locals.query

    const match: Record<string, unknown> = { status: BoardingStatus.APPROVED }
    if (q.minRent !== undefined || q.maxRent !== undefined) {
      match.monthlyRent = {
        ...(q.minRent !== undefined && { $gte: q.minRent }),
        ...(q.maxRent !== undefined && { $lte: q.maxRent })
      }
    }
    if (q.facilities?.length) match.facilities = { $all: q.facilities }
    if (q.availableOnly) match.availableRooms = { $gt: 0 }

    const skip = (q.page - 1) * q.limit

    let items: unknown[]
    let total: number
    let campusInfo: { id: string; name: string; city: string } | null = null

    if (q.campusId) {
      const campus = await Campus.findById(q.campusId)
      if (!campus) {
        res.status(404).json({ message: "Campus not found" })
        return
      }
      campusInfo = { id: campus._id.toString(), name: campus.name, city: campus.city }

      const sortStage: Record<string, 1 | -1> =
        q.sort === "price_asc"
          ? { monthlyRent: 1, _id: 1 }
          : q.sort === "price_desc"
            ? { monthlyRent: -1, _id: 1 }
            : q.sort === "newest"
              ? { createdAt: -1, _id: 1 }
              : { distanceMeters: 1, _id: 1 }

      const [r] = await Boarding.aggregate([
        {
          $geoNear: {
            near: toPoint(campus.location.coordinates[0], campus.location.coordinates[1]),
            distanceField: "distanceMeters",
            maxDistance: q.radiusKm * 1000,
            spherical: true,
            query: match
          }
        },
        { $project: { description: 0, address: 0, owner: 0 } },
        { $sort: sortStage },
        { $facet: { items: [{ $skip: skip }, { $limit: q.limit }], total: [{ $count: "n" }] } }
      ])
      items = r.items.map(toCard)
      total = r.total[0]?.n ?? 0
    } else {

      const sort: Record<string, 1 | -1> =
        q.sort === "price_asc"
          ? { monthlyRent: 1, _id: 1 }
          : q.sort === "price_desc"
            ? { monthlyRent: -1, _id: 1 }
            : { createdAt: -1, _id: 1 }

      const [rows, count] = await Promise.all([
        Boarding.find(match).select("-description -address -owner").sort(sort).skip(skip).limit(q.limit).lean(),
        Boarding.countDocuments(match)
      ])
      items = rows.map(toCard)
      total = count
    }

    res.json({ message: "Success", data: { items, total, page: q.page, limit: q.limit, campus: campusInfo } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const getBoardingDetail = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid id" })
      return
    }

    const b: any = await Boarding.findOne({ _id: id, status: BoardingStatus.APPROVED }).populate("owner", "name email phone").lean()
    if (!b) {
      res.status(404).json({ message: "Boarding not found" })
      return
    }

    const lng: number = b.location.coordinates[0]
    const lat: number = b.location.coordinates[1]
    const near = toPoint(lng, lat)

    const nearby = await Campus.aggregate<CampusDistanceRow>([
      { $geoNear: { near, distanceField: "distanceMeters", maxDistance: 10000, spherical: true } },
      { $limit: 5 }
    ])

    let selectedCampus: unknown = null
    const campusId = res.locals.query?.campusId as string | undefined
    if (campusId) {
      const [c] = await Campus.aggregate<CampusDistanceRow>([
        {
          $geoNear: {
            near,
            distanceField: "distanceMeters",
            spherical: true,
            query: { _id: new mongoose.Types.ObjectId(campusId) }
          }
        }
      ])
      if (c) selectedCampus = { id: c._id.toString(), name: c.name, city: c.city, ...estimateTravel(c.distanceMeters) }
    }

    const isFavorite = !!(await Favorite.exists({ student: req.user!.id, boarding: id }))

    const [myBooking, hasApprovedBooking, pendingCount] = await Promise.all([
      Booking.findOne({ student: req.user!.id, boarding: id, active: true }).select("status moveInDate"),
      Booking.exists({ student: req.user!.id, status: BookingStatus.APPROVED }),
      Booking.countDocuments({ student: req.user!.id, status: BookingStatus.PENDING })
    ])
    const approved = myBooking?.status === BookingStatus.APPROVED

    res.json({
      message: "Success",
      data: {
        id: b._id.toString(),
        title: b.title,
        description: b.description,
        city: b.city,
        monthlyRent: b.monthlyRent,
        totalRooms: b.totalRooms,
        availableRooms: b.availableRooms,
        facilities: b.facilities,
        images: (b.images as { url: string }[]).map((i) => i.url),
        lat: approx(lat),
        lng: approx(lng),
        ownerName: b.owner?.name ?? null,
        nearbyCampuses: nearby.map((c) => ({ id: c._id.toString(), name: c.name, city: c.city, ...estimateTravel(c.distanceMeters) })),
        selectedCampus,
        isFavorite,
        myBooking: myBooking
          ? { id: myBooking._id.toString(), status: myBooking.status, moveInDate: myBooking.moveInDate }
          : null,

        requestBlockedReason: myBooking
          ? null
          : getRequestBlockedReason({
            availableRooms: b.availableRooms,
            hasApprovedBooking: !!hasApprovedBooking,
            pendingCount
          }),

        contactVisible: approved,
        contact: approved ? buildContact(b, b.owner) : null
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const compareBoardings = async (_req: Request, res: Response) => {
  try {
    const { ids, campusId } = res.locals.query as { ids: string[]; campusId?: string }
    const unique = [...new Set(ids)]
    if (unique.length < 2) {
      res.status(400).json({ message: "Choose at least 2 different boardings" })
      return
    }
    const objectIds = unique.map((i) => new mongoose.Types.ObjectId(i))

    let rows: any[]
    if (campusId) {
      const campus = await Campus.findById(campusId)
      if (!campus) {
        res.status(404).json({ message: "Campus not found" })
        return
      }
      rows = await Boarding.aggregate([
        {
          $geoNear: {
            near: toPoint(campus.location.coordinates[0], campus.location.coordinates[1]),
            distanceField: "distanceMeters",
            spherical: true,
            query: { _id: { $in: objectIds }, status: BoardingStatus.APPROVED }
          }
        },
        { $project: { description: 0, address: 0, owner: 0 } }
      ])
    } else {
      rows = await Boarding.find({ _id: { $in: objectIds }, status: BoardingStatus.APPROVED })
        .select("-description -address -owner")
        .lean()
    }

    const byId = new Map(rows.map((r) => [r._id.toString(), r]))
    const items = unique
      .map((i) => byId.get(i))
      .filter(Boolean)
      .map(toCard)

    res.json({ message: "Success", data: items })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}