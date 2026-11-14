import mongoose from "mongoose"
import { Boarding, BoardingStatus } from "../models/boarding.model"
import { Campus } from "../models/campus.model"
import { estimateTravel } from "../util/geo"

export const approx = (n: number) => Math.round(n * 1000) / 1000

export const toPoint = (lng: number, lat: number) => ({
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

export type SortKey = "distance" | "price_asc" | "price_desc" | "newest"

export interface SearchParams {
  campusId?: string
  radiusKm: number
  minRent?: number
  maxRent?: number
  facilities?: string[]
  availableOnly: boolean
  sort: SortKey
  page: number
  limit: number
}

type CampusDistanceRow = { _id: mongoose.Types.ObjectId; name: string; city: string; distanceMeters: number }

export const searchBoardings = async (q: SearchParams) => {
 
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
}