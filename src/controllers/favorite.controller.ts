import { Request, Response } from "express"
import { isValidObjectId } from "mongoose"
import { Boarding, BoardingStatus } from "../models/boarding.model"
import { Favorite } from "../models/favorite.model"
import { toCard } from "./browse.controller"

export const favoriteIds = async (req: Request, res: Response) => {
  try {
    const rows = await Favorite.find({ student: req.user!.id }).select("boarding")
    res.json({ message: "Success", data: rows.map((r) => r.boarding.toString()) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const listFavorites = async (req: Request, res: Response) => {
  try {
    const favs: any[] = await Favorite.find({ student: req.user!.id })
      .sort({ createdAt: -1 })
      .populate({
        path: "boarding",
        match: { status: BoardingStatus.APPROVED },
        select: "title city monthlyRent totalRooms availableRooms facilities images location"
      })
      .lean()

    res.json({ message: "Success", data: favs.map((f) => f.boarding).filter(Boolean).map(toCard) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const addFavorite = async (req: Request, res: Response) => {
  try {
    const boardingId = String(req.params.boardingId)
    if (!isValidObjectId(boardingId)) {
      res.status(400).json({ message: "Invalid id" })
      return
    }
    const exists = await Boarding.exists({ _id: boardingId, status: BoardingStatus.APPROVED })
    if (!exists) {
      res.status(404).json({ message: "Boarding not found" })
      return
    }
    await Favorite.updateOne(
      { student: req.user!.id, boarding: boardingId },
      { student: req.user!.id, boarding: boardingId },
      { upsert: true }
    )
    res.json({ message: "Added to favorites" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const removeFavorite = async (req: Request, res: Response) => {
  try {
    const boardingId = String(req.params.boardingId)
    if (!isValidObjectId(boardingId)) {
      res.status(400).json({ message: "Invalid id" })
      return
    }
    await Favorite.deleteOne({ student: req.user!.id, boarding: boardingId })
    res.json({ message: "Removed from favorites" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}