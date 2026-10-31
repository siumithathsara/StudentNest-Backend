import { z } from "zod"
import { isInSriLanka } from "../util/geo"

export const campusSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(100),
    city: z.string().trim().min(2, "City is too short").max(60),
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180)
  })
  .refine((d) => isInSriLanka(d.lat, d.lng), {
    message: "Location must be inside Sri Lanka",
    path: ["lat"]
  })

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.5).max(50).default(10)
})

export const geoSearchSchema = z.object({
  q: z.string().trim().min(3, "Type at least 3 characters").max(100)
})

export const reverseSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180)
})