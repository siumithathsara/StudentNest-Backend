import { z } from "zod"
import { isInSriLanka } from "../util/geo"

const csv = (v: unknown) =>
  typeof v === "string"
    ? v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : v

const jsonArray = (v: unknown) => {
  if (typeof v !== "string") return v
  try {
    return JSON.parse(v)
  } catch {
    return v
  }
}

const base = z.object({
  title: z.string().trim().min(3, "Title is too short").max(100),
  description: z.string().trim().min(10, "Description is too short").max(2000),
  city: z.string().trim().min(2).max(60),
  address: z.string().trim().min(5, "Address is too short").max(200),
  monthlyRent: z.coerce.number().positive("Rent must be more than 0").max(1_000_000),
  totalRooms: z.coerce.number().int().min(1).max(100),
  availableRooms: z.coerce.number().int().min(0).max(100),
  facilities: z.preprocess(csv, z.array(z.string().trim().max(30)).max(20)).default([]),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180)
})

export const createBoardingSchema = base
  .refine((d) => d.availableRooms <= d.totalRooms, {
    message: "Available rooms cannot be more than total rooms",
    path: ["availableRooms"]
  })
  .refine((d) => isInSriLanka(d.lat, d.lng), {
    message: "Location must be inside Sri Lanka",
    path: ["lat"]
  })

export const updateBoardingSchema = base.partial().extend({
  removeImages: z.preprocess(jsonArray, z.array(z.string()).max(8)).optional()
})

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id")

export const browseQuerySchema = z.object({
  campusId: objectId.optional(),
  radiusKm: z.coerce.number().min(0.5).max(50).default(5),
  minRent: z.coerce.number().min(0).optional(),
  maxRent: z.coerce.number().min(0).optional(),
  facilities: z.preprocess(csv, z.array(z.string().trim().max(30)).max(10)).optional(),
  availableOnly: z.preprocess((v) => v === "true" || v === true, z.boolean()).default(false),
  sort: z.enum(["distance", "price_asc", "price_desc", "newest"]).default("distance"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(9)
})

export const compareQuerySchema = z.object({
  ids: z.preprocess(
    csv,
    z.array(objectId).min(2, "Choose at least 2 boardings").max(3, "You can compare up to 3 boardings")
  ),
  campusId: objectId.optional()
})

export const detailQuerySchema = z.object({
  campusId: objectId.optional()
})