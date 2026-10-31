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