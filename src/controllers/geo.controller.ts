import { Request, Response } from "express"
import { reversePlace, searchPlaces } from "../service/geocoding.service"

const UNAVAILABLE = "Place search is unavailable right now. You can click on the map instead."

export const search = async (_req: Request, res: Response) => {
  try {
    const { q } = res.locals.query
    res.json({ message: "Success", data: await searchPlaces(q) })
  } catch (err) {
    console.error(err)
    res.status(502).json({ message: UNAVAILABLE })
  }
}

export const reverse = async (_req: Request, res: Response) => {
  try {
    const { lat, lng } = res.locals.query
    res.json({ message: "Success", data: await reversePlace(lat, lng) })
  } catch (err) {
    console.error(err)
    res.status(502).json({ message: UNAVAILABLE })
  }
}