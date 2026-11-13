import { Request, Response } from "express"
import { isValidObjectId } from "mongoose"
import { MAX_IMAGES } from "../middleware/upload"
import { Boarding, BoardingStatus, IBoarding } from "../models/boarding.model"
import { notifyAdmins } from "../service/notification.service"
import { deleteImages, uploadImages } from "../service/upload.service"
import { isInSriLanka } from "../util/geo"
import { Booking } from "../models/booking.model"

export const toBoardingDto = (b: IBoarding) => ({
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
  createdAt: b.createdAt
})

const filesOf = (req: Request) => (req.files as Express.Multer.File[] | undefined) ?? []

export const myBoardings = async (req: Request, res: Response) => {
  try {
    const items = await Boarding.find({ owner: req.user!.id }).sort({ createdAt: -1 })
    res.json({ message: "Success", data: items.map(toBoardingDto) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const getMyBoarding = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid id" })
      return
    }

    const b = await Boarding.findOne({ _id: id, owner: req.user!.id })
    if (!b) {
      res.status(404).json({ message: "Boarding not found" })
      return
    }
    res.json({ message: "Success", data: toBoardingDto(b) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const createBoarding = async (req: Request, res: Response) => {
  try {
    const files = filesOf(req)
    if (files.length === 0) {
      res.status(400).json({ message: "At least one image is required" })
      return
    }

    const b = req.body
    const doc = new Boarding({
      title: b.title,
      description: b.description,
      city: b.city,
      address: b.address,
      monthlyRent: b.monthlyRent,
      totalRooms: b.totalRooms,
      availableRooms: b.availableRooms,
      facilities: b.facilities,
      location: { type: "Point", coordinates: [b.lng, b.lat] },
      owner: req.user!.id,
      status: BoardingStatus.PENDING
    })

    doc.images = await uploadImages(doc._id.toString(), files)
    try {
      await doc.save()
    } catch (err) {
      await deleteImages(doc.images.map((i) => i.path))
      throw err
    }

    await notifyAdmins({
      type: "BOARDING_SUBMITTED",
      title: "New boarding awaiting approval",
      message: `"${doc.title}" was submitted for review.`,
      link: "/admin/boardings"
    })

    res.status(201).json({ message: "Boarding submitted for approval", data: toBoardingDto(doc) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

const REVIEW_FIELDS = ["title", "description", "monthlyRent", "address", "city"] as const

export const updateBoarding = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid id" })
      return
    }

    const doc = await Boarding.findOne({ _id: id, owner: req.user!.id })
    if (!doc) {
      res.status(404).json({ message: "Boarding not found" })
      return
    }

    const b = req.body
    let needsReview = false

    for (const key of REVIEW_FIELDS) {
      if (b[key] !== undefined && b[key] !== doc[key]) {
        ; (doc as any)[key] = b[key]
        needsReview = true
      }
    }

    if ((b.lat === undefined) !== (b.lng === undefined)) {
      res.status(400).json({ message: "lat and lng must be sent together" })
      return
    }
    if (b.lat !== undefined) {
      if (!isInSriLanka(b.lat, b.lng)) {
        res.status(400).json({ message: "Location must be inside Sri Lanka" })
        return
      }
      const [currentLng, currentLat] = doc.location.coordinates
      const moved = Math.abs(b.lat - currentLat) > 1e-6 || Math.abs(b.lng - currentLng) > 1e-6
      if (moved) {
        doc.location = { type: "Point", coordinates: [b.lng, b.lat] }
        needsReview = true
      }
    }

    if (b.totalRooms !== undefined) doc.totalRooms = b.totalRooms
    if (b.availableRooms !== undefined) doc.availableRooms = b.availableRooms
    if (b.facilities !== undefined) doc.facilities = b.facilities
    if (doc.availableRooms > doc.totalRooms) {
      res.status(400).json({ message: "Available rooms cannot be more than total rooms" })
      return
    }


    const incoming = filesOf(req)
    const removePaths = (b.removeImages as string[] | undefined) ?? []
    const removed = doc.images.filter((i) => removePaths.includes(i.path))
    const finalCount = doc.images.length - removed.length + incoming.length
    if (finalCount < 1) {
      res.status(400).json({ message: "A boarding needs at least one image" })
      return
    }
    if (finalCount > MAX_IMAGES) {
      res.status(400).json({ message: `A boarding can have at most ${MAX_IMAGES} images` })
      return
    }

    const added = incoming.length > 0 ? await uploadImages(doc._id.toString(), incoming) : []
    if (removed.length > 0 || added.length > 0) needsReview = true
    doc.images = [...doc.images.filter((i) => !removePaths.includes(i.path)), ...added]

    if (needsReview && doc.status !== BoardingStatus.PENDING) {
      doc.status = BoardingStatus.PENDING
      doc.rejectionReason = undefined
    }

    try {
      await doc.save()
    } catch (err) {
      await deleteImages(added.map((i) => i.path))
      throw err
    }
    await deleteImages(removed.map((i) => i.path))

    if (needsReview) {
      await notifyAdmins({
        type: "BOARDING_SUBMITTED",
        title: "Boarding updated, awaiting approval",
        message: `"${doc.title}" was edited and needs to be reviewed again.`,
        link: "/admin/boardings"
      })
    }

    res.json({
      message: needsReview ? "Updated. Sent for admin approval again." : "Updated",
      data: toBoardingDto(doc)
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const deleteBoarding = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid id" })
      return
    }
    const doc = await Boarding.findOne({ _id: id, owner: req.user!.id })
    if (!doc) {
      res.status(404).json({ message: "Boarding not found" })
      return
    }

    if (await Booking.exists({ boarding: doc._id, active: true })) {
      res.status(409).json({ message: "This boarding has active booking requests. Reject or cancel them first." })
      return
    }
    await doc.deleteOne()
    await deleteImages(doc.images.map((i) => i.path))
    res.json({ message: "Boarding deleted" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}