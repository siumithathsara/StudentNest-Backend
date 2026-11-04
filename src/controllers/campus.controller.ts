import { Request, Response } from "express"
import mongoose, { isValidObjectId } from "mongoose"
import { Campus, ICampus } from "../models/campus.model"
import { estimateTravel } from "../util/geo"

const toDto = (c: ICampus) => ({
  id: c._id.toString(),
  name: c.name,
  city: c.city,
  lat: c.location.coordinates[1],
  lng: c.location.coordinates[0]
})

export const listCampuses = async (_req: Request, res: Response) => {
  try {
    const campuses = await Campus.find().sort({ name: 1 })
    res.json({ message: "Success", data: campuses.map(toDto) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const createCampus = async (req: Request, res: Response) => {
  try {
    const { name, city, lat, lng } = req.body
    const campus = await Campus.create({ name, city, location: { type: "Point", coordinates: [lng, lat] } })
    res.status(201).json({ message: "Campus created", data: toDto(campus) })
  } catch (err: any) {
    if (err?.code === 11000) {
      res.status(409).json({ message: "This campus already exists in this city" })
      return
    }
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const updateCampus = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid id" })
      return
    }
    const { name, city, lat, lng } = req.body
    const campus = await Campus.findByIdAndUpdate(
      id,
      { name, city, location: { type: "Point", coordinates: [lng, lat] } },
      { new: true, runValidators: true }
    )
    if (!campus) {
      res.status(404).json({ message: "Campus not found" })
      return
    }
    res.json({ message: "Campus updated", data: toDto(campus) })
  } catch (err: any) {
    if (err?.code === 11000) {
      res.status(409).json({ message: "This campus already exists in this city" })
      return
    }
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const deleteCampus = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid id" })
      return
    }
    const campus = await Campus.findByIdAndDelete(id)
    if (!campus) {
      res.status(404).json({ message: "Campus not found" })
      return
    }
    res.json({ message: "Campus deleted" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}


export const nearbyCampuses = async (_req: Request, res: Response) => {
  try {
    const { lat, lng, radiusKm } = res.locals.query

    const rows = await Campus.aggregate<{
      _id: mongoose.Types.ObjectId
      name: string
      city: string
      distanceMeters: number
    }>([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] }, // (lng, lat)
          distanceField: "distanceMeters",
          maxDistance: radiusKm * 1000,
          spherical: true
        }
      },
      { $limit: 5 }
    ])

    res.json({
      message: "Success",
      data: rows.map((r) => ({
        id: r._id.toString(),
        name: r.name,
        city: r.city,
        ...estimateTravel(r.distanceMeters)
      }))
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}